require("dotenv").config();
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

(async () => {
  try {
    // ======================
    // KONEKSI DATABASE
    // ======================
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log("Connected to database for seeding...");

    // ======================
    // 1. SEED USERS (ADMIN)
    // ======================
    const hashedPassword = await bcrypt.hash("admin123", 10);

    await connection.execute(
      `INSERT IGNORE INTO users (id, nama, email, password, role)
       VALUES (1, 'Admin Wiki', 'admin@wikihelper.com', ?, 'admin')`,
      [hashedPassword]
    );

    console.log("Admin user seeded");

    // ======================
    // 2. SEED CATEGORIES
    // ======================
    const categories = [
      ["Troubleshooting", "troubleshooting"],
      ["Panduan Sistem", "panduan-sistem"],
      ["FAQ", "faq"]
    ];

    for (const [nama, slug] of categories) {
      await connection.execute(
        `INSERT IGNORE INTO categories (nama, slug)
         VALUES (?, ?)`,
        [nama, slug]
      );
    }

    console.log("Categories seeded");

    // ======================
    // 3. SEED ARTICLES
    // ======================
    await connection.execute(`
      INSERT IGNORE INTO articles
      (id, judul, slug, konten, excerpt, status, tipe, prioritas, views, rating, rating_count, created_by)
      VALUES
      (
        1,
        'Cara Reset Password Sistem',
        'cara-reset-password-sistem',
        'Panduan lengkap untuk melakukan reset password pada sistem perusahaan.',
        'Panduan reset password sistem',
        'published',
        'panduan',
        'sedang',
        0,
        0.00,
        0,
        1
      )
    `);

    console.log("Article seeded");

    // ======================
    // 4. SEED ARTICLE CATEGORIES
    // ======================
    await connection.execute(`
      INSERT IGNORE INTO article_categories (article_id, category_id)
      VALUES (1, 1)
    `);

    console.log("Article categories seeded");

    // ======================
    // SELESAI
    // ======================
    await connection.end();
    console.log("Database seeding completed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  }
})();
