// Check if User 78's token is actually valid for Braintree
const { PrismaClient } = require('@prisma/client');

async function checkUser78TokenValidity() {
  console.log('🔍 Checking User 78 Token Validity...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Get User 78's current token
    const wallet = await prisma.connectedWallets.findFirst({
      where: {
        walletId: 'venmo_78_1758494905756',
        userId: 78,
        provider: 'VENMO'
      }
    });
    
    if (!wallet) {
      console.log('❌ User 78 Venmo wallet not found');
      return;
    }
    
    console.log('📋 Current User 78 Wallet Status:');
    console.log(`   Wallet ID: ${wallet.walletId}`);
    console.log(`   Payment Method Token: ${wallet.paymentMethodToken}`);
    console.log(`   Customer ID: ${wallet.customerId}`);
    console.log(`   Access Token: ${wallet.accessToken}`);
    console.log('');
    
    // The issue might be that we're using test nonces instead of real payment method tokens
    // Braintree test nonces are meant for Drop-in UI, not direct API calls
    
    console.log('🧪 Braintree Token Analysis:');
    if (wallet.paymentMethodToken === 'fake-valid-nonce') {
      console.log('⚠️ Using generic test nonce - this might not work for direct API calls');
      console.log('💡 Braintree test nonces are for Drop-in UI, not direct transaction.sale()');
    } else if (wallet.paymentMethodToken?.startsWith('fake-')) {
      console.log('⚠️ Using Braintree test nonce - might need real payment method token');
    } else {
      console.log('✅ Using what appears to be a real payment method token');
    }
    
    console.log('');
    console.log('🔧 POTENTIAL SOLUTIONS:');
    console.log('1. Use a real Braintree payment method token (from actual Drop-in UI)');
    console.log('2. Or create a real Braintree customer with payment method');
    console.log('3. Or use Braintree\'s transaction.sale() with different parameters');
    console.log('');
    
    // Let's try updating with a different approach
    console.log('🚀 Trying Alternative Braintree Test Token...');
    
    // Use a different test approach - create a customer ID that Braintree recognizes
    await prisma.connectedWallets.update({
      where: {
        id: wallet.id
      },
      data: {
        paymentMethodToken: 'fake-valid-visa-nonce', // Try a more specific test nonce
        customerId: 'test_customer_id_78', // Simpler customer ID
        accessToken: 'test_customer_id_78',
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Updated User 78 with alternative test token');
    console.log('   New Token: fake-valid-visa-nonce');
    console.log('   New Customer ID: test_customer_id_78');
    
    console.log('');
    console.log('📱 Try your mobile app again!');
    console.log('💡 If still fails, the issue is that Braintree sandbox needs real payment methods');
    
  } catch (error) {
    console.error('❌ Error checking token validity:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkUser78TokenValidity().catch(console.error);
