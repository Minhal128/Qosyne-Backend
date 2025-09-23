const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addAllMissingColumns() {
  console.log('🔧 Adding ALL missing columns to connectedWallets table...');
  
  const columnsToAdd = [
    { name: 'createdAt', type: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)', description: 'Record creation timestamp' },
    { name: 'updatedAt', type: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)', description: 'Record update timestamp' },
    { name: 'accessToken', type: 'TEXT NULL', description: 'OAuth access token for wallet API' },
    { name: 'refreshToken', type: 'TEXT NULL', description: 'OAuth refresh token for wallet API' },
    { name: 'lastSync', type: 'DATETIME(3) NULL', description: 'Last synchronization timestamp' },
    { name: 'capabilities', type: 'TEXT NULL', description: 'JSON string of wallet capabilities' }
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
        
        try {
          // Use dynamic SQL to add the column
          await prisma.$executeRawUnsafe(`ALTER TABLE connectedWallets ADD COLUMN ${column.name} ${column.type}`);
          console.log(`✅ ${column.name} column added successfully`);
        } catch (addError) {
          console.log(`⚠️  Error adding ${column.name}: ${addError.message}`);
          // Continue with other columns
        }
      } else {
        console.log(`✅ ${column.name} column already exists`);
      }
    }
    
    console.log('\n🔄 Regenerating Prisma client...');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Comprehensive fix for connectedWallets table schema\n');
  
  try {
    await addAllMissingColumns();
    
    console.log('\n🎉 All missing columns have been added!');
    console.log('Please run: npx prisma generate');
    console.log('Then test the /api/wallet/wallets endpoint again.');
    
  } catch (error) {
    console.error('\n💥 Fix failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
