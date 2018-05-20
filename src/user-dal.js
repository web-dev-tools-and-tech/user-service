'use strict'
const {promisify: p} = require('util')
const redis = require('redis')

module.exports = async ({redisAddress}) => {
  const redisClient = await new Promise((resolve, reject) => {
    const client = new redis.createClient({url: `//${redisAddress}`})
      .on('error', reject)
      .on('ready', () => resolve(client))
  })

  async function setUserKey(category, id, value) {
    const client = await redisClient()

    await p(client.set.bind(client))(`user:${category}:${id}`, JSON.stringify(value))
  }

  async function getUserKey(category, id) {
    const client = await redisClient()

    return JSON.parse(await p(client.get.bind(client))(`user:${category}:${id}`))
  }

  return {setUserKey, getUserKey}
}
