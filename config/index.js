'use scrict'

const path = require('path')
const colors = require('colors/safe')
const lib = require('../lib')

const db = path.resolve('./db.json')
const dbjson = lib.checkDatabase(db)

const prompt = {
  colors: false,
  message: colors.bgWhite.red(' ? '),
  delimiter: ` ${colors.bgRed.white('::')} `,
  correct: colors.bgWhite.red(' √ '),
  wrong: colors.bgWhite.red(' X ')
}

module.exports = {
  db,
  dbjson,
  prompt
}
