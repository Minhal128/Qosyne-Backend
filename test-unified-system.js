/**
 * Unified Payment System Test Suite
 * Tests all providers and routing scenarios
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test credentials (you'll need to create these users first)
const TEST_USERS = {
  user1: {
    email: 'test1@qosyne.com',
    password: 'Test123!',
    token: null,
    id: null,
  },
  user2: {
    email: 'test2@qosyne.com',
    password: 'Test123!',
    token: null,
    id: null,
  },
};

/**
 * Helper: Login user
 */
async function login(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error(`Login failed for ${email}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Test 1: Get supported routes
 */
async function testSupportedRoutes(token) {
  console.log('\n📋 Test 1: Get Supported Routes');
  console.log('=================================');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/transactions/supported-routes`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ Supported Routes:');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 2: Get balance
 */
async function testGetBalance(token) {
  console.log('\n💰 Test 2: Get Balance');
  console.log('======================');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/transactions/balance`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ Balance Information:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 3: Get PayPal client token
 */
async function testGetClientToken(token) {
  console.log('\n🔑 Test 3: Get PayPal Client Token');
  console.log('===================================');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/transactions/client-token?provider=paypal`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ Client Token Generated (first 20 chars):', response.data.clientToken.substring(0, 20) + '...');
    return response.data.clientToken;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 4: Connect PayPal wallet
 */
async function testConnectPayPalWallet(token) {
  console.log('\n🔗 Test 4: Connect PayPal Wallet');
  console.log('=================================');
  
  try {
    // Note: In real scenario, you'd get paymentMethodNonce from frontend
    const response = await axios.post(
      `${BASE_URL}/api/transactions/connect-wallet`,
      {
        provider: 'PAYPAL',
        accountDetails: {
          email: 'paypal-test@example.com',
          name: 'PayPal Test Account',
          currency: 'USD',
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ PayPal Wallet Connected:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 5: Connect Wise wallet
 */
async function testConnectWiseWallet(token) {
  console.log('\n🔗 Test 5: Connect Wise Wallet');
  console.log('===============================');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/transactions/connect-wallet`,
      {
        provider: 'WISE',
        accountDetails: {
          email: 'wise-test@example.com',
          name: 'Wise Test Account',
          currency: 'USD',
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ Wise Wallet Connected:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 6: Connect Square wallet
 */
async function testConnectSquareWallet(token) {
  console.log('\n🔗 Test 6: Connect Square Wallet');
  console.log('=================================');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/transactions/connect-wallet`,
      {
        provider: 'SQUARE',
        accountDetails: {
          email: 'square-test@example.com',
          name: 'Square Test Account',
          currency: 'USD',
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ Square Wallet Connected:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 7: Get all transactions
 */
async function testGetTransactions(token) {
  console.log('\n📜 Test 7: Get Transaction History');
  console.log('===================================');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/transactions?limit=10`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ Transaction History:');
    console.log(`Total: ${response.data.total} transactions`);
    console.log(JSON.stringify(response.data.transactions.slice(0, 3), null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 8: Get sandbox links
 */
async function testGetSandboxLinks(token) {
  console.log('\n🔗 Test 8: Get Sandbox Links');
  console.log('=============================');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/sandbox/links`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ Sandbox Links:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 9: Get system stats
 */
async function testGetStats(token) {
  console.log('\n📊 Test 9: Get System Statistics');
  console.log('=================================');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/sandbox/stats`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ System Statistics:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 10: Get all sandbox transactions
 */
async function testGetSandboxTransactions(token) {
  console.log('\n📋 Test 10: Get All Sandbox Transactions');
  console.log('=========================================');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/sandbox/transactions?limit=10`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ Sandbox Transactions:');
    console.log(`Total: ${response.data.total} transactions`);
    console.log('Provider Stats:', JSON.stringify(response.data.providers, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Unified Payment System Tests');
  console.log('=========================================\n');

  try {
    // Login test user
    console.log('🔐 Logging in test user...');
    const loginResult = await login(TEST_USERS.user1.email, TEST_USERS.user1.password);
    
    if (!loginResult || !loginResult.token) {
      console.error('❌ Login failed. Please create test user first.');
      console.log('\nTo create test user, run:');
      console.log(`POST ${BASE_URL}/api/auth/register`);
      console.log(JSON.stringify({
        name: 'Test User 1',
        email: TEST_USERS.user1.email,
        password: TEST_USERS.user1.password,
      }, null, 2));
      return;
    }

    const token = loginResult.token;
    console.log('✅ Login successful!\n');

    // Run all tests
    await testSupportedRoutes(token);
    await testGetBalance(token);
    await testGetClientToken(token);
    await testConnectPayPalWallet(token);
    await testConnectWiseWallet(token);
    await testConnectSquareWallet(token);
    await testGetTransactions(token);
    await testGetSandboxLinks(token);
    await testGetStats(token);
    await testGetSandboxTransactions(token);

    console.log('\n✅ All tests completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. Check sandbox dashboards for transactions:');
    console.log('   - PayPal/Braintree: https://sandbox.braintreegateway.com/');
    console.log('   - Wise: https://sandbox.transferwise.tech/');
    console.log('   - Square: https://squareupsandbox.com/');
    console.log('\n2. To test actual transactions, you need to:');
    console.log('   - Get payment nonces from the frontend');
    console.log('   - Use the /api/transactions/send endpoint');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
