const express = require('express');
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ============================================
// POST /api/deals - Create a new deal
// ============================================
router.post('/', protect, async (req, res) => {
  try {
    const { clientId, productName, contractAmount, downPayment } = req.body;

    if (!clientId || !productName || !contractAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const deal = await prisma.deal.create({
      data: {
        clientId: parseInt(clientId),
        productName,
        contractAmount: parseFloat(contractAmount),
        downPayment: parseFloat(downPayment) || 0,
        totalReceived: parseFloat(downPayment) || 0,
        remainingDebt: parseFloat(contractAmount) - (parseFloat(downPayment) || 0),
        managerId: req.userId,
        createdBy: req.userId
      }
    });

    res.status(201).json(deal);
  } catch (error) {
    console.error('[Deal Error]', error);
    res.status(500).json({ message: 'Failed to create deal' });
  }
});

// ============================================
// GET /api/deals - Get all deals (with filters)
// ============================================
router.get('/', protect, async (req, res) => {
  try {
    const { status, managerId, debtStatus } = req.query;

    const where = {};
    if (status) where.status = status;
    if (managerId) where.managerId = parseInt(managerId);
    if (debtStatus) where.debtStatus = debtStatus;

    const deals = await prisma.deal.findMany({
      where,
      include: { client: true, manager: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(deals);
  } catch (error) {
    console.error('[Deal Error]', error);
    res.status(500).json({ message: 'Failed to fetch deals' });
  }
});

// ============================================
// GET /api/deals/:id - Get deal details
// ============================================
router.get('/:id', protect, async (req, res) => {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { 
        client: true, 
        manager: true,
        expenses: true,
        payments: true
      }
    });

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    res.json(deal);
  } catch (error) {
    console.error('[Deal Error]', error);
    res.status(500).json({ message: 'Failed to fetch deal' });
  }
});

// ============================================
// PATCH /api/deals/:id - Update deal
// ============================================
router.patch('/:id', protect, async (req, res) => {
  try {
    const { status, totalReceived } = req.body;
    const dealId = parseInt(req.params.id);

    // Fetch current deal
    const currentDeal = await prisma.deal.findUnique({
      where: { id: dealId }
    });

    if (!currentDeal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const updateData = { updatedBy: req.userId };

    if (status) updateData.status = status;

    if (totalReceived !== undefined) {
      const newTotalReceived = parseFloat(totalReceived);
      const remainingDebt = currentDeal.contractAmount - newTotalReceived;
      
      updateData.totalReceived = newTotalReceived;
      updateData.remainingDebt = remainingDebt;
      updateData.debtStatus = remainingDebt <= 0 ? 'to\'langan' : 'aktiv';
    }

    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
      include: { client: true }
    });

    res.json(updatedDeal);
  } catch (error) {
    console.error('[Deal Error]', error);
    res.status(500).json({ message: 'Failed to update deal' });
  }
});

module.exports = router;
