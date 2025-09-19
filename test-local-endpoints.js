const axios = require('axios');

// Test your local server
const LOCAL_URL = 'http://localhost:3000';
const TEST_JWT_TOKEN = 'your-jwt-token-here'; // Replace with your actual token

async function testLocalEndpoints() {
  console.log('🧪 Testing Local QR Endpoints\n');
  
  const headers = {
    'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // Test 1: Health check
  try {
    console.log('1. Testing server health...');
    const healthResponse = await axios.get(`${LOCAL_URL}/api/health`, { headers });
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Server not running or health endpoint not available');
    console.log('   Make sure your server is running on port 3000');
    console.log('   Run: npm start or node server.js');
    return;
  }

  // Test 2: Connect Venmo + Generate QR
  try {
    console.log('\n2. Testing Venmo QR generation...');
    const venmoResponse = await axios.post(`${LOCAL_URL}/api/wallet-integration/qr/connect-and-generate`, {
      provider: 'VENMO',
      credentials: JSON.stringify({
        username: 'test110@example.com',
        password: 'password123'
      }),
      amount: 25.50,
      description: 'Coffee payment ☕'
    }, { headers });

    console.log('✅ Venmo QR generated successfully');
    console.log('   Wallet ID:', venmoResponse.data.data.wallet.walletId);
    console.log('   QR ID:', venmoResponse.data.data.qrCode.id);
    console.log('   Shareable URL:', venmoResponse.data.data.qrCode.shareableUrl);
    
    return venmoResponse.data;
    
  } catch (error) {
    console.log('❌ Venmo QR generation failed');
    console.log('   Status:', error.response?.status);
    console.log('   Error:', error.response?.data?.error || error.message);
    
    if (error.response?.status === 401) {
      console.log('   🔑 Authentication issue - check your JWT token');
    } else if (error.response?.status === 404) {
      console.log('   🔍 Endpoint not found - check your routes');
    }
  }
}

// Test different ports
async function findServer() {
  const ports = [3000, 3001, 5000, 8000];
  
  console.log('🔍 Looking for your server...\n');
  
  for (const port of ports) {
    try {
      console.log(`Trying port ${port}...`);
      const response = await axios.get(`http://localhost:${port}/api/health`, {
        timeout: 2000,
        headers: { 'Authorization': `Bearer ${TEST_JWT_TOKEN}` }
      });
      
      console.log(`✅ Found server on port ${port}`);
      return `http://localhost:${port}`;
      
    } catch (error) {
      console.log(`❌ No server on port ${port}`);
    }
  }
  
  console.log('\n🚨 No server found on common ports');
  console.log('Please start your server first:');
  console.log('   cd h:\\Development\\Qosyne-main\\venmo-frontend\\src\\backend');
  console.log('   npm start');
  
  return null;
}

// Run tests
if (require.main === module) {
  console.log('Local Endpoint Tester');
  console.log('Make sure your server is running first!\n');
  
  // First try to find the server
  findServer().then(serverUrl => {
    if (serverUrl) {
      // Update the LOCAL_URL and test
      console.log(`\nUsing server: ${serverUrl}`);
      testLocalEndpoints();
    }
  });
}

module.exports = { testLocalEndpoints, findServer };
