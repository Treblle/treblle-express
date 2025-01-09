require('dotenv').config()
const express = require('express')

// Dont forget to install body-parser with -- npm i body-parser
const bodyParser = require('body-parser')
const app = express()
const PORT = 4000
const treblle = require('..')

app.use(bodyParser.json())

// Don't forget to set your Treblle API Key and Project ID in .env file
// TREBLLE_API_KEY=your-api-key
// TREBLLE_PROJECT_ID=your-project-id

console.log('TREBLLE_API_KEY:', process.env.TREBLLE_API_KEY)
console.log('TREBLLE_PROJECT_ID:', process.env.TREBLLE_PROJECT_ID)

app.use(
  treblle({
    additionalFieldsToMask: ['code_mobile'],
    blocklistPaths: [],
  })
)

// Library code will always pick up the environment variables from the .env file
// only define the options you want to override

// app.use(
//   treblle({
//     apiKey: process.env.TREBLLE_API_KEY_INTERNAL,
//     projectId: process.env.TREBLLE_PROJECT_ID_INTERNAL,
//     additionalFieldsToMask: ['code_mobile'],
//     blocklistPaths: ['test'],
//   })
// )

app.get('/', (req, res) => {
  res.status(200).send({ message: 'Hello World!' })
})

app.get('/test/message', (req, res) => {
  res.status(403).send({ message: 'Hello Test!' })
})

app.get('/healthcheck', (req, res) => {
  res.sendStatus(204)
})

app.post('/test', (req, res) => {
  const inputData = req.body

  // Process your inputData here
  console.log('Received data:', inputData)

  // Send a response
  res.status(200).json({ message: 'Data received successfully' })
})

app.post('/timeout', (req, res) => {
  const inputData = req.body

  // Process your inputData here
  console.log('Received data:', inputData)

  setTimeout(() => {
    // Send a response
    res.status(200).json({ message: 'Data received successfully 4 seconds' })
  }, 4000)
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
