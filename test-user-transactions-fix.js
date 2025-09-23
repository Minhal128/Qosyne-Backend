const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import the actual controller function
const { getUserTransactions } = require('./controllers/userDataController');

async function testTransactionsQuery() {
  console.log('🔧 Testing transactions query with correct relationships...');
  
  try {
    const testUserId = 78; // Using the userId from the error logs
    
    // Test the exact query from getUserTransactions
    const transactions = await prisma.transactions.findMany({
      where: { userId: testUserId },
      include: {
        Wallet: true,
        connectedWallets: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    console.log(`✅ Query successful! Found ${transactions.length} transactions`);
    
    if (transactions.length > 0) {
      console.log('Sample transaction data:');
      const sample = transactions[0];
      console.log(`  ID: ${sample.id}`);
      console.log(`  Amount: ${sample.amount}`);
      console.log(`  Currency: ${sample.currency}`);
      console.log(`  Provider: ${sample.provider}`);
      console.log(`  Status: ${sample.status}`);
      console.log(`  Wallet: ${sample.Wallet ? `ID ${sample.Wallet.id}` : 'None'}`);
      console.log(`  Connected Wallet: ${sample.connectedWallets ? `ID ${sample.connectedWallets.id}` : 'None'}`);
    } else {
      console.log('ℹ️  No transactions found for user 78');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Transactions query failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

async function testUserTransactionsController() {
  console.log('\n🔧 Testing getUserTransactions controller function...');
  
  try {
    // Mock request and response objects
    const mockReq = {
      user: { userId: 78 }
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
    await getUserTransactions(mockReq, mockRes);
    
    console.log('✅ Controller function executed successfully');
    console.log('Status Code:', mockRes.statusCode);
    console.log('Response Message:', mockRes.responseData?.message);
    console.log('Transactions Count:', mockRes.responseData?.data?.length || 0);
    
    if (mockRes.responseData?.data?.length > 0) {
      console.log('Sample transaction from controller:');
      const sample = mockRes.responseData.data[0];
      console.log(`  ID: ${sample.id}`);
      console.log(`  Amount: ${sample.amount}`);
      console.log(`  Currency: ${sample.currency}`);
      console.log(`  Provider: ${sample.provider}`);
      console.log(`  Status: ${sample.status}`);
    }
    
    return mockRes.statusCode === 200;
    
  } catch (error) {
    console.error('❌ Controller function failed:', error.message);
    return false;
  }
}

async function testWithMultipleUsers() {
  console.log('\n🔧 Testing with multiple users...');
  
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
    console.log(`\nTesting transactions for user ${user.id} (${user.name})...`);
    
    const mockReq = { user: { userId: user.id } };
    const mockRes = {
      statusCode: null,
      responseData: null,
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };
    
    try {
      await getUserTransactions(mockReq, mockRes);
      console.log(`  Status: ${mockRes.statusCode}`);
      console.log(`  Transactions found: ${mockRes.responseData?.data?.length || 0}`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Testing getUserTransactions fix after schema corrections\n');
  
  try {
    const queryTest = await testTransactionsQuery();
    const controllerTest = await testUserTransactionsController();
    await testWithMultipleUsers();
    
    console.log('\n📊 Test Results:');
    console.log('Direct Prisma query:', queryTest ? '✅ PASSED' : '❌ FAILED');
    console.log('Controller function:', controllerTest ? '✅ PASSED' : '❌ FAILED');
    
    if (queryTest && controllerTest) {
      console.log('\n🎉 All tests passed! The getUserTransactions endpoint has been fixed.');
      console.log('The Prisma validation error should no longer occur.');
    } else {
      console.log('\n⚠️  Some tests failed. The issue may not be fully resolved.');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
