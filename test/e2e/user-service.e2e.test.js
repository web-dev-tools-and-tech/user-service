'use strict'
const path = require('path')
const {describe, it, before, after} = require('mocha')
const {expect} = require('chai')
const {dockerComposeTool, getAddressForService} = require('docker-compose-mocha')
const {signupUser, authenticateUser} = require('../common/common')

describe('user-service e2e', function() {
  this.retries(global.v8debug || /--inspect/.test(process.execArgv.join(' ')) ? 0 : 3)

  const composePath = path.join(__dirname, 'docker-compose.yml')
  const envName = dockerComposeTool(before, after, composePath, {
    shouldPullImages: !!process.env.NODE_ENV && process.env.NODE_ENV !== 'development',
    brutallyKill: true,
    healthcheck: {
      state: true,
      options: {
        custom: {redis: () => true},
      },
    },
  })

  before(async () => {
    const appUrl = `http://${await getAddressForService(envName, composePath, 'app', 80)}`

    await signupUser(appUrl, 'good name', 'email@example.com', 'great-password')
  })

  it('should authenticate signed up user', async () => {
    const appUrl = `http://${await getAddressForService(envName, composePath, 'app', 80)}`

    const authenticated = await authenticateUser(appUrl, 'email@example.com', 'great-password')

    expect(authenticated).to.be.ok
  })
})
