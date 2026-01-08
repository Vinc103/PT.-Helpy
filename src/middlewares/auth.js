const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = {
  // Authentication middleware
  authenticate: async (req, res, next) => {
    try {
      console.log('🔐 Authentication check started');
      
      // Get token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ No valid authorization header');
        return res.status(401).json({
          success: false,
          message: 'Token tidak ditemukan. Silakan login terlebih dahulu.'
        });
      }
      
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({
          success: false,
          message: 'Format token tidak valid.'
        });
      }
      
      console.log('🔑 Token received, verifying...');
      
      // Verify token
      const JWT_SECRET = process.env.JWT_SECRET || 'wiki_helper_secret_key_2024';
      const decoded = jwt.verify(token, JWT_SECRET);
      
      console.log('✅ Token verified for user ID:', decoded.userId);
      
      // Find user by ID
      const userId = decoded.userId;
      const user = await User.findById(userId);
      
      if (!user) {
        console.log('❌ User not found for ID:', userId);
        return res.status(401).json({
          success: false,
          message: 'Pengguna tidak ditemukan.'
        });
      }
      
      console.log('✅ User found:', user.email, 'Role:', user.role);
      
      // Attach user to request object
      req.user = {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        departemen: user.departemen,
        avatar: user.avatar
      };
      req.token = token;
      
      next();
      
    } catch (error) {
      console.log('❌ Authentication error:', error.message);
      
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
          console.log('❌ No user in request');
          return res.status(401).json({
            success: false,
            message: 'Silakan login terlebih dahulu.'
          });
        }
        
        console.log(`🔑 Authorization check for role: ${req.user.role}`);
        console.log(`✅ Allowed roles: ${allowedRoles.join(', ')}`);
        
        if (!allowedRoles.includes(req.user.role)) {
          console.log(`⛔ Access denied. User role: ${req.user.role}`);
          return res.status(403).json({
            success: false,
            message: 'Anda tidak memiliki izin untuk mengakses resource ini.'
          });
        }
        
        console.log('✅ Authorization passed');
        next();
        
      } catch (error) {
        console.log('❌ Authorization error:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Terjadi kesalahan pada server.'
        });
      }
    };
  }
};

module.exports = authMiddleware;