const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import the actual controller function
const { getConnectedWallets } = require('./controllers/walletController');

async function testWalletAPIEndpoint() {
  console.log('🔧 Testing the actual /api/wallet/wallets endpoint logic...');
  
  try {
    // Mock request and response objects like Express would provide
    const mockReq = {
      user: { userId: 78 } // Using the user ID from the logs
    };
    
    const mockRes = {
      statusCode: null,
      responseData: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        return this;
      }
    };
    
    // Call the actual controller function
    await getConnectedWallets(mockReq, mockRes);
    
    console.log('✅ API endpoint test completed');
    console.log('Status Code:', mockRes.statusCode);
    console.log('Response Data:', JSON.stringify(mockRes.responseData, null, 2));
    
    if (mockRes.statusCode === 200) {
      console.log('\n🎉 SUCCESS: The /api/wallet/wallets endpoint is working correctly!');
      return true;
    } else {
      console.log('\n❌ FAILED: Endpoint returned non-200 status');
      return false;
    }
    
  } catch (error) {
    console.error('❌ API endpoint test failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

async function testWithDifferentUsers() {
  console.log('\n🔧 Testing with different user IDs...');
  
  // Get a few users from the database
  const users = await prisma.users.findMany({
    select: { id: true, name: true, email: true },
    take: 3
  });
  
  console.log('Testing with users:');
  users.forEach(user => {
    console.log(`  - ${user.id}: ${user.name} (${user.email})`);
  });
  
  for (const user of users) {
    console.log(`\nTesting with user ${user.id} (${user.name})...`);
    
    const mockReq = { user: { userId: user.id } };
    const mockRes = {
      statusCode: null,
      responseData: null,
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };
    
    try {
      await getConnectedWallets(mockReq, mockRes);
      console.log(`  Status: ${mockRes.statusCode}`);
      console.log(`  Wallets found: ${mockRes.responseData?.data?.length || 0}`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Final test of /api/wallet/wallets endpoint\n');
  
  try {
    const mainTest = await testWalletAPIEndpoint();
    await testWithDifferentUsers();
    
    if (mainTest) {
      console.log('\n🎉 CONCLUSION: The /api/wallet/wallets endpoint has been fixed!');
      console.log('The 500 error should no longer occur.');
      console.log('\nIf you\'re still getting 500 errors, it might be due to:');
      console.log('1. Authentication issues (invalid JWT token)');
      console.log('2. User ID not found in database');
      console.log('3. Network/deployment issues');
      console.log('4. The production environment needs to be redeployed with these fixes');
    } else {
      console.log('\n⚠️  The endpoint still has issues that need to be resolved.');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
