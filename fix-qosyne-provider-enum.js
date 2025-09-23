// Script to safely add QOSYNE to transactions_provider enum
const { PrismaClient } = require('@prisma/client');

async function fixQosyneProviderEnum() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing QOSYNE provider enum in transactions table...\n');
    
    // Check current enum values
    console.log('📋 Checking current enum values...');
    const result = await prisma.$queryRaw`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'transactions' 
      AND COLUMN_NAME = 'provider'
    `;
    
    console.log('Current enum:', result[0]?.COLUMN_TYPE);
    
    // Check if QOSYNE already exists
    const currentEnum = result[0]?.COLUMN_TYPE || '';
    if (currentEnum.includes('QOSYNE')) {
      console.log('✅ QOSYNE already exists in transactions_provider enum');
      return;
    }
    
    console.log('➕ Adding QOSYNE to transactions_provider enum...');
    
    // Add QOSYNE to the enum
    await prisma.$executeRaw`
      ALTER TABLE transactions 
      MODIFY provider ENUM(
        'PAYPAL', 
        'GOOGLEPAY', 
        'WISE', 
        'SQUARE', 
        'VENMO', 
        'APPLEPAY', 
        'RAPYD', 
        'STRIPE', 
        'BRAINTREE', 
        'QOSYNE'
      ) NOT NULL
    `;
    
    console.log('✅ Successfully added QOSYNE to transactions_provider enum');
    
    // Verify the change
    const verifyResult = await prisma.$queryRaw`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'transactions' 
      AND COLUMN_NAME = 'provider'
    `;
    
    console.log('✅ Updated enum:', verifyResult[0]?.COLUMN_TYPE);
    
    // Test creating a transaction with QOSYNE provider
    console.log('\n🧪 Testing QOSYNE provider...');
    
    const testTransaction = await prisma.transactions.create({
      data: {
        userId: 1,
        amount: 0.01,
        currency: 'USD',
        provider: 'QOSYNE',
        type: 'DEPOSIT',
        status: 'COMPLETED',
        paymentId: `test_qosyne_${Date.now()}`,
        metadata: JSON.stringify({ test: true }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Test transaction created:', testTransaction.id);
    
    // Clean up test transaction
    await prisma.transactions.delete({
      where: { id: testTransaction.id }
    });
    
    console.log('✅ Test transaction cleaned up');
    console.log('\n🎉 QOSYNE provider enum fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing QOSYNE provider enum:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixQosyneProviderEnum().catch(console.error);
