const express = require('express')
const router = express.Router()

router.use((req, res, next) => {
  next()
})

router.get('/', (req, res) => {
  res.send('Welcome to this very cool Songroom API homepage!')
})

router.get('/about', (req, res) => {
  res.send('About birds')
})



module.exports = router