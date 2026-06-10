const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.send('Clients list ishladi')
})

module.exports = router