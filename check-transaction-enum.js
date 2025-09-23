const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTransactionEnum() {
  console.log('🔧 Checking transaction status enum values...');
  
  try {
    // Check what enum values are actually in the database
    const result = await prisma.$queryRaw`
      SELECT COLUMN_TYPE 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'transactions' 
      AND COLUMN_NAME = 'status'
    `;
    
    console.log('Database enum definition:', result[0]?.COLUMN_TYPE);
    
    // Try to create a transaction with each status to see which ones work
    const statusesToTest = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
    
    for (const status of statusesToTest) {
      try {
        console.log(`Testing status: ${status}`);
        
        const testTransaction = await prisma.transactions.create({
          data: {
            userId: 78,
            connectedWalletId: 70,
            amount: 1.00,
            currency: 'USD',
            provider: 'VENMO',
            type: 'EXTERNAL_TRANSFER',
            status: status,
            fees: 0.25,
            metadata: JSON.stringify({ test: true }),
            updatedAt: new Date()
          }
        });
        
        console.log(`✅ ${status} - SUCCESS (ID: ${testTransaction.id})`);
        
        // Clean up
        await prisma.transactions.delete({
          where: { id: testTransaction.id }
        });
        
      } catch (error) {
        console.log(`❌ ${status} - FAILED: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking enum:', error.message);
  }
}

async function main() {
  console.log('🚀 Checking transaction status enum compatibility\n');
  
  try {
    await checkTransactionEnum();
  } catch (error) {
    console.error('\n💥 Check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
