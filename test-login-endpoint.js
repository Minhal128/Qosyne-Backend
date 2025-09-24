const axios = require('axios');

async function testLoginEndpoint() {
  console.log('🧪 Testing login endpoint...\n');
  
  const baseUrl = 'https://qosynebackend-blafe12t9-rizvitherizzler-s-projects.vercel.app';
  
  const testCredentials = [
    { email: 'test128@example', password: 'password123' },
    { email: 'test@example.com', password: 'password123' }
  ];
  
  for (const creds of testCredentials) {
    console.log(`🔐 Testing login with: ${creds.email}`);
    
    try {
      const response = await axios.post(`${baseUrl}/api/auth/login`, {
        email: creds.email,
        password: creds.password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Login successful!');
      console.log('Status:', response.status);
      console.log('Response:', response.data);
      console.log('');
      
    } catch (error) {
      console.log('❌ Login failed!');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
      console.log('Full error:', error.message);
      console.log('');
    }
  }
  
  // Test with invalid credentials to see error format
  console.log('🧪 Testing with invalid credentials...');
  try {
    const response = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    });
  } catch (error) {
    console.log('Expected error for invalid credentials:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
  }
}

testLoginEndpoint();
