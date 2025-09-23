const axios = require('axios');

const BASE_URL = 'https://qosynebackend.vercel.app/api';

async function testRapydAuth() {
  console.log('🔐 Testing Rapyd API Authentication...\n');

  try {
    // Test 1: Connection test
    console.log('1️⃣ Testing connection...');
    const connectionTest = await axios.get(`${BASE_URL}/rapyd/test/connection`);
    console.log('✅ Connection test:', connectionTest.data.message);
    console.log('');

    // Test 2: Try to create a test wallet (this will test real API auth)
    console.log('2️⃣ Testing real Rapyd API authentication...');
    const testWalletResponse = await axios.post(`${BASE_URL}/rapyd/test/create-wallet`, {
      firstName: 'Auth',
      lastName: 'Test',
      email: 'authtest@qosyne.com'
    });

    if (testWalletResponse.data.success) {
      console.log('✅ Rapyd API authentication successful!');
      console.log('   Test wallet created:', testWalletResponse.data.data.walletId);
      console.log('   Reference ID:', testWalletResponse.data.data.referenceId);
      console.log('');
      console.log('🎉 Your Rapyd integration is working correctly!');
      console.log('   The authentication issue has been fixed.');
      console.log('   You can now process real money transfers with admin fees.');
    } else {
      console.log('❌ Rapyd API authentication failed:', testWalletResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.data?.error) {
      console.log('');
      console.log('🔍 Error Analysis:');
      if (error.response.data.error.includes('MISSING_AUTHENTICATION_HEADERS')) {
        console.log('   Issue: Authentication headers missing or incorrect');
        console.log('   Solution: Check signature generation format');
      } else if (error.response.data.error.includes('UNAUTHORIZED')) {
        console.log('   Issue: Invalid credentials or signature');
        console.log('   Solution: Verify access key and secret key');
      } else {
        console.log('   Error details:', error.response.data.error);
      }
    }
  }

  console.log('\n🏁 Authentication test complete!');
}

testRapydAuth();
