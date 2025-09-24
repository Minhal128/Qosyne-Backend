const axios = require('axios');

async function testFixedWallets() {
  console.log('🧪 Testing FIXED wallets endpoint...\n');
  
  const baseUrl = 'https://qosynebackend-e13u6te0u-rizvitherizzler-s-projects.vercel.app';
  
  // Use the JWT token from your error log
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzU4NjU1MDUzLCJleHAiOjE3NTkyNTk4NTN9.dQK_0fU82ffmK5SVAVb-mHzMBWopOaX9qRizCbdfh_o';
  
  console.log('🔐 Testing with JWT token for userId: 4');
  
  try {
    // Test 1: Get user connected wallets
    console.log('1️⃣ Testing getUserConnectedWallets...');
    
    const response = await axios.get(`${baseUrl}/api/wallet/wallets`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ getUserConnectedWallets successful!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📱 Connected wallets found:');
      response.data.data.forEach((wallet, index) => {
        console.log(`  ${index + 1}. ${wallet.provider} - ${wallet.walletId}`);
        console.log(`     Balance: ${wallet.balance} ${wallet.currency}`);
        console.log(`     Active: ${wallet.isActive}`);
      });
    } else {
      console.log('\n📱 No connected wallets found for this user');
    }
    
    // Test 2: Test registration to create a user with wallet
    console.log('\n2️⃣ Testing registration (should create user + wallet)...');
    
    try {
      const regResponse = await axios.post(`${baseUrl}/api/auth/register`, {
        name: "Test Wallet User",
        email: "testwallet@example.com",
        password: "password123"
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Registration successful!');
      console.log('New user created with ID:', regResponse.data.data.id);
      
    } catch (regError) {
      if (regError.response?.status === 400 && regError.response?.data?.error?.includes('already exists')) {
        console.log('✅ Registration skipped - user already exists');
      } else {
        console.log('⚠️ Registration failed:', regError.response?.data?.error || regError.message);
      }
    }
    
    // Test 3: Test login
    console.log('\n3️⃣ Testing login...');
    
    try {
      const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
        email: "test128@example",
        password: "password123"
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Login successful!');
      console.log('New token generated:', loginResponse.data.data.token ? 'YES' : 'NO');
      
    } catch (loginError) {
      console.log('⚠️ Login failed:', loginError.response?.data?.message || loginError.message);
    }
    
  } catch (error) {
    console.log('❌ Wallets endpoint failed!');
    console.log('Status:', error.response?.status);
    console.log('Error Response:', error.response?.data);
    console.log('Error Message:', error.message);
  }
}

testFixedWallets();
