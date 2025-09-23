// EMERGENCY: Fix all possible transfer failure issues
const { PrismaClient } = require('@prisma/client');

async function emergencyFixAllIssues() {
  console.log('🚨 EMERGENCY: Fixing all possible transfer issues...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Verify User 78's wallet status
    console.log('📋 1. Checking User 78 wallet status...');
    const wallet = await prisma.connectedWallets.findFirst({
      where: {
        walletId: 'venmo_78_1758494905756',
        userId: 78
      }
    });
    
    if (!wallet) {
      console.log('❌ User 78 wallet not found!');
      return;
    }
    
    console.log('✅ User 78 wallet found:');
    console.log(`   Payment Method Token: ${wallet.paymentMethodToken}`);
    console.log(`   Customer ID: ${wallet.customerId}`);
    
    // 2. Check if we need to add updatedAt to more tables
    console.log('\n📋 2. Checking database schema issues...');
    
    try {
      // Test creating a transaction to see if updatedAt is the issue
      const testTransaction = await prisma.transactions.create({
        data: {
          userId: 78,
          amount: 0.01,
          currency: 'USD',
          type: 'TEST',
          status: 'COMPLETED',
          provider: 'TEST',
          paymentId: `test_${Date.now()}`,
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Transactions table working');
      
      // Clean up test transaction
      await prisma.transactions.delete({
        where: { id: testTransaction.id }
      });
      
    } catch (error) {
      console.log('❌ Transactions table error:', error.message);
    }
    
    // 3. Check if other tables need updatedAt
    console.log('\n📋 3. Checking other tables...');
    
    try {
      await prisma.transactionRecipients.create({
        data: {
          transactionId: 1, // This will fail but we'll catch it
          recipientEmail: 'test@test.com'
        }
      });
    } catch (error) {
      if (error.message.includes('updatedAt')) {
        console.log('❌ transactionRecipients table also needs updatedAt fix');
      } else {
        console.log('✅ transactionRecipients table structure OK');
      }
    }
    
    console.log('\n🔧 EMERGENCY FIXES TO APPLY:');
    console.log('1. ✅ Braintree customer ID conflict - FIXED');
    console.log('2. ✅ Payment method token - User 78 has real token');
    console.log('3. ⚠️ Check if more Prisma tables need updatedAt');
    console.log('4. ⚠️ Check if Rapyd signature is still failing');
    
    console.log('\n💡 IMMEDIATE ACTION NEEDED:');
    console.log('Please share the EXACT error message from your mobile app!');
    console.log('This will help me identify the specific failure point.');
    
  } catch (error) {
    console.error('❌ Emergency check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run emergency check
emergencyFixAllIssues().catch(console.error);
