const express = require('express')
const router = express.Router()

// misol uchun tasks route
router.get('/', (req, res) => {
  res.send('Tasks route ishladi')
})

module.exports = router