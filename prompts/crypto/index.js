'use strict'

const cryptoPrompt = {
  name: 'option',
  message: '[A]dd [R]emove [L]ogout',
  validator: /a$|r$|l$/i,
  warning: 'Not a valid option',
  empty: false,
  before: function (option) { return option.toLowerCase() }
}

module.exports = cryptoPrompt
