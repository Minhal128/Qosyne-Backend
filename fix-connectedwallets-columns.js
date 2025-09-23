const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMissingConnectedWalletsColumns() {
  console.log('🔧 Checking and adding missing columns to connectedWallets table...');
  
  const columnsToAdd = [
    { name: 'accessToken', type: 'TEXT NULL', description: 'OAuth access token for wallet API' },
    { name: 'refreshToken', type: 'TEXT NULL', description: 'OAuth refresh token for wallet API' },
    { name: 'lastSync', type: 'DATETIME(3) NULL', description: 'Last synchronization timestamp' },
    { name: 'capabilities', type: 'TEXT NULL', description: 'JSON string of wallet capabilities' },
    { name: 'updatedAt', type: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)', description: 'Record update timestamp' }
  ];
  
  try {
    for (const column of columnsToAdd) {
      console.log(`\nChecking ${column.name} column...`);
      
      // Check if column exists
      const checkColumn = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'connectedWallets' 
        AND COLUMN_NAME = ${column.name}
      `;
      
      const columnExists = checkColumn[0].count > 0;
      console.log(`${column.name} column exists: ${columnExists}`);
      
      if (!columnExists) {
        console.log(`Adding ${column.name} column (${column.description})...`);
        
        // Use dynamic SQL to add the column
        await prisma.$executeRawUnsafe(`ALTER TABLE connectedWallets ADD COLUMN ${column.name} ${column.type}`);
        
        console.log(`✅ ${column.name} column added successfully`);
      } else {
        console.log(`✅ ${column.name} column already exists`);
      }
    }
    
    // Test the columns by running a simple query
    console.log('\n🔧 Testing column access...');
    const testWallet = await prisma.connectedWallets.findFirst({
      select: {
        id: true,
        walletId: true,
        accessToken: true,
        refreshToken: true,
        lastSync: true,
        capabilities: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log('✅ Column access test successful');
    console.log('Sample wallet data:', testWallet || 'No wallets found');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function testWalletControllerLogic() {
  console.log('\n🔧 Testing wallet controller logic after column fix...');
  
  try {
    // Test the exact query from getConnectedWallets
    const testUserId = 78;
    
    let externalWallets = await prisma.connectedWallets.findMany({
      where: { userId: testUserId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    // Fallback: if none found, try without isActive filter
    if (externalWallets.length === 0) {
      externalWallets = await prisma.connectedWallets.findMany({
        where: { userId: testUserId },
        orderBy: { createdAt: 'desc' }
      });
    }
    
    console.log(`Found ${externalWallets.length} wallets for user ${testUserId}`);
    
    // Test the JSON parsing logic that was causing issues
    const wallets = externalWallets.map((cw) => ({
      id: cw.id,
      provider: cw.provider,
      walletId: cw.walletId,
      capabilities: cw.capabilities ? JSON.parse(cw.capabilities) : [],
      lastSync: cw.lastSync,
      accessToken: cw.accessToken ? '***HIDDEN***' : null,
      refreshToken: cw.refreshToken ? '***HIDDEN***' : null
    }));
    
    console.log('✅ Wallet controller logic test successful');
    console.log('Processed wallets:', wallets);
    
  } catch (error) {
    console.error('❌ Wallet controller logic test failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Fixing connectedWallets table schema for /api/wallet/wallets endpoint\n');
  
  try {
    await addMissingConnectedWalletsColumns();
    await testWalletControllerLogic();
    
    console.log('\n🎉 connectedWallets table fix completed successfully!');
    console.log('The /api/wallet/wallets endpoint should now work without 500 errors.');
    
  } catch (error) {
    console.error('\n💥 Fix failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
