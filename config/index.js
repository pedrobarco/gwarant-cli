'use scrict'

const colors = require('colors/safe')
const fs = require('fs')
const rsa = require('node-rsa')
const path = require('path')

const pubk = checkKeys('public', path.resolve('./public.key'))
const privk = checkKeys('private', path.resolve('./private.key'))
const db = path.resolve('./db.json')
const dbjson = checkDatabase(db)

const prompt = {
  colors: false,
  message: colors.bgWhite.red(' ? '),
  delimiter: ` ${colors.bgRed.white('::')} `,
  correct: colors.bgWhite.red(' √ '),
  wrong: colors.bgWhite.red(' X ')
}

const len = {
  pass: 32,
  salt: 32,
  key: 24,
  iv: 16
}

function checkKeys (type, file) {
  let key
  if (!fs.existsSync(file)) {
    key = rsa().generateKeyPair(512).exportKey('pkcs1-' + type + '-der')
    fs.writeFileSync(file, key)
  } else {
    key = fs.readFileSync(file)
  }
  return key
}

function checkDatabase (file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({}, null, 4))
  }
  const database = require(file)
  return database
}

module.exports = {
  db,
  dbjson,
  privk,
  prompt,
  pubk,
  len
}
