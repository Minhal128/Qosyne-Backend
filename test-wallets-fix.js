const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnectedWalletsQuery() {
  console.log('Testing connectedWallets query after schema fix...');
  
  try {
    // Test the exact query that was failing
    const wallets = await prisma.connectedWallets.findMany({
      where: { userId: 78 }, // Using the userId from the error log
      orderBy: { createdAt: 'desc' },
    });
    
    console.log('✅ Query successful! Found wallets:', wallets.length);
    console.log('Wallets data:', wallets);
    
    // Test if createdAt field exists
    if (wallets.length > 0) {
      console.log('✅ createdAt field exists:', wallets[0].createdAt);
    } else {
      console.log('ℹ️  No wallets found for user 78, but query executed successfully');
    }
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    return false;
  }
  
  return true;
}

async function testUserDataController() {
  console.log('\nTesting userDataController.getUserConnectedWallets function...');
  
  // Mock request and response objects
  const mockReq = {
    user: { userId: 78 }
  };
  
  const mockRes = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.responseData = data;
      return this;
    }
  };
  
  try {
    // Import and test the controller function
    const { getUserConnectedWallets } = require('./controllers/userDataController');
    await getUserConnectedWallets(mockReq, mockRes);
    
    console.log('✅ Controller function executed successfully');
    console.log('Status code:', mockRes.statusCode);
    console.log('Response:', mockRes.responseData);
    
  } catch (error) {
    console.error('❌ Controller function failed:', error.message);
    return false;
  }
  
  return true;
}

async function main() {
  console.log('🔧 Testing database schema fix for connectedWallets.createdAt column\n');
  
  const queryTest = await testConnectedWalletsQuery();
  const controllerTest = await testUserDataController();
  
  console.log('\n📊 Test Results:');
  console.log('Direct Prisma query:', queryTest ? '✅ PASSED' : '❌ FAILED');
  console.log('Controller function:', controllerTest ? '✅ PASSED' : '❌ FAILED');
  
  if (queryTest && controllerTest) {
    console.log('\n🎉 All tests passed! The createdAt column issue has been resolved.');
  } else {
    console.log('\n⚠️  Some tests failed. The issue may not be fully resolved.');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
