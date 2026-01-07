const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

class AuthController {
  // Generate JWT token
  static generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }

  // Register
  static async register(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { nama, email, password, role, departemen } = req.body;

      // Check if email already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email sudah terdaftar.'
        });
      }

      // Create user
      const user = await User.create({
        nama,
        email,
        password,
        role: role || 'karyawan',
        departemen
      });

      // Generate token
      const token = AuthController.generateToken(user.id);

      // Update last login
      await User.updateLastLogin(user.id);

      res.status(201).json({
        success: true,
        message: 'Registrasi berhasil.',
        data: {
          user: {
            id: user.id,
            nama: user.nama,
            email: user.email,
            role: user.role,
            departemen: user.departemen,
            avatar: user.avatar
          },
          token
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server.'
      });
    }
  }

  // Login
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email atau password salah.'
        });
      }

      // Verify password
      const isPasswordValid = await User.comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email atau password salah.'
        });
      }

      // Generate token
      const token = AuthController.generateToken(user.id);

      // Update last login
      await User.updateLastLogin(user.id);

      // Remove password from response
      delete user.password;

      res.json({
        success: true,
        message: 'Login berhasil.',
        data: {
          user,
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server.'
      });
    }
  }

  // Get profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User tidak ditemukan.'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server.'
      });
    }
  }

  // Update profile
  static async updateProfile(req, res) {
    try {
      const updates = {};
      const allowedUpdates = ['nama', 'avatar', 'departemen', 'password'];
      
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      const user = await User.update(req.user.id, updates);

      res.json({
        success: true,
        message: 'Profil berhasil diperbarui.',
        data: user
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server.'
      });
    }
  }

  // Logout (client-side only)
  static logout(req, res) {
    res.json({
      success: true,
      message: 'Logout berhasil.'
    });
  }

  // Refresh token
  static refreshToken(req, res) {
    try {
      const token = AuthController.generateToken(req.user.id);
      
      res.json({
        success: true,
        data: { token }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server.'
      });
    }
  }
}

module.exports = AuthController;