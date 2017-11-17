'use strict'

const dbjson = require('../../config').dbjson

const registerPrompt = {
  properties: {
    username: {
      type: 'string',
      empty: false,
      conform: function (username) { return !dbjson.hasOwnProperty(username) },
      warning: 'Username already in use.'
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

module.exports = registerPrompt
