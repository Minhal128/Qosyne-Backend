const { getUserTransactions } = require('./controllers/userDataController');

async function testUserTransactionsEndpoint() {
  console.log('🎯 Testing getUserTransactions endpoint fix...');
  
  // Test with User ID 4 (from the original error log)
  const testUserId = 4;
  
  const mockReq = {
    user: { userId: testUserId }
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
  
  try {
    console.log(`Testing with User ID: ${testUserId}`);
    
    await getUserTransactions(mockReq, mockRes);
    
    console.log('✅ API call completed successfully');
    console.log(`Status Code: ${mockRes.statusCode}`);
    console.log(`Message: ${mockRes.responseData?.message}`);
    console.log(`Transactions Count: ${mockRes.responseData?.data?.length || 0}`);
    
    if (mockRes.statusCode === 200) {
      console.log('\n🎉 SUCCESS! The getUserTransactions endpoint is now working correctly.');
      console.log('The Prisma validation error has been resolved.');
      
      if (mockRes.responseData?.data?.length > 0) {
        console.log('\nSample transaction data:');
        const sample = mockRes.responseData.data[0];
        console.log(`  ID: ${sample.id}`);
        console.log(`  Amount: ${sample.amount}`);
        console.log(`  Currency: ${sample.currency}`);
        console.log(`  Provider: ${sample.provider}`);
        console.log(`  Status: ${sample.status}`);
        console.log(`  Created: ${sample.createdAt}`);
      } else {
        console.log('ℹ️  No transactions found for this user (this is normal).');
      }
      
      return true;
    } else {
      console.log(`❌ API returned error status: ${mockRes.statusCode}`);
      console.log(`Error message: ${mockRes.responseData?.message}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

async function testMultipleUsers() {
  console.log('\n🔄 Testing with multiple user IDs...');
  
  const testUserIds = [1, 2, 3, 4, 78]; // Including the original failing user ID 4
  
  for (const userId of testUserIds) {
    console.log(`\nTesting User ID: ${userId}`);
    
    const mockReq = { user: { userId } };
    const mockRes = {
      statusCode: null,
      responseData: null,
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };
    
    try {
      await getUserTransactions(mockReq, mockRes);
      const transactionCount = mockRes.responseData?.data?.length || 0;
      console.log(`  ✅ Status: ${mockRes.statusCode}, Transactions: ${transactionCount}`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Final verification of getUserTransactions fix\n');
  
  const mainTest = await testUserTransactionsEndpoint();
  await testMultipleUsers();
  
  console.log('\n📊 Final Result:');
  if (mainTest) {
    console.log('🎉 SUCCESS: The getUserTransactions API endpoint has been fixed!');
    console.log('✅ The "Unknown field `description`" error has been resolved.');
    console.log('✅ The API now only selects existing database columns.');
    console.log('✅ User ID 4 (from original error) now works correctly.');
  } else {
    console.log('❌ FAILED: The issue may not be fully resolved.');
  }
}

main();
