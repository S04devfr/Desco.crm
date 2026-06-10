const express = require('express');
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ============================================
// POST /api/expenses - Create expense
// ============================================
router.post('/', protect, async (req, res) => {
  try {
    const { dealId, driverName, deliveryCost, miscExpenses } = req.body;

    if (!dealId) {
      return res.status(400).json({ message: 'Deal ID is required' });
    }

    const deliveryCostNum = parseFloat(deliveryCost) || 0;
    const miscExpensesNum = parseFloat(miscExpenses) || 0;
    const totalExpense = deliveryCostNum + miscExpensesNum;

    const expense = await prisma.expense.create({
      data: {
        dealId: parseInt(dealId),
        driverName,
        deliveryCost: deliveryCostNum,
        miscExpenses: miscExpensesNum,
        totalExpense,
        userId: req.userId
      }
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('[Expense Error]', error);
    res.status(500).json({ message: 'Failed to create expense' });
  }
});

// ============================================
// GET /api/expenses - List expenses
// ============================================
router.get('/', protect, async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: { deal: true, user: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(expenses);
  } catch (error) {
    console.error('[Expense Error]', error);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// ============================================
// GET /api/expenses/:id - Get expense detail
// ============================================
router.get('/:id', protect, async (req, res) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { deal: true, user: true }
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    console.error('[Expense Error]', error);
    res.status(500).json({ message: 'Failed to fetch expense' });
  }
});

module.exports = router;
