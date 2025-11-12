const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSquareInvoiceDatabase() {
  console.log('🧪 Testing Square Invoice Database Operations...');
  
  try {
    // Test 1: Create a test transaction
    console.log('\n1️⃣ Testing transaction creation...');
    const testTransaction = await prisma.transactions.create({
      data: {
        userId: 1,
        provider: 'SQUARE',
        type: 'EXTERNAL_TRANSFER',
        amount: 50.00,
        currency: 'USD',
        paymentId: 'test_square_invoice_123',
        status: 'PENDING',
      },
    });
    console.log('✅ Transaction created:', testTransaction.id);

    // Test 2: Create recipient record
    console.log('\n2️⃣ Testing recipient creation...');
    const testRecipient = await prisma.transactionRecipients.create({
      data: {
        transactionId: testTransaction.id,
        recipientEmail: 'test@example.com',
      },
    });
    console.log('✅ Recipient created:', testRecipient.id);

    // Test 3: Find transaction by paymentId
    console.log('\n3️⃣ Testing transaction lookup by paymentId...');
    const foundTransaction = await prisma.transactions.findFirst({
      where: {
        paymentId: 'test_square_invoice_123',
        provider: 'SQUARE',
        userId: 1,
      },
    });
    console.log('✅ Transaction found:', foundTransaction ? 'Yes' : 'No');

    // Test 4: Update transaction status
    console.log('\n4️⃣ Testing transaction status update...');
    await prisma.transactions.update({
      where: { id: testTransaction.id },
      data: { status: 'COMPLETED' },
    });
    console.log('✅ Transaction status updated to COMPLETED');

    // Test 5: Get recipient details
    console.log('\n5️⃣ Testing recipient lookup...');
    const foundRecipient = await prisma.transactionRecipients.findUnique({
      where: { transactionId: testTransaction.id },
    });
    console.log('✅ Recipient found:', foundRecipient ? foundRecipient.recipientEmail : 'No');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.transactionRecipients.delete({
      where: { id: testRecipient.id },
    });
    await prisma.transactions.delete({
      where: { id: testTransaction.id },
    });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All Square Invoice database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Test Square SDK loading
async function testSquareSDK() {
  console.log('\n🧪 Testing Square SDK loading...');
  
  try {
    const square = require('square');
    const { Client, Environment } = square;
    
    console.log('✅ Square SDK loaded successfully');
    console.log('✅ Client available:', typeof Client === 'function');
    console.log('✅ Environment available:', typeof Environment === 'object');
    
    // Test client creation
    const client = new Client({
      accessToken: 'test_token',
      environment: Environment.Sandbox,
    });
    console.log('✅ Square client created successfully');
    
  } catch (error) {
    console.error('❌ Square SDK test failed:', error.message);
  }
}

async function runAllTests() {
  await testSquareSDK();
  await testSquareInvoiceDatabase();
}

runAllTests();
