const express = require('express')
const prisma = require('../config/database')
const { protect } = require('../middleware/auth')

const router = express.Router()

router.use(protect)

// List clients
router.get('/', async (req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      include: { owner: { select: { id: true, fullName: true, email: true, role: true } }, deals: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(clients)
  } catch (error) {
    next(error)
  }
})

// Get client details
router.get('/:id', async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: Number(req.params.id) },
      include: { owner: { select: { id: true, fullName: true, email: true, role: true } }, deals: true }
    })
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' })
    }
    res.json(client)
  } catch (error) {
    next(error)
  }
})

// Create client
router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email, company, notes } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Ism majburiy' })
    }

    const client = await prisma.client.create({
      data: { name, phone, email, company, notes, ownerId: req.userId }
    })

    res.status(201).json(client)
  } catch (error) {
    next(error)
  }
})

// Update client
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, phone, email, company, notes } = req.body

    const client = await prisma.client.update({
      where: { id: Number(req.params.id) },
      data: { name, phone, email, company, notes }
    })

    res.json(client)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Mijoz topilmadi' })
    }
    next(error)
  }
})

module.exports = router
