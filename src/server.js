const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security middleware
// CSP and HSTS are disabled because the views rely on inline <script> tags
// and CDN-hosted assets (Tailwind, Font Awesome, Chart.js), and HSTS would
// force the browser to upgrade localhost to HTTPS on future visits.
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: false
}));
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// View engine setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'DESCO CRM is running' });
});

// Import route modules
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const dealRoutes = require('./routes/deals');
const clientRoutes = require('./routes/clients');
const expenseRoutes = require('./routes/expenses');
const taskRoutes = require('./routes/tasks');
const searchRoutes = require('./routes/search');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/search', searchRoutes);

// Serve views (for server-rendered pages)
app.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  res.render('dashboard/index', { user: req.session.user });
});

app.get('/deals', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  res.render('deals/index', { user: req.session.user });
});

app.get('/clients', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  res.render('clients/index', { user: req.session.user });
});

app.get('/expenses', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  res.render('expenses/index', { user: req.session.user });
});

app.get('/tasks', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  res.render('tasks/index', { user: req.session.user });
});

app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('auth/login');
});

app.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('auth/register');
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║    DESCO CRM - Server Started ✅       ║
  ║    Port: ${PORT}                           ║
  ║    Environment: ${process.env.NODE_ENV}              ║
  ╚════════════════════════════════════════╝
  `);
});

module.exports = app;
