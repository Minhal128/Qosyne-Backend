const axios = require('axios');

// Test configuration
const BASE_URL = 'https://qosyncebackend.vercel.app';
const TEST_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTczNzI3NzI4MSwiZXhwIjoxNzM3MzYzNjgxfQ.example'; // Replace with valid token

class VenmoQRTest {
  constructor() {
    this.baseURL = BASE_URL;
    this.headers = {
      'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
      'Content-Type': 'application/json'
    };
  }

  async testCompleteVenmoFlow() {
    console.log('🚀 Testing Complete Venmo QR Flow\n');
    
    try {
      // Step 1: Connect Venmo wallet
      console.log('1. Connecting Venmo wallet...');
      const venmoConnection = await this.connectVenmoWallet();
      
      // Step 2: Generate QR code for receiving payments
      console.log('\n2. Generating QR code for receiving payments...');
      const qrCode = await this.generateVenmoQRCode(venmoConnection.walletId);
      
      // Step 3: Test QR code status
      console.log('\n3. Testing QR code status...');
      await this.testQRStatus(qrCode.id);
      
      // Step 4: Simulate QR scan
      console.log('\n4. Simulating QR code scan...');
      await this.simulateQRScan(qrCode.id);
      
      console.log('\n✅ Complete Venmo QR flow test completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Venmo QR flow test failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    }
  }

  async connectVenmoWallet() {
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
      console.log('   Provider:', response.data.data.wallet.provider);
      console.log('   Full Name:', response.data.data.wallet.fullName);
      
      return response.data.data.wallet;
    } catch (error) {
      console.error('❌ Failed to connect Venmo wallet:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateVenmoQRCode(walletId) {
    try {
      // Test different QR code types
      const qrRequests = [
        {
          name: 'Payment Request QR',
          data: {
            type: 'PAYMENT_REQUEST',
            amount: 25.00,
            currency: 'USD',
            description: 'Payment for coffee ☕',
            destinationWalletId: walletId,
            expiresIn: 3600 // 1 hour
          }
        },
        {
          name: 'Wallet Connect QR',
          data: {
            type: 'WALLET_CONNECT',
            walletProvider: 'VENMO',
            amount: 50.00,
            currency: 'USD',
            description: 'Connect to receive payments'
          }
        }
      ];

      const results = [];

      for (const request of qrRequests) {
        try {
          console.log(`   Generating ${request.name}...`);
          
          const response = await axios.post(`${this.baseURL}/api/wallet-integration/qr/generate`, 
            request.data, 
            { headers: this.headers }
          );

          console.log(`   ✅ ${request.name} generated successfully`);
          console.log('      QR ID:', response.data.data.qrCode.id);
          console.log('      Type:', response.data.data.qrCode.type);
          console.log('      Expires:', response.data.data.qrCode.expiresAt);
          console.log('      Instructions:', response.data.data.qrCode.instructions);
          
          results.push(response.data.data.qrCode);
        } catch (error) {
          console.error(`   ❌ Failed to generate ${request.name}:`, error.response?.data || error.message);
        }
      }

      return results[0]; // Return the first successful QR code
    } catch (error) {
      console.error('❌ Failed to generate QR codes:', error.message);
      throw error;
    }
  }

  async testQRStatus(qrId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/wallet-integration/qr/${qrId}/status`, {
        headers: this.headers
      });

      console.log('✅ QR status retrieved successfully');
      console.log('   Status:', response.data.data.status.status);
      console.log('   Scan Count:', response.data.data.status.scanCount);
      console.log('   Expired:', response.data.data.status.isExpired);
      
      return response.data.data.status;
    } catch (error) {
      console.error('❌ Failed to get QR status:', error.response?.data || error.message);
      throw error;
    }
  }

  async simulateQRScan(qrId) {
    try {
      const response = await axios.post(`${this.baseURL}/api/wallet-integration/qr/scan/${qrId}`, {
        scannerInfo: {
          appName: 'Venmo',
          version: '8.0.0',
          platform: 'iOS'
        },
        ip: '192.168.1.1',
        userAgent: 'Venmo/8.0.0 (iPhone; iOS 15.0)'
      });

      console.log('✅ QR scan simulated successfully');
      console.log('   Scan ID:', response.data.data.scanResult.scanId);
      console.log('   Status:', response.data.data.scanResult.status);
      console.log('   Next Steps:', response.data.data.scanResult.nextSteps);
      
      return response.data.data.scanResult;
    } catch (error) {
      console.error('❌ Failed to simulate QR scan:', error.response?.data || error.message);
      throw error;
    }
  }

  async testVenmoSpecificQR() {
    console.log('\n🎯 Testing Venmo-Specific QR Generation...\n');
    
    try {
      // First connect a Venmo wallet
      const venmoWallet = await this.connectVenmoWallet();
      
      // Generate a Venmo payment request QR
      const venmoQR = await axios.post(`${this.baseURL}/api/wallet-integration/qr/generate`, {
        type: 'PAYMENT_REQUEST',
        amount: 15.50,
        currency: 'USD',
        description: 'Split dinner bill 🍕',
        destinationWalletId: venmoWallet.walletId,
        expiresIn: 7200, // 2 hours
        metadata: {
          venmoUsername: venmoWallet.username,
          venmoDisplayName: venmoWallet.fullName,
          paymentType: 'request'
        }
      }, { headers: this.headers });

      console.log('✅ Venmo-specific QR generated successfully');
      console.log('   QR ID:', venmoQR.data.data.qrCode.id);
      console.log('   Payload preview:', JSON.parse(venmoQR.data.data.qrCode.payload).description);
      
      // Test the payload structure
      const payload = JSON.parse(venmoQR.data.data.qrCode.payload);
      console.log('\n📱 QR Code Payload Structure:');
      console.log('   Version:', payload.version);
      console.log('   Type:', payload.type);
      console.log('   Amount:', payload.amount);
      console.log('   Currency:', payload.currency);
      console.log('   Description:', payload.description);
      console.log('   Destination Wallet:', payload.destinationWalletId);
      console.log('   Payment URL:', payload.paymentUrl);
      
      return venmoQR.data.data.qrCode;
      
    } catch (error) {
      console.error('❌ Venmo-specific QR test failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testGetUserQRCodes() {
    console.log('\n📋 Testing Get User QR Codes...\n');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/wallet-integration/qr?type=PAYMENT_REQUEST&limit=10`, {
        headers: this.headers
      });

      console.log('✅ User QR codes retrieved successfully');
      console.log('   Total QR codes:', response.data.data.total);
      console.log('   Active QR codes:', response.data.data.data.filter(qr => qr.status === 'ACTIVE').length);
      
      response.data.data.data.forEach((qr, index) => {
        console.log(`   ${index + 1}. ${qr.type} - $${qr.amount} - ${qr.status}`);
      });
      
      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to get user QR codes:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Manual test functions
async function testQREndpointDirectly() {
  console.log('🧪 Testing QR Endpoint Directly...\n');
  
  const testData = {
    type: 'PAYMENT_REQUEST',
    amount: 20.00,
    currency: 'USD',
    description: 'Test payment request',
    destinationWalletId: 'venmo_4_1758277304658', // Use an existing wallet ID
    expiresIn: 3600
  };

  try {
    const response = await axios.post(`${BASE_URL}/api/wallet-integration/qr/generate`, testData, {
      headers: {
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Direct QR endpoint test successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Direct QR endpoint test failed');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

// Export test functions
module.exports = {
  VenmoQRTest,
  testQREndpointDirectly
};

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('Venmo QR Code Test Suite');
  console.log('Please update the TEST_JWT_TOKEN constant with a valid JWT token.\n');
  
  const test = new VenmoQRTest();
  
  // Run the complete flow test
  test.testCompleteVenmoFlow()
    .then(() => test.testVenmoSpecificQR())
    .then(() => test.testGetUserQRCodes())
    .catch(console.error);
}
