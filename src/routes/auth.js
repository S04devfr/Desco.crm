const express = require('express')
const router = express.Router()

// Login route
router.post('/login', (req, res) => {
  res.send('Login route ishladi')
})

// Register route
router.post('/register', (req, res) => {
  res.send('Register route ishladi')
})

module.exports = router