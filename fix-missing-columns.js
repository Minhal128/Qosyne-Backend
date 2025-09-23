const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMissingColumns() {
  console.log('🔧 Checking and adding missing columns to users table...');
  
  try {
    // Check if selectedWalletId column exists
    const checkSelectedWalletId = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'selectedWalletId'
    `;
    
    const selectedWalletIdExists = checkSelectedWalletId[0].count > 0;
    console.log('selectedWalletId column exists:', selectedWalletIdExists);
    
    if (!selectedWalletIdExists) {
      console.log('Adding selectedWalletId column...');
      await prisma.$executeRaw`ALTER TABLE users ADD COLUMN selectedWalletId VARCHAR(191) NULL`;
      console.log('✅ selectedWalletId column added successfully');
    }
    
    // Check if selectedWalletType column exists
    const checkSelectedWalletType = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'selectedWalletType'
    `;
    
    const selectedWalletTypeExists = checkSelectedWalletType[0].count > 0;
    console.log('selectedWalletType column exists:', selectedWalletTypeExists);
    
    if (!selectedWalletTypeExists) {
      console.log('Adding selectedWalletType column...');
      await prisma.$executeRaw`ALTER TABLE users ADD COLUMN selectedWalletType VARCHAR(191) NULL`;
      console.log('✅ selectedWalletType column added successfully');
    }
    
    if (selectedWalletIdExists && selectedWalletTypeExists) {
      console.log('✅ All required columns already exist');
    }
    
    // Test the columns by running a simple query
    console.log('\nTesting column access...');
    const testUser = await prisma.users.findFirst({
      select: {
        id: true,
        selectedWalletId: true,
        selectedWalletType: true
      }
    });
    
    console.log('✅ Column access test successful');
    console.log('Sample data:', testUser);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🚀 Starting missing columns fix...\n');
  
  try {
    await addMissingColumns();
    console.log('\n🎉 Missing columns fix completed successfully!');
  } catch (error) {
    console.error('\n💥 Fix failed:', error.message);
    process.exit(1);
  }
}

main();
