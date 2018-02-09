'use strict'
const {promisify: p} = require('util')
const express = require('express')
const bodyParser = require('body-parser')
const redis = require('redis')
const bcrypt = require('bcryptjs')
const uuid = require('uuid')

module.exports = createApp

function createApp({redisAddress}) {
  let redisClientCache
  const redisClient = async () =>
    redisClientCache ||
    (redisClientCache = new Promise((resolve, reject) => {
      const client = new redis.createClient({url: `//${redisAddress}`})
        .on('error', reject)
        .on('ready', () => resolve(client))
    }))

  const app = express()
  app.set('etag', false)

  app.get('/', (req, res) => res.send('OK'))

  app.post(
    '/signup',
    bodyParser.json(),
    captureAsyncErrors(async (req, res) => {
      const {email, name, password} = req.body
      const id = uuid.v4()

      if (await getUserKey('authenticatoin', email)) {
        return res.status(400).send('user email alreadusy exists')
      }

      const salt = await bcrypt.genSalt(2)
      const passwordHash = await bcrypt.hash(password, salt)

      await Promise.all([setUserKey('profile', id, {email, name}), setUserKey('data', id, {})])
      await setUserKey('authentication', email, {id, passwordHash})

      res.json({id})
    }),
  )

  app.get(
    '/authenticate',
    captureAsyncErrors(async (req, res) => {
      const {email, password} = req.query

      const emailInfo = await getUserKey('authentication', email)
      if (!emailInfo) {
        return res.status(404).send('user email does not exist')
      }

      const {passwordHash, id} = emailInfo
      if (await bcrypt.compare(password, passwordHash)) {
        res.json({id})
      } else {
        res.status(401).send('')
      }
    }),
  )

  app.get(
    '/user/profile/:id',
    captureAsyncErrors(async (req, res) => {
      const {id} = req.params

      const data = await getUserKey('profile', id)

      return data ? res.json({id, ...data}) : res.status(404).send('user not found')
    }),
  )

  app.put(
    '/user/profile/:id',
    bodyParser.json(),
    captureAsyncErrors(async (req, res) => {
      const {id} = req.params
      const {name} = req.body

      const profile = await getUserKey('profile', id)
      if (!profile) {
        return res.status(404).send('user not found')
      }

      const merged = {...profile, name}

      await setUserKey('profile', id, merged)

      res.send('')
    }),
  )

  app.get(
    '/user/data/:id',
    captureAsyncErrors(async (req, res) => {
      const {id} = req.params

      const data = await getUserKey('data', id)

      return data ? res.json(data) : res.status(404).send('user not found')
    }),
  )

  app.put(
    '/user/data/:id',
    bodyParser.json(),
    captureAsyncErrors(async (req, res) => {
      const {id} = req.params

      const data = await getUserKey('data', id)
      if (!data) {
        return res.status(404).send('user not found')
      }

      await setUserKey('data', id, req.body)

      res.send('')
    }),
  )

  app.dispose = async () => {
    const client = await redisClient()

    await client.quit()
  }

  return app

  async function setUserKey(category, id, value) {
    const client = await redisClient()

    await p(client.set.bind(client))(`user:${category}:${id}`, JSON.stringify(value))
  }

  async function getUserKey(category, id) {
    const client = await redisClient()

    return JSON.parse(await p(client.get.bind(client))(`user:${category}:${id}`))
  }
}

const captureAsyncErrors = handler => (req, res, ...args) => {
  handler(req, res, ...args).catch(err => {
    console.error(`Exception in ${req.url}:\n`, err.stack)

    res.status(500).send(err.stack)
  })
}
