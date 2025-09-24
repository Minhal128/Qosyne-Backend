const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixConnectedWalletsColumns() {
  console.log('🔧 Fixing missing columns in connectedWallets table...\n');
  
  try {
    // Check current table structure
    console.log('1️⃣ Checking current connectedWallets table structure...');
    
    const tableInfo = await prisma.$queryRaw`
      DESCRIBE connectedWallets
    `;
    
    console.log('Current columns:');
    tableInfo.forEach(column => {
      console.log(`  - ${column.Field} (${column.Type})`);
    });
    
    // List of columns that should exist based on our schema
    const requiredColumns = [
      'accessToken',
      'refreshToken', 
      'paymentMethodToken',
      'lastSync',
      'capabilities'
    ];
    
    const existingColumns = tableInfo.map(col => col.Field);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    console.log('\n2️⃣ Missing columns:', missingColumns.length > 0 ? missingColumns : 'None');
    
    if (missingColumns.length > 0) {
      console.log('\n3️⃣ Adding missing columns...');
      
      // Add missing columns one by one
      for (const column of missingColumns) {
        try {
          let alterQuery;
          
          switch (column) {
            case 'accessToken':
              alterQuery = `ALTER TABLE connectedWallets ADD COLUMN accessToken TEXT`;
              break;
            case 'refreshToken':
              alterQuery = `ALTER TABLE connectedWallets ADD COLUMN refreshToken TEXT`;
              break;
            case 'paymentMethodToken':
              alterQuery = `ALTER TABLE connectedWallets ADD COLUMN paymentMethodToken TEXT`;
              break;
            case 'lastSync':
              alterQuery = `ALTER TABLE connectedWallets ADD COLUMN lastSync DATETIME`;
              break;
            case 'capabilities':
              alterQuery = `ALTER TABLE connectedWallets ADD COLUMN capabilities TEXT`;
              break;
            default:
              console.log(`⚠️ Unknown column: ${column}`);
              continue;
          }
          
          await prisma.$executeRawUnsafe(alterQuery);
          console.log(`  ✅ Added column: ${column}`);
          
        } catch (error) {
          console.log(`  ❌ Failed to add ${column}:`, error.message);
        }
      }
    }
    
    // Verify the fix
    console.log('\n4️⃣ Verifying the fix...');
    
    try {
      const testQuery = await prisma.connectedWallets.findMany({
        take: 1,
        select: {
          id: true,
          provider: true,
          accessToken: true,
          refreshToken: true,
          paymentMethodToken: true,
          lastSync: true,
          capabilities: true
        }
      });
      
      console.log('✅ All columns are now accessible!');
      console.log('Sample data structure:', Object.keys(testQuery[0] || {}));
      
    } catch (error) {
      console.log('❌ Verification failed:', error.message);
    }
    
    console.log('\n🎉 connectedWallets table fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing connectedWallets table:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixConnectedWalletsColumns();
