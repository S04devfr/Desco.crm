const express = require('express');
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ============================================
// POST /api/clients - Create new client
// ============================================
router.post('/', protect, async (req, res) => {
  try {
    const { name, phone, email, region, address } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    const client = await prisma.client.create({
      data: {
        name,
        phone,
        email,
        region,
        address,
        createdBy: req.userId
      }
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('[Client Error]', error);
    res.status(500).json({ message: 'Failed to create client' });
  }
});

// ============================================
// GET /api/clients - List all clients
// ============================================
router.get('/', protect, async (req, res) => {
  try {
    const { region } = req.query;

    const where = {};
    if (region) where.region = region;

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(clients);
  } catch (error) {
    console.error('[Client Error]', error);
    res.status(500).json({ message: 'Failed to fetch clients' });
  }
});

// ============================================
// GET /api/clients/:id - Get client details
// ============================================
router.get('/:id', protect, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { deals: true }
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('[Client Error]', error);
    res.status(500).json({ message: 'Failed to fetch client' });
  }
});

// ============================================
// PATCH /api/clients/:id - Update client
// ============================================
router.patch('/:id', protect, async (req, res) => {
  try {
    const { name, phone, email, region, address, notes } = req.body;

    const client = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(region && { region }),
        ...(address && { address }),
        ...(notes && { notes }),
        updatedBy: req.userId
      }
    });

    res.json(client);
  } catch (error) {
    console.error('[Client Error]', error);
    res.status(500).json({ message: 'Failed to update client' });
  }
});

module.exports = router;
