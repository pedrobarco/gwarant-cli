#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const prompt = require('prompt')
const config = require('./config')
const prompts = require('./prompts/')
const lib = require('./lib')
const db = config.db
const dbjson = config.dbjson

prompt.colors = config.prompt.colors
prompt.message = config.prompt.message
prompt.delimiter = config.prompt.delimiter

let username, password

prompt.start()
lib.headerFiglet()
mainMenu()

function mainMenu () {
  prompt.get(prompts.mainPrompt, function (err, result) {
    if (err) {
      handleSignal()
    } else if (result.option === 'r') {
      return registerMenu()
    } else if (result.option === 'l') {
      return loginMenu()
    } else if (result.option === 'q') {
      return process.exit()
    }
  })
}

function registerMenu () {
  prompt.get(prompts.registerPrompt, function (err, result) {
    if (err) {
      handleSignal()
    } else {
      if (result.password !== result.confirm) {
        console.log(`${config.prompt.wrong} Passwords do not match.`)
      } else {
        registerUser(result.username, result.password)
      }
      return mainMenu()
    }
  })
}

function loginMenu () {
  prompt.get(prompts.loginPrompt, function (err, result) {
    if (err) {
      handleSignal()
    } else {
      if (dbjson.hasOwnProperty(result.username)) {
        const hash = calculateHash(result.username, result.password, dbjson[result.username].salt)
        if (dbjson[result.username].password === hash) {
          loginUser(result.username, result.password)
          console.log(`${config.prompt.correct} Logged in as ${result.username}!`)
          return cryptoMenu()
        }
      }
      console.log(`${config.prompt.wrong} Incorrect user or password.`)
      return mainMenu()
    }
  })
}

function cryptoMenu () {
  prompt.get(prompts.cryptoPrompt, function (err, result) {
    if (err) {
      handleSignal()
    } else if (result.option === 'a') {
      return addFileMenu()
    } else if (result.option === 'r') {
      return removeFileMenu()
    } else if (result.option === 'l') {
      logoutUser()
      console.log(`${config.prompt.correct} Logged out. Stay safe!`)
      return mainMenu()
    }
  })
}

function addFileMenu () {
  prompt.get(prompts.filePrompt, function (err, result) {
    if (err) {
      handleSignal()
    } else {
      const file = path.resolve(result.file)
      if (fs.existsSync(file) && fs.lstatSync(file).isFile()) {
        if (dbjson[username].files.includes(file)) {
          console.log(`${config.prompt.wrong} File already in list.`)
        } else {
          addFile(file)
        }
      } else {
        console.log(`${config.prompt.wrong} File does not exist.`)
      }
      return cryptoMenu()
    }
  })
}

function removeFileMenu () {
  prompt.get(prompts.filePrompt, function (err, result) {
    if (err) {
      handleSignal()
    } else {
      const file = path.resolve(result.file)
      if (!dbjson[username].files.includes(file)) {
        console.log(`${config.prompt.wrong} File not in list.`)
      } else {
        removeFile(file)
      }
      return cryptoMenu()
    }
  })
}

function registerUser (username, password) {
  const salt = crypto.randomBytes(256).toString('hex')
  const hash = calculateHash(username, password, salt)
  dbjson[username] = { password: hash, salt: salt, files: [] }
  fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
}

function loginUser (user, pass) {
  username = user
  password = pass
  cipherAll(false)
}

function logoutUser () {
  cipherAll(true, () => {
    username = null
    password = null
  })
}

function addFile (file) {
  dbjson[username].files.push(file)
  fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
}
function removeFile (file) {
  const index = dbjson[username].files.indexOf(file)
  dbjson[username].files.splice(index, 1)
  fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
}

function calculateHash (username, password, salt) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 512, 'sha512').toString('hex')
  return hash
}

function cipherAll (toCipher) {
  let input, output
  let i, file, newFile
  let cipher
  const mode = toCipher ? 'Ciphering' : 'Deciphering'
  console.log(`${config.prompt.correct} ${mode} files...`)
  const hash = require('crypto')
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
      removeFile(file)
    }
  }
}

function handleSignal () {
  console.log()
  console.log(`${config.prompt.wrong} Program interruption detected.`)
  if (username && password) {
    cipherAll(true, () => {
      process.exit()
    })
  } else {
    process.exit()
  }
}
