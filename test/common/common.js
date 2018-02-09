const fetch = require('node-fetch')
const {expect} = require('chai')

async function signupUser(baseUrl, name, email, password) {
  const response = await fetch(`${baseUrl}/signup`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({email, name, password}),
  })

  expect(response.status).to.equal(200)

  return await response.json()
}

async function authenticateUser(baseUrl, email, password) {
  const response = await fetch(
    `${baseUrl}/authenticate?email=${encodeURI(email)}&password=${encodeURI(password)}`,
  )

  expect(response.status).to.be.oneOf([200, 401, 404])

  return response.status === 200 ? await response.json() : undefined
}

async function getUserData(baseUrl, id) {
  const response = await fetch(`${baseUrl}/user/data/${encodeURI(id)}`)

  expect(response.status).to.be.oneOf([200, 404])

  return response.status === 200 ? await response.json() : undefined
}

async function putUserData(baseUrl, id, data) {
  const response = await fetch(`${baseUrl}/user/data/${encodeURI(id)}`, {
    method: 'PUT',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(data),
  })

  expect(response.status).to.be.oneOf([200, 404])
  expect(await response.text()).to.equal(response.status === 200 ? '' : 'user not found')

  return response.status === 200
}

async function getUserProfile(baseUrl, id) {
  const response = await fetch(`${baseUrl}/user/profile/${encodeURI(id)}`)

  expect(response.status).to.be.oneOf([200, 404])

  return response.status === 200 ? await response.json() : undefined
}

async function putUserProfile(baseUrl, id, {name}) {
  const response = await fetch(`${baseUrl}/user/profile/${encodeURI(id)}`, {
    method: 'PUT',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({name}),
  })

  expect(response.status).to.be.oneOf([200, 404])
  expect(await response.text()).to.equal(response.status === 200 ? '' : 'user not found')

  return response.status === 200
}

module.exports = {
  signupUser,
  authenticateUser,
  getUserData,
  putUserData,
  getUserProfile,
  putUserProfile,
}
