const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Create new user
  static async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const sql = `
        INSERT INTO users (nama, email, password, role, departemen, avatar)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const result = await db.query(sql, [
        userData.nama,
        userData.email,
        hashedPassword,
        userData.role || 'karyawan',
        userData.departemen || '',
        userData.avatar || ''
      ]);
      
      return await this.findById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const sql = `
        SELECT id, nama, email, role, departemen, avatar, 
               is_active, last_login, created_at
        FROM users 
        WHERE id = ? AND is_active = TRUE
      `;
      const users = await db.query(sql, [id]);
      return users[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const sql = 'SELECT * FROM users WHERE email = ? AND is_active = TRUE';
      const users = await db.query(sql, [email]);
      return users[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Update user
  static async update(id, updates) {
    try {
      const allowedFields = ['nama', 'avatar', 'departemen', 'password'];
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          if (key === 'password') {
            // Hash new password
            const hashedPassword = bcrypt.hashSync(updates[key], 10);
            fields.push(`${key} = ?`);
            values.push(hashedPassword);
          } else {
            fields.push(`${key} = ?`);
            values.push(updates[key]);
          }
        }
      });
      
      if (fields.length === 0) {
        return this.findById(id);
      }
      
      values.push(id);
      const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      await db.query(sql, values);
      
      return this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // Update last login
  static async updateLastLogin(id) {
    try {
      const sql = 'UPDATE users SET last_login = NOW() WHERE id = ?';
      await db.query(sql, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Compare password
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Get all users (admin only)
  static async getAll(limit = 50, offset = 0) {
    try {
      const sql = `
        SELECT id, nama, email, role, departemen, avatar, 
               is_active, last_login, created_at
        FROM users 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      return await db.query(sql, [limit, offset]);
    } catch (error) {
      throw error;
    }
  }

  // Search users
  static async search(keyword) {
    try {
      const sql = `
        SELECT id, nama, email, role, departemen, avatar
        FROM users 
        WHERE (nama LIKE ? OR email LIKE ?) AND is_active = TRUE
        LIMIT 20
      `;
      const searchTerm = `%${keyword}%`;
      return await db.query(sql, [searchTerm, searchTerm]);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;