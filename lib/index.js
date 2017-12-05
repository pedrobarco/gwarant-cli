'use strict'

const crypto = require('crypto')
const fs = require('fs')
const figlet = require('figlet')
const colors = require('colors/safe')
const os = require('os')
const net = require('net')
const qr = require('qrcode-terminal')
const pjson = require('../package.json')
const config = require('../config')
const db = config.file.db
const dbjson = config.dbjson

function headerFiglet () {
  const figletText = figlet.textSync(pjson.name, 'Speed')
  console.log(colors.red(figletText))
  console.log()
  console.log(`${colors.bgWhite.red(` ${pjson.name} `)}${colors.bgRed.white(` ${pjson.version} `)}`)
  console.log()
}

function calculateHash (password, salt, len) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, len, 'sha256')
  return hash
}

function registerUser (username, password) {
  const salt = crypto.randomBytes(config.len.salt).toString('hex')
  const hash = calculateHash(password, salt, config.len.pass).toString('hex')
  const iv = crypto.randomBytes(config.len.iv).toString('hex')
  dbjson[username] = { password: hash, salt: salt, iv: iv, devices: [], files: [] }
  fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
}

function cipherAll (toCipher, username, password) {
  let input, output
  let i, file, newFile
  let cipher, iv
  const mode = toCipher ? 'Ciphering' : 'Deciphering'
  console.log(`${config.prompt.correct} ${mode} files...`)
  const key = calculateHash(password, dbjson[username].salt, config.len.key)
  if (toCipher) {
    iv = crypto.randomBytes(config.len.iv)
    cipher = crypto.createCipheriv('aes192', key, iv)
    dbjson[username].iv = iv.toString('hex')
    fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
  } else {
    iv = Buffer.from(dbjson[username].iv, 'hex')
    cipher = crypto.createDecipheriv('aes192', key, iv)
  }
  for (i in dbjson[username].files) {
    file = dbjson[username].files[i]
    if (fs.existsSync(file)) {
      newFile = file + '.tmp'
      input = fs.createReadStream(file)
      output = fs.createWriteStream(newFile)
      input.pipe(cipher).pipe(output)
      output.on('finish', () => {
        input = fs.createReadStream(newFile)
        output = fs.createWriteStream(file)
        input.pipe(output)
        output.on('finish', () => {
          fs.unlinkSync(newFile)
        })
      })
    } else {
      removeFile(db, dbjson, username, file)
    }
  }
}

function addFile (username, file) {
  dbjson[username].files.push(file)
  fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
}

function removeFile (username, file) {
  const index = dbjson[username].files.indexOf(file)
  dbjson[username].files.splice(index, 1)
  fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
}

function getExternalIP () {
  const interfaces = os.networkInterfaces()
  let addr
  for (let i in interfaces) {
    for (let ii in interfaces[i]) {
      addr = interfaces[i][ii]
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address
      }
    }
  }
}

function generateQR (username, password) {
  const pwdhash = dbjson[username].password
  const salt = dbjson[username].salt
  const ip = getExternalIP()
  const nonce = crypto.randomBytes(config.len.nonce).toString('hex')
  const iv = crypto.randomBytes(config.len.iv).toString('hex')
  const key = config.key.exportKey(config.enc.qr).toString(config.enc.string)
  const message = username + ' ' + pwdhash + ' ' + salt + ' ' + key + ' ' + ip + ' ' + iv + ' ' + nonce
  qr.generate(message, { small: true })
  establishPair(username, password, nonce, iv)
}

function establishPair (username, password, nonce) {
  let newNonce = nonce + 1
  const key = calculateHash(password, dbjson[username].salt, config.len.key)
  const decipher = crypto.createDecipher('aes192', key)
  const cipher = crypto.createCipher('aes192', key)
  const server = net.createServer(socket => {
    socket.on('data', data => {
      try {
        // TODO: cipher decipher
        let decipheredMessage = decipher.update(data, 'hex', 'utf8')
        decipheredMessage += decipher.final('utf8').split(' ')
        const command = decipheredMessage[0]
        const deviceName = decipheredMessage[1]
        const deviceId = decipheredMessage[2]
        const deviceKey = decipheredMessage[3]
        const deviceNonce = decipheredMessage[4]
        if (command === 'REGISTER' && deviceNonce === newNonce) {
          if (deviceNonce === nonce) {
            const newDevice = { id: deviceId, key: deviceKey }
            dbjson[username].devices.push(newDevice)
            fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
            console.log(`${config.prompt.correct} ${deviceName} linked successfully.`)
            newNonce++
            let ack = 'ACK ' + newNonce
            // TODO: Chiper ack
            let cipheredMessage = cipher.update(ack, 'hex', 'utf8')
            cipheredMessage += cipher.final('utf8').split(' ')
            socket.write(cipheredMessage)
          } else {
            console.log(`${config.prompt.wrong} Invalid pairing request.`)
          }
        }
      } catch (error) {
        console.log(`${config.prompt.wrong} Error deciphering message.`)
      }
    })
  })
  server.listen(config.server.port)
  console.log(`\n${config.prompt.correct} Listening at port: ${config.server.port}`)
}

function loginUser (username, password) {
  cipherAll(false, username, password)
}

function logoutUser (username, password) {
  cipherAll(true, username, password)
}

function handleSignal (username, password) {
  console.log()
  console.log(`${config.prompt.wrong} Program interruption detected.`)
  if (username && password) {
    cipherAll(true, username, password, () => {
      process.exit()
    })
  } else {
    process.exit()
  }
}

module.exports = {
  headerFiglet,
  calculateHash,
  registerUser,
  cipherAll,
  addFile,
  removeFile,
  generateQR,
  establishPair,
  loginUser,
  logoutUser,
  handleSignal
}
