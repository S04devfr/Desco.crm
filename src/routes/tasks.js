const express = require('express')
const prisma = require('../config/database')
const { protect } = require('../middleware/auth')

const router = express.Router()

router.use(protect)

// List user's tasks
router.get('/', async (req, res, next) => {
  try {
    const where = req.user.role === 'admin' ? {} : { assignedToId: req.userId }

    const tasks = await prisma.task.findMany({
      where,
      include: { assignedTo: { select: { id: true, fullName: true, email: true, role: true } }, deal: true },
      orderBy: { dueDate: 'asc' }
    })

    res.json(tasks)
  } catch (error) {
    next(error)
  }
})

// Create task
router.post('/', async (req, res, next) => {
  try {
    const { title, description, dueDate, dueTime, dealId, assignedToId } = req.body

    if (!title) {
      return res.status(400).json({ message: 'Sarlavha majburiy' })
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        dueTime,
        dealId: dealId ? Number(dealId) : null,
        assignedToId: assignedToId ? Number(assignedToId) : req.userId
      }
    })

    res.status(201).json(task)
  } catch (error) {
    next(error)
  }
})

// Complete task
router.patch('/:id/complete', async (req, res, next) => {
  try {
    const task = await prisma.task.update({
      where: { id: Number(req.params.id) },
      data: { completed: true }
    })

    res.json(task)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Vazifa topilmadi' })
    }
    next(error)
  }
})

module.exports = router
