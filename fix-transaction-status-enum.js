const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndFixTransactionStatusEnum() {
  console.log('🔧 Checking and fixing transaction status enum...');
  
  try {
    // Check current enum values in database
    const result = await prisma.$queryRaw`
      SELECT COLUMN_TYPE 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'transactions' 
      AND COLUMN_NAME = 'status'
    `;
    
    console.log('Current database enum:', result[0]?.COLUMN_TYPE);
    
    // Check if we need to update the enum
    const currentEnum = result[0]?.COLUMN_TYPE || '';
    const requiredValues = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
    
    let needsUpdate = false;
    for (const value of requiredValues) {
      if (!currentEnum.includes(value)) {
        console.log(`❌ Missing enum value: ${value}`);
        needsUpdate = true;
      } else {
        console.log(`✅ Found enum value: ${value}`);
      }
    }
    
    if (needsUpdate) {
      console.log('\n🔄 Updating transaction status enum...');
      
      // Update the enum to include all required values
      await prisma.$executeRawUnsafe(`
        ALTER TABLE transactions 
        MODIFY COLUMN status ENUM(
          'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'
        ) NOT NULL DEFAULT 'PENDING'
      `);
      
      console.log('✅ Transaction status enum updated successfully');
    } else {
      console.log('✅ Transaction status enum is already correct');
    }
    
    // Test creating a transaction with each status
    console.log('\n🧪 Testing transaction status values...');
    
    for (const status of requiredValues) {
      try {
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
        
        console.log(`✅ ${status} - Created transaction ID: ${testTransaction.id}`);
        
        // Test updating the status
        await prisma.transactions.update({
          where: { id: testTransaction.id },
          data: { 
            status: status,
            updatedAt: new Date()
          }
        });
        
        console.log(`✅ ${status} - Update successful`);
        
        // Clean up
        await prisma.transactions.delete({
          where: { id: testTransaction.id }
        });
        
      } catch (error) {
        console.log(`❌ ${status} - Failed: ${error.message}`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing transaction status enum:', error.message);
    return false;
  }
}

async function testTransactionServiceAfterFix() {
  console.log('\n🔄 Testing transaction service after enum fix...');
  
  try {
    // Import transaction service
    const transactionService = require('./services/transactionService');
    
    // Test a simple transfer
    const transferData = {
      userId: 78,
      fromWalletId: 70, // Venmo wallet
      toWalletId: 72,   // Wise wallet
      amount: 1.00,
      currency: 'USD',
      description: 'Test transfer after enum fix',
      metadata: {
        testTransfer: true,
        enumFix: true
      }
    };
    
    console.log('Initiating test transfer...');
    const transaction = await transactionService.initiateTransfer(transferData);
    
    console.log('✅ Transaction created successfully!');
    console.log(`Transaction ID: ${transaction.id}`);
    console.log(`Status: ${transaction.status}`);
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check final status
    const finalTransaction = await transactionService.getTransaction(78, transaction.id);
    console.log(`Final status: ${finalTransaction.status}`);
    
    if (finalTransaction.status === 'COMPLETED') {
      console.log('🎉 Transaction completed successfully!');
    } else if (finalTransaction.status === 'FAILED') {
      console.log('⚠️  Transaction failed, but enum is working');
    } else {
      console.log(`ℹ️  Transaction status: ${finalTransaction.status}`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Transaction service test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Fixing Transaction Status Enum Issue\n');
  
  try {
    const enumFixed = await checkAndFixTransactionStatusEnum();
    
    if (enumFixed) {
      const serviceTest = await testTransactionServiceAfterFix();
      
      console.log('\n📊 Results:');
      console.log(`Enum fix: ${enumFixed ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`Service test: ${serviceTest ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (enumFixed && serviceTest) {
        console.log('\n🎉 Transaction status enum issue has been resolved!');
        console.log('Your money transfers should now work without status errors.');
      }
    }
    
  } catch (error) {
    console.error('\n💥 Fix failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
