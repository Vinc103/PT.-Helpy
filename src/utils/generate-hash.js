const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Password:', password);
    console.log('Bcrypt Hash:', hash);
    
    // Verify hash
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash is valid:', isValid);
    
    // Contoh hash yang valid: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
}

generateHash();