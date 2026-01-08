const API_BASE_URL = "http://localhost:3000/api";
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser'));

// Fungsi untuk menginisialisasi website
async function initWebsite() {
    // Cek status login
    checkAuthStatus();
    
    // Load data dari API
    await loadCategories();
    await loadArticles();
    await loadPopularArticles();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup menu toggle
    setupMobileMenu();
}

// Fungsi untuk cek status autentikasi
function checkAuthStatus() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (authToken && currentUser) {
        // User sudah login
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        
        // Update user info
        document.getElementById('user-name').textContent = currentUser.nama;
        document.getElementById('user-avatar').src = 
            currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.nama)}&background=4A6FA5&color=fff`;
        
        // Setup dropdown menu
        setupUserDropdown();
    } else {
        // User belum login
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

// Fungsi untuk load kategori
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const result = await response.json();
        
        if (result.success) {
            displayCategories(result.data);
            displayFooterCategories(result.data.slice(0, 5));
        } else {
            displayCategories(getFallbackCategories());
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback data jika API tidak tersedia
        displayCategories(getFallbackCategories());
    }
}

// Fungsi untuk display kategori
function displayCategories(categories) {
    const container = document.getElementById('categories-list');
    
    let html = '';
    categories.slice(0, 6).forEach(category => {
        html += `
            <div class="category-card">
                <div class="category-icon">
                    <i class="fas ${category.icon || 'fa-folder'}"></i>
                </div>
                <h3>${category.nama || category.name}</h3>
                <p>${category.deskripsi || category.description || 'Solusi untuk masalah terkait kategori ini'}</p>
                <div class="category-stats">
                    <span><i class="fas fa-file-alt"></i> ${category.article_count || category.total_articles || 12} Artikel</span>
                </div>
                <a href="#" class="btn-outline" style="margin-top: 15px;" onclick="viewCategory('${category.id}')">Lihat Solusi</a>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Fungsi untuk display kategori di footer
function displayFooterCategories(categories) {
    const container = document.getElementById('footer-categories');
    
    let html = '';
    categories.forEach(category => {
        html += `<li><a href="#" onclick="viewCategory('${category.id}')">${category.nama || category.name}</a></li>`;
    });
    
    container.innerHTML = html;
}

// Fungsi untuk load artikel
async function loadArticles() {
    try {
        const response = await fetch(`${API_BASE_URL}/articles?limit=6`);
        const result = await response.json();
        
        if (result.success) {
            displayArticles(result.data, 'articles-list');
        } else {
            displayArticles(getFallbackArticles(), 'articles-list');
        }
    } catch (error) {
        console.error('Error loading articles:', error);
        displayArticles(getFallbackArticles(), 'articles-list');
    }
}

// Fungsi untuk load artikel populer
async function loadPopularArticles() {
    try {
        const response = await fetch(`${API_BASE_URL}/articles/popular?limit=3`);
        const result = await response.json();
        
        if (result.success) {
            displayArticles(result.data, 'popular-articles-list');
        } else {
            displayArticles(getFallbackArticles().slice(0, 3), 'popular-articles-list');
        }
    } catch (error) {
        console.error('Error loading popular articles:', error);
        displayArticles(getFallbackArticles().slice(0, 3), 'popular-articles-list');
    }
}

// Fungsi untuk display artikel
function displayArticles(articles, containerId) {
    const container = document.getElementById(containerId);
    
    if (!articles || articles.length === 0) {
        container.innerHTML = '<p class="no-data">Belum ada artikel tersedia.</p>';
        return;
    }
    
    let html = '';
    articles.forEach(article => {
        // Handle both API response and fallback data
        const judul = article.judul || article.title;
        const excerpt = article.excerpt || article.konten_ringkas || 'Artikel troubleshooting untuk masalah perusahaan...';
        const tipe = article.tipe || article.category_name || 'Panduan';
        const created_at = article.created_at || article.created_date;
        const views = article.views || article.view_count || 0;
        const rating = article.rating || article.average_rating || 0;
        const id = article.id;
        
        html += `
            <div class="article-card">
                <div class="article-image">
                    <i class="fas fa-question-circle fa-3x"></i>
                </div>
                <div class="article-content">
                    <div class="article-meta">
                        <span class="article-category">${tipe}</span>
                        <span class="article-date">${formatDate(created_at)}</span>
                    </div>
                    <h3>${judul}</h3>
                    <p>${excerpt.substring(0, 100)}...</p>
                    <div class="article-stats">
                        <span><i class="fas fa-eye"></i> ${views}</span>
                        <span class="article-rating">
                            <i class="fas fa-star"></i> ${parseFloat(rating).toFixed(1)}
                        </span>
                        <a href="article.html?id=${id}" class="btn-primary" style="padding: 5px 15px; font-size: 0.8rem;">Baca</a>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Fungsi untuk format tanggal
function formatDate(dateString) {
    if (!dateString) return 'Tanggal tidak tersedia';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch (error) {
        return 'Tanggal tidak tersedia';
    }
}

// Fungsi untuk view kategori
function viewCategory(id) {
    window.location.href = `articles.html?category=${id}`;
}

// Fungsi untuk setup event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Search functionality
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('global-search');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    // View all articles
    const viewAllBtn = document.getElementById('view-all-articles');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'articles.html';
        });
    }
}

// Fungsi untuk perform search
function performSearch() {
    const searchInput = document.getElementById('global-search');
    const query = searchInput.value.trim();
    
    if (query) {
        window.location.href = `articles.html?search=${encodeURIComponent(query)}`;
    }
}

// Fungsi untuk setup mobile menu
function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-toggle') && !e.target.closest('.nav-links')) {
            navLinks.classList.remove('active');
        }
    });
}

// Fungsi untuk setup user dropdown
function setupUserDropdown() {
    const userProfile = document.querySelector('.user-profile');
    const dropdown = document.querySelector('.dropdown-menu');
    
    if (userProfile && dropdown) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
    }
}

// Fungsi untuk logout
async function logout() {
    try {
        if (authToken) {
            // Call logout API if available
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

// Fungsi untuk API call dengan authentication
async function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = 'auth.html?mode=login';
            throw new Error('Session expired');
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Fallback data jika API tidak tersedia
function getFallbackCategories() {
    return [
        { id: 1, nama: 'IT & Teknologi', deskripsi: 'Masalah hardware, software, dan jaringan', icon: 'fa-laptop-code', article_count: 45 },
        { id: 2, nama: 'Operasional', deskripsi: 'Masalah proses kerja dan SOP', icon: 'fa-cogs', article_count: 32 },
        { id: 3, nama: 'Administrasi', deskripsi: 'Pengelolaan dokumen dan laporan', icon: 'fa-file-invoice', article_count: 28 },
        { id: 4, nama: 'HRD & Personalia', deskripsi: 'Masalah kepegawaian dan cuti', icon: 'fa-users', article_count: 24 },
        { id: 5, nama: 'Keuangan', deskripsi: 'Pengelolaan anggaran dan pembayaran', icon: 'fa-money-bill-wave', article_count: 19 },
        { id: 6, nama: 'Marketing', deskripsi: 'Strategi pemasaran dan penjualan', icon: 'fa-chart-line', article_count: 15 }
    ];
}

function getFallbackArticles() {
    return [
        { 
            id: 1, 
            judul: 'Cara Mengatasi Printer Tidak Terdeteksi', 
            excerpt: 'Langkah-langkah troubleshooting printer yang tidak terdeteksi oleh sistem.',
            tipe: 'Troubleshooting',
            created_at: '2024-01-15',
            views: 156,
            rating: 4.5
        },
        { 
            id: 2, 
            judul: 'Panduan Penggunaan Sistem Absensi Online', 
            excerpt: 'Cara menggunakan sistem absensi online perusahaan dengan benar.',
            tipe: 'Panduan',
            created_at: '2024-01-10',
            views: 203,
            rating: 4.8
        },
        { 
            id: 3, 
            judul: 'Solusi Email Tidak Bisa Mengirim Attachment', 
            excerpt: 'Mengatasi masalah email yang tidak bisa mengirimkan lampiran file.',
            tipe: 'Troubleshooting',
            created_at: '2024-01-05',
            views: 98,
            rating: 4.2
        }
    ];
}

// Inisialisasi website saat halaman dimuat
document.addEventListener('DOMContentLoaded', initWebsite);