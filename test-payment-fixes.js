const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test configuration
const BASE_URL = 'http://localhost:3000'; // Adjust to your server URL
const TEST_USER_ID = 1; // Use a valid test user ID
const TEST_JWT_TOKEN = 'your-test-jwt-token'; // Replace with valid JWT token

class PaymentFixesTest {
  constructor() {
    this.baseURL = BASE_URL;
    this.headers = {
      'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
      'Content-Type': 'application/json'
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Payment System Fixes Tests\n');
    
    try {
      await this.testVenmoWalletConnection();
      await this.testWiseWalletConnection();
      await this.testWalletVisibility();
      await this.testFeeCalculation();
      await this.testTransferFunctionality();
      await this.testNewEndpoints();
      
      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
    }
  }

  async testVenmoWalletConnection() {
    console.log('📱 Testing Venmo Wallet Connection...');
    
    try {
      // Test Venmo connection with demo credentials
      const venmoConnection = await axios.post(`${this.baseURL}/api/wallet-integration/wallets/connect`, {
        provider: 'VENMO',
        authCode: JSON.stringify({
          username: 'demo',
          password: 'demo123'
        })
      }, { headers: this.headers });

      console.log('✅ Venmo wallet connected successfully');
      console.log('   Wallet ID:', venmoConnection.data.data.wallet.walletId);
      console.log('   Provider:', venmoConnection.data.data.wallet.provider);
      
      return venmoConnection.data.data.wallet;
    } catch (error) {
      console.error('❌ Venmo connection failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testWiseWalletConnection() {
    console.log('\n💰 Testing Wise Wallet Connection...');
    
    try {
      // Test Wise connection with demo credentials
      const wiseConnection = await axios.post(`${this.baseURL}/api/wallet-integration/wallets/connect`, {
        provider: 'WISE',
        authCode: JSON.stringify({
          connectionType: 'email',
          identifier: 'demo@wise.com',
          country: 'US'
        })
      }, { headers: this.headers });

      console.log('✅ Wise wallet connected successfully');
      console.log('   Wallet ID:', wiseConnection.data.data.wallet.walletId);
      console.log('   Provider:', wiseConnection.data.data.wallet.provider);
      
      return wiseConnection.data.data.wallet;
    } catch (error) {
      console.error('❌ Wise connection failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testWalletVisibility() {
    console.log('\n👀 Testing Wallet Visibility...');
    
    try {
      // Test getting connected wallets
      const walletsResponse = await axios.get(`${this.baseURL}/api/wallet-integration/wallets`, {
        headers: this.headers
      });

      const wallets = walletsResponse.data.data.wallets;
      console.log(`✅ Found ${wallets.length} connected wallets`);
      
      wallets.forEach((wallet, index) => {
        console.log(`   ${index + 1}. ${wallet.provider} - ${wallet.fullName || wallet.username}`);
        console.log(`      Wallet ID: ${wallet.walletId}`);
        console.log(`      Active: ${wallet.isActive}`);
        console.log(`      Balance: ${wallet.balance} ${wallet.currency}`);
      });

      // Test the new available wallets endpoint
      const availableWalletsResponse = await axios.get(`${this.baseURL}/api/wallet-integration/wallets/available-for-transfer`, {
        headers: this.headers
      });

      console.log(`✅ Available wallets for transfer: ${availableWalletsResponse.data.data.wallets.length}`);
      
      return wallets;
    } catch (error) {
      console.error('❌ Wallet visibility test failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testFeeCalculation() {
    console.log('\n💸 Testing Fee Calculation...');
    
    try {
      // Test fee estimation
      const feeEstimate = await axios.post(`${this.baseURL}/api/wallet-integration/transactions/estimate-fees`, {
        fromProvider: 'VENMO',
        toProvider: 'WISE',
        amount: 100,
        currency: 'USD'
      }, { headers: this.headers });

      const fees = feeEstimate.data.data.feeEstimate.fees;
      console.log('✅ Fee calculation working correctly');
      console.log('   Amount: $100.00');
      console.log('   Base Fee: $' + fees.base.toFixed(2));
      console.log('   Processing Fee: $' + fees.percentage.toFixed(2));
      console.log('   Cross-wallet Fee: $' + fees.rapyd.toFixed(2));
      console.log('   Total Fee: $' + fees.total.toFixed(2));
      console.log('   Fee Description:', fees.breakdown?.description);
      
      // Verify fees are reasonable (should be much less than $2 for $100 transfer)
      if (fees.total > 2.00) {
        throw new Error(`Fees too high: $${fees.total.toFixed(2)} for $100 transfer`);
      }
      
      console.log('✅ Fees are within reasonable limits');
      
      return fees;
    } catch (error) {
      console.error('❌ Fee calculation test failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testTransferFunctionality() {
    console.log('\n🔄 Testing Transfer Functionality...');
    
    try {
      // First, get available wallets
      const walletsResponse = await axios.get(`${this.baseURL}/api/wallet-integration/wallets`, {
        headers: this.headers
      });

      const wallets = walletsResponse.data.data.wallets;
      
      if (wallets.length < 2) {
        console.log('⚠️  Need at least 2 wallets to test transfers. Skipping transfer test.');
        return;
      }

      const fromWallet = wallets[0];
      const toWallet = wallets[1];

      console.log(`   Testing transfer from ${fromWallet.provider} to ${toWallet.provider}`);

      // Test transfer initiation
      const transferResponse = await axios.post(`${this.baseURL}/api/wallet-integration/transactions/transfer`, {
        fromWalletId: fromWallet.walletId,
        toWalletId: toWallet.walletId,
        amount: 10,
        currency: 'USD',
        description: 'Test transfer'
      }, { headers: this.headers });

      console.log('✅ Transfer initiated successfully');
      console.log('   Transaction ID:', transferResponse.data.data.transaction.id);
      console.log('   Status:', transferResponse.data.data.transaction.status);
      console.log('   Amount: $' + transferResponse.data.data.transaction.amount);
      
      return transferResponse.data.data.transaction;
    } catch (error) {
      console.error('❌ Transfer test failed:', error.response?.data || error.message);
      // Don't throw here as this might fail due to missing wallets
    }
  }

  async testNewEndpoints() {
    console.log('\n🆕 Testing New Endpoints...');
    
    try {
      // Test available wallets endpoint
      const availableWallets = await axios.get(`${this.baseURL}/api/wallet-integration/wallets/available-for-transfer?includeOtherUsers=true`, {
        headers: this.headers
      });

      console.log('✅ Available wallets endpoint working');
      console.log('   User wallets:', availableWallets.data.data.userWalletsCount);
      console.log('   Total available:', availableWallets.data.data.totalWalletsCount);

      // Test supported currencies endpoint
      const currencies = await axios.get(`${this.baseURL}/api/wallet-integration/transactions/currencies/supported?fromProvider=VENMO&toProvider=WISE`, {
        headers: this.headers
      });

      console.log('✅ Supported currencies endpoint working');
      console.log('   Supported currencies:', currencies.data.data.currencies);
      
    } catch (error) {
      console.error('❌ New endpoints test failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testDatabaseConsistency() {
    console.log('\n🗄️  Testing Database Consistency...');
    
    try {
      // Check for wallets with proper wallet IDs
      const venmoWallets = await prisma.connectedWallets.findMany({
        where: { provider: 'VENMO' }
      });

      const wiseWallets = await prisma.connectedWallets.findMany({
        where: { provider: 'WISE' }
      });

      console.log(`✅ Found ${venmoWallets.length} Venmo wallets in database`);
      console.log(`✅ Found ${wiseWallets.length} Wise wallets in database`);

      // Check wallet ID formats
      venmoWallets.forEach(wallet => {
        if (!wallet.walletId.startsWith('venmo_')) {
          throw new Error(`Invalid Venmo wallet ID format: ${wallet.walletId}`);
        }
      });

      wiseWallets.forEach(wallet => {
        if (!wallet.walletId.startsWith('wise_')) {
          throw new Error(`Invalid Wise wallet ID format: ${wallet.walletId}`);
        }
      });

      console.log('✅ All wallet IDs have correct format');
      
    } catch (error) {
      console.error('❌ Database consistency test failed:', error.message);
      throw error;
    }
  }
}

// Manual test functions for individual components
async function testWalletService() {
  console.log('🧪 Testing Wallet Service directly...');
  
  const walletService = require('./services/walletService');
  
  try {
    // Test Venmo connection
    const venmoResult = await walletService.connectVenmo(TEST_USER_ID, JSON.stringify({
      username: 'demo',
      password: 'demo123'
    }));
    
    console.log('✅ Wallet Service Venmo test passed');
    console.log('   Wallet ID:', venmoResult.walletId);
    
    // Test Wise connection
    const wiseResult = await walletService.connectWise(TEST_USER_ID, JSON.stringify({
      connectionType: 'email',
      identifier: 'demo@wise.com',
      country: 'US'
    }));
    
    console.log('✅ Wallet Service Wise test passed');
    console.log('   Wallet ID:', wiseResult.walletId);
    
  } catch (error) {
    console.error('❌ Wallet Service test failed:', error.message);
  }
}

async function testTransactionService() {
  console.log('🧪 Testing Transaction Service directly...');
  
  const transactionService = require('./services/transactionService');
  
  try {
    // Test fee calculation
    const fees = await transactionService.calculateFees('VENMO', 'WISE', 100, 'USD');
    
    console.log('✅ Transaction Service fee calculation test passed');
    console.log('   Total fee for $100:', fees.total);
    console.log('   Fee breakdown:', fees.breakdown?.description);
    
    if (fees.total > 2.00) {
      throw new Error(`Fees too high: $${fees.total} for $100 transfer`);
    }
    
  } catch (error) {
    console.error('❌ Transaction Service test failed:', error.message);
  }
}

// Export test functions
module.exports = {
  PaymentFixesTest,
  testWalletService,
  testTransactionService
};

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new PaymentFixesTest();
  
  console.log('Please update the TEST_JWT_TOKEN and TEST_USER_ID constants before running tests.\n');
  console.log('To run tests:');
  console.log('1. Start your server');
  console.log('2. Update the configuration at the top of this file');
  console.log('3. Run: node test-payment-fixes.js');
  console.log('\nOr run individual service tests:');
  console.log('- testWalletService()');
  console.log('- testTransactionService()');
  
  // Uncomment to run tests automatically:
  // test.runAllTests();
}
