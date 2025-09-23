const axios = require('axios');

const BASE_URL = 'https://qosynebackend.vercel.app/api';

async function createTestUser() {
  console.log('🚀 Creating test user for Rapyd integration...\n');

  try {
    // Create test user
    console.log('1️⃣ Creating test user...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Test User',
      email: 'test128@example.com',
      password: 'password'
    });

    if (registerResponse.data.success) {
      console.log('✅ User created successfully!');
      console.log('   User ID:', registerResponse.data.data.user.id);
      console.log('   Email:', registerResponse.data.data.user.email);
      console.log('   Name:', registerResponse.data.data.user.name);
      console.log('');

      // Now try to login
      console.log('2️⃣ Testing login with new user...');
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'test128@example.com',
        password: 'password'
      });

      if (loginResponse.data.success) {
        console.log('✅ Login successful!');
        console.log('   Token:', loginResponse.data.data.token ? 'Present' : 'Missing');
        console.log('   User verified:', loginResponse.data.data.user.isVerified);
      } else {
        console.log('❌ Login failed:', loginResponse.data.message);
      }

    } else {
      console.log('❌ User creation failed:', registerResponse.data.message);
      
      // If user already exists, try to login
      if (registerResponse.data.message.includes('already exists')) {
        console.log('ℹ️  User already exists, trying to login...');
        
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          email: 'test128@example.com',
          password: 'password'
        });

        if (loginResponse.data.success) {
          console.log('✅ Login successful with existing user!');
          console.log('   User ID:', loginResponse.data.data.user.id);
          console.log('   Token:', loginResponse.data.data.token ? 'Present' : 'Missing');
        } else {
          console.log('❌ Login failed:', loginResponse.data.message);
          console.log('   Might need to verify email or use different credentials');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n🏁 User creation test complete!');
}

createTestUser();
