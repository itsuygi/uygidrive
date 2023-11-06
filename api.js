const express = require('express')
const router = express.Router()

router.use((req, res, next) => {
  next()
})

router.get('/', (req, res) => {
  res.send('Welcome to this very cool Songroom API homepage!')
})

router.get('/about', (req, res) => {
  res.send('About')
})

router.get('/playWithLoad', (req, res) => { // First sends a load message then the play message for extra sync.
  res.send('About')
})

module.exports = router