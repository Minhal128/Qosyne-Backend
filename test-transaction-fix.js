// Test script to verify transaction creation fix
const { PrismaClient } = require('@prisma/client');

async function testTransactionCreation() {
  console.log('🧪 Testing Transaction Creation Fix...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Test creating a transaction with the new format
    console.log('📋 Creating test transaction...');
    
    // Find a test user
    const testUser = await prisma.users.findFirst({
      take: 1,
      select: { id: true, name: true }
    });
    
    if (!testUser) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`Using test user: ${testUser.name} (ID: ${testUser.id})`);
    
    // Create a test transaction using the new format
    const testTransaction = await prisma.transactions.create({
      data: {
        userId: testUser.id,
        amount: 10.50,
        currency: 'USD',
        type: 'TRANSFER',
        status: 'COMPLETED',
        provider: 'VENMO',
        paymentId: `test_${Date.now()}`,
        updatedAt: new Date(),
      },
    });
    
    console.log('✅ Transaction created successfully!');
    console.log('Transaction ID:', testTransaction.id);
    
    // Clean up the test transaction
    await prisma.transactions.delete({
      where: { id: testTransaction.id }
    });
    
    console.log('✅ Test transaction cleaned up');
    console.log('\n🎉 Transaction creation fix verified!');
    
  } catch (error) {
    console.error('❌ Transaction creation failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testTransactionCreation().catch(console.error);