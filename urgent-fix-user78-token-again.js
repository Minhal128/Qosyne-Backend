// URGENT: Fix User 78 token again for permanent URL
const { PrismaClient } = require('@prisma/client');

async function urgentFixUser78TokenAgain() {
  console.log('🚨 URGENT: Fixing User 78 token for permanent URL...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Update User 78's token with the most reliable Braintree test nonce
    const updatedWallet = await prisma.connectedWallets.update({
      where: {
        walletId: 'venmo_78_1758494905756'
      },
      data: {
        paymentMethodToken: 'fake-valid-nonce', // Most reliable Braintree test token
        customerId: 'test_customer_78_urgent',
        accessToken: 'test_customer_78_urgent',
        updatedAt: new Date()
      }
    });
    
    console.log('✅ User 78 Venmo wallet updated:');
    console.log(`   Wallet ID: ${updatedWallet.walletId}`);
    console.log(`   Payment Method Token: ${updatedWallet.paymentMethodToken}`);
    console.log(`   Customer ID: ${updatedWallet.customerId}`);
    
    console.log('\n🎯 IMMEDIATE SOLUTION:');
    console.log('1. ✅ User 78 token updated with most reliable test nonce');
    console.log('2. 🔄 Wait 2-3 minutes for permanent URL to update');
    console.log('3. 📱 Try your mobile app again with permanent URL');
    console.log('4. 💡 If still fails, the VenmoGateway code needs to reach permanent URL');
    
    console.log('\n🚀 Your permanent URL should work now:');
    console.log('https://qosynebackend.vercel.app/');
    
  } catch (error) {
    console.error('❌ Error fixing User 78 token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the urgent fix
urgentFixUser78TokenAgain().catch(console.error);
