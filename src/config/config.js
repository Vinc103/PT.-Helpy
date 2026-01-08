// config.js - Configuration for frontend
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api',
    APP_NAME: 'PT. Helpy',
    VERSION: '1.0.0',
    
    // Default user avatar
    DEFAULT_AVATAR: (name) => {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4A6FA5&color=fff&size=128`;
    },
    
    // Demo credentials for testing
    DEMO_CREDENTIALS: {
        admin: {
            email: 'admin@helper.com',
            password: 'admin123',
            name: 'Admin Demo'
        }
    },
    
    // Fallback data when API is offline
    FALLBACK_CATEGORIES: [
        { id: 1, nama: 'IT & Teknologi', deskripsi: 'Masalah hardware, software, dan jaringan', icon: 'fa-laptop-code', article_count: 45 },
        { id: 2, nama: 'Operasional', deskripsi: 'Masalah proses kerja dan SOP', icon: 'fa-cogs', article_count: 32 },
        { id: 3, nama: 'Administrasi', deskripsi: 'Pengelolaan dokumen dan laporan', icon: 'fa-file-invoice', article_count: 28 },
        { id: 4, nama: 'HRD & Personalia', deskripsi: 'Masalah kepegawaian dan cuti', icon: 'fa-users', article_count: 24 },
        { id: 5, nama: 'Keuangan', deskripsi: 'Pengelolaan anggaran dan pembayaran', icon: 'fa-money-bill-wave', article_count: 19 },
        { id: 6, nama: 'Marketing', deskripsi: 'Strategi pemasaran dan penjualan', icon: 'fa-chart-line', article_count: 15 }
    ],
    
    FALLBACK_ARTICLES: [
        { 
            id: 1, 
            judul: 'Cara Mengatasi Printer Tidak Terdeteksi', 
            excerpt: 'Langkah-langkah troubleshooting printer yang tidak terdeteksi oleh sistem.',
            tipe: 'Troubleshooting',
            created_at: '2024-01-15',
            views: 156,
            rating: 4.5,
            category_name: 'IT & Teknologi'
        },
        { 
            id: 2, 
            judul: 'Panduan Penggunaan Sistem Absensi Online', 
            excerpt: 'Cara menggunakan sistem absensi online perusahaan dengan benar.',
            tipe: 'Panduan',
            created_at: '2024-01-10',
            views: 203,
            rating: 4.8,
            category_name: 'HRD & Personalia'
        }
    ]
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}