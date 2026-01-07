require('dotenv').config();
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

console.log('🔧 Menjalankan DB Setup PT. Helpy...');

const DB_NAME = process.env.DB_NAME || 'wiki_helper';

const connection = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: 3306,
  multipleStatements: true
});

connection.connect(err => {
  if (err) {
    console.error('❌ Gagal koneksi MySQL:', err.message);
    process.exit(1);
  }

  console.log('✅ MySQL Connected');

  connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``, err => {
    if (err) {
      console.error('❌ Gagal membuat database:', err.message);
      process.exit(1);
    }

    console.log(`✅ Database '${DB_NAME}' siap`);

    connection.changeUser({ database: DB_NAME }, err => {
      if (err) {
        console.error('❌ Gagal memilih database:', err.message);
        process.exit(1);
      }

      console.log('📂 Menggunakan database:', DB_NAME);

      const sqlPath = path.join(__dirname, '../sql/wiki_helper.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');

      connection.query(sql, err => {
        if (err) {
          console.error('❌ Gagal menjalankan SQL:', err.message);
          process.exit(1);
        }

        console.log('🎉 Database & tabel berhasil dibuat!');
        connection.end();
      });
    });
  });
});
