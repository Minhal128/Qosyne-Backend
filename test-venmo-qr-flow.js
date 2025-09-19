const axios = require('axios');

// Test configuration for your specific use case
const BASE_URL = 'https://qosyncebackend.vercel.app';
const TEST_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTczNzI3NzI4MSwiZXhwIjoxNzM3MzYzNjgxfQ.your-actual-token'; // Replace with your valid token

class VenmoQRFlowTest {
  constructor() {
    this.baseURL = BASE_URL;
    this.headers = {
      'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
      'Content-Type': 'application/json'
    };
  }

  // Test the complete flow: Connect Venmo + Generate QR in one step
  async testCompleteVenmoQRFlow() {
    console.log('🚀 Testing Complete Venmo QR Flow (Connect + Generate QR)\n');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/wallet-integration/qr/connect-and-generate`, {
        provider: 'VENMO',
        credentials: JSON.stringify({
          username: 'demo',
          password: 'demo123'
        }),
        amount: 25.50,
        description: 'Coffee payment ☕ - Share this QR with friends!'
      }, { headers: this.headers });

      console.log('✅ Complete flow successful!');
      console.log('\n📱 Wallet Information:');
      console.log('   Provider:', response.data.data.wallet.provider);
      console.log('   Wallet ID:', response.data.data.wallet.walletId);
      console.log('   Display Name:', response.data.data.wallet.fullName);
      console.log('   Username:', response.data.data.wallet.username);
      console.log('   Status:', response.data.data.wallet.isActive ? 'Active' : 'Inactive');

      console.log('\n🎯 QR Code Information:');
      console.log('   QR ID:', response.data.data.qrCode.id);
      console.log('   Type:', response.data.data.qrCode.type);
      console.log('   Amount: $' + response.data.data.qrCode.amount);
      console.log('   Description:', response.data.data.qrCode.description);
      console.log('   Expires:', response.data.data.qrCode.expiresAt);
      
      if (response.data.data.qrCode.venmoUsername) {
        console.log('   Venmo Username: @' + response.data.data.qrCode.venmoUsername);
      }
      
      if (response.data.data.qrCode.shareableUrl) {
        console.log('   Shareable URL:', response.data.data.qrCode.shareableUrl);
      }

      console.log('\n📋 Instructions for your friends:');
      response.data.data.qrCode.instructions.forEach((instruction, index) => {
        console.log(`   ${instruction}`);
      });

      // Parse and display the QR payload
      if (response.data.data.qrCode.payload) {
        const payload = JSON.parse(response.data.data.qrCode.payload);
        console.log('\n🔍 QR Code Payload Details:');
        console.log('   Version:', payload.version);
        console.log('   Type:', payload.type);
        
        if (payload.venmoInfo) {
          console.log('   Venmo Username:', payload.venmoInfo.username);
          console.log('   Display Name:', payload.venmoInfo.displayName);
        }
        
        if (payload.venmoDeepLink) {
          console.log('   Venmo Deep Link:', payload.venmoDeepLink);
        }
      }

      return response.data.data;
      
    } catch (error) {
      console.error('❌ Complete flow failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Test connecting Venmo wallet separately
  async testVenmoConnection() {
    console.log('\n🔗 Testing Venmo Wallet Connection...\n');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/wallet-integration/wallets/connect`, {
        provider: 'VENMO',
        authCode: JSON.stringify({
          username: 'demo',
          password: 'demo123'
        })
      }, { headers: this.headers });

      console.log('✅ Venmo wallet connected successfully');
      console.log('   Wallet ID:', response.data.data.wallet.walletId);
      console.log('   Full Name:', response.data.data.wallet.fullName);
      console.log('   Username:', response.data.data.wallet.username);
      console.log('   Account Email:', response.data.data.wallet.accountEmail);
      console.log('   Currency:', response.data.data.wallet.currency);
      console.log('   Balance: $' + response.data.data.wallet.balance);

      return response.data.data.wallet;
      
    } catch (error) {
      console.error('❌ Venmo connection failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Test generating QR for existing Venmo wallet
  async testVenmoQRGeneration(walletId) {
    console.log('\n🎯 Testing Venmo QR Generation...\n');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/wallet-integration/qr/venmo`, {
        walletId: walletId,
        amount: 15.75,
        description: 'Lunch split 🍕',
        expiresIn: 7200 // 2 hours
      }, { headers: this.headers });

      console.log('✅ Venmo QR generated successfully');
      console.log('   QR ID:', response.data.data.qrCode.id);
      console.log('   Amount: $' + response.data.data.qrCode.amount);
      console.log('   Description:', response.data.data.qrCode.description);
      console.log('   Venmo Username: @' + response.data.data.qrCode.venmoUsername);
      console.log('   Display Name:', response.data.data.qrCode.displayName);
      console.log('   Shareable URL:', response.data.data.qrCode.shareableUrl);
      console.log('   Expires:', response.data.data.qrCode.expiresAt);

      return response.data.data.qrCode;
      
    } catch (error) {
      console.error('❌ Venmo QR generation failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Test the original QR generation endpoint
  async testOriginalQREndpoint(walletId) {
    console.log('\n🔧 Testing Original QR Generation Endpoint...\n');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/wallet-integration/qr/generate`, {
        type: 'PAYMENT_REQUEST',
        amount: 30.00,
        currency: 'USD',
        description: 'Dinner payment 🍽️',
        destinationWalletId: walletId,
        expiresIn: 3600,
        metadata: {
          category: 'food',
          splitBill: true
        }
      }, { headers: this.headers });

      console.log('✅ Original QR endpoint working');
      console.log('   QR ID:', response.data.data.qrCode.id);
      console.log('   Type:', response.data.data.qrCode.type);
      console.log('   Expires:', response.data.data.qrCode.expiresAt);

      return response.data.data.qrCode;
      
    } catch (error) {
      console.error('❌ Original QR endpoint failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Test getting user's QR codes
  async testGetUserQRCodes() {
    console.log('\n📋 Testing Get User QR Codes...\n');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/wallet-integration/qr?type=PAYMENT_REQUEST&limit=5`, {
        headers: this.headers
      });

      console.log('✅ User QR codes retrieved');
      console.log('   Total QR codes:', response.data.data.total);
      console.log('   Showing:', response.data.data.data.length);

      response.data.data.data.forEach((qr, index) => {
        console.log(`   ${index + 1}. ${qr.type} - $${qr.amount} - ${qr.status} - ${qr.description}`);
      });

      return response.data.data;
      
    } catch (error) {
      console.error('❌ Get QR codes failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Test QR code scanning simulation
  async testQRScanning(qrId) {
    console.log('\n📱 Testing QR Code Scanning...\n');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/wallet-integration/qr/scan/${qrId}`, {
        scannerInfo: {
          appName: 'Venmo',
          version: '8.0.0',
          platform: 'iOS'
        },
        ip: '192.168.1.100',
        userAgent: 'Venmo/8.0.0 (iPhone; iOS 16.0)'
      });

      console.log('✅ QR scan simulation successful');
      console.log('   Scan ID:', response.data.data.scanResult.scanId);
      console.log('   Status:', response.data.data.scanResult.status);
      console.log('   Next Steps:', response.data.data.scanResult.nextSteps);
      
      if (response.data.data.scanResult.redirectUrl) {
        console.log('   Redirect URL:', response.data.data.scanResult.redirectUrl);
      }

      return response.data.data.scanResult;
      
    } catch (error) {
      console.error('❌ QR scan simulation failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Run all tests in sequence
  async runAllTests() {
    console.log('🚀 Starting Complete Venmo QR Flow Tests\n');
    console.log('=' .repeat(60));
    
    try {
      // Test 1: Complete flow (connect + generate QR)
      const completeFlowResult = await this.testCompleteVenmoQRFlow();
      
      // Test 2: Separate connection
      const wallet = await this.testVenmoConnection();
      
      // Test 3: Generate QR for existing wallet
      const qrCode = await this.testVenmoQRGeneration(wallet.walletId);
      
      // Test 4: Original endpoint
      await this.testOriginalQREndpoint(wallet.walletId);
      
      // Test 5: Get user QR codes
      await this.testGetUserQRCodes();
      
      // Test 6: Simulate QR scanning
      await this.testQRScanning(qrCode.id);
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ All tests completed successfully!');
      console.log('\n🎉 Your Venmo QR flow is working perfectly!');
      console.log('\nKey endpoints for your use case:');
      console.log('1. Connect + Generate QR: POST /api/wallet-integration/qr/connect-and-generate');
      console.log('2. Connect Wallet Only: POST /api/wallet-integration/wallets/connect');
      console.log('3. Generate Venmo QR: POST /api/wallet-integration/qr/venmo');
      console.log('4. Original QR Generate: POST /api/wallet-integration/qr/generate');
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
    }
  }
}

// Quick test function for your specific endpoint
async function testYourEndpoint() {
  console.log('🧪 Testing Your Specific Endpoint\n');
  
  const testData = {
    provider: 'VENMO',
    credentials: JSON.stringify({
      username: 'demo',
      password: 'demo123'
    }),
    amount: 20.00,
    description: 'Payment request from friend'
  };

  try {
    const response = await axios.post(`${BASE_URL}/api/wallet-integration/qr/connect-and-generate`, testData, {
      headers: {
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Your endpoint is working!');
    console.log('Wallet connected:', response.data.data.wallet.walletId);
    console.log('QR generated:', response.data.data.qrCode.id);
    console.log('Shareable URL:', response.data.data.qrCode.shareableUrl);
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Your endpoint failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
    console.error('Message:', error.message);
  }
}

// Export for use
module.exports = {
  VenmoQRFlowTest,
  testYourEndpoint
};

// Run tests if executed directly
if (require.main === module) {
  console.log('Venmo QR Flow Test Suite');
  console.log('Please update TEST_JWT_TOKEN with your valid JWT token\n');
  
  const test = new VenmoQRFlowTest();
  test.runAllTests().catch(console.error);
}
