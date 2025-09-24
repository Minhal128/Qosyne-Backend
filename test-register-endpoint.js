const axios = require('axios');

async function testRegisterEndpoint() {
  console.log('🧪 Testing registration endpoint...\n');
  
  const baseUrl = 'https://qosynebackend-i6ws1o7vc-rizvitherizzler-s-projects.vercel.app';
  
  const testUser = {
    name: "Test User Registration",
    email: "testregister@example.com",
    password: "password123",
    confirmPassword: "password123"
  };
  
  console.log('📝 Attempting to register user:', {
    name: testUser.name,
    email: testUser.email,
    password: '***hidden***'
  });
  
  try {
    const response = await axios.post(`${baseUrl}/api/auth/register`, testUser, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Registration successful!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Registration failed!');
    console.log('Status:', error.response?.status);
    console.log('Error Response:', error.response?.data);
    console.log('Error Message:', error.message);
    
    if (error.response?.status === 500) {
      console.log('\n🔍 This looks like a server-side database error.');
      console.log('Possible causes:');
      console.log('1. Missing database columns (selectedWalletId, selectedWalletType)');
      console.log('2. Missing updatedAt field in user creation');
      console.log('3. Database connection issues');
      console.log('4. Prisma schema mismatch');
    }
  }
  
  // Test with existing user to see different error
  console.log('\n🧪 Testing with existing user (should get "already exists" error)...');
  try {
    const existingUserTest = await axios.post(`${baseUrl}/api/auth/register`, {
      name: "Test User 128",
      email: "test128@example",
      password: "password123"
    });
  } catch (error) {
    console.log('Expected error for existing user:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
  }
}

testRegisterEndpoint();
