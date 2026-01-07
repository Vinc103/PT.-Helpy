const Category = require('../models/Category');
const { validationResult } = require('express-validator');

class CategoryController {
  // Create category
  static async createCategory(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const category = await Category.create(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Kategori berhasil dibuat.',
        data: category
      });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal membuat kategori.'
      });
    }
  }

  // Get all categories
  static async getCategories(req, res) {
    try {
      const parentOnly = req.query.parentOnly === 'true';
      const withArticles = req.query.withArticles === 'true';
      
      let categories;
      
      if (withArticles) {
        categories = await Category.getWithArticles();
      } else {
        categories = await Category.getAll(parentOnly);
      }

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil kategori.'
      });
    }
  }

  // Get single category
  static async getCategory(req, res) {
    try {
      const category = await Category.findBySlug(req.params.slug);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategori tidak ditemukan.'
        });
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Get category error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil kategori.'
      });
    }
  }

  // Update category
  static async updateCategory(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const category = await Category.update(req.params.id, req.body);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategori tidak ditemukan.'
        });
      }

      res.json({
        success: true,
        message: 'Kategori berhasil diperbarui.',
        data: category
      });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengupdate kategori.'
      });
    }
  }

  // Delete category
  static async deleteCategory(req, res) {
    try {
      const category = await Category.findById(req.params.id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategori tidak ditemukan.'
        });
      }

      await Category.delete(req.params.id);

      res.json({
        success: true,
        message: 'Kategori berhasil dihapus.'
      });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menghapus kategori.'
      });
    }
  }
}

module.exports = CategoryController;