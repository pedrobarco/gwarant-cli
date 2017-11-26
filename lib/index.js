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

function calculateHash (username, password, salt) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 512, 'sha512').toString('hex')
  return hash
}

function registerUser (username, password) {
  const salt = crypto.randomBytes(256).toString('hex')
  const hash = calculateHash(username, password, salt)
  dbjson[username] = { password: hash, salt: salt, files: [] }
  fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
}

function cipherAll (toCipher, username, password) {
  let input, output
  let i, file, newFile
  let cipher
  const hash = require('crypto')
  const mode = toCipher ? 'Ciphering' : 'Deciphering'
  console.log(`${config.prompt.correct} ${mode} files...`)
  const key = calculateHash(username, password + 'file', dbjson[username].salt).slice(0, 24)
  const iv = hash.createHash('md5').update(password).digest().slice(0, 16)
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
        fs.unlinkSync(newFile)
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
