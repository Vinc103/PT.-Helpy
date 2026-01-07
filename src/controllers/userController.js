const User = require('../models/User');

class UserController {
  // Get all users (admin only)
  static async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      
      const users = await User.getAll(limit, offset);
      
      // Get total count
      const countSql = 'SELECT COUNT(*) as total FROM users WHERE is_active = TRUE';
      const countResult = await require('../config/database').query(countSql);
      
      res.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data pengguna.'
      });
    }
  }

  // Get user by ID
  static async getUser(req, res) {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Pengguna tidak ditemukan.'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data pengguna.'
      });
    }
  }

  // Update user (admin only)
  static async updateUser(req, res) {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Pengguna tidak ditemukan.'
        });
      }

      const updates = {};
      const allowedUpdates = ['nama', 'email', 'role', 'departemen', 'avatar', 'is_active'];
      
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      const updatedUser = await User.update(req.params.id, updates);

      res.json({
        success: true,
        message: 'Data pengguna berhasil diperbarui.',
        data: updatedUser
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengupdate data pengguna.'
      });
    }
  }

  // Delete user (admin only - soft delete)
  static async deleteUser(req, res) {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Pengguna tidak ditemukan.'
        });
      }

      // Soft delete
      await User.update(req.params.id, { is_active: false });

      res.json({
        success: true,
        message: 'Pengguna berhasil dinonaktifkan.'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menonaktifkan pengguna.'
      });
    }
  }

  // Search users
  static async searchUsers(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Keyword pencarian diperlukan.'
        });
      }

      const users = await User.search(q);

      res.json({
        success: true,
        data: users,
        query: q
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal melakukan pencarian.'
      });
    }
  }
}

module.exports = UserController;