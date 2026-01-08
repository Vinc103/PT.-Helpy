const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const AuthController = require('../controllers/authController');
const { authenticate, authorize } = require('../middlewares/auth');

// Validation rules
const registerValidation = [
  body('nama').trim().notEmpty().withMessage('Nama wajib diisi.'),
  body('email').isEmail().withMessage('Email tidak valid.'),
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
  body('departemen').optional().trim(),
  body('role').optional().isIn(['admin', 'teknisi', 'karyawan']).withMessage('Role tidak valid.')
];

const loginValidation = [
  body('email').isEmail().withMessage('Email tidak valid.'),
  body('password').notEmpty().withMessage('Password wajib diisi.')
];

const updateProfileValidation = [
  body('nama').optional().trim(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
  body('departemen').optional().trim(),
  body('avatar').optional().trim()
];

// Public Routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);

// Protected Routes (require authentication)
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, updateProfileValidation, AuthController.updateProfile);
router.post('/logout', authenticate, AuthController.logout);
router.post('/refresh-token', authenticate, AuthController.refreshToken);
router.get('/check-admin', authenticate, AuthController.checkAdmin);

// Admin only routes
router.get('/admin/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.getAll();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.'
    });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;