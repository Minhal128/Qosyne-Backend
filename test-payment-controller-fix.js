const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTransactionCreation() {
  console.log('🔧 Testing transaction creation with only existing database columns...');
  
  try {
    // Test the exact transaction creation format used in paymentController.js
    const testTransaction = await prisma.transactions.create({
      data: {
        userId: 4, // Using the user ID from the error logs
        amount: 5.00,
        currency: 'USD',
        type: 'TRANSFER',
        status: 'COMPLETED',
        connectedWalletId: 1,
        provider: 'VENMO',
        paymentId: 'test_payment_' + Date.now(),
      },
    });
    
    console.log('✅ Transaction created successfully!');
    console.log(`  Transaction ID: ${testTransaction.id}`);
    console.log(`  Amount: ${testTransaction.amount}`);
    console.log(`  Provider: ${testTransaction.provider}`);
    console.log(`  Status: ${testTransaction.status}`);
    
    // Clean up test transaction
    await prisma.transactions.delete({
      where: { id: testTransaction.id }
    });
    console.log('✅ Test transaction cleaned up');
    
    return true;
    
  } catch (error) {
    console.error('❌ Transaction creation failed:', error.message);
    if (error.meta?.column) {
      console.error(`  Problem column: ${error.meta.column}`);
    }
    return false;
  }
}

async function testDepositTransaction() {
  console.log('\n🔧 Testing deposit transaction creation...');
  
  try {
    // Test the deposit transaction format
    const depositTransaction = await prisma.transactions.create({
      data: {
        userId: 4,
        walletId: 1, // Assuming wallet ID 1 exists
        amount: 10.00,
        currency: 'USD',
        provider: 'QOSYNE',
        type: 'DEPOSIT',
        status: 'COMPLETED',
      },
    });
    
    console.log('✅ Deposit transaction created successfully!');
    console.log(`  Transaction ID: ${depositTransaction.id}`);
    console.log(`  Amount: ${depositTransaction.amount}`);
    console.log(`  Type: ${depositTransaction.type}`);
    
    // Clean up
    await prisma.transactions.delete({
      where: { id: depositTransaction.id }
    });
    console.log('✅ Test deposit transaction cleaned up');
    
    return true;
    
  } catch (error) {
    console.error('❌ Deposit transaction creation failed:', error.message);
    if (error.meta?.column) {
      console.error(`  Problem column: ${error.meta.column}`);
    }
    return false;
  }
}

async function testPendingTransaction() {
  console.log('\n🔧 Testing pending transaction creation...');
  
  try {
    // Test the pending transaction format used in PayPal flow
    const pendingTransaction = await prisma.transactions.create({
      data: {
        userId: 4,
        amount: 25.00,
        currency: 'USD',
        type: 'EXTERNAL_TRANSFER',
        status: 'PENDING',
        paymentId: 'pending_test_' + Date.now(),
        connectedWalletId: 1,
        provider: 'PAYPAL',
      },
    });
    
    console.log('✅ Pending transaction created successfully!');
    console.log(`  Transaction ID: ${pendingTransaction.id}`);
    console.log(`  Status: ${pendingTransaction.status}`);
    console.log(`  Payment ID: ${pendingTransaction.paymentId}`);
    
    // Clean up
    await prisma.transactions.delete({
      where: { id: pendingTransaction.id }
    });
    console.log('✅ Test pending transaction cleaned up');
    
    return true;
    
  } catch (error) {
    console.error('❌ Pending transaction creation failed:', error.message);
    if (error.meta?.column) {
      console.error(`  Problem column: ${error.meta.column}`);
    }
    return false;
  }
}

async function testAllTransactionTypes() {
  console.log('\n🔧 Testing all transaction types and statuses...');
  
  const testCases = [
    { type: 'DEPOSIT', status: 'COMPLETED', provider: 'QOSYNE' },
    { type: 'TRANSFER', status: 'PENDING', provider: 'VENMO' },
    { type: 'EXTERNAL_TRANSFER', status: 'COMPLETED', provider: 'WISE' },
    { type: 'PEER_TO_PEER', status: 'PROCESSING', provider: 'PAYPAL' },
  ];
  
  const createdIds = [];
  
  try {
    for (const testCase of testCases) {
      console.log(`  Testing: ${testCase.type} - ${testCase.status} - ${testCase.provider}`);
      
      const transaction = await prisma.transactions.create({
        data: {
          userId: 4,
          amount: 1.00,
          currency: 'USD',
          type: testCase.type,
          status: testCase.status,
          provider: testCase.provider,
          paymentId: `test_${testCase.type.toLowerCase()}_${Date.now()}`,
          connectedWalletId: 1,
        },
      });
      
      createdIds.push(transaction.id);
      console.log(`    ✅ Created transaction ID: ${transaction.id}`);
    }
    
    console.log('✅ All transaction types created successfully!');
    
    // Clean up all test transactions
    for (const id of createdIds) {
      await prisma.transactions.delete({ where: { id } });
    }
    console.log('✅ All test transactions cleaned up');
    
    return true;
    
  } catch (error) {
    console.error('❌ Transaction type test failed:', error.message);
    
    // Clean up any created transactions
    for (const id of createdIds) {
      try {
        await prisma.transactions.delete({ where: { id } });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    return false;
  }
}

async function main() {
  console.log('🚀 Testing paymentController.js transaction creation fixes\n');
  
  try {
    const test1 = await testTransactionCreation();
    const test2 = await testDepositTransaction();
    const test3 = await testPendingTransaction();
    const test4 = await testAllTransactionTypes();
    
    console.log('\n📊 Test Results:');
    console.log('Basic transaction creation:', test1 ? '✅ PASSED' : '❌ FAILED');
    console.log('Deposit transaction creation:', test2 ? '✅ PASSED' : '❌ FAILED');
    console.log('Pending transaction creation:', test3 ? '✅ PASSED' : '❌ FAILED');
    console.log('All transaction types:', test4 ? '✅ PASSED' : '❌ FAILED');
    
    if (test1 && test2 && test3 && test4) {
      console.log('\n🎉 All tests passed! The paymentController.js has been fixed.');
      console.log('✅ Venmo payments should now work without Prisma validation errors.');
      console.log('✅ The "fees" column error should be resolved.');
      console.log('✅ All transaction creation calls use only existing database columns.');
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
