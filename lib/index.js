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

const main = require('../')

var sessionKey = null
var hbTimeout = null
var fileKey = null
var appSocket = null

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
  let key
  const mode = toCipher ? 'Ciphering' : 'Deciphering'
  console.log(`${config.prompt.correct} ${mode} files...`)
  if (fileKey == null) {
    key = calculateHash(password, dbjson[username].salt, config.len.key)
  } else {
    key = fileKey
  }
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
  const delimiter = '::'
  const pwdhash = dbjson[username].password
  const salt = dbjson[username].salt
  const ip = getExternalIP()
  const nonce = crypto.randomBytes(config.len.nonce).toString('hex')
  const iv = crypto.randomBytes(config.len.iv).toString('hex')
  const key = config.key.exportKey(config.enc.qr).toString(config.enc.string)
  const message = username + delimiter + pwdhash + delimiter + salt + delimiter + key + delimiter + ip + delimiter + iv + delimiter + nonce
  qr.generate(message, { small: true })
  establishPair(username, password, nonce, iv)
}

function establishPair (username, password, nonce, iv) {
  console.log('Nonce1: ' + nonce)
  const delimiter = '::'
  const key = calculateHash(password, dbjson[username].salt, config.len.key).toString('hex')
  const decipher = crypto.createDecipher('aes192', key, iv)
  const server = net.createServer(socket => {
    socket.on('data', data => {
      try {
        let decipheredMessage = decipher.update(data.toString('utf8'), 'hex', 'utf8')
        decipheredMessage += decipher.final('utf8')
        decipheredMessage = decipheredMessage.split(delimiter)
        const command = decipheredMessage[0]
        const deviceName = decipheredMessage[1]
        const deviceId = decipheredMessage[2]
        const deviceKey = decipheredMessage[3]
        const deviceNonce1 = decipheredMessage[4]
        const deviceNonce2 = decipheredMessage[5]
        if (command === 'REGISTER' && deviceNonce1 === nonce) {
          const newDevice = { id: deviceId, key: deviceKey }
          dbjson[username].devices.push(newDevice)
          fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
          console.log(`\n${config.prompt.correct} ${deviceName} linked successfully.`)
          const nonce2 = deviceNonce2
          let ack = 'ACK' + delimiter + nonce2
          ack = Buffer.from(ack, 'utf8')
          ack = crypto.publicEncrypt(deviceKey, ack)
          socket.write(ack)
        } else {
          console.log(`${config.prompt.wrong} Invalid pairing request.`)
        }
      } catch (error) {
        console.log(error)
        console.log(`${config.prompt.wrong} Error deciphering message.`)
      }
    })
  })
  server.listen(config.server.port)
  console.log(`\n${config.prompt.correct} Listening at port: ${config.server.port}`)
}

function connectPair () {
  const dgram = require('dgram')
  const udpserver = dgram.createSocket('udp4')
  udpserver.on('error', (err) => {
    console.log(`server error:\n${err.stack}`)
    udpserver.close()
  })
  udpserver.on('message', (msg, rinfo) => {
    console.log(`${config.prompt.correct} Establishing connection...`)
    const message = msg.toString('utf8').split(' ')
    const port = 8080
    const ip = message[0]
    const id = message[1]
    const user = message[2]
    main.username = user
    appSocket = new net.Socket()
    appSocket.connect(port, ip, function () {
      appSocket.on('error', function error (error) {
        // Dont crash when there is an error
      })
      try {
        const timestamp = Date.now()
        const salt = dbjson[main.username].salt
        const pass = crypto.randomBytes(16)
        sessionKey = crypto.pbkdf2Sync(pass, salt, 10000, 24, 'sha256')
        let deviceKey = null
        dbjson[main.username].devices.forEach(item => {
          if (item.id === id) {
            deviceKey = item.key
          }
        })
        if (deviceKey == null) {
          console.log(`${config.prompt.wrong} Tried to pair with unknown device`)
          return
        }
        const emessage = crypto.publicEncrypt(deviceKey, Buffer.from(timestamp + ' ' + sessionKey.toString('hex') + ' ' + salt, 'utf8'))
        appSocket.write(emessage)
        appSocket.on('data', function incoming (data) {
          const iv = '0000000000000000'
          const decipher = crypto.createDecipheriv('aes192', sessionKey, iv)
          let message = decipher.update(data, 'hex', 'utf8')
          message += decipher.final('utf8')
          message = message.split(' ')
          if (validateTimestamp(message[0])) {
            if (message.length === 2) {
              fileKey = Buffer.from(message[1], 'hex')
              hbTimeout = setTimeout(checkHeartbeat, 5 * 1000 + 500)
              cipherAll(false, main.username, null)
              appSocket.on('close', function stop () {
                checkHeartbeat()
              })
              main.cryptoMenu()
            } else if (message.length === 1) {
              if (hbTimeout == null) {
              } else {
                clearTimeout(hbTimeout)
                hbTimeout = setTimeout(checkHeartbeat, 5 * 1000 + 500)
              }
            }
          } else {
            console.log(`${config.prompt.wrong} Error establishing connection: Invalid Timestamp`)
          }
        })
      } catch (error) {
        console.log(error)
        console.log(`${config.prompt.wrong} Error establishing connection.`)
      }
    })
  })
  udpserver.on('listening', () => {
    const address = udpserver.address()
    console.log(`${config.prompt.correct} Waiting for App connection on port ${address.port}`)
  })
  udpserver.bind(12345)
}

function validateTimestamp (timestamp) {
  const currentTimestamp = Date.now()
  const difference = currentTimestamp - timestamp
  return difference <= 60000
}

function checkHeartbeat () {
  if (hbTimeout != null) {
    console.log(`${config.prompt.wrong} App no longer in proximity. Logging out.`)
    clearTimeout(hbTimeout)
    if (appSocket != null) {
      appSocket.destroy()
    }
    cipherAll(true, main.username, null)
    hbTimeout = null
  }
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
  connectPair,
  loginUser,
  logoutUser,
  handleSignal
}
