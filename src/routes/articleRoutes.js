const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ArticleController = require('../controllers/articleController');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Validation rules
const articleValidation = [
  body('judul').trim().notEmpty().withMessage('Judul wajib diisi.'),
  body('konten').notEmpty().withMessage('Konten wajib diisi.'),
  body('excerpt').optional().trim(),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('tipe').optional().isIn(['troubleshooting', 'panduan', 'referensi', 'faq']),
  body('prioritas').optional().isIn(['rendah', 'sedang', 'tinggi', 'kritis']),
  body('kategori').optional().isArray(),
  body('tags').optional().isArray(),
  body('sistemTerkait').optional().isArray(),
  body('langkahPenyelesaian').optional().isArray()
];

const ratingValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating harus antara 1-5.')
];

// Public routes (no authentication required)
router.get('/', ArticleController.getArticles);
router.get('/popular', ArticleController.getPopularArticles);
router.get('/recent', ArticleController.getRecentArticles);
router.get('/search', ArticleController.searchArticles);
router.get('/stats', ArticleController.getStats);
router.get('/:slug', ArticleController.getArticle);

// Protected routes
router.use(authenticate);

// User routes
router.post('/:id/rate', ratingValidation, ArticleController.rateArticle);

// Admin/Author routes
router.post('/', authorize('admin', 'teknisi'), articleValidation, ArticleController.createArticle);
router.put('/:id', authorize('admin', 'teknisi'), articleValidation, ArticleController.updateArticle);
router.delete('/:id', authorize('admin', 'teknisi'), ArticleController.deleteArticle);

// Upload routes
router.post('/:id/upload', authorize('admin', 'teknisi'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File tidak ditemukan.'
      });
    }

    // Save file info to database
    const db = require('../config/database');
    const sql = `
      INSERT INTO attachments (article_id, nama, url, tipe, size)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await db.query(sql, [
      req.params.id,
      req.file.originalname,
      `/uploads/${req.file.filename}`,
      req.file.mimetype,
      req.file.size
    ]);

    res.json({
      success: true,
      message: 'File berhasil diupload.',
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupload file.'
    });
  }
});

module.exports = router;