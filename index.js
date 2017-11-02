#!/usr/bin/env node
'use strict'

const fs = require('fs')
const crypto = require('crypto')
const prompt = require('prompt')

const path = './db.json'
if (!fs.existsSync(path)) {
  fs.writeFileSync(path, JSON.stringify({}, null, 4))
}
const db = require(path)

const menu = {
  name: 'option',
  message: '[R]egister [L]ogin [Q]uit',
  validator: /r|l|q/i,
  require: true,
  before: function (option) { return option.toLowerCase() }
}

const register = {
  properties: {
    username:
    {
      type: 'string',
      required: true,
      conform: function (username) {
        return !(db.hasOwnProperty(username))
      }
    },
    password: {
      type: 'string',
      hidden: true,
      required: true,
      replace: '*'
    }
  }
}

const login = {
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

prompt.start()
mainMenu()

function mainMenu () {
  prompt.get(menu, function (err, result) {
    if (err) {
      console.log(err)
    } else if (result.option === 'r') {
      return registerUser()
    } else if (result.option === 'l') {
      return loginUser()
    } else if (result.option === 'q') {
      return process.exit()
    }
  })
}

function registerUser () {
  prompt.get(register, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      let hash = calculateHash(result.username, result.password)
      db[result.username] = hash
      fs.writeFile(path, JSON.stringify(db, null, 4))
      return mainMenu()
    }
  })
}

function loginUser () {
  prompt.get(login, function (err, result) {
    if (err) {
      console.log(err)
    }
    let hash = calculateHash(result.username, result.password)
    if (db[result.username] === hash) {
      console.log(`Logged in as ${result.username}`)
    } else {
      console.log(`Incorrect user or password.`)
      return mainMenu()
    }
  })
}

function calculateHash (username, password) {
  const hash = crypto.createHash('sha256')
  const salt = hash.update(hash.update(username) + hash.update(password)).digest('hex')
  const key = crypto.pbkdf2Sync(password, salt, 100000, 512, 'sha512').toString('hex')
  return key
}
