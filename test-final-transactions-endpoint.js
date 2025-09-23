const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import the actual controller function
const { getUserTransactions } = require('./controllers/userDataController');

async function testCompleteTransactionsEndpoint() {
  console.log('🔧 Final comprehensive test of getUserTransactions endpoint...');
  
  try {
    // Test with user 60 who has transactions
    const mockReq = { user: { userId: 60 } };
    const mockRes = {
      statusCode: null,
      responseData: null,
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };
    
    await getUserTransactions(mockReq, mockRes);
    
    console.log('✅ Endpoint test completed successfully');
    console.log('Status Code:', mockRes.statusCode);
    console.log('Response Message:', mockRes.responseData?.message);
    console.log('Transactions Count:', mockRes.responseData?.data?.length || 0);
    
    if (mockRes.responseData?.data?.length > 0) {
      console.log('\nSample transaction data:');
      const sample = mockRes.responseData.data[0];
      console.log(JSON.stringify(sample, null, 2));
    }
    
    return mockRes.statusCode === 200;
    
  } catch (error) {
    console.error('❌ Endpoint test failed:', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n🔧 Testing error handling with invalid user ID...');
  
  try {
    const mockReq = { user: { userId: 'invalid' } };
    const mockRes = {
      statusCode: null,
      responseData: null,
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };
    
    await getUserTransactions(mockReq, mockRes);
    
    console.log('Status Code:', mockRes.statusCode);
    console.log('Response Message:', mockRes.responseData?.message);
    
    return mockRes.statusCode === 401; // Should return 401 for invalid user ID
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Final validation of getUserTransactions endpoint fix\n');
  
  try {
    const endpointTest = await testCompleteTransactionsEndpoint();
    const errorTest = await testErrorHandling();
    
    console.log('\n📊 Final Test Results:');
    console.log('Complete endpoint test:', endpointTest ? '✅ PASSED' : '❌ FAILED');
    console.log('Error handling test:', errorTest ? '✅ PASSED' : '❌ FAILED');
    
    if (endpointTest && errorTest) {
      console.log('\n🎉 FINAL CONCLUSION: The getUserTransactions endpoint is fully fixed!');
      console.log('\nChanges made:');
      console.log('1. ✅ Fixed include statement: wallet → Wallet, connectedWallet → connectedWallets');
      console.log('2. ✅ Fixed mapping logic: t.wallet → t.Wallet');
      console.log('3. ✅ Added missing columns to transactions table');
      console.log('4. ✅ Regenerated Prisma client');
      console.log('\nThe Prisma validation error should no longer occur in production.');
    } else {
      console.log('\n⚠️  Some issues remain that need to be addressed.');
    }
    
  } catch (error) {
    console.error('\n💥 Final test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
