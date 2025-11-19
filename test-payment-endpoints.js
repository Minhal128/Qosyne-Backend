const axios = require('axios');

const BASE_URL = 'https://qosynebackend.vercel.app';

// Test credentials - update these with real user from your database
const TEST_USER = {
  email: 'test128@example.com', // Change to your real user email
  password: 'password123' // Change to your real password
};

let jwtToken = null;
let userId = null;

async function testEndpoints() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 TESTING PAYPAL & TRANSACTION ENDPOINTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Login to get JWT token
    console.log('📝 Step 1: Login to get JWT token...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
    jwtToken = loginResponse.data.data.token;
    userId = loginResponse.data.data.user.id;
    console.log(`✅ Login successful! User ID: ${userId}`);
    console.log(`   Token: ${jwtToken.substring(0, 30)}...\n`);

    // Step 2: Get user wallets
    console.log('📝 Step 2: Get connected wallets...');
    const walletsResponse = await axios.get(`${BASE_URL}/api/wallet-integration/wallets`, {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    });
    
    console.log(`✅ Wallets fetched! Found ${walletsResponse.data.data.wallets.length} wallets:`);
    walletsResponse.data.data.wallets.forEach((w, i) => {
      console.log(`   ${i + 1}. ${w.provider} - ID: ${w.id} - Email: ${w.accountEmail || 'N/A'}`);
    });
    console.log('');

    const wallets = walletsResponse.data.data.wallets;

    // Step 3: Test /api/paypal/send endpoint (if exists)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: /api/paypal/send endpoint');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      const paypalSendResponse = await axios.post(
        `${BASE_URL}/api/paypal/send`,
        {
          recipientEmail: 'test@example.com',
          amount: 10.00,
          currency: 'USD'
        },
        {
          headers: { 
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ SUCCESS:', paypalSendResponse.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('❌ ENDPOINT NOT FOUND (404)');
        console.log('   This endpoint does not exist on the backend');
      } else {
        console.log('❌ ERROR:', error.response?.data || error.message);
      }
    }

    // Step 4: Test /api/wallet-integration/transactions/transfer endpoint
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: /api/wallet-integration/transactions/transfer endpoint');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (wallets.length < 2) {
      console.log('⚠️  SKIPPED: Need at least 2 wallets connected');
      console.log('   Current wallets:', wallets.length);
      console.log('   Connect more wallets first');
    } else {
      try {
        const transferResponse = await axios.post(
          `${BASE_URL}/api/wallet-integration/transactions/transfer`,
          {
            fromWalletId: wallets[0].id,
            toWalletId: wallets[1].id,
            amount: 5.00,
            currency: 'USD',
            description: 'Test payment'
          },
          {
            headers: { 
              'Authorization': `Bearer ${jwtToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('✅ SUCCESS:', JSON.stringify(transferResponse.data, null, 2));
      } catch (error) {
        console.log('❌ ERROR:', error.response?.data || error.message);
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Login: SUCCESS');
    console.log('✅ Get Wallets: SUCCESS');
    console.log('❓ PayPal Send: Check logs above');
    console.log('❓ Transfer: Check logs above');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run tests
testEndpoints();
