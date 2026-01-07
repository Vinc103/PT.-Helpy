const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

// Validation rules
const registerValidation = [
  body('nama').trim().notEmpty().withMessage('Nama wajib diisi.'),
  body('email').isEmail().withMessage('Email tidak valid.'),
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
  body('departemen').optional().trim(),
  body('role').optional().isIn(['admin', 'teknisi', 'karyawan'])
];

const loginValidation = [
  body('email').isEmail().withMessage('Email tidak valid.'),
  body('password').notEmpty().withMessage('Password wajib diisi.')
];

// Routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.post('/logout', authenticate, AuthController.logout);
router.post('/refresh-token', authenticate, AuthController.refreshToken);
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, AuthController.updateProfile);

module.exports = router;