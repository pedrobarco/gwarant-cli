#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const prompt = require('prompt')
const colors = require('colors/safe')
const figlet = require('figlet')
const pjson = require('./package.json')

const DATABASE = './db.json'
if (!fs.existsSync(DATABASE)) {
  fs.writeFileSync(DATABASE, JSON.stringify({}, null, 4))
}
const db = require(DATABASE)
let password

const mainPrompt = {
  name: 'option',
  message: '[R]egister [L]ogin [Q]uit',
  validator: /r|l|q/i,
  require: true,
  before: function (option) { return option.toLowerCase() }
}

const registerPrompt = {
  properties: {
    username:
    {
      type: 'string',
      required: true
    },
    password: {
      type: 'string',
      hidden: true,
      required: true,
      replace: '*'
    }
  }
}

const loginPrompt = {
  properties: {
    username:
    {
      type: 'string',
      required: true
    },
    password: {
      type: 'string',
      hidden: true,
      required: true,
      replace: '*'
    }
  }
}

const cryptoPrompt = {
  name: 'option',
  message: '[A]dd [R]emove [L]ogout',
  validator: /a|r|l/i,
  require: true,
  before: function (option) { return option.toLowerCase() }
}

const filePrompt = {
  name: 'file',
  require: true
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
    } else if (!db.hasOwnProperty(result.username)) {
      let salt = crypto.randomBytes(256).toString('hex')
      let hash = calculateHash(result.username, result.password, salt)
      db[result.username] = { password: hash, salt: salt, files: [] }
      fs.writeFileSync(DATABASE, JSON.stringify(db, null, 4))
      return mainMenu()
    } else {
      console.log(`That username has already been taken.`)
      return mainMenu()
    }
  })
}

function loginMenu () {
  prompt.get(loginPrompt, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      let hash = calculateHash(result.username, result.password, db[result.username]['salt'])
      if (db[result.username].password === hash) {
        password = result.password
        console.log(`Logged in as ${result.username}`)
        cipherAll(result.username, false)
        return cryptoMenu(result.username)
      } else {
        console.log(`Incorrect user or password.`)
        return mainMenu()
      }
    }
  })
}

function cryptoMenu (username) {
  prompt.get(cryptoPrompt, function (err, result) {
    if (err) {
      console.log(err)
    } else if (result.option === 'a') {
      return addFileMenu(username)
    } else if (result.option === 'r') {
      return removeFileMenu(username)
    } else if (result.option === 'l') {
      cipherAll(username, true)
      return mainMenu()
    }
  })
}

function addFileMenu (username) {
  prompt.get(filePrompt, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      let file = path.resolve(result.file)
      if (db[username].files.includes(file)) {
        console.log(`File already exists in list.`)
      } else {
        db[username].files.push(file)
        fs.writeFileSync(DATABASE, JSON.stringify(db, null, 4))
      }
      return cryptoMenu(username)
    }
  })
}

function removeFileMenu (username) {
  prompt.get(filePrompt, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      let file = path.resolve(result.file)
      if (!db[username].files.includes(file)) {
        console.log(`File does not exist in list.`)
      } else {
        let index = db[username].files.indexOf(file)
        db[username].files.splice(index, 1)
        fs.writeFileSync(DATABASE, JSON.stringify(db, null, 4))
      }
      return cryptoMenu(username)
    }
  })
}

function cipherAll (username, toCipher) {
  let key
  let input, output
  if (toCipher) {
    key = crypto.createCipher('aes192', password)
  } else {
    key = crypto.createDecipher('aes192', password)
  }
  let i, file, newFile
  for (i in db[username].files) {
    file = db[username].files[i]
    if (fs.existsSync(file)) {
      newFile = file + '.tmp'
      input = fs.createReadStream(file)
      output = fs.createWriteStream(newFile)
      input.pipe(key).pipe(output)
      output.on('finish', () => {
        input = fs.createReadStream(newFile)
        output = fs.createWriteStream(file)
        input.pipe(output)
        fs.unlink(newFile)
      })
    } else {
      console.log(`File ${file} does not exist.`)
    }
  }
}

function calculateHash (username, password, salt) {
  let hash = crypto.pbkdf2Sync(password, salt, 100000, 512, 'sha512').toString('hex')
  return hash
}

function headerFiglet () {
  const figletText = figlet.textSync('gwarant-cli', 'speed')
  console.log(colors.red(figletText))
  console.log()
  console.log(`${colors.bgWhite.red(' ' + pjson.name + ' ')}${colors.bgRed.white(' ' + pjson.version + ' ')}`)
  console.log()
}
