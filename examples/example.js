require('dotenv').config()
const express = require('express')
const app = express()
const PORT = 3000
const treblle = require('..')

app.use(treblle())

app.get('/', (req, res) => {
  res.send({ message: 'Hello World!' })
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
