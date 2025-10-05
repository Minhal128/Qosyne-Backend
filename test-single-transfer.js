const axios = require('axios');

const TEST_CONFIG = {
  baseUrl: 'https://qosynebackend.vercel.app',
  rapydBaseUrl: 'https://qosynebackend.vercel.app/api/rapyd',
  testUser: {
    email: 'test128@example.com',
    password: 'password123',
    userId: null,
    token: null
  }
};

async function testSingleTransfer() {
  console.log('🧪 Testing Single Rapyd Transfer...');
  
  try {
    // Step 1: Authenticate
    console.log('\n🔐 Step 1: Authenticating...');
    const loginResponse = await axios.post(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password
    });
    
    if (loginResponse.data.data && loginResponse.data.data.token) {
      TEST_CONFIG.testUser.token = loginResponse.data.data.token;
      TEST_CONFIG.testUser.userId = loginResponse.data.data.user.id;
      console.log('✅ Authentication successful!');
      console.log('- User ID:', TEST_CONFIG.testUser.userId);
    } else {
      throw new Error('Authentication failed');
    }
    
    // Step 2: Get connected wallets
    console.log('\n📱 Step 2: Getting connected wallets...');
    const walletsResponse = await axios.get(`${TEST_CONFIG.rapydBaseUrl}/wallets`, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.testUser.token}`
      }
    });
    
    if (walletsResponse.data.status_code === 200) {
      const wallets = walletsResponse.data.data.wallets;
      console.log(`✅ Found ${wallets.length} connected wallets`);
      
      if (wallets.length === 0) {
        throw new Error('No connected wallets found');
      }
      
      // Use the first wallet
      const sourceWallet = wallets[0];
      console.log(`- Using wallet: ${sourceWallet.provider} (ID: ${sourceWallet.id})`);
      
      // Step 3: Execute a simple transfer
      console.log('\n💸 Step 3: Executing transfer...');
      const transferData = {
        toWalletId: 'wise_receiver_60_1758620967206',
        amount: 10, // Small test amount
        currency: 'USD',
        description: 'Test transfer from Qosyne',
        sourceWalletId: sourceWallet.id,
        targetWalletType: 'wise'
      };
      
      console.log('Transfer details:', JSON.stringify(transferData, null, 2));
      
      const transferResponse = await axios.post(`${TEST_CONFIG.rapydBaseUrl}/transfer`, transferData, {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.testUser.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (transferResponse.status === 201) {
        const result = transferResponse.data.data;
        console.log('\n🎉 TRANSFER SUCCESSFUL!');
        console.log('- Transaction ID:', result.transactionId);
        console.log('- Rapyd ID:', result.rapydTransactionId);
        console.log('- Status:', result.status);
        console.log('- Amount:', result.amount);
        console.log('- Description:', result.description);
        console.log('- Estimated Delivery:', result.estimatedDelivery);
        
        return true;
      }
      
    } else {
      throw new Error('Failed to get connected wallets');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

if (require.main === module) {
  testSingleTransfer()
    .then(success => {
      if (success) {
        console.log('\n🎊 Single transfer test completed successfully!');
      } else {
        console.log('\n💥 Single transfer test failed!');
      }
    })
    .catch(console.error);
}
