require('dotenv').config()
const express = require('express')
const app = express()
const PORT = 3000

function TreblleExpress({
  apiKey = process.env.TREBLLE_API_KEY,
  projectId = process.env.TREBLLE_PROJECT_ID,
}) {
  return function TreblleExpress(req, res, next) {
    next()
    console.log(req.headers)
  }
}
app.get('/', (req, res) => {
  res.send({ message: 'Hello World!' })
})

app.use(TreblleExpress())

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
