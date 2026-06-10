const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const router = express.Router();

// ============================================
// POST /api/auth/register
// ============================================
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        role: 'manager' // Default role
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    // Set session
    req.session.userId = user.id;
    req.session.user = { id: user.id, email: user.email, fullName: user.fullName, role: user.role };

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
    });
  } catch (error) {
    console.error('[Auth Error]', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// ============================================
// POST /api/auth/login
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(403).json({ message: 'User account is inactive' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    // Set session
    req.session.userId = user.id;
    req.session.user = { id: user.id, email: user.email, fullName: user.fullName, role: user.role };

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
    });
  } catch (error) {
    console.error('[Auth Error]', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// ============================================
// POST /api/auth/logout
// ============================================
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// ============================================
// GET /api/auth/me
// ============================================
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  res.json({ user: req.session.user });
});

module.exports = router;
