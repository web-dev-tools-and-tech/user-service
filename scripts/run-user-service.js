#!/usr/bin/env node
'use strict'

const webApp = require('../src/user-service-with-dal')
const userDalMaker = require('../src/user-dal')

async function main() {
  const userDal = await userDalMaker({redisAddress: process.env.REDIS_ADDRESS})
  const server = webApp({userDal}).listen(process.env.PORT || 3000, err => {
    if (err) {
      return console.error(err)
    }
    console.log(`Listening on port ${server.address().port}`)
  })
}

main()
