const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const CategoryController = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middlewares/auth');

// Validation rules
const categoryValidation = [
  body('nama').trim().notEmpty().withMessage('Nama kategori wajib diisi.'),
  body('deskripsi').optional().trim(),
  body('icon').optional().trim(),
  body('warna').optional().trim(),
  body('parent_id').optional().isInt(),
  body('is_active').optional().isBoolean()
];

// Public routes
router.get('/', CategoryController.getCategories);
router.get('/:slug', CategoryController.getCategory);

// Protected routes (admin only)
router.use(authenticate);
router.use(authorize('admin'));

router.post('/', categoryValidation, CategoryController.createCategory);
router.put('/:id', categoryValidation, CategoryController.updateCategory);
router.delete('/:id', CategoryController.deleteCategory);

module.exports = router;