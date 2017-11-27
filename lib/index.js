'use strict'

const crypto = require('crypto')
const fs = require('fs')
const figlet = require('figlet')
const colors = require('colors/safe')
const pjson = require('../package.json')
const config = require('../config')
const db = config.db
const dbjson = config.dbjson

function headerFiglet () {
  const figletText = figlet.textSync(pjson.name, 'Speed')
  console.log(colors.red(figletText))
  console.log()
  console.log(`${colors.bgWhite.red(` ${pjson.name} `)}${colors.bgRed.white(` ${pjson.version} `)}`)
  console.log()
}

function calculateHash (password, salt, len) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, len, 'sha256')
  return hash
}

function registerUser (username, password) {
  const salt = crypto.randomBytes(config.len.salt).toString('hex')
  const hash = calculateHash(password, salt, config.len.pass).toString('hex')
  dbjson[username] = { password: hash, salt: salt, files: [] }
  fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
}

function cipherAll (toCipher, username, password) {
  let input, output
  let i, file, newFile
  let cipher
  const mode = toCipher ? 'Ciphering' : 'Deciphering'
  console.log(`${config.prompt.correct} ${mode} files...`)
  const hash = require('crypto')
  const key = calculateHash(password, dbjson[username].salt, config.len.key)
  const iv = hash.createHash('md5').update(password).digest().slice(0, config.len.iv)
  if (toCipher) {
    cipher = crypto.createCipheriv('aes192', key, iv)
  } else {
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
  loginUser,
  logoutUser,
  handleSignal
}
