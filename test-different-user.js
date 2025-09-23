const axios = require('axios');

const BASE_URL = 'https://qosynebackend.vercel.app/api';

async function testWithDifferentUser() {
  console.log('🚀 Testing with different user credentials...\n');

  try {
    // Try creating a new unique user
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@qosyne.com`;
    const testPassword = 'TestPassword123!';

    console.log('1️⃣ Creating new unique test user...');
    console.log('   Email:', testEmail);
    console.log('   Password:', testPassword);

    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Rapyd Test User',
      email: testEmail,
      password: testPassword
    });

    if (registerResponse.data.success) {
      console.log('✅ New user created successfully!');
      console.log('   User ID:', registerResponse.data.data.user.id);
      console.log('   Email:', registerResponse.data.data.user.email);
      console.log('');

      // Login with new user
      console.log('2️⃣ Logging in with new user...');
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: testEmail,
        password: testPassword
      });

      if (loginResponse.data.success) {
        console.log('✅ Login successful!');
        console.log('   User ID:', loginResponse.data.data.user.id);
        console.log('   Token:', loginResponse.data.data.token ? 'Present' : 'Missing');
        console.log('   Verified:', loginResponse.data.data.user.isVerified);
        console.log('');

        const authToken = loginResponse.data.data.token;

        // Test Rapyd wallet creation
        console.log('3️⃣ Creating Rapyd wallet for new user...');
        const walletResponse = await axios.post(`${BASE_URL}/rapyd/create-rapyd-wallet`, {
          firstName: 'Rapyd',
          lastName: 'TestUser',
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
          console.log('✅ Rapyd wallet created successfully!');
          console.log('   Wallet ID:', walletResponse.data.data.wallet.walletId);
          console.log('   Provider:', walletResponse.data.data.wallet.provider);
          console.log('   Currency:', walletResponse.data.data.wallet.currency);
          console.log('   Balance:', walletResponse.data.data.wallet.balance);
          console.log('');

          // Check admin wallet
          console.log('4️⃣ Checking admin wallet status...');
          const adminResponse = await axios.get(`${BASE_URL}/rapyd/admin/wallet-balance`);
          
          if (adminResponse.data.success) {
            console.log('✅ Admin wallet ready!');
            console.log('   Admin Wallet ID:', adminResponse.data.data.adminWalletId);
            console.log('   Admin Balance:', `$${adminResponse.data.data.balance}`);
            console.log('   Fee per transaction:', `$${adminResponse.data.data.feePerTransaction}`);
            console.log('');

            console.log('🎉 RAPYD INTEGRATION FULLY WORKING!');
            console.log('');
            console.log('📋 Test Summary:');
            console.log('   ✅ User registration: Working');
            console.log('   ✅ User login: Working');
            console.log('   ✅ Rapyd API connection: Working');
            console.log('   ✅ User wallet creation: Working');
            console.log('   ✅ Admin wallet: Working');
            console.log('   ✅ Ready for real transfers with $0.75 admin fee!');
            console.log('');
            console.log('🔗 Use these credentials to test in frontend:');
            console.log(`   Email: ${testEmail}`);
            console.log(`   Password: ${testPassword}`);
            console.log(`   User Wallet ID: ${walletResponse.data.data.wallet.walletId}`);

          } else {
            console.log('❌ Admin wallet check failed:', adminResponse.data.error);
          }

        } else {
          console.log('❌ Rapyd wallet creation failed:', walletResponse.data.error);
        }

      } else {
        console.log('❌ Login failed:', loginResponse.data.message);
      }

    } else {
      console.log('❌ User creation failed:', registerResponse.data.message || registerResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n🏁 Test complete!');
}

testWithDifferentUser();
