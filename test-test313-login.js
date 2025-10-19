const axios = require('axios');

async function testTest313Login() {
  console.log('🔐 Testing login for test313@example.com...\n');
  
  const baseUrl = 'https://qosynebackend.vercel.app/api';
  
  try {
    // Step 1: Login with test313 credentials
    console.log('1️⃣ Logging in with test313@example.com...');
    const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
      email: 'test313@example.com',
      password: 'password123'
    });
    
    console.log('✅ Login successful!');
    const token = loginResponse.data.data.token;
    console.log('Token received:', token.substring(0, 50) + '...');
    
    // Step 2: Get wallets for this user
    console.log('\n2️⃣ Fetching wallets for test313@example.com...');
    const walletsResponse = await axios.get(`${baseUrl}/wallet-integration/wallets`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Wallets API Response:');
    console.log(JSON.stringify(walletsResponse.data, null, 2));
    
    if (walletsResponse.data.data && walletsResponse.data.data.wallets) {
      console.log(`\n📱 Found ${walletsResponse.data.data.wallets.length} wallets:`);
      walletsResponse.data.data.wallets.forEach((wallet, index) => {
        console.log(`   ${index + 1}. ${wallet.provider}: ${wallet.walletId}`);
        console.log(`      - Name: ${wallet.fullName}`);
        console.log(`      - Email: ${wallet.accountEmail}`);
        console.log(`      - Active: ${wallet.isActive}`);
      });
    }
    
    // Check if Venmo is present
    const hasVenmo = walletsResponse.data.data?.wallets?.some(w => w.provider === 'VENMO');
    if (hasVenmo) {
      console.log('\n🎉 VENMO WALLET FOUND for test313@example.com!');
    } else {
      console.log('\n❌ NO VENMO WALLET found for test313@example.com');
      console.log('   This means the Venmo connection was not saved or failed.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testTest313Login().catch(console.error);
