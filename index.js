#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const prompt = require('prompt')
const colors = require('colors/safe')
const figlet = require('figlet')
const pjson = require('./package.json')

const db = './db.json'
if (!fs.existsSync(db)) {
  fs.writeFileSync(db, JSON.stringify({}, null, 4))
}
const dbjson = require(db)

let username, password

const mainPrompt = {
  name: 'option',
  message: '[R]egister [L]ogin [Q]uit',
  validator: /r|l|q/i,
  warning: 'Not a valid option',
  empty: false,
  before: function (option) { return option.toLowerCase() }
}

const registerPrompt = {
  properties: {
    username: {
      type: 'string',
      empty: false
    },
    password: {
      type: 'string',
      validator: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
      warning: 'Minimum eight characters, at least one letter and one number.',
      hidden: true,
      empty: false
    },
    confirm: {
      type: 'string',
      message: 'retype password',
      hidden: true,
      empty: false
    }
  }
}

const loginPrompt = {
  properties: {
    username:
      {
        type: 'string',
        empty: false
      },
    password: {
      type: 'string',
      hidden: true,
      empty: false,
      replace: '*'
    }
  }
}

const cryptoPrompt = {
  name: 'option',
  message: '[A]dd [R]emove [L]ogout',
  validator: /a|r|l/i,
  warning: 'Not a valid option',
  empty: false,
  before: function (option) { return option.toLowerCase() }
}

const filePrompt = {
  name: 'file',
  empty: false
}

prompt.colors = false
prompt.message = colors.bgWhite.red(' ? ')
prompt.delimiter = ' ' + colors.bgRed.white('::') + ' '

prompt.start()
headerFiglet()
mainMenu()

function mainMenu () {
  prompt.get(mainPrompt, function (err, result) {
    if (err) {
      console.log(err)
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
  prompt.get(registerPrompt, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      if (dbjson.hasOwnProperty(result.username)) {
        console.log(`That username has already been taken.`)
      } else if (result.password !== result.confirm) {
        console.log(`Passwords do not match.`)
      } else {
        const salt = crypto.randomBytes(256).toString('hex')
        const hash = calculateHash(result.username, result.password, salt)
        dbjson[result.username] = { password: hash, salt: salt, files: [] }
        fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
      }
      return mainMenu()
    }
  })
}

function loginMenu () {
  prompt.get(loginPrompt, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      if (dbjson.hasOwnProperty(result.username)) {
        const hash = calculateHash(result.username, result.password, dbjson[result.username].salt)
        if (dbjson[result.username].password === hash) {
          username = result.username
          password = result.password
          console.log(`Logged in as ${username}`)
          cipherAll(false)
          return cryptoMenu()
        }
      }
      console.log(`Incorrect user or password.`)
      return mainMenu()
    }
  })
}

function cryptoMenu () {
  prompt.get(cryptoPrompt, function (err, result) {
    if (err) {
      console.log(err)
    } else if (result.option === 'a') {
      return addFileMenu()
    } else if (result.option === 'r') {
      return removeFileMenu()
    } else if (result.option === 'l') {
      cipherAll(true)
      return mainMenu()
    }
  })
}

function addFileMenu () {
  prompt.get(filePrompt, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      const file = path.resolve(result.file)
      if (fs.existsSync(file)) {
        if (dbjson[username].files.includes(file)) {
          console.log(`File already in list.`)
        } else {
          dbjson[username].files.push(file)
          fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
        }
      } else {
        console.log(`File does not exist.`)
      }
      return cryptoMenu()
    }
  })
}

function removeFileMenu () {
  prompt.get(filePrompt, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      const file = path.resolve(result.file)
      if (fs.existsSync(file)) {
        if (!dbjson[username].files.includes(file)) {
          console.log(`File not in list.`)
        } else {
          const index = dbjson[username].files.indexOf(file)
          dbjson[username].files.splice(index, 1)
          fs.writeFileSync(db, JSON.stringify(dbjson, null, 4))
        }
      } else {
        console.log(`File does not exist.`)
      }
      return cryptoMenu()
    }
  })
}

function cipherAll (toCipher) {
  let input, output
  let i, file, newFile
  let cipher
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
      console.log(`File ${file} does not exist.`)
    }
  }
}

function calculateHash (username, password, salt) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 512, 'sha512').toString('hex')
  return hash
}

function headerFiglet () {
  const figletText = figlet.textSync('gwarant-cli', 'speed')
  console.log(colors.red(figletText))
  console.log()
  console.log(`${colors.bgWhite.red(' ' + pjson.name + ' ')}${colors.bgRed.white(' ' + pjson.version + ' ')}`)
  console.log()
}
