const axios = require('axios');

const BASE_URL = 'https://qosynebackend.vercel.app/api';

// Test credentials
const TEST_USER = {
  email: 'test128@example.com',
  password: 'password'
};

async function testRapydIntegration() {
  console.log('🚀 Starting Rapyd Integration Test...\n');

  try {
    // Step 1: Test Rapyd Connection
    console.log('1️⃣ Testing Rapyd API connection...');
    const connectionTest = await axios.get(`${BASE_URL}/rapyd/test/connection`);
    console.log('✅ Rapyd Connection:', connectionTest.data.message);
    console.log('   Credentials:', connectionTest.data.data.credentials);
    console.log('   Environment:', connectionTest.data.data.environment);
    console.log('');

    // Step 2: Login User
    console.log('2️⃣ Testing user login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful!');
      console.log('   User ID:', loginResponse.data.data.user.id);
      console.log('   Email:', loginResponse.data.data.user.email);
      console.log('   Token:', loginResponse.data.data.token ? 'Present' : 'Missing');
      
      const authToken = loginResponse.data.data.token;
      const userId = loginResponse.data.data.user.id;
      console.log('');

      // Step 3: Create Rapyd Wallet for User
      console.log('3️⃣ Creating Rapyd wallet for user...');
      const walletResponse = await axios.post(`${BASE_URL}/rapyd/create-rapyd-wallet`, {
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+1234567890',
        country: 'US',
        nationality: 'US'
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (walletResponse.data.success) {
        console.log('✅ Rapyd wallet created!');
        console.log('   Wallet ID:', walletResponse.data.data.wallet.walletId);
        console.log('   Provider:', walletResponse.data.data.wallet.provider);
        console.log('   Balance:', walletResponse.data.data.wallet.balance);
        console.log('');

        const userWalletId = walletResponse.data.data.wallet.walletId;

        // Step 4: Get Admin Wallet Balance
        console.log('4️⃣ Checking admin wallet balance...');
        const adminBalanceResponse = await axios.get(`${BASE_URL}/rapyd/admin/wallet-balance`);
        
        if (adminBalanceResponse.data.success) {
          console.log('✅ Admin wallet found!');
          console.log('   Admin Wallet ID:', adminBalanceResponse.data.data.adminWalletId);
          console.log('   Admin Balance:', adminBalanceResponse.data.data.balance);
          console.log('   Fee per transaction:', `$${adminBalanceResponse.data.data.feePerTransaction}`);
          console.log('');
        }

        // Step 5: Create Test Wallet for Transfer
        console.log('5️⃣ Creating test recipient wallet...');
        const testWalletResponse = await axios.post(`${BASE_URL}/rapyd/test/create-wallet`, {
          firstName: 'Recipient',
          lastName: 'Test',
          email: 'recipient@test.com'
        });

        if (testWalletResponse.data.success) {
          console.log('✅ Test recipient wallet created!');
          console.log('   Recipient Wallet ID:', testWalletResponse.data.data.walletId);
          console.log('');

          const recipientWalletId = testWalletResponse.data.data.walletId;

          // Step 6: Test Transfer with Admin Fee (This would need real money in sandbox)
          console.log('6️⃣ Testing transfer with admin fee...');
          console.log('⚠️  Note: This requires funded wallets in Rapyd sandbox');
          console.log(`   Would transfer: $10.00 total`);
          console.log(`   Recipient gets: $9.25`);
          console.log(`   Admin fee: $0.75`);
          console.log('');

          // Uncomment below to test actual transfer (needs funded wallet)
          /*
          const transferResponse = await axios.post(`${BASE_URL}/rapyd/test/transfer`, {
            fromWalletId: userWalletId,
            toWalletId: recipientWalletId,
            amount: 10
          });
          
          if (transferResponse.data.success) {
            console.log('✅ Transfer successful!');
            console.log('   Transfer details:', transferResponse.data.data);
          }
          */

        }

      } else {
        console.log('❌ Wallet creation failed:', walletResponse.data.error);
      }

    } else {
      console.log('❌ Login failed:', loginResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n🏁 Rapyd Integration Test Complete!');
}

// Run the test
testRapydIntegration();
