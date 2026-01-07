const db = require('../config/database');
const slugify = require('slugify');

class Article {
  // Generate slug from title
  static generateSlug(title) {
    return slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }

  // Create new article
  static async create(articleData, userId) {
    return await db.executeTransaction(async (connection) => {
      // Generate slug
      const slug = this.generateSlug(articleData.judul);
      
      // Insert main article
      const articleSql = `
        INSERT INTO articles (
          judul, slug, konten, excerpt, status, tipe, 
          prioritas, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [articleResult] = await connection.execute(articleSql, [
        articleData.judul,
        slug,
        articleData.konten,
        articleData.excerpt || '',
        articleData.status || 'draft',
        articleData.tipe || 'panduan',
        articleData.prioritas || 'sedang',
        userId
      ]);
      
      const articleId = articleResult.insertId;
      
      // Insert categories
      if (articleData.kategori && articleData.kategori.length > 0) {
        const categoryValues = articleData.kategori.map(catId => [articleId, catId]);
        const categorySql = 'INSERT INTO article_categories (article_id, category_id) VALUES ?';
        await connection.query(categorySql, [categoryValues]);
      }
      
      // Insert tags
      if (articleData.tags && articleData.tags.length > 0) {
        const tagValues = articleData.tags.map(tag => [articleId, tag]);
        const tagSql = 'INSERT INTO article_tags (article_id, tag) VALUES ?';
        await connection.query(tagSql, [tagValues]);
      }
      
      // Insert systems
      if (articleData.sistemTerkait && articleData.sistemTerkait.length > 0) {
        const systemValues = articleData.sistemTerkait.map(system => [articleId, system]);
        const systemSql = 'INSERT INTO article_systems (article_id, sistem) VALUES ?';
        await connection.query(systemSql, [systemValues]);
      }
      
      // Insert steps
      if (articleData.langkahPenyelesaian && articleData.langkahPenyelesaian.length > 0) {
        const stepValues = articleData.langkahPenyelesaian.map(step => [
          articleId,
          step.judul,
          step.deskripsi,
          step.urutan || 0
        ]);
        const stepSql = `
          INSERT INTO article_steps (article_id, judul, deskripsi, urutan) 
          VALUES ?
        `;
        await connection.query(stepSql, [stepValues]);
      }
      
      return await this.findById(articleId, connection);
    });
  }

  // Find article by ID
  static async findById(id, connection = null) {
    const query = connection ? connection.query.bind(connection) : db.query.bind(db);
    
    try {
      // Get main article data
      const articleSql = `
        SELECT a.*, 
          u.nama as author_nama, u.email as author_email, 
          u.avatar as author_avatar, u.departemen as author_departemen,
          u2.nama as updater_nama
        FROM articles a
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN users u2 ON a.updated_by = u2.id
        WHERE a.id = ?
      `;
      
      const articles = await query(articleSql, [id]);
      if (articles.length === 0) return null;
      
      const article = articles[0];
      
      // Get categories
      const categorySql = `
        SELECT c.id, c.nama, c.slug, c.icon, c.warna 
        FROM categories c
        JOIN article_categories ac ON c.id = ac.category_id
        WHERE ac.article_id = ? AND c.is_active = TRUE
      `;
      article.kategori = await query(categorySql, [id]);
      
      // Get tags
      const tagSql = 'SELECT tag FROM article_tags WHERE article_id = ?';
      const tags = await query(tagSql, [id]);
      article.tags = tags.map(row => row.tag);
      
      // Get systems
      const systemSql = 'SELECT sistem FROM article_systems WHERE article_id = ?';
      const systems = await query(systemSql, [id]);
      article.sistemTerkait = systems.map(row => row.sistem);
      
      // Get steps
      const stepSql = `
        SELECT judul, deskripsi, urutan 
        FROM article_steps 
        WHERE article_id = ? 
        ORDER BY urutan
      `;
      article.langkahPenyelesaian = await query(stepSql, [id]);
      
      // Get images
      const imageSql = `
        SELECT id, url, caption, alt_text 
        FROM article_images 
        WHERE article_id = ? 
        ORDER BY urutan
      `;
      article.gambar = await query(imageSql, [id]);
      
      // Get attachments
      const attachmentSql = `
        SELECT id, nama, url, tipe, size 
        FROM attachments 
        WHERE article_id = ?
      `;
      article.attachments = await query(attachmentSql, [id]);
      
      // Get related articles
      const relatedSql = `
        SELECT a.id, a.judul, a.slug, a.excerpt 
        FROM articles a
        JOIN related_articles ra ON a.id = ra.related_article_id
        WHERE ra.article_id = ? AND a.status = 'published'
      `;
      article.relatedArticles = await query(relatedSql, [id]);
      
      return article;
    } catch (error) {
      throw error;
    }
  }

  // Find article by slug
  static async findBySlug(slug) {
    try {
      const sql = 'SELECT id FROM articles WHERE slug = ?';
      const articles = await db.query(sql, [slug]);
      
      if (articles.length === 0) return null;
      
      return await this.findById(articles[0].id);
    } catch (error) {
      throw error;
    }
  }

  // Get all articles with filters
  static async findAll(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        kategori,
        tipe,
        status,
        prioritas,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        userId = null
      } = filters;
      
      // Build WHERE clause
      const whereConditions = [];
      const params = [];
      
      // For non-admin users, only show published articles
      if (!filters.includeAll) {
        whereConditions.push('a.status = ?');
        params.push('published');
      } else if (status) {
        whereConditions.push('a.status = ?');
        params.push(status);
      }
      
      // Search
      if (search) {
        whereConditions.push(`
          (MATCH(a.judul, a.konten, a.excerpt) AGAINST(? IN BOOLEAN MODE) 
          OR a.id IN (
            SELECT article_id FROM article_tags WHERE tag LIKE ?
          ))
        `);
        const searchTerm = `%${search}%`;
        params.push(search, searchTerm);
      }
      
      // Category filter
      if (kategori) {
        whereConditions.push(`
          a.id IN (
            SELECT article_id FROM article_categories WHERE category_id = ?
          )
        `);
        params.push(kategori);
      }
      
      // Type filter
      if (tipe) {
        whereConditions.push('a.tipe = ?');
        params.push(tipe);
      }
      
      // Priority filter
      if (prioritas) {
        whereConditions.push('a.prioritas = ?');
        params.push(prioritas);
      }
      
      // User's articles filter
      if (userId) {
        whereConditions.push('a.created_by = ?');
        params.push(userId);
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      // Count total
      const countSql = `
        SELECT COUNT(DISTINCT a.id) as total 
        FROM articles a
        ${whereClause}
      `;
      
      const countResult = await db.query(countSql, params);
      const total = countResult[0].total;
      
      // Get data
      const offset = (page - 1) * limit;
      const dataSql = `
        SELECT 
          a.id, a.judul, a.slug, a.excerpt, a.status, a.tipe, 
          a.prioritas, a.views, a.rating, a.rating_count,
          a.created_at, a.updated_at,
          u.nama as author_nama, u.avatar as author_avatar,
          GROUP_CONCAT(DISTINCT c.nama) as kategori_nama
        FROM articles a
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN article_categories ac ON a.id = ac.article_id
        LEFT JOIN categories c ON ac.category_id = c.id
        ${whereClause}
        GROUP BY a.id
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      const dataParams = [...params, limit, offset];
      const articles = await db.query(dataSql, dataParams);
      
      return {
        data: articles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Update article
  static async update(id, articleData, userId) {
    return await db.executeTransaction(async (connection) => {
      const updates = [];
      const values = [];
      
      // Check which fields to update
      if (articleData.judul) {
        updates.push('judul = ?');
        values.push(articleData.judul);
        
        // Update slug if title changed
        const newSlug = this.generateSlug(articleData.judul);
        updates.push('slug = ?');
        values.push(newSlug);
      }
      
      if (articleData.konten) {
        updates.push('konten = ?');
        values.push(articleData.konten);
      }
      
      if (articleData.excerpt !== undefined) {
        updates.push('excerpt = ?');
        values.push(articleData.excerpt);
      }
      
      if (articleData.status) {
        updates.push('status = ?');
        values.push(articleData.status);
      }
      
      if (articleData.tipe) {
        updates.push('tipe = ?');
        values.push(articleData.tipe);
      }
      
      if (articleData.prioritas) {
        updates.push('prioritas = ?');
        values.push(articleData.prioritas);
      }
      
      // Always update updated_by and timestamp
      updates.push('updated_by = ?');
      values.push(userId);
      
      if (updates.length === 0) {
        return await this.findById(id, connection);
      }
      
      values.push(id);
      
      const updateSql = `
        UPDATE articles 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `;
      
      await connection.query(updateSql, values);
      
      // Update categories if provided
      if (articleData.kategori !== undefined) {
        // Delete existing categories
        await connection.query('DELETE FROM article_categories WHERE article_id = ?', [id]);
        
        // Insert new categories
        if (articleData.kategori.length > 0) {
          const categoryValues = articleData.kategori.map(catId => [id, catId]);
          const categorySql = 'INSERT INTO article_categories (article_id, category_id) VALUES ?';
          await connection.query(categorySql, [categoryValues]);
        }
      }
      
      // Update tags if provided
      if (articleData.tags !== undefined) {
        await connection.query('DELETE FROM article_tags WHERE article_id = ?', [id]);
        
        if (articleData.tags.length > 0) {
          const tagValues = articleData.tags.map(tag => [id, tag]);
          const tagSql = 'INSERT INTO article_tags (article_id, tag) VALUES ?';
          await connection.query(tagSql, [tagValues]);
        }
      }
      
      // Update systems if provided
      if (articleData.sistemTerkait !== undefined) {
        await connection.query('DELETE FROM article_systems WHERE article_id = ?', [id]);
        
        if (articleData.sistemTerkait.length > 0) {
          const systemValues = articleData.sistemTerkait.map(system => [id, system]);
          const systemSql = 'INSERT INTO article_systems (article_id, sistem) VALUES ?';
          await connection.query(systemSql, [systemValues]);
        }
      }
      
      // Update steps if provided
      if (articleData.langkahPenyelesaian !== undefined) {
        await connection.query('DELETE FROM article_steps WHERE article_id = ?', [id]);
        
        if (articleData.langkahPenyelesaian.length > 0) {
          const stepValues = articleData.langkahPenyelesaian.map(step => [
            id,
            step.judul,
            step.deskripsi,
            step.urutan || 0
          ]);
          const stepSql = `
            INSERT INTO article_steps (article_id, judul, deskripsi, urutan) 
            VALUES ?
          `;
          await connection.query(stepSql, [stepValues]);
        }
      }
      
      return await this.findById(id, connection);
    });
  }

  // Delete article
  static async delete(id) {
    try {
      const sql = 'DELETE FROM articles WHERE id = ?';
      await db.query(sql, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Increment view count
  static async incrementViews(id) {
    try {
      const sql = 'UPDATE articles SET views = views + 1 WHERE id = ?';
      await db.query(sql, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Rate article
  static async rate(articleId, userId, rating) {
    return await db.executeTransaction(async (connection) => {
      // Check if user already rated
      const checkSql = 'SELECT * FROM ratings WHERE article_id = ? AND user_id = ?';
      const existingRatings = await connection.query(checkSql, [articleId, userId]);
      
      if (existingRatings.length > 0) {
        // Update existing rating
        await connection.query(
          'UPDATE ratings SET rating = ?, updated_at = NOW() WHERE article_id = ? AND user_id = ?',
          [rating, articleId, userId]
        );
      } else {
        // Insert new rating
        await connection.query(
          'INSERT INTO ratings (article_id, user_id, rating) VALUES (?, ?, ?)',
          [articleId, userId, rating]
        );
      }
      
      // Recalculate average rating
      const avgSql = `
        SELECT AVG(rating) as avg_rating, COUNT(*) as count 
        FROM ratings 
        WHERE article_id = ?
      `;
      const [ratingStats] = await connection.query(avgSql, [articleId]);
      
      // Update article rating
      await connection.query(
        'UPDATE articles SET rating = ?, rating_count = ? WHERE id = ?',
        [ratingStats.avg_rating || 0, ratingStats.count, articleId]
      );
      
      return {
        rating: parseFloat(ratingStats.avg_rating || 0).toFixed(2),
        ratingCount: ratingStats.count
      };
    });
  }

  // Get popular articles
  static async getPopular(limit = 5) {
    try {
      const sql = `
        SELECT a.id, a.judul, a.slug, a.excerpt, a.views, a.rating, a.rating_count
        FROM articles a
        WHERE a.status = 'published'
        ORDER BY a.views DESC, a.rating DESC
        LIMIT ?
      `;
      
      return await db.query(sql, [limit]);
    } catch (error) {
      throw error;
    }
  }

  // Get recent articles
  static async getRecent(limit = 5) {
    try {
      const sql = `
        SELECT id, judul, slug, excerpt, created_at
        FROM articles
        WHERE status = 'published'
        ORDER BY created_at DESC
        LIMIT ?
      `;
      
      return await db.query(sql, [limit]);
    } catch (error) {
      throw error;
    }
  }

  // Search articles
  static async search(keyword, limit = 20) {
    try {
      const sql = `
        SELECT 
          a.id, a.judul, a.slug, a.excerpt, a.tipe, a.prioritas,
          MATCH(a.judul, a.konten, a.excerpt) AGAINST(? IN BOOLEAN MODE) as relevance
        FROM articles a
        WHERE a.status = 'published'
          AND MATCH(a.judul, a.konten, a.excerpt) AGAINST(? IN BOOLEAN MODE)
        ORDER BY relevance DESC
        LIMIT ?
      `;
      
      return await db.query(sql, [keyword, keyword, limit]);
    } catch (error) {
      throw error;
    }
  }

  // Get dashboard statistics
  static async getStats() {
    try {
      const statsSql = `
        SELECT 
          COUNT(*) as total_articles,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
          SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived,
          SUM(views) as total_views,
          AVG(rating) as avg_rating
        FROM articles
      `;
      
      const recentSql = `
        SELECT id, judul, slug, status, created_at
        FROM articles
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
      const [stats, recent] = await Promise.all([
        db.query(statsSql),
        db.query(recentSql)
      ]);
      
      return {
        ...stats[0],
        recent: recent
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Article;