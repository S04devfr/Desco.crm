const express = require('express')
const prisma = require('../config/database')
const { protect } = require('../middleware/auth')

const router = express.Router()

router.use(protect)

// List deals (with filters)
router.get('/', async (req, res, next) => {
  try {
    const { status, managerId, clientId } = req.query
    const where = {}

    if (status) where.status = status
    if (managerId) where.managerId = Number(managerId)
    if (clientId) where.clientId = Number(clientId)

    const deals = await prisma.deal.findMany({
      where,
      include: { client: true, manager: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    })

    res.json(deals)
  } catch (error) {
    next(error)
  }
})

// Get deal details
router.get('/:id', async (req, res, next) => {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: Number(req.params.id) },
      include: { client: true, manager: { select: { id: true, fullName: true, email: true, role: true } }, tasks: true }
    })
    if (!deal) {
      return res.status(404).json({ message: 'Sdelka topilmadi' })
    }
    res.json(deal)
  } catch (error) {
    next(error)
  }
})

// Create deal
router.post('/', async (req, res, next) => {
  try {
    const { productName, amount, paidAmount, status, notes, clientId } = req.body

    if (!productName) {
      return res.status(400).json({ message: 'Mahsulot nomi majburiy' })
    }

    const deal = await prisma.deal.create({
      data: {
        productName,
        amount: amount ? Number(amount) : 0,
        paidAmount: paidAmount ? Number(paidAmount) : 0,
        status: status || 'new',
        notes,
        clientId: clientId ? Number(clientId) : null,
        managerId: req.userId
      }
    })

    res.status(201).json(deal)
  } catch (error) {
    next(error)
  }
})

// Update deal
router.patch('/:id', async (req, res, next) => {
  try {
    const { productName, amount, paidAmount, status, notes, clientId } = req.body

    const data = {}
    if (productName !== undefined) data.productName = productName
    if (amount !== undefined) data.amount = Number(amount)
    if (paidAmount !== undefined) data.paidAmount = Number(paidAmount)
    if (status !== undefined) data.status = status
    if (notes !== undefined) data.notes = notes
    if (clientId !== undefined) data.clientId = clientId ? Number(clientId) : null

    const deal = await prisma.deal.update({
      where: { id: Number(req.params.id) },
      data
    })

    res.json(deal)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Sdelka topilmadi' })
    }
    next(error)
  }
})

module.exports = router
