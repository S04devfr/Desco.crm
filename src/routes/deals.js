const express = require('express')
const router = express.Router()

// misol uchun deals route
router.get('/', (req, res) => {
  res.send('Deals route ishladi')
})

module.exports = router