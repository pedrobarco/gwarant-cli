'use strict'

const fs = require('fs')
const figlet = require('figlet')
const colors = require('colors/safe')
const pjson = require('../package.json')

function checkDatabase (db) {
  if (!fs.existsSync(db)) {
    fs.writeFileSync(db, JSON.stringify({}, null, 4))
  }
  const dbjson = require(db)
  return dbjson
}

function headerFiglet () {
  const figletText = figlet.textSync(pjson.name, 'Speed')
  console.log(colors.red(figletText))
  console.log()
  console.log(`${colors.bgWhite.red(` ${pjson.name} `)}${colors.bgRed.white(` ${pjson.version} `)}`)
  console.log()
}

module.exports = {
  checkDatabase,
  headerFiglet
}
