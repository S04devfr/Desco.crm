const express = require('express');
const prisma = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ============================================
// POST /api/tasks - Create task
// ============================================
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, dueDate, dueTime, assignedTo } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: 'Title and due date are required' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        dueTime,
        assignedTo: parseInt(assignedTo || req.userId)
      }
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('[Task Error]', error);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// ============================================
// GET /api/tasks - List tasks
// ============================================
router.get('/', protect, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assignedTo: req.userId },
      orderBy: [{ dueDate: 'asc' }, { dueTime: 'asc' }]
    });

    res.json(tasks);
  } catch (error) {
    console.error('[Task Error]', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// ============================================
// PATCH /api/tasks/:id/complete - Complete task
// ============================================
router.patch('/:id/complete', protect, async (req, res) => {
  try {
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: {
        completed: true,
        completedAt: new Date()
      }
    });

    res.json(task);
  } catch (error) {
    console.error('[Task Error]', error);
    res.status(500).json({ message: 'Failed to complete task' });
  }
});

module.module = router;
