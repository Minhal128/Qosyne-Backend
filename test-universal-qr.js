const axios = require('axios');

// Test configuration
const BASE_URL = 'https://qosyncebackend.vercel.app';
const TEST_JWT_TOKEN = 'your-jwt-token-here'; // Replace with valid token

class UniversalQRTest {
  constructor() {
    this.baseURL = BASE_URL;
    this.headers = {
      'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    this.supportedProviders = ['VENMO', 'WISE', 'GOOGLEPAY', 'SQUARE', 'PAYPAL'];
  }

  // Test connecting all wallet types and generating QR codes
  async testAllWalletProviders() {
    console.log('🚀 Testing Universal QR Generation for All Wallet Providers\n');
    console.log('=' .repeat(70));
    
    const results = {};
    
    for (const provider of this.supportedProviders) {
      try {
        console.log(`\n📱 Testing ${provider} Wallet...`);
        
        // Step 1: Connect wallet
        const wallet = await this.connectWallet(provider);
        
        // Step 2: Generate QR code
        const qrCode = await this.generateQRForWallet(wallet);
        
        // Step 3: Test one-step connect + QR generation
        const oneStepResult = await this.testOneStepConnectAndQR(provider);
        
        results[provider] = {
          wallet,
          qrCode,
          oneStepResult,
          status: 'SUCCESS'
        };
        
        console.log(`✅ ${provider} tests completed successfully`);
        
      } catch (error) {
        console.error(`❌ ${provider} tests failed:`, error.message);
        results[provider] = {
          status: 'FAILED',
          error: error.message
        };
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 Test Results Summary:');
    
    Object.entries(results).forEach(([provider, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`   ${status} ${provider}: ${result.status}`);
      if (result.qrCode) {
        console.log(`      QR ID: ${result.qrCode.id}`);
        console.log(`      Shareable URL: ${result.qrCode.shareableUrl}`);
      }
    });
    
    return results;
  }

  // Connect a specific wallet provider
  async connectWallet(provider) {
    const credentials = this.getTestCredentials(provider);
    
    const response = await axios.post(`${this.baseURL}/api/wallet-integration/wallets/connect`, {
      provider,
      authCode: credentials
    }, { headers: this.headers });

    console.log(`   ✅ ${provider} wallet connected`);
    console.log(`      Wallet ID: ${response.data.data.wallet.walletId}`);
    console.log(`      Display Name: ${response.data.data.wallet.fullName}`);
    console.log(`      Username: ${response.data.data.wallet.username || 'N/A'}`);

    return response.data.data.wallet;
  }

  // Generate QR code for a connected wallet
  async generateQRForWallet(wallet) {
    const response = await axios.post(`${this.baseURL}/api/wallet-integration/qr/universal`, {
      walletId: wallet.walletId,
      amount: 25.50,
      description: `Payment request for ${wallet.provider} - Coffee money ☕`,
      expiresIn: 3600
    }, { headers: this.headers });

    console.log(`   ✅ QR code generated for ${wallet.provider}`);
    console.log(`      QR ID: ${response.data.data.qrCode.id}`);
    console.log(`      Type: ${response.data.data.qrCode.type}`);
    console.log(`      Amount: $${response.data.data.qrCode.amount}`);
    console.log(`      Provider: ${response.data.data.qrCode.provider}`);

    // Display provider-specific instructions
    console.log(`      Instructions:`);
    response.data.data.qrCode.instructions.forEach((instruction, index) => {
      console.log(`        ${instruction}`);
    });

    return response.data.data.qrCode;
  }

  // Test one-step connect and QR generation
  async testOneStepConnectAndQR(provider) {
    const credentials = this.getTestCredentials(provider);
    
    const response = await axios.post(`${this.baseURL}/api/wallet-integration/qr/connect-and-generate`, {
      provider,
      credentials,
      amount: 15.75,
      description: `One-step ${provider} payment request 🚀`
    }, { headers: this.headers });

    console.log(`   ✅ One-step connect+QR for ${provider}`);
    console.log(`      Wallet: ${response.data.data.wallet.walletId}`);
    console.log(`      QR: ${response.data.data.qrCode.id}`);

    return response.data.data;
  }

  // Get test credentials for each provider
  getTestCredentials(provider) {
    const credentials = {
      VENMO: JSON.stringify({
        username: 'demo',
        password: 'demo123'
      }),
      WISE: JSON.stringify({
        connectionType: 'email',
        identifier: 'demo@wise.com',
        country: 'US'
      }),
      GOOGLEPAY: JSON.stringify({
        email: 'demo@gmail.com',
        phone: '+1234567890'
      }),
      SQUARE: JSON.stringify({
        identifier: 'demo@square.com'
      }),
      PAYPAL: JSON.stringify({
        email: 'demo@paypal.com',
        password: 'demo123'
      })
    };

    return credentials[provider] || JSON.stringify({ identifier: 'demo' });
  }

  // Test QR code scanning for different providers
  async testQRScanning(qrId, provider) {
    console.log(`\n📱 Testing QR Scanning for ${provider}...`);
    
    try {
      const response = await axios.post(`${this.baseURL}/api/wallet-integration/qr/scan/${qrId}`, {
        scannerInfo: {
          appName: provider,
          version: '1.0.0',
          platform: 'iOS'
        },
        ip: '192.168.1.100',
        userAgent: `${provider}/1.0.0 (iPhone; iOS 16.0)`
      });

      console.log(`   ✅ QR scan simulation successful for ${provider}`);
      console.log(`      Status: ${response.data.data.scanResult.status}`);
      console.log(`      Next Steps: ${response.data.data.scanResult.nextSteps}`);

      return response.data.data.scanResult;
    } catch (error) {
      console.error(`   ❌ QR scan failed for ${provider}:`, error.message);
      throw error;
    }
  }

  // Test getting all user QR codes
  async testGetAllQRCodes() {
    console.log('\n📋 Testing Get All User QR Codes...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/wallet-integration/qr?limit=20`, {
        headers: this.headers
      });

      console.log('✅ All QR codes retrieved');
      console.log(`   Total: ${response.data.data.total}`);
      console.log(`   Active: ${response.data.data.data.filter(qr => qr.status === 'ACTIVE').length}`);

      // Group by provider
      const byProvider = {};
      response.data.data.data.forEach(qr => {
        // Parse payload to get provider info
        try {
          const payload = JSON.parse(qr.payload || '{}');
          const provider = payload.provider || 'UNKNOWN';
          if (!byProvider[provider]) byProvider[provider] = 0;
          byProvider[provider]++;
        } catch (e) {
          if (!byProvider['UNKNOWN']) byProvider['UNKNOWN'] = 0;
          byProvider['UNKNOWN']++;
        }
      });

      console.log('   QR codes by provider:');
      Object.entries(byProvider).forEach(([provider, count]) => {
        console.log(`      ${provider}: ${count}`);
      });

      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to get QR codes:', error.message);
      throw error;
    }
  }

  // Comprehensive test suite
  async runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive Universal QR Test Suite\n');
    
    try {
      // Test 1: All wallet providers
      const providerResults = await this.testAllWalletProviders();
      
      // Test 2: QR code scanning
      const successfulProviders = Object.entries(providerResults)
        .filter(([_, result]) => result.status === 'SUCCESS')
        .map(([provider, result]) => ({ provider, qrCode: result.qrCode }));

      if (successfulProviders.length > 0) {
        console.log('\n📱 Testing QR Code Scanning...');
        for (const { provider, qrCode } of successfulProviders.slice(0, 2)) { // Test first 2
          await this.testQRScanning(qrCode.id, provider);
        }
      }
      
      // Test 3: Get all QR codes
      await this.testGetAllQRCodes();
      
      console.log('\n🎉 Comprehensive test suite completed!');
      
      // Summary
      const successCount = Object.values(providerResults).filter(r => r.status === 'SUCCESS').length;
      console.log(`\n📊 Final Results: ${successCount}/${this.supportedProviders.length} providers working`);
      
      return providerResults;
      
    } catch (error) {
      console.error('\n❌ Comprehensive test suite failed:', error.message);
      throw error;
    }
  }
}

// Quick test for specific provider
async function testSpecificProvider(provider = 'VENMO') {
  console.log(`🧪 Quick Test for ${provider}\n`);
  
  const testData = {
    provider,
    credentials: provider === 'VENMO' 
      ? JSON.stringify({ username: 'demo', password: 'demo123' })
      : JSON.stringify({ identifier: 'demo@example.com' }),
    amount: 20.00,
    description: `${provider} payment request`
  };

  try {
    const response = await axios.post(`${BASE_URL}/api/wallet-integration/qr/connect-and-generate`, testData, {
      headers: {
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ ${provider} test successful!`);
    console.log('Wallet:', response.data.data.wallet.walletId);
    console.log('QR Code:', response.data.data.qrCode.id);
    console.log('Instructions:', response.data.data.qrCode.instructions);
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ ${provider} test failed:`);
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
  }
}

// Export for use
module.exports = {
  UniversalQRTest,
  testSpecificProvider
};

// Run tests if executed directly
if (require.main === module) {
  console.log('Universal QR Code Test Suite');
  console.log('Supports: Venmo, Wise, Google Pay, Square, PayPal');
  console.log('Please update TEST_JWT_TOKEN with your valid JWT token\n');
  
  const test = new UniversalQRTest();
  
  // Quick test for Venmo
  testSpecificProvider('VENMO').then(() => {
    console.log('\nTo run full test suite, uncomment the line below:');
    console.log('// test.runComprehensiveTests().catch(console.error);');
  });
  
  // Uncomment to run full test suite:
  // test.runComprehensiveTests().catch(console.error);
}
