const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wiki_helper',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully to:', process.env.DB_NAME || 'wiki_helper');
        connection.release();
    })
    .catch(error => {
        console.error('❌ Database connection failed:', error.message);
    });

// Query helper function
async function query(sql, params) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
}

// For compatibility with existing code
const db = {
    query: async (sql, params) => {
        try {
            const [rows] = await pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error.message);
            throw error;
        }
    },
    
    // For insert operations that need last insert ID
    execute: async (sql, params) => {
        try {
            const [result] = await pool.execute(sql, params);
            return result;
        } catch (error) {
            console.error('Database execute error:', error.message);
            throw error;
        }
    },
    
    // Get connection from pool
    getConnection: () => pool.getConnection(),
    
    // Close pool (for graceful shutdown)
    close: async () => {
        await pool.end();
    }
};

module.exports = db;



//---------------Versi 2
// // src/config/database.js
// console.log('Loading database module...');

// const mysql = require('mysql2');

// // Buat koneksi sederhana
// const connection = mysql.createConnection({
//   host: '127.0.0.1',
//   user: 'root',
//   password: '',  // XAMPP default kosong
//   database: 'wiki_helper'
// });

// // Connect
// connection.connect((err) => {
//   if (err) {
//     console.log('Database error:', err.message);
//     console.log('Tips: Buat database "wiki_helper" di phpMyAdmin dulu');
//   } else {
//     console.log('Database connected: wiki_helper');
//   }
// });

// // Export fungsi sederhana
// module.exports = {
//   query: (sql, params = []) => {
//     return new Promise((resolve, reject) => {
//       console.log('SQL:', sql.substring(0, 50) + '...');
//       connection.query(sql, params, (err, results) => {
//         if (err) {
//           console.log('SQL Error:', err.message);
//           reject(err);
//         } else {
//           resolve(results);
//         }
//       });
//     });
//   }
// };

// Versi 1
// // src/config/database.js
// const mysql = require('mysql2');

// console.log('🔧 Initializing database connection...');

// // Buat koneksi langsung (tanpa pool untuk sederhana)
// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '',  // XAMPP default: kosong
//   database: 'wiki_helper',  // GANTI nama database
//   port: 3306
// });

// // Connect ke database
// connection.connect((err) => {
//   if (err) {
//     console.error('❌ Database connection failed:', err.message);
//     console.log('💡 Please check:');
//     console.log('   1. XAMPP MySQL is running');
//     console.log('   2. Database "wiki_helper" exists');
//     console.log('   3. Open phpMyAdmin: http://localhost/phpmyadmin');
//   } else {
//     console.log('✅ Connected to MySQL: wiki_helper');
//   }
// });

// // Fungsi query sederhana
// const db = {
//   query: (sql, params = []) => {
//     return new Promise((resolve, reject) => {
//       console.log(`📝 Executing SQL: ${sql.substring(0, 50)}...`);
//       connection.query(sql, params, (err, results) => {
//         if (err) {
//           console.error('❌ SQL Error:', err.message);
//           console.error('SQL:', sql);
//           reject(err);
//         } else {
//           resolve(results);
//         }
//       });
//     });
//   },

//   // Fungsi untuk prepared statements
//   execute: (sql, params = []) => {
//     return new Promise((resolve, reject) => {
//       connection.execute(sql, params, (err, results) => {
//         if (err) {
//           console.error('❌ Execute Error:', err.message);
//           reject(err);
//         } else {
//           resolve(results);
//         }
//       });
//     });
//   },

//   // Test connection
//   test: async () => {
//     try {
//       const result = await db.query('SELECT 1 + 1 AS result');
//       console.log('✅ Database test passed:', result);
//       return true;
//     } catch (error) {
//       console.error('❌ Database test failed:', error.message);
//       return false;
//     }
//   },

//   // Helper untuk transaction (sederhana)
//   beginTransaction: () => {
//     return new Promise((resolve, reject) => {
//       connection.beginTransaction((err) => {
//         if (err) reject(err);
//         else resolve();
//       });
//     });
//   },

//   commit: () => {
//     return new Promise((resolve, reject) => {
//       connection.commit((err) => {
//         if (err) reject(err);
//         else resolve();
//       });
//     });
//   },

//   rollback: () => {
//     return new Promise((resolve, reject) => {
//       connection.rollback((err) => {
//         if (err) reject(err);
//         else resolve();
//       });
//     });
//   }
// };

// module.exports = db;