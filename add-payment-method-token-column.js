// Script to add paymentMethodToken column to connectedWallets table
const { PrismaClient } = require('@prisma/client');

async function addPaymentMethodTokenColumn() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Adding paymentMethodToken column to connectedWallets table...\n');
    
    // Check if column already exists
    console.log('📋 Checking if paymentMethodToken column exists...');
    const result = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'connectedWallets' 
      AND COLUMN_NAME = 'paymentMethodToken'
    `;
    
    if (result.length > 0) {
      console.log('✅ paymentMethodToken column already exists');
      return;
    }
    
    console.log('➕ Adding paymentMethodToken column...');
    
    // Add the column
    await prisma.$executeRaw`
      ALTER TABLE connectedWallets 
      ADD COLUMN paymentMethodToken TEXT NULL
    `;
    
    console.log('✅ Successfully added paymentMethodToken column');
    
    // Verify the change
    const verifyResult = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'connectedWallets' 
      AND COLUMN_NAME = 'paymentMethodToken'
    `;
    
    console.log('✅ Column details:', verifyResult[0]);
    
    console.log('\n🎉 paymentMethodToken column added successfully!');
    console.log('💡 Now you can store Braintree payment method tokens for Venmo wallets');
    
  } catch (error) {
    console.error('❌ Error adding paymentMethodToken column:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addPaymentMethodTokenColumn().catch(console.error);
