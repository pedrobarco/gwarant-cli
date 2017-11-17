'use strict'

const mainPrompt = {
  name: 'option',
  message: '[R]egister [L]ogin [Q]uit',
  validator: /r$|l$|q$/i,
  warning: 'Not a valid option',
  empty: false,
  before: function (option) { return option.toLowerCase() }
}

module.exports = mainPrompt
