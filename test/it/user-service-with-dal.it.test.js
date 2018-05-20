'use strict'
const {describe, it, before, after} = require('mocha')
const {expect} = require('chai')
const fetch = require('node-fetch')
const {
  signupUser,
  authenticateUser,
  putUserData,
  putUserProfile,
  getUserData,
  getUserProfile,
} = require('../common/common')

const app = require('../../src/user-service-with-dal')

describe('user-service (with dal) it', function() {
  const {baseUrl} = setupApp(app)

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

function setupApp(app) {
  let server
  let appInstance

  before(async () => {
    const userDalDb = new Map()
    const userDal = {
      getUserKey(category, id) {
        return userDalDb.get(`${category}-${id}`)
      },
      setUserKey(category, id, value) {
        return userDalDb.set(`${category}-${id}`, value)
      },
    }

    await new Promise((resolve, reject) => {
      appInstance = app({userDal})
      server = appInstance.listen(err => (err ? reject(err) : resolve()))
    })
  })
  after(done => {
    server.close(done)
  })

  return {
    baseUrl: () => `http://localhost:${server.address().port}`,
    address: () => `localhost:${server.address().port}`,
  }
}
