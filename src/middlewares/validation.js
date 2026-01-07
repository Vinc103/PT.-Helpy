// src/middlewares/validation.js - NEW VALIDATION MIDDLEWARE
console.log('Loading validation middleware...');

const { body, param, query, validationResult } = require('express-validator');

const validationMiddleware = {
  // Common validation rules
  rules: {
    // User validation
    registerUser: [
      body('nama').trim().notEmpty().withMessage('Nama wajib diisi'),
      body('email').isEmail().withMessage('Email tidak valid'),
      body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
      body('role').optional().isIn(['admin', 'teknisi', 'karyawan']).withMessage('Role tidak valid'),
      body('departemen').optional().trim()
    ],
    
    loginUser: [
      body('email').isEmail().withMessage('Email tidak valid'),
      body('password').notEmpty().withMessage('Password wajib diisi')
    ],
    
    // Article validation
    createArticle: [
      body('judul').trim().notEmpty().withMessage('Judul artikel wajib diisi'),
      body('konten').notEmpty().withMessage('Konten artikel wajib diisi'),
      body('excerpt').optional().trim(),
      body('tipe').optional().isIn(['troubleshooting', 'panduan', 'referensi', 'faq']),
      body('prioritas').optional().isIn(['rendah', 'sedang', 'tinggi', 'kritis']),
      body('status').optional().isIn(['draft', 'published', 'archived']),
      body('kategori').optional().isArray(),
      body('tags').optional().isArray(),
      body('sistemTerkait').optional().isArray()
    ],
    
    // Category validation
    createCategory: [
      body('nama').trim().notEmpty().withMessage('Nama kategori wajib diisi'),
      body('deskripsi').optional().trim(),
      body('icon').optional().trim(),
      body('warna').optional().trim(),
      body('parent_id').optional().isInt()
    ],
    
    // ID validation
    validateId: [
      param('id').isInt().withMessage('ID harus berupa angka')
    ],
    
    // Pagination validation
    validatePagination: [
      query('page').optional().isInt({ min: 1 }).withMessage('Halaman harus angka positif'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit harus antara 1-100')
    ],
    
    // Search validation
    validateSearch: [
      query('q').trim().notEmpty().withMessage('Keyword pencarian wajib diisi')
    ]
  },
  
  // Validation result handler
  handleValidation: (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    
    next();
  },
  
  // Sanitize input
  sanitize: (req, res, next) => {
    // Sanitize string fields
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    };
    
    // Sanitize request body
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = sanitizeString(req.body[key]);
        }
      });
    }
    
    // Sanitize query params
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitizeString(req.query[key]);
        }
      });
    }
    
    next();
  },
  
  // Validate file upload
  validateFile: (allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']) => {
    return (req, res, next) => {
      if (!req.file) {
        return next();
      }
      
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Tipe file tidak diizinkan. Hanya: ${allowedTypes.join(', ')}`
        });
      }
      
      next();
    };
  }
};

console.log('Validation middleware loaded');
console.log('Available validation sets:', Object.keys(validationMiddleware.rules).join(', '));

module.exports = validationMiddleware;