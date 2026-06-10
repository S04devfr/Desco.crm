const express = require('express')
const prisma = require('../config/database')
const { protect } = require('../middleware/auth')

const router = express.Router()

router.use(protect)

// List expenses
router.get('/', async (req, res, next) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: { createdBy: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { date: 'desc' }
    })
    res.json(expenses)
  } catch (error) {
    next(error)
  }
})

// Get expense details
router.get('/:id', async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: Number(req.params.id) },
      include: { createdBy: { select: { id: true, fullName: true, email: true, role: true } } }
    })
    if (!expense) {
      return res.status(404).json({ message: 'Xarajat topilmadi' })
    }
    res.json(expense)
  } catch (error) {
    next(error)
  }
})

// Create expense
router.post('/', async (req, res, next) => {
  try {
    const { description, amount, category, date } = req.body

    if (!description || amount === undefined) {
      return res.status(400).json({ message: 'Tavsif va summa majburiy' })
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount: Number(amount),
        category: category || 'other',
        date: date ? new Date(date) : new Date(),
        createdById: req.userId
      }
    })

    res.status(201).json(expense)
  } catch (error) {
    next(error)
  }
})

module.exports = router
