const express = require('express')
const router = express.Router()

// misol uchun dashboard route
router.get('/', (req, res) => {
  res.send('Dashboard route ishladi')
})

module.exports = router