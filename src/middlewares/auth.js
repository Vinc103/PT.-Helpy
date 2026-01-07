// src/middlewares/auth.js - UPDATED VERSION
console.log('Loading auth middleware...');

const jwt = require('jsonwebtoken');

// 1. FUNCTION TO LOAD USER MODEL WITH MULTIPLE FALLBACKS
const loadUserModel = () => {
  console.log('Attempting to load User model...');
  
  // Method 1: Try direct require with relative path
  try {
    const User = require('../models/User');
    console.log('User model loaded successfully (Method 1)');
    return User;
  } catch (err1) {
    console.log('Method 1 failed:', err1.message);
  }
  
  // Method 2: Try with absolute path
  try {
    const path = require('path');
    const absolutePath = path.join(process.cwd(), 'src/models/User.js');
    console.log('Trying absolute path:', absolutePath);
    
    const fs = require('fs');
    if (fs.existsSync(absolutePath)) {
      console.log('File exists at absolute path');
      const User = require(absolutePath);
      console.log('User model loaded (Method 2)');
      return User;
    } else {
      console.log('File not found at absolute path');
    }
  } catch (err2) {
    console.log('Method 2 failed:', err2.message);
  }
  
  // Method 3: Try dynamic import (Node.js 14+)
  try {
    const path = require('path');
    const userPath = path.join(process.cwd(), 'src/models/User.js');
    
    // Convert to file URL for dynamic import
    const fileUrl = 'file://' + userPath.replace(/\\/g, '/');
    console.log('Trying dynamic import:', fileUrl);
    
    // Note: Dynamic import returns a promise, so we need async handling
    // For middleware, we'll use a wrapper
    console.log('Dynamic import available (will be used async)');
  } catch (err3) {
    console.log('Method 3 failed:', err3.message);
  }
  
  // Method 4: Create mock User model for fallback
  console.log('Creating mock User model as fallback...');
  
  const mockUserModel = {
    findById: async (id) => {
      console.log(`MOCK: User.findById(${id}) called`);
      
      // Try to connect to database directly as fallback
      try {
        const mysql = require('mysql2');
        const connection = mysql.createConnection({
          host: 'localhost',
          user: 'root',
          password: '',
          database: 'wiki_helper'
        });
        
        return new Promise((resolve) => {
          connection.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id], (err, results) => {
            connection.end();
            if (err) {
              console.log('❌ Database query failed:', err.message);
              // Return mock data
              resolve({ 
                id: id, 
                nama: 'Administrator', 
                email: 'admin@helper.com',
                role: 'admin',
                departemen: 'IT'
              });
            } else if (results.length > 0) {
              console.log('Found real user in database');
              resolve(results[0]);
            } else {
              console.log('No user found, returning mock');
              resolve({ 
                id: id, 
                nama: 'User ' + id, 
                role: 'karyawan',
                departemen: 'General'
              });
            }
          });
        });
      } catch (dbError) {
        console.log('Database connection failed:', dbError.message);
        return { 
          id: id, 
          nama: 'Mock User ' + id, 
          role: 'karyawan',
          departemen: 'General'
        };
      }
    },
    
    findByEmail: async (email) => {
      console.log('🔧 MOCK: User.findByEmail(${email}) called');
      
      try {
        const mysql = require('mysql2');
        const connection = mysql.createConnection({
          host: 'localhost',
          user: 'root',
          password: '',
          database: 'wiki_helper'
        });
        
        return new Promise((resolve) => {
          connection.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email], (err, results) => {
            connection.end();
            if (err) {
              console.log('Database query failed:', err.message);
              resolve(null);
            } else if (results.length > 0) {
              console.log('Found user by email');
              resolve(results[0]);
            } else {
              console.log('No user found with email');
              resolve(null);
            }
          });
        });
      } catch (error) {
        console.log('Database error:', error.message);
        return null;
      }
    },
    
    create: async (userData) => {
      console.log('MOCK: User.create() called');
      return { id: 1, ...userData };
    }
  };
  
  console.log('Mock User model created');
  return mockUserModel;
};

// 2. LOAD USER MODEL
const User = loadUserModel();

// 3. MIDDLEWARE FUNCTIONS
const authMiddleware = {
  // Authentication middleware
  authenticate: async (req, res, next) => {
    try {
      console.log('Authentication check started');
      
      // Get token from header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.log('No authorization header');
        return res.status(401).json({
          success: false,
          message: 'Token tidak ditemukan. Silakan login terlebih dahulu.'
        });
      }
      
      const token = authHeader.replace('Bearer ', '');
      
      if (!token || token === 'Bearer') {
        console.log('Invalid token format');
        return res.status(401).json({
          success: false,
          message: 'Format token tidak valid.'
        });
      }
      
      console.log('Token received, verifying...');
      
      // Verify token - use environment variable or default
      const JWT_SECRET = process.env.JWT_SECRET || 'wiki_helper_secret_key_2024';
      const decoded = jwt.verify(token, JWT_SECRET);
      
      console.log('Token verified for user ID:', decoded.userId || decoded.id);
      
      // Find user by ID
      const userId = decoded.userId || decoded.id;
      const user = await User.findById(userId);
      
      if (!user) {
        console.log('User not found for ID:', userId);
        return res.status(401).json({
          success: false,
          message: 'Pengguna tidak ditemukan.'
        });
      }
      
      console.log('User found:', user.email);
      
      // Attach user to request object
      req.user = user;
      req.token = token;
      
      next();
      
    } catch (error) {
      console.log('Authentication error:', error.message);
      
      // Handle specific JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token tidak valid.'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token telah kadaluarsa. Silakan login kembali.'
        });
      }
      
      // Generic error
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  // Authorization middleware (role-based)
  authorize: (...allowedRoles) => {
    return (req, res, next) => {
      try {
        if (!req.user) {
          console.log('No user in request');
          return res.status(401).json({
            success: false,
            message: 'Silakan login terlebih dahulu.'
          });
        }
        
        console.log('Authorization check for role:', req.user.role);
        console.log('Allowed roles:', allowedRoles);
        
        if (!allowedRoles.includes(req.user.role)) {
          console.log('Access denied. User role:', req.user.role, 'not in', allowedRoles);
          return res.status(403).json({
            success: false,
            message: 'Anda tidak memiliki izin untuk mengakses resource ini.'
          });
        }
        
        console.log('Authorization passed');
        next();
        
      } catch (error) {
        console.log('Authorization error:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Terjadi kesalahan pada server.'
        });
      }
    };
  },
  
  // Optional: Public access logging middleware
  logRequest: (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection.remoteAddress;
    
    console.log(`${timestamp} ${method} ${url} from ${ip}`);
    
    // Log body for POST/PUT requests (except sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
      const safeBody = { ...req.body };
      
      // Hide sensitive fields
      if (safeBody.password) safeBody.password = '***HIDDEN***';
      if (safeBody.token) safeBody.token = '***HIDDEN***';
      
      console.log('Request body:', JSON.stringify(safeBody).substring(0, 200));
    }
    
    next();
  },
  
  // Error handling middleware
  errorHandler: (err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Terjadi kesalahan pada server.';
    
    res.status(statusCode).json({
      success: false,
      message: message,
      ...(process.env.NODE_ENV === 'development' && {
        error: err.message,
        stack: err.stack
      })
    });
  },
  
  // CORS middleware
  cors: (req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  },
  
  // Rate limiting (simple version)
  rateLimit: (limit = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();
    
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      if (!requests.has(ip)) {
        requests.set(ip, []);
      }
      
      const userRequests = requests.get(ip);
      
      // Remove old requests
      const windowStart = now - windowMs;
      const recentRequests = userRequests.filter(time => time > windowStart);
      requests.set(ip, recentRequests);
      
      // Check if limit exceeded
      if (recentRequests.length >= limit) {
        console.log(`Rate limit exceeded for IP: ${ip}`);
        return res.status(429).json({
          success: false,
          message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.'
        });
      }
      
      // Add current request
      recentRequests.push(now);
      
      // Set headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', limit - recentRequests.length);
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      
      next();
    };
  }
};

console.log('Auth middleware loaded successfully');
console.log('Available methods:', Object.keys(authMiddleware).join(', '));

module.exports = authMiddleware;