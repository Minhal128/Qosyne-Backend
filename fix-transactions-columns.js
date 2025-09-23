const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMissingTransactionsColumns() {
  console.log('🔧 Checking and adding missing columns to transactions table...');
  
  const columnsToAdd = [
    { name: 'rapydPaymentId', type: 'VARCHAR(100) NULL', description: 'Rapyd payment ID for external transactions' },
    { name: 'rapydPayoutId', type: 'VARCHAR(100) NULL', description: 'Rapyd payout ID for external transactions' },
    { name: 'fees', type: 'DECIMAL(65,30) NOT NULL DEFAULT 0.0', description: 'Transaction fees' },
    { name: 'estimatedCompletion', type: 'DATETIME(3) NULL', description: 'Estimated completion time' },
    { name: 'failureReason', type: 'TEXT NULL', description: 'Reason for transaction failure' },
    { name: 'metadata', type: 'TEXT NULL', description: 'Additional transaction metadata' },
    { name: 'updatedAt', type: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)', description: 'Record update timestamp' },
    { name: 'completedAt', type: 'DATETIME(3) NULL', description: 'Transaction completion timestamp' }
  ];
  
  try {
    for (const column of columnsToAdd) {
      console.log(`\nChecking ${column.name} column...`);
      
      // Check if column exists
      const checkColumn = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'transactions' 
        AND COLUMN_NAME = ${column.name}
      `;
      
      const columnExists = checkColumn[0].count > 0;
      console.log(`${column.name} column exists: ${columnExists}`);
      
      if (!columnExists) {
        console.log(`Adding ${column.name} column (${column.description})...`);
        
        try {
          // Use dynamic SQL to add the column
          await prisma.$executeRawUnsafe(`ALTER TABLE transactions ADD COLUMN ${column.name} ${column.type}`);
          console.log(`✅ ${column.name} column added successfully`);
        } catch (addError) {
          console.log(`⚠️  Error adding ${column.name}: ${addError.message}`);
          // Continue with other columns
        }
      } else {
        console.log(`✅ ${column.name} column already exists`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function testTransactionsQuery() {
  console.log('\n🔧 Testing transactions query after column fix...');
  
  try {
    const transactions = await prisma.transactions.findMany({
      where: { userId: 78 },
      include: {
        Wallet: true,
        connectedWallets: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    
    console.log(`✅ Query successful! Found ${transactions.length} transactions`);
    
    if (transactions.length > 0) {
      const sample = transactions[0];
      console.log('Sample transaction with new columns:');
      console.log(`  ID: ${sample.id}`);
      console.log(`  Amount: ${sample.amount}`);
      console.log(`  Fees: ${sample.fees}`);
      console.log(`  Rapyd Payment ID: ${sample.rapydPaymentId}`);
      console.log(`  Metadata: ${sample.metadata ? 'Present' : 'None'}`);
      console.log(`  Updated At: ${sample.updatedAt}`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Transactions query failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Fixing transactions table schema for getUserTransactions endpoint\n');
  
  try {
    await addMissingTransactionsColumns();
    const testResult = await testTransactionsQuery();
    
    if (testResult) {
      console.log('\n🎉 Transactions table fix completed successfully!');
      console.log('Please run: npx prisma generate');
      console.log('Then test the getUserTransactions endpoint again.');
    } else {
      console.log('\n⚠️  Still having issues with transactions queries.');
    }
    
  } catch (error) {
    console.error('\n💥 Fix failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
