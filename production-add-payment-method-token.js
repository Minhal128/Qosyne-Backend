// Production migration script to add paymentMethodToken column
const { PrismaClient } = require('@prisma/client');

async function addPaymentMethodTokenColumnProduction() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Production Migration: Adding paymentMethodToken column...\n');
    
    // Step 1: Check if column already exists
    console.log('📋 Step 1: Checking if paymentMethodToken column exists...');
    const columnCheck = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'connectedWallets' 
      AND COLUMN_NAME = 'paymentMethodToken'
    `;
    
    if (columnCheck.length > 0) {
      console.log('✅ paymentMethodToken column already exists in production');
      console.log('Migration not needed - skipping column creation');
    } else {
      console.log('➕ paymentMethodToken column not found - adding it...');
      
      // Step 2: Add the column safely
      await prisma.$executeRaw`
        ALTER TABLE connectedWallets 
        ADD COLUMN paymentMethodToken TEXT NULL
      `;
      
      console.log('✅ Successfully added paymentMethodToken column to production database');
    }
    
    // Step 3: Verify the column exists and get details
    console.log('\n📋 Step 2: Verifying column details...');
    const verifyResult = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'connectedWallets' 
      AND COLUMN_NAME = 'paymentMethodToken'
    `;
    
    if (verifyResult.length > 0) {
      const column = verifyResult[0];
      console.log('✅ Column verification successful:');
      console.log(`   Name: ${column.COLUMN_NAME}`);
      console.log(`   Type: ${column.DATA_TYPE}`);
      console.log(`   Nullable: ${column.IS_NULLABLE}`);
      console.log(`   Default: ${column.COLUMN_DEFAULT || 'NULL'}`);
    } else {
      console.log('❌ Column verification failed - column not found');
      throw new Error('paymentMethodToken column was not created successfully');
    }
    
    // Step 4: Check existing Venmo wallets
    console.log('\n📋 Step 3: Checking existing Venmo wallets...');
    const venmoWallets = await prisma.connectedWallets.findMany({
      where: {
        provider: 'VENMO'
      },
      select: {
        id: true,
        walletId: true,
        userId: true,
        paymentMethodToken: true,
        customerId: true,
        accessToken: true
      }
    });
    
    console.log(`Found ${venmoWallets.length} Venmo wallets in production:`);
    
    let walletsWithTokens = 0;
    let walletsNeedingReconnection = 0;
    
    venmoWallets.forEach((wallet, index) => {
      console.log(`\n${index + 1}. Wallet ID: ${wallet.walletId}`);
      console.log(`   User ID: ${wallet.userId}`);
      console.log(`   Customer ID: ${wallet.customerId || 'Missing'}`);
      console.log(`   Access Token: ${wallet.accessToken ? 'Present' : 'Missing'}`);
      console.log(`   Payment Method Token: ${wallet.paymentMethodToken || 'Missing'}`);
      
      if (wallet.paymentMethodToken) {
        walletsWithTokens++;
        console.log(`   ✅ Ready for transactions`);
      } else {
        walletsNeedingReconnection++;
        console.log(`   ⚠️ Needs reconnection to get Braintree token`);
      }
    });
    
    console.log(`\n📊 Production Wallet Status:`);
    console.log(`✅ Wallets ready for transactions: ${walletsWithTokens}`);
    console.log(`⚠️ Wallets needing reconnection: ${walletsNeedingReconnection}`);
    
    // Step 5: Regenerate Prisma client (important for production)
    console.log('\n📋 Step 4: Prisma client regeneration...');
    console.log('💡 After this migration, run: npx prisma generate');
    console.log('💡 This ensures the Prisma client includes the new paymentMethodToken field');
    
    console.log('\n🎉 Production migration completed successfully!');
    console.log('\n📱 Next Steps for Users:');
    console.log('1. Users with missing payment method tokens need to reconnect Venmo');
    console.log('2. New Venmo connections will automatically store Braintree tokens');
    console.log('3. VenmoGateway will now use correct tokens for transactions');
    console.log('4. Deploy the updated VenmoGateway.js and walletService.js code');
    
  } catch (error) {
    console.error('❌ Production migration failed:', error);
    console.error('\n🚨 Migration Error Details:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'P1001') {
      console.error('💡 Database connection failed - check production database credentials');
    } else if (error.code === 'P2010') {
      console.error('💡 Raw query failed - check database permissions');
    } else {
      console.error('💡 Unexpected error - check database connection and permissions');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the production migration
console.log('🔥 PRODUCTION DATABASE MIGRATION');
console.log('================================');
console.log('This script will add paymentMethodToken column to production database');
console.log('');

addPaymentMethodTokenColumnProduction().catch((error) => {
  console.error('\n💥 MIGRATION FAILED');
  console.error('===================');
  console.error(error);
  process.exit(1);
});
