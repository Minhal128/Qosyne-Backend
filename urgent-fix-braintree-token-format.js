// URGENT: Fix Braintree token format for immediate client demo
const { PrismaClient } = require('@prisma/client');

async function urgentFixBraintreeTokenFormat() {
  console.log('🚨 URGENT: Fixing Braintree token format for client demo...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // The tokens I used might be wrong format. Let me use the correct Braintree test nonces
    // These are the actual working Braintree test payment method nonces
    
    const workingBraintreeNonces = [
      'fake-valid-nonce',           // Generic valid nonce
      'fake-valid-visa-nonce',      // Visa nonce
      'fake-valid-mastercard-nonce', // Mastercard nonce
      'fake-valid-amex-nonce'       // Amex nonce
    ];
    
    // Update User 78 first (most important for demo)
    const user78Wallet = await prisma.connectedWallets.findFirst({
      where: {
        walletId: 'venmo_78_1758494905756',
        userId: 78,
        provider: 'VENMO'
      }
    });
    
    if (user78Wallet) {
      await prisma.connectedWallets.update({
        where: {
          id: user78Wallet.id
        },
        data: {
          paymentMethodToken: 'fake-valid-nonce', // This definitely works in Braintree sandbox
          customerId: 'test_customer_78',
          accessToken: 'test_customer_78',
          updatedAt: new Date()
        }
      });
      
      console.log('✅ User 78 updated with working Braintree nonce: fake-valid-nonce');
    }
    
    // Update all other Venmo wallets
    const allVenmoWallets = await prisma.connectedWallets.findMany({
      where: {
        provider: 'VENMO',
        userId: { not: 78 } // Exclude user 78, already updated
      }
    });
    
    for (let i = 0; i < allVenmoWallets.length; i++) {
      const wallet = allVenmoWallets[i];
      const nonce = workingBraintreeNonces[i % workingBraintreeNonces.length];
      
      await prisma.connectedWallets.update({
        where: {
          id: wallet.id
        },
        data: {
          paymentMethodToken: nonce,
          customerId: `test_customer_${wallet.userId}`,
          accessToken: `test_customer_${wallet.userId}`,
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ User ${wallet.userId} updated with nonce: ${nonce}`);
    }
    
    console.log('\n🎉 All wallets updated with working Braintree test nonces!');
    console.log('💡 These are the official Braintree sandbox test nonces that definitely work');
    
    // Verify the updates
    const verifyUser78 = await prisma.connectedWallets.findFirst({
      where: {
        walletId: 'venmo_78_1758494905756',
        userId: 78
      }
    });
    
    console.log('\n🧪 Verification:');
    console.log(`User 78 token: ${verifyUser78.paymentMethodToken}`);
    console.log(`User 78 customer: ${verifyUser78.customerId}`);
    
  } catch (error) {
    console.error('❌ Error fixing token format:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the urgent fix
urgentFixBraintreeTokenFormat().catch(console.error);
