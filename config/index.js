'use scrict'

const colors = require('colors/safe')
const fs = require('fs')
const NodeRSA = require('node-rsa')
const path = require('path')

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

const server = {
  port: '1918',
  timeout: 10 * 1000
}

const enc = {
  string: 'hex',
  pubkey: 'pkcs8-public-der',
  privkey: 'pkcs1-der'
}

const file = {
  db: path.resolve('./db.json'),
  pubKeyFile: path.resolve('./pub.der'),
  privKeyFile: path.resolve('./priv.der')
}

const key = checkKeys(file.pubKeyFile, file.privKeyFile)
function checkKeys (pubKeyFile, privKeyFile) {
  const key = new NodeRSA({ b: 512 })
  if (fs.existsSync(pubKeyFile) && fs.existsSync(privKeyFile)) {
    const pubk = fs.readFileSync(pubKeyFile)
    const privk = fs.readFileSync(privKeyFile)
    key.importKey(pubk, enc.pubkey)
    key.importKey(privk, enc.privkey)
  } else {
    key.generateKeyPair()
    const publicDer = key.exportKey(enc.pubkey)
    const privateDer = key.exportKey(enc.privkey)
    fs.writeFileSync(pubKeyFile, publicDer)
    fs.writeFileSync(privKeyFile, privateDer)
  }
  return key
}

const dbjson = checkDatabase(file.db)
function checkDatabase (file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({}, null, 4))
  }
  const database = require(file)
  return database
}

module.exports = {
  file,
  key,
  server,
  dbjson,
  prompt,
  len,
  enc
}
