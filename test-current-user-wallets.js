const axios = require('axios');

async function testCurrentUserWallets() {
  console.log('🔍 Testing current user wallet API...\n');
  
  // Use the token from your error log
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzU5Njk0Mzk3LCJleHAiOjE3NjAyOTkxOTd9._S8NwlyRKsGzWHBI96IdF0rom4ZNQ4tuZYD7CRSdqG0';
  const baseUrl = 'https://qosynebackend.vercel.app/api';
  
  try {
    console.log('1️⃣ Testing /api/wallet-integration/wallets endpoint...');
    const response = await axios.get(`${baseUrl}/wallet-integration/wallets`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data && response.data.data.wallets) {
      console.log(`\n📱 Found ${response.data.data.wallets.length} wallets:`);
      response.data.data.wallets.forEach((wallet, index) => {
        console.log(`   ${index + 1}. ${wallet.provider}: ${wallet.walletId} (DB ID: ${wallet.id}) - Active: ${wallet.isActive}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔑 Token might be expired. Try getting a fresh token by logging in again.');
    }
  }
  
  // Also test the old endpoint to compare
  try {
    console.log('\n2️⃣ Testing old /api/wallet/wallets endpoint for comparison...');
    const oldResponse = await axios.get(`${baseUrl}/wallet/wallets`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Old endpoint response:', JSON.stringify(oldResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Old endpoint error:', error.response?.status, error.response?.data?.error || error.message);
  }
}

testCurrentUserWallets().catch(console.error);
