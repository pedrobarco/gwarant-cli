'use scrict'

const colors = require('colors/safe')
const fs = require('fs')
const path = require('path')

const db = path.resolve('./db.json')
const dbjson = checkDatabase(db)

function checkDatabase (file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({}, null, 4))
  }
  const database = require(file)
  return database
}

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
