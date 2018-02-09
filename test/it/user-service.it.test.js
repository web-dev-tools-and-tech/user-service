'use strict'
const path = require('path')
const {describe, it, before, after} = require('mocha')
const {expect} = require('chai')
const redis = require('redis')
const fetch = require('node-fetch')
const {dockerComposeTool, getAddressForService} = require('docker-compose-mocha')
const {
  signupUser,
  authenticateUser,
  putUserData,
  putUserProfile,
  getUserData,
  getUserProfile,
} = require('../common/common')

const app = require('../..')

describe('user-service it', function() {
  this.retries(global.v8debug || /--inspect/.test(process.execArgv.join(' ')) ? 0 : 3)

  const composePath = path.join(__dirname, 'docker-compose.yml')
  const envName = dockerComposeTool(before, after, composePath, {
    shouldPullImages: !!process.env.NODE_ENV && process.env.NODE_ENV !== 'development',
    brutallyKill: true,
    healthCheck: {
      state: true,
      options: {
        custom: {
          redis: url =>
            new Promise((resolve, reject) => {
              const client = new redis.createClient({url: `//${url}`})
                .on('error', err => {
                  client.end(false)
                  reject(err)
                })
                .on('ready', () => {
                  client.end(false)
                  resolve(true)
                })
            }),
        },
      },
    },
  })

  const {baseUrl} = setupApp(app, envName, composePath)

  let userId
  before(
    async () =>
      ({id: userId} = await signupUser(
        baseUrl(),
        'good name',
        'email@example.com',
        'great-password',
      )),
  )

  it('should return OK on /', async () => {
    const response = await fetch(`${baseUrl()}/`)

    expect(response.status).to.equal(200)
    expect(await response.text()).to.equal('OK')
  })

  describe('signup and authentication', function() {
    it('should authenticate signed up user', async () => {
      const authenticated = await authenticateUser(baseUrl(), 'email@example.com', 'great-password')

      expect(authenticated).to.eql({id: userId})
    })

    it('should not authenticate unknown user', async () => {
      const random = ((Math.random() * 100000) | 0).toString()
      const authenticated = await authenticateUser(
        baseUrl(),
        `email-${random}@example.com`,
        'great-password',
      )

      expect(authenticated).to.be.undefined
    })

    it('should not authenticate user with different password', async () => {
      const authenticated = await authenticateUser(baseUrl(), `email@example.com`, 'wrong-password')

      expect(authenticated).to.be.undefined
    })
  })

  describe('data', function() {
    it('should return undefined for unknown user', async () => {
      expect(await getUserData(baseUrl(), userId + 'xxx')).to.be.undefined
    })
    it('should return data that was put for a user', async () => {
      const data = {foo: 'bar', lalala: true}

      expect(await putUserData(baseUrl(), userId, data)).to.equal(true)

      expect(await getUserData(baseUrl(), userId)).to.eql(data)
    })

    it('should not allow put for an unknown user', async () => {
      expect(await putUserData(baseUrl(), userId + 'ttt', {})).to.equal(false)
    })
  })

  describe('profile', function() {
    it('should return the name and email for a signed user', async () => {
      expect(await getUserProfile(baseUrl(), userId + 'xxx')).to.be.undefined
    })

    it('should return profile that was put for a user', async () => {
      const data = {name: 'newman'}

      expect(await putUserProfile(baseUrl(), userId, data)).to.equal(true)

      expect(await getUserProfile(baseUrl(), userId)).to.eql({
        ...data,
        id: userId,
        email: 'email@example.com',
      })
    })

    it('should not allow put for an unknown user', async () => {
      expect(await putUserProfile(baseUrl(), userId + 'ttt', {})).to.equal(false)
    })
  })
})

function setupApp(app, envName, composePath) {
  let server
  let appInstance

  before(async () => {
    const configuration = {
      redisAddress: await getAddressForService(envName, composePath, 'redis', 6379),
    }

    await new Promise((resolve, reject) => {
      appInstance = app(configuration)
      server = appInstance.listen(err => (err ? reject(err) : resolve()))
    })
  })
  after(done => {
    appInstance.dispose().then(() => server.close(done), () => server.close(done))
  })

  return {
    baseUrl: () => `http://localhost:${server.address().port}`,
    address: () => `localhost:${server.address().port}`,
  }
}
