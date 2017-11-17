'use strict'

const mainPrompt = require('./main')
const registerPrompt = require('./register')
const loginPrompt = require('./login')
const cryptoPrompt = require('./crypto')
const filePrompt = require('./file')

module.exports = {
  mainPrompt,
  registerPrompt,
  loginPrompt,
  cryptoPrompt,
  filePrompt
}
