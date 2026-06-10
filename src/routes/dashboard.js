const express = require('express')
const prisma = require('../config/database')
const { protect } = require('../middleware/auth')

const router = express.Router()

router.use(protect)

// KPI metrics
router.get('/kpis', async (req, res, next) => {
  try {
    const deals = await prisma.deal.findMany()
    const expenses = await prisma.expense.findMany()

    const totalOrders = deals.length
    const totalRevenue = deals.reduce((sum, d) => sum + d.paidAmount, 0)
    const totalDebt = deals.reduce((sum, d) => sum + Math.max(d.amount - d.paidAmount, 0), 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const netProfit = totalRevenue - totalExpenses

    res.json({ totalOrders, totalRevenue, totalDebt, totalExpenses, netProfit })
  } catch (error) {
    next(error)
  }
})

// Sales grouped by manager
router.get('/sales-by-manager', async (req, res, next) => {
  try {
    const deals = await prisma.deal.findMany({ include: { manager: true } })

    const totals = {}
    for (const deal of deals) {
      const name = deal.manager ? deal.manager.fullName : 'Belgilanmagan'
      totals[name] = (totals[name] || 0) + deal.amount
    }

    const result = Object.entries(totals).map(([manager, totalSales]) => ({ manager, totalSales }))
    res.json(result)
  } catch (error) {
    next(error)
  }
})

// Product popularity
router.get('/product-popularity', async (req, res, next) => {
  try {
    const deals = await prisma.deal.findMany()

    const counts = {}
    for (const deal of deals) {
      counts[deal.productName] = (counts[deal.productName] || 0) + 1
    }

    const result = Object.entries(counts).map(([product, count]) => ({ product, count }))
    res.json(result)
  } catch (error) {
    next(error)
  }
})

// Today's tasks
router.get('/today-tasks', async (req, res, next) => {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const where = {
      completed: false,
      dueDate: { gte: startOfDay, lte: endOfDay }
    }

    if (req.user.role !== 'admin') {
      where.assignedToId = req.userId
    }

    const tasks = await prisma.task.findMany({ where, orderBy: { dueDate: 'asc' } })

    res.json(tasks)
  } catch (error) {
    next(error)
  }
})

module.exports = router
