const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import database (auto-connect)
const db = require('./config/database');

// Import middlewares
const errorHandler = require('./middlewares/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const articleRoutes = require('./routes/articleRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const userRoutes = require('./routes/userRoutes');

// Create Express app
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Wiki Helper API',
      version: '1.0.0',
      database: 'connected',
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    message: 'Wiki Helper API',
    description: 'Backend untuk sistem Wiki Perusahaan - Troubleshooting & Panduan',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        logout: 'POST /api/auth/logout'
      },
      articles: {
        getAll: 'GET /api/articles',
        getSingle: 'GET /api/articles/:slug',
        create: 'POST /api/articles',
        update: 'PUT /api/articles/:id',
        delete: 'DELETE /api/articles/:id',
        rate: 'POST /api/articles/:id/rate',
        search: 'GET /api/articles/search?q=keyword',
        popular: 'GET /api/articles/popular',
        recent: 'GET /api/articles/recent'
      },
      categories: {
        getAll: 'GET /api/categories',
        getSingle: 'GET /api/categories/:slug',
        create: 'POST /api/categories',
        update: 'PUT /api/categories/:id',
        delete: 'DELETE /api/categories/:id'
      },
      users: {
        getAll: 'GET /api/users',
        getSingle: 'GET /api/users/:id',
        update: 'PUT /api/users/:id',
        delete: 'DELETE /api/users/:id',
        search: 'GET /api/users/search?q=keyword'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.redirect('/api');
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan.',
    path: req.originalUrl
  });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(' Wiki Helper Backend');
  console.log('='.repeat(50));
  console.log(` Server  : http://localhost:${PORT}`);
  console.log(` API Docs: http://localhost:${PORT}/api`);
  console.log(` Health  : http://localhost:${PORT}/health`);
  console.log(`  Database: ${process.env.DB_NAME || 'wiki_helper'}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
  
  // Show default credentials
  if (process.env.NODE_ENV === 'development') {
    console.log('\n Default Admin Credentials:');
    console.log('   Email: admin@helper.com');
    console.log('   Password: admin123');
    console.log('\n Note: Change password after first login!');
    console.log('='.repeat(50));
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing server...');
  await db.close();
  process.exit(0);
});

module.exports = app;