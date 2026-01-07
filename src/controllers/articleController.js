const Article = require('../models/Article');
const Category = require('../models/Category');
const { validationResult } = require('express-validator');

class ArticleController {
  // Create article
  static async createArticle(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const article = await Article.create(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Artikel berhasil dibuat.',
        data: article
      });
    } catch (error) {
      console.error('Create article error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal membuat artikel.'
      });
    }
  }

  // Get all articles
  static async getArticles(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        search: req.query.search,
        kategori: req.query.kategori,
        tipe: req.query.tipe,
        prioritas: req.query.prioritas,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      // Include all statuses for admin
      if (req.user?.role === 'admin') {
        filters.includeAll = true;
        if (req.query.status) filters.status = req.query.status;
      }

      const result = await Article.findAll(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get articles error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil artikel.'
      });
    }
  }

  // Get single article
  static async getArticle(req, res) {
    try {
      const article = await Article.findBySlug(req.params.slug);

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Artikel tidak ditemukan.'
        });
      }

      // Only admin or author can view draft articles
      if (article.status === 'draft' && 
          req.user?.role !== 'admin' && 
          article.created_by !== req.user?.id) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki izin untuk melihat artikel ini.'
        });
      }

      res.json({
        success: true,
        data: article
      });
    } catch (error) {
      console.error('Get article error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil artikel.'
      });
    }
  }

  // Update article
  static async updateArticle(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      // Check if article exists
      const existingArticle = await Article.findById(req.params.id);
      if (!existingArticle) {
        return res.status(404).json({
          success: false,
          message: 'Artikel tidak ditemukan.'
        });
      }

      // Check permission
      if (req.user.role !== 'admin' && existingArticle.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki izin untuk mengubah artikel ini.'
        });
      }

      const article = await Article.update(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: 'Artikel berhasil diperbarui.',
        data: article
      });
    } catch (error) {
      console.error('Update article error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengupdate artikel.'
      });
    }
  }

  // Delete article
  static async deleteArticle(req, res) {
    try {
      // Check if article exists
      const existingArticle = await Article.findById(req.params.id);
      if (!existingArticle) {
        return res.status(404).json({
          success: false,
          message: 'Artikel tidak ditemukan.'
        });
      }

      // Check permission
      if (req.user.role !== 'admin' && existingArticle.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki izin untuk menghapus artikel ini.'
        });
      }

      await Article.delete(req.params.id);

      res.json({
        success: true,
        message: 'Artikel berhasil dihapus.'
      });
    } catch (error) {
      console.error('Delete article error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menghapus artikel.'
      });
    }
  }

  // Rate article
  static async rateArticle(req, res) {
    try {
      const { rating } = req.body;
      
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating harus antara 1 sampai 5.'
        });
      }

      // Check if article exists
      const existingArticle = await Article.findById(req.params.id);
      if (!existingArticle) {
        return res.status(404).json({
          success: false,
          message: 'Artikel tidak ditemukan.'
        });
      }

      const result = await Article.rate(req.params.id, req.user.id, rating);

      res.json({
        success: true,
        message: 'Rating berhasil disimpan.',
        data: result
      });
    } catch (error) {
      console.error('Rate article error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menyimpan rating.'
      });
    }
  }

  // Get popular articles
  static async getPopularArticles(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const articles = await Article.getPopular(limit);

      res.json({
        success: true,
        data: articles
      });
    } catch (error) {
      console.error('Get popular articles error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil artikel populer.'
      });
    }
  }

  // Get recent articles
  static async getRecentArticles(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const articles = await Article.getRecent(limit);

      res.json({
        success: true,
        data: articles
      });
    } catch (error) {
      console.error('Get recent articles error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil artikel terbaru.'
      });
    }
  }

  // Search articles
  static async searchArticles(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Keyword pencarian diperlukan.'
        });
      }

      const articles = await Article.search(q, 20);

      res.json({
        success: true,
        data: articles,
        query: q
      });
    } catch (error) {
      console.error('Search articles error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal melakukan pencarian.'
      });
    }
  }

  // Get article statistics
  static async getStats(req, res) {
    try {
      const stats = await Article.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil statistik.'
      });
    }
  }
}

module.exports = ArticleController;