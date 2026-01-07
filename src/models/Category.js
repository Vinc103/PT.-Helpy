const db = require('../config/database');

class Category {
  // Create new category
  static async create(categoryData, userId) {
    try {
      // Generate slug
      const slug = categoryData.nama
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');
      
      const sql = `
        INSERT INTO categories (nama, slug, deskripsi, icon, warna, parent_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await db.query(sql, [
        categoryData.nama,
        slug,
        categoryData.deskripsi || '',
        categoryData.icon || 'folder',
        categoryData.warna || '#3498db',
        categoryData.parent_id || null,
        userId
      ]);
      
      return await this.findById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Find category by ID
  static async findById(id) {
    try {
      const sql = `
        SELECT c.*, 
          u.nama as created_by_name,
          parent.nama as parent_nama
        FROM categories c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN categories parent ON c.parent_id = parent.id
        WHERE c.id = ? AND c.is_active = TRUE
      `;
      
      const categories = await db.query(sql, [id]);
      return categories[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find category by slug
  static async findBySlug(slug) {
    try {
      const sql = `
        SELECT c.*, 
          u.nama as created_by_name,
          parent.nama as parent_nama
        FROM categories c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN categories parent ON c.parent_id = parent.id
        WHERE c.slug = ? AND c.is_active = TRUE
      `;
      
      const categories = await db.query(sql, [slug]);
      return categories[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Get all categories
  static async getAll(parentOnly = false) {
    try {
      let whereClause = 'WHERE c.is_active = TRUE';
      if (parentOnly) {
        whereClause += ' AND c.parent_id IS NULL';
      }
      
      const sql = `
        SELECT c.*, 
          u.nama as created_by_name,
          parent.nama as parent_nama,
          COUNT(DISTINCT a.id) as article_count
        FROM categories c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN categories parent ON c.parent_id = parent.id
        LEFT JOIN article_categories ac ON c.id = ac.category_id
        LEFT JOIN articles a ON ac.article_id = a.id AND a.status = 'published'
        ${whereClause}
        GROUP BY c.id
        ORDER BY c.nama
      `;
      
      return await db.query(sql);
    } catch (error) {
      throw error;
    }
  }

  // Get categories with articles
  static async getWithArticles(limit = 5) {
    try {
      const categories = await this.getAll();
      
      for (const category of categories) {
        const articlesSql = `
          SELECT a.id, a.judul, a.slug, a.excerpt, a.tipe, a.created_at
          FROM articles a
          JOIN article_categories ac ON a.id = ac.article_id
          WHERE ac.category_id = ? AND a.status = 'published'
          ORDER BY a.created_at DESC
          LIMIT ?
        `;
        
        category.articles = await db.query(articlesSql, [category.id, limit]);
        
        // Get subcategories
        const subSql = `
          SELECT * FROM categories 
          WHERE parent_id = ? AND is_active = TRUE
        `;
        category.subcategories = await db.query(subSql, [category.id]);
      }
      
      return categories;
    } catch (error) {
      throw error;
    }
  }

  // Update category
  static async update(id, updates) {
    try {
      const allowedFields = ['nama', 'deskripsi', 'icon', 'warna', 'parent_id', 'is_active'];
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      if (fields.length === 0) {
        return this.findById(id);
      }
      
      // Update slug if name changed
      if (updates.nama) {
        const slug = updates.nama
          .toLowerCase()
          .replace(/[^\w\s]/gi, '')
          .replace(/\s+/g, '-');
        fields.push('slug = ?');
        values.push(slug);
      }
      
      values.push(id);
      const sql = `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`;
      await db.query(sql, values);
      
      return this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // Delete category (soft delete)
  static async delete(id) {
    try {
      const sql = 'UPDATE categories SET is_active = FALSE WHERE id = ?';
      await db.query(sql, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Category;