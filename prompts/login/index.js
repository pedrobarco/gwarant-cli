'use strict'

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

module.exports = loginPrompt
