const express = require('express')
const prisma = require('../config/database')
const { protect } = require('../middleware/auth')

const router = express.Router()
router.use(protect)

const managerSelect = { select: { id: true, fullName: true, email: true, role: true } }
const stageSelect = { select: { id: true, name: true, color: true, order: true } }

async function logActivity(dealId, userId, action, details) {
  try {
    await prisma.activityLog.create({ data: { action, details, dealId, userId } })
  } catch (e) { /* ignore */ }
}

// List deals
router.get('/', async (req, res, next) => {
  try {
    const { status, managerId, clientId, stageId, pipelineId, q } = req.query
    const where = {}
    if (status) where.status = status
    if (managerId) where.managerId = Number(managerId)
    if (clientId) where.clientId = Number(clientId)
    if (stageId) where.stageId = Number(stageId)

    // pipelineId filter: find stageIds belonging to that pipeline
    if (pipelineId) {
      try {
        const stageRows = await prisma.pipelineStage.findMany({
          where: { pipelineId: Number(pipelineId) },
          select: { id: true }
        })
        where.stageId = { in: stageRows.map(r => r.id) }
      } catch(e) { /* ignore, show all */ }
    }

    let deals = await prisma.deal.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, company: true, phone: true } },
        manager: managerSelect,
        stage: stageSelect
      },
      orderBy: { createdAt: 'desc' }
    })

    if (q) deals = deals.filter(d => d.productName?.toLowerCase().includes(q.toLowerCase()))
    res.json(deals)
  } catch (error) { next(error) }
})

// Get deal details
router.get('/:id', async (req, res, next) => {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        client: { select: { id: true, name: true, company: true, phone: true } },
        manager: managerSelect,
        stage: stageSelect,
        tasks: true,
        activities: {
          include: { user: managerSelect },
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    })
    if (!deal) return res.status(404).json({ message: 'Sdelka topilmadi' })
    if (!deal.activities) deal.activities = []
    res.json(deal)
  } catch (error) { next(error) }
})

// Create deal.
// Supports two input shapes:
//  1) classic — clientId pointing at an existing Client
//  2) "Быстрое добавление" quick-add — inline contact/company fields
//     (contactName, contactPhone, contactEmail, companyName, companyAddress).
//     When clientId is absent but any of those are provided, a new Client
//     row is auto-created first and the deal is linked to it.
router.post('/', async (req, res, next) => {
  try {
    const {
      productName, amount, paidAmount, status, notes, clientId, deadline, stageId, pipelineId,
      contactName, contactPhone, contactEmail, companyName, companyAddress
    } = req.body
    if (!productName) return res.status(400).json({ message: 'Mahsulot nomi majburiy' })

    let resolvedClientId = clientId ? Number(clientId) : null

    if (!resolvedClientId) {
      const hasQuickAddFields = [contactName, contactPhone, contactEmail, companyName, companyAddress]
        .some(v => v !== undefined && v !== null && String(v).trim() !== '')

      if (hasQuickAddFields) {
        const newClient = await prisma.client.create({
          data: {
            name: (contactName && contactName.trim()) || (companyName && companyName.trim()) || "Noma'lum mijoz",
            phone: contactPhone || null,
            email: contactEmail || null,
            company: companyName || null,
            companyAddress: companyAddress || null,
            ownerId: req.userId
          }
        })
        resolvedClientId = newClient.id
      }
    }

    const deal = await prisma.deal.create({
      data: {
        productName,
        amount: amount ? Number(amount) : 0,
        paidAmount: paidAmount ? Number(paidAmount) : 0,
        status: status || 'new',
        notes: notes || null,
        deadline: deadline ? new Date(deadline) : null,
        clientId: resolvedClientId,
        managerId: req.userId,
        stageId: stageId ? Number(stageId) : null,
        pipelineId: pipelineId ? Number(pipelineId) : null
      },
      include: {
        client: { select: { id: true, name: true, company: true } },
        manager: managerSelect,
        stage: stageSelect
      }
    })

    await logActivity(deal.id, req.userId, 'Sdelka yaratildi', `"${deal.productName}" sdelkasi yaratildi`)
    res.status(201).json(deal)
  } catch (error) { next(error) }
})

// Update deal
router.patch('/:id', async (req, res, next) => {
  try {
    const { productName, amount, paidAmount, status, notes, clientId, deadline, managerId, stageId } = req.body

    const existing = await prisma.deal.findUnique({ where: { id: Number(req.params.id) } })
    if (!existing) return res.status(404).json({ message: 'Sdelka topilmadi' })

    const data = {}
    if (productName !== undefined) data.productName = productName
    if (amount !== undefined) data.amount = Number(amount)
    if (paidAmount !== undefined) data.paidAmount = Number(paidAmount)
    if (status !== undefined) data.status = status
    if (notes !== undefined) data.notes = notes
    if (clientId !== undefined) data.clientId = clientId ? Number(clientId) : null
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null
    if (managerId !== undefined) data.managerId = managerId ? Number(managerId) : null
    if (stageId !== undefined) data.stageId = stageId ? Number(stageId) : null

    const deal = await prisma.deal.update({
      where: { id: Number(req.params.id) },
      data,
      include: {
        client: { select: { id: true, name: true, company: true } },
        manager: managerSelect,
        stage: stageSelect
      }
    })

    const statusLabels = { new: 'Yangi', negotiation: 'Muzokaralar', proposal: 'Taklif', won: 'Yutilgan', lost: "Yo'qotilgan" }
    if (status && status !== existing.status) {
      await logActivity(deal.id, req.userId, "Status o'zgartirildi",
        `${statusLabels[existing.status] || existing.status} → ${statusLabels[status] || status}`)
    } else if (Object.keys(data).length > 0) {
      await logActivity(deal.id, req.userId, 'Sdelka yangilandi', Object.keys(data).join(', ') + " o'zgartirildi")
    }

    res.json(deal)
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Sdelka topilmadi' })
    next(error)
  }
})

// Move deal to another stage (dedicated endpoint for Kanban drag-and-drop).
// Strict validation + atomic transaction: if the activity-log write fails,
// the stage change is rolled back automatically by Prisma's $transaction —
// the deal never ends up "half moved".
router.patch('/:id/stage', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Noto'g'ri sdelka ID" })
    }

    const { stageId } = req.body
    let newStageId = null
    if (stageId !== null && stageId !== undefined && stageId !== '') {
      newStageId = Number(stageId)
      if (!Number.isInteger(newStageId) || newStageId <= 0) {
        return res.status(400).json({ message: "Noto'g'ri bosqich ID" })
      }
    }

    const existing = await prisma.deal.findUnique({
      where: { id },
      include: { stage: stageSelect }
    })
    if (!existing) return res.status(404).json({ message: 'Sdelka topilmadi' })

    let newStage = null
    if (newStageId !== null) {
      newStage = await prisma.pipelineStage.findUnique({ where: { id: newStageId } })
      if (!newStage) return res.status(400).json({ message: 'Bosqich topilmadi' })
    }

    // No-op: already in the requested stage — return as-is, nothing to roll back.
    if (existing.stageId === newStageId) {
      const unchanged = await prisma.deal.findUnique({
        where: { id },
        include: {
          client: { select: { id: true, name: true, company: true } },
          manager: managerSelect,
          stage: stageSelect
        }
      })
      return res.json(unchanged)
    }

    const deal = await prisma.$transaction(async (tx) => {
      const updated = await tx.deal.update({
        where: { id },
        data: { stageId: newStageId },
        include: {
          client: { select: { id: true, name: true, company: true } },
          manager: managerSelect,
          stage: stageSelect
        }
      })
      await tx.activityLog.create({
        data: {
          action: "Bosqich o'zgartirildi",
          details: `${existing.stage?.name || 'Bosqichsiz'} → ${newStage?.name || 'Bosqichsiz'}`,
          dealId: id,
          userId: req.userId
        }
      })
      return updated
    })

    res.json(deal)
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Sdelka yoki bosqich topilmadi' })
    next(error)
  }
})

// Delete deal
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.task.deleteMany({ where: { dealId: Number(req.params.id) } })
    await prisma.activityLog.deleteMany({ where: { dealId: Number(req.params.id) } })
    await prisma.deal.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: "Sdelka o'chirildi" })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Sdelka topilmadi' })
    next(error)
  }
})

// Activity log
router.get('/:id/activity', async (req, res, next) => {
  try {
    const activities = await prisma.activityLog.findMany({
      where: { dealId: Number(req.params.id) },
      include: { user: managerSelect },
      orderBy: { createdAt: 'desc' }
    })
    res.json(activities)
  } catch (error) { next(error) }
})

router.post('/:id/activity', async (req, res, next) => {
  try {
    const { details } = req.body
    if (!details) return res.status(400).json({ message: 'Izoh mazmuni majburiy' })
    const activity = await prisma.activityLog.create({
      data: { action: "Izoh qo'shildi", details, dealId: Number(req.params.id), userId: req.userId },
      include: { user: managerSelect }
    })
    res.status(201).json(activity)
  } catch (error) { next(error) }
})

module.exports = router
