const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // Create new user
    static async create(userData) {
        try {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            
            const sql = `
                INSERT INTO users (nama, email, password, role, departemen, avatar, is_active)
                VALUES (?, ?, ?, ?, ?, ?, TRUE)
            `;
            
            const result = await db.execute(sql, [
                userData.nama,
                userData.email,
                hashedPassword,
                userData.role || 'karyawan',
                userData.departemen || '',
                userData.avatar || ''
            ]);
            
            // Get the inserted user
            const [user] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
            return user[0] || null;
        } catch (error) {
            console.error('Error creating user:', error);
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
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    // Find user by email
    static async findByEmail(email) {
        try {
            const sql = `
                SELECT id, nama, email, password, role, departemen, avatar, 
                       is_active, last_login, created_at
                FROM users 
                WHERE email = ? AND is_active = TRUE
            `;
            const users = await db.query(sql, [email]);
            return users[0] || null;
        } catch (error) {
            console.error('Error finding user by email:', error);
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
            await db.execute(sql, values);
            
            return this.findById(id);
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // Update last login
    static async updateLastLogin(id) {
        try {
            const sql = 'UPDATE users SET last_login = NOW() WHERE id = ?';
            await db.execute(sql, [id]);
            return true;
        } catch (error) {
            console.error('Error updating last login:', error);
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
            console.error('Error getting all users:', error);
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
            console.error('Error searching users:', error);
            throw error;
        }
    }

    // Create admin user if not exists (with correct bcrypt hash)
    static async createDefaultAdmin() {
        try {
            // Check if admin already exists
            const admin = await this.findByEmail('admin@helper.com');
            
            if (!admin) {
                console.log('Creating default admin user...');
                
                // Hash password: admin123
                const adminPassword = await bcrypt.hash('admin123', 10);
                
                const sql = `
                    INSERT INTO users (nama, email, password, role, departemen, is_active)
                    VALUES (?, ?, ?, ?, ?, TRUE)
                `;
                
                await db.execute(sql, [
                    'Admin Helper',
                    'admin@helper.com',
                    adminPassword,
                    'admin',
                    'IT'
                ]);
                
                console.log('✅ Default admin user created');
                console.log('   Email: admin@helper.com');
                console.log('   Password: admin123');
                console.log('   ⚠️ Please change password after first login!');
            } else {
                console.log('✅ Admin user already exists');
                
                // Check if admin has correct password hash
                const isValidPassword = await this.comparePassword('admin123', admin.password);
                if (!isValidPassword) {
                    console.log('⚠️  Admin password needs update');
                    // Update password if needed
                    const newHash = await bcrypt.hash('admin123', 10);
                    await db.execute('UPDATE users SET password = ? WHERE id = ?', [newHash, admin.id]);
                    console.log('✅ Admin password updated');
                }
            }
        } catch (error) {
            console.error('❌ Error creating default admin:', error.message);
        }
    }

    // Count total users
    static async count() {
        try {
            const sql = 'SELECT COUNT(*) as count FROM users WHERE is_active = TRUE';
            const result = await db.query(sql);
            return result[0].count;
        } catch (error) {
            console.error('Error counting users:', error);
            return 0;
        }
    }
}

module.exports = User;