const axios = require('axios');

async function testFixedRegistration() {
  console.log('🧪 Testing FIXED registration endpoint...\n');
  
  const baseUrl = 'https://qosynebackend-p0dhv5no0-rizvitherizzler-s-projects.vercel.app';
  
  const testUser = {
    name: "Test User Fixed",
    email: "testfixed@example.com",
    password: "password123"
  };
  
  console.log('📝 Attempting to register user with FIXED schema:', {
    name: testUser.name,
    email: testUser.email,
    password: '***hidden***'
  });
  
  try {
    const response = await axios.post(`${baseUrl}/api/auth/register`, testUser, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ Registration successful!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
    if (response.data.data && response.data.data.id) {
      console.log('\n🎉 User created successfully!');
      console.log('User ID:', response.data.data.id);
      console.log('Email:', response.data.data.email);
      console.log('Verified:', response.data.data.isVerified);
      
      // Test login with the new user
      console.log('\n🔐 Testing login with new user...');
      try {
        const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
          email: testUser.email,
          password: testUser.password
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Login successful!');
        console.log('Token received:', loginResponse.data.data.token ? 'YES' : 'NO');
        
      } catch (loginError) {
        console.log('⚠️ Login failed (expected - user needs verification):', loginError.response?.data?.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Registration failed!');
    console.log('Status:', error.response?.status);
    console.log('Error Response:', error.response?.data);
    console.log('Error Message:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log('\n⏰ Request timed out - this might indicate server issues');
    }
  }
}

testFixedRegistration();
