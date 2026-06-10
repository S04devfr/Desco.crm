const express = require('express');
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ============================================
// GET /api/search - Global search
// Query params: q (search term), type (clients/deals/orders)
// ============================================
router.get('/', protect, async (req, res) => {
  try {
    const { q, type } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search term must be at least 2 characters' });
    }

    const searchTerm = `%${q}%`;
    const results = { clients: [], deals: [], orders: [] };

    // Search clients by name or phone
    if (!type || type === 'clients') {
      results.clients = await prisma.client.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } }
          ]
        },
        take: 10
      });
    }

    // Search deals by product name or order ID
    if (!type || type === 'deals') {
      results.deals = await prisma.deal.findMany({
        where: {
          OR: [
            { productName: { contains: q, mode: 'insensitive' } },
            { id: isNaN(q) ? undefined : parseInt(q) }
          ]
        },
        include: { client: true },
        take: 10
      });
    }

    res.json(results);
  } catch (error) {
    console.error('[Search Error]', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

module.exports = router;
