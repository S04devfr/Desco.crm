const express = require('express');
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ============================================
// GET /api/dashboard/kpis
// Returns: Total Orders, Revenue, Debt, Expenses, Net Profit
// ============================================
router.get('/kpis', protect, async (req, res) => {
  try {
    // Total Orders
    const totalOrders = await prisma.deal.count();

    // Total Revenue (from payments)
    const totalRevenueData = await prisma.payment.aggregate({
      _sum: { amount: true }
    });
    const totalRevenue = totalRevenueData._sum.amount || 0;

    // Total Outstanding Debt (Qarzdorlik)
    const totalDebtData = await prisma.deal.aggregate({
      _sum: { remainingDebt: true }
    });
    const totalDebt = totalDebtData._sum.remainingDebt || 0;

    // Total Expenses
    const totalExpensesData = await prisma.expense.aggregate({
      _sum: { totalExpense: true }
    });
    const totalExpenses = totalExpensesData._sum.totalExpense || 0;

    // Net Profit
    const netProfit = totalRevenue - totalExpenses;

    res.json({
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalDebt: parseFloat(totalDebt.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2))
    });
  } catch (error) {
    console.error('[Dashboard Error]', error);
    res.status(500).json({ message: 'Failed to fetch KPIs' });
  }
});

// ============================================
// GET /api/dashboard/sales-by-manager
// Returns: Sales data grouped by manager
// ============================================
router.get('/sales-by-manager', protect, async (req, res) => {
  try {
    const salesData = await prisma.deal.groupBy({
      by: ['managerId'],
      _sum: { contractAmount: true },
      _count: true
    });

    // Fetch manager details
    const result = await Promise.all(
      salesData.map(async (data) => {
        const manager = await prisma.user.findUnique({
          where: { id: data.managerId }
        });
        return {
          manager: manager.fullName,
          totalSales: data._sum.contractAmount || 0,
          dealCount: data._count
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error('[Dashboard Error]', error);
    res.status(500).json({ message: 'Failed to fetch sales data' });
  }
});

// ============================================
// GET /api/dashboard/product-popularity
// Returns: Popular products
// ============================================
router.get('/product-popularity', protect, async (req, res) => {
  try {
    const products = await prisma.deal.groupBy({
      by: ['productName'],
      _count: true,
      _sum: { contractAmount: true }
    });

    const result = products.map(p => ({
      product: p.productName,
      count: p._count,
      totalValue: p._sum.contractAmount || 0
    })).sort((a, b) => b.count - a.count);

    res.json(result);
  } catch (error) {
    console.error('[Dashboard Error]', error);
    res.status(500).json({ message: 'Failed to fetch product data' });
  }
});

// ============================================
// GET /api/dashboard/today-tasks
// Returns: Tasks due today for logged-in manager
// ============================================
router.get('/today-tasks', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await prisma.task.findMany({
      where: {
        assignedTo: req.userId,
        dueDate: {
          gte: today,
          lt: tomorrow
        },
        completed: false
      },
      orderBy: { dueTime: 'asc' }
    });

    res.json(tasks);
  } catch (error) {
    console.error('[Dashboard Error]', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

module.exports = router;
