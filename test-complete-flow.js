const axios = require('axios');

const BASE_URL = 'https://qosynebackend.vercel.app';

// UPDATE THESE WITH YOUR REAL CREDENTIALS
const TEST_USER = {
  email: 'test128@example.com',
  password: 'password123'
};

let jwtToken = null;
let userId = null;

async function fullTest() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 COMPLETE WALLET & TRANSFER TEST');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Login
    console.log('📝 Step 1: Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
    jwtToken = loginResponse.data.data.token;
    userId = loginResponse.data.data.user.id;
    console.log(`✅ Login successful! User ID: ${userId}\n`);

    // Step 2: Get existing wallets
    console.log('📝 Step 2: Get existing wallets...');
    const walletsResponse = await axios.get(`${BASE_URL}/api/wallet-integration/wallets`, {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    });
    
    let wallets = walletsResponse.data.data.wallets;
    console.log(`✅ Found ${wallets.length} existing wallets:`);
    wallets.forEach((w, i) => {
      console.log(`   ${i + 1}. ID: ${w.id} | ${w.provider} | ${w.accountEmail || 'N/A'}`);
    });
    console.log('');

    // Step 3: If less than 2 wallets, show how to connect
    if (wallets.length < 2) {
      console.log('⚠️  You need at least 2 wallets to test transfer!');
      console.log('   Current: ' + wallets.length + ' wallet(s)');
      console.log('\n📋 To connect wallets, use these endpoints:\n');
      
      console.log('For Venmo:');
      console.log('POST ' + BASE_URL + '/api/wallet-integration/wallets/connect');
      console.log('Headers: Authorization: Bearer ' + jwtToken.substring(0, 20) + '...');
      console.log('Body:');
      console.log(JSON.stringify({
        provider: 'VENMO',
        authCode: '{"paymentMethodNonce":"fake-venmo-account-nonce","customerInfo":{"email":"user@venmo.com","firstName":"Test","lastName":"User"}}'
      }, null, 2));
      
      console.log('\nFor PayPal:');
      console.log('POST ' + BASE_URL + '/api/wallet-integration/wallets/connect');
      console.log('Headers: Authorization: Bearer ' + jwtToken.substring(0, 20) + '...');
      console.log('Body:');
      console.log(JSON.stringify({
        provider: 'PAYPAL',
        authCode: '{"paymentMethodNonce":"fake-paypal-account-nonce","connectionType":"BRAINTREE","paypalDetails":{"email":"user@paypal.com","firstName":"Test","lastName":"User"}}'
      }, null, 2));
      
      console.log('\n⚠️  CANNOT TEST TRANSFER - Need 2+ wallets');
      return;
    }

    // Step 4: Test transfer between wallets
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Step 3: Testing Money Transfer');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const fromWallet = wallets[0];
    const toWallet = wallets[1];
    
    console.log(`From: ID ${fromWallet.id} - ${fromWallet.provider} (${fromWallet.accountEmail})`);
    console.log(`To:   ID ${toWallet.id} - ${toWallet.provider} (${toWallet.accountEmail})`);
    console.log('Amount: $5.00 USD\n');

    const transferPayload = {
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      amount: 5.00,
      currency: 'USD',
      description: 'Test payment from API test script'
    };

    console.log('Request Body:', JSON.stringify(transferPayload, null, 2));
    console.log('\nSending request...\n');

    try {
      const transferResponse = await axios.post(
        `${BASE_URL}/api/wallet-integration/transactions/transfer`,
        transferPayload,
        {
          headers: { 
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ TRANSFER SUCCESSFUL!\n');
      console.log('Response:');
      console.log(JSON.stringify(transferResponse.data, null, 2));
      
    } catch (error) {
      console.log('❌ TRANSFER FAILED!\n');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Error:', JSON.stringify(error.response.data, null, 2));
        
        if (error.response.status === 404) {
          console.log('\n🔍 Debugging Info:');
          console.log('   The wallet IDs might not belong to this user');
          console.log('   User ID:', userId);
          console.log('   From Wallet ID:', fromWallet.id);
          console.log('   To Wallet ID:', toWallet.id);
        }
      } else {
        console.log('Error:', error.message);
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('User Email:', TEST_USER.email);
    console.log('User ID:', userId);
    console.log('JWT Token:', jwtToken.substring(0, 30) + '...');
    console.log('Total Wallets:', wallets.length);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🎯 CORRECT ENDPOINTS FOR FRONTEND:');
    console.log('\n1. Login:');
    console.log('   POST ' + BASE_URL + '/api/auth/login');
    console.log('   Body: { "email": "...", "password": "..." }');
    
    console.log('\n2. Get Wallets:');
    console.log('   GET ' + BASE_URL + '/api/wallet-integration/wallets');
    console.log('   Headers: Authorization: Bearer {token}');
    
    console.log('\n3. Transfer Money:');
    console.log('   POST ' + BASE_URL + '/api/wallet-integration/transactions/transfer');
    console.log('   Headers: Authorization: Bearer {token}');
    console.log('   Body: {');
    console.log('     "fromWalletId": 1,  ← Use wallet.id from step 2');
    console.log('     "toWalletId": 2,    ← Use wallet.id from step 2');
    console.log('     "amount": 5.00,');
    console.log('     "currency": "USD",');
    console.log('     "description": "Payment"');
    console.log('   }');
    
    console.log('\n❌ DO NOT use: /api/paypal/send (does not exist)');
    console.log('❌ DO NOT pass: accessToken or clientToken in body');
    console.log('✅ ONLY use: JWT token in Authorization header\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run test
fullTest();
