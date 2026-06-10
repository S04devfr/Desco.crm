const express = require('express')
const router = express.Router()

// misol uchun search route
router.get('/', (req, res) => {
  res.send('Search route ishladi')
})

module.exports = router