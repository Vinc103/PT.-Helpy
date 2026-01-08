const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'admin@helper.com',
            password: 'admin123'
        });
        
        console.log('✅ Login successful!');
        console.log('Response:', response.data);
        
        // Test protected route
        const token = response.data.data.token;
        const profileResponse = await axios.get('http://localhost:3000/api/auth/profile', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Profile access successful!');
        console.log('User:', profileResponse.data.data);
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testLogin();