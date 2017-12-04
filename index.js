#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const prompt = require('prompt')
const config = require('./config')
const prompts = require('./prompts/')
const lib = require('./lib')
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
      lib.handleSignal(username, password)
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
      lib.handleSignal(username, password)
    } else {
      if (result.password !== result.confirm) {
        console.log(`${config.prompt.wrong} Passwords do not match.`)
      } else {
        lib.registerUser(result.username, result.password)
      }
      return mainMenu()
    }
  })
}

function loginMenu () {
  prompt.get(prompts.loginPrompt, function (err, result) {
    if (err) {
      lib.handleSignal(username, password)
    } else {
      if (dbjson.hasOwnProperty(result.username)) {
        const hash = lib.calculateHash(result.password, dbjson[result.username].salt, config.len.pass).toString('hex')
        if (dbjson[result.username].password === hash) {
          username = result.username
          password = result.password
          lib.loginUser(username, password)
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
      lib.handleSignal(username, password)
    } else if (result.option === 'a') {
      return addFileMenu()
    } else if (result.option === 'r') {
      return removeFileMenu()
    } else if (result.option === 'c') {
      lib.generateQR(username, password)
      return cryptoMenu()
    } else if (result.option === 'l') {
      lib.logoutUser(username, password, () => {
        username = null
        password = null
        console.log(`${config.prompt.correct} Logged out. Stay safe!`)
        return mainMenu()
      })
    }
  })
}

function addFileMenu () {
  prompt.get(prompts.filePrompt, function (err, result) {
    if (err) {
      lib.handleSignal(username, password)
    } else {
      const file = path.resolve(result.file)
      if (fs.existsSync(file) && fs.lstatSync(file).isFile()) {
        if (dbjson[username].files.includes(file)) {
          console.log(`${config.prompt.wrong} File already in list.`)
        } else {
          lib.addFile(username, file)
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
      lib.handleSignal(username, password)
    } else {
      const file = path.resolve(result.file)
      if (!dbjson[username].files.includes(file)) {
        console.log(`${config.prompt.wrong} File not in list.`)
      } else {
        lib.removeFile(username, file)
      }
      return cryptoMenu()
    }
  })
}
