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
const User = require('./models/User');

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
  contentSecurityPolicy: false, // Disable for simplicity
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5500',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Initialize default admin
app.get('/init-admin', async (req, res) => {
  try {
    await User.createDefaultAdmin();
    res.json({
      success: true,
      message: 'Admin initialization completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initialize admin',
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
        logout: 'POST /api/auth/logout',
        refresh: 'POST /api/auth/refresh-token',
        checkAdmin: 'GET /api/auth/check-admin'
      },
      admin: {
        init: 'GET /init-admin',
        health: 'GET /health'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <your_token_here>'
    },
    defaultCredentials: {
      email: 'admin@helper.com',
      password: 'admin123'
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
    path: req.originalUrl,
    available: ['/api', '/health', '/init-admin', '/api/auth/*']
  });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Create default admin on startup
    await User.createDefaultAdmin();
    
    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log('🚀 Wiki Helper Backend Server');
      console.log('='.repeat(50));
      console.log(`✅ Server  : http://localhost:${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api`);
      console.log(`❤️  Health  : http://localhost:${PORT}/health`);
      console.log(`🛠️  Init Admin: http://localhost:${PORT}/init-admin`);
      console.log('='.repeat(50));
      console.log(`📁 Database: ${process.env.DB_NAME || 'wiki_helper'}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Using default'}`);
      console.log('='.repeat(50));
      
      // Show login credentials
      console.log('\n🔐 Default Login Credentials:');
      console.log('   👤 Admin:');
      console.log('      Email: admin@helper.com');
      console.log('      Password: admin123');
      console.log('\n⚠️  Security Note:');
      console.log('   1. Change admin password after first login');
      console.log('   2. Set JWT_SECRET in .env for production');
      console.log('   3. Use HTTPS in production');
      console.log('='.repeat(50));
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received. Closing server...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received. Closing server...');
  process.exit(0);
});

module.exports = app;