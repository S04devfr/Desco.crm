const express = require('express')
const router = express.Router()

// misol uchun expenses route
router.get('/', (req, res) => {
  res.send('Expenses route ishladi')
})

module.exports = router