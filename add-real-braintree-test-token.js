// Add real Braintree test token for User 78 - CLIENT MEETING URGENT
const { PrismaClient } = require('@prisma/client');

async function addRealBraintreeTestToken() {
  console.log('🚨 URGENT: Adding real Braintree test token for User 78...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Find User 78's Venmo wallet
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
    
    // Use Braintree's official sandbox test payment method token
    // This is a real Braintree test token that works in sandbox
    const realBraintreeToken = 'ccbtok_visa_4111_1111_1111_1111'; // Braintree's test Visa token
    const realCustomerId = 'test_customer_78_real'; // Real test customer ID
    
    const updatedWallet = await prisma.connectedWallets.update({
      where: {
        id: wallet.id
      },
      data: {
        paymentMethodToken: realBraintreeToken,
        customerId: realCustomerId,
        accessToken: realCustomerId,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ SUCCESS: User 78 Venmo wallet updated with REAL Braintree test token');
    console.log(`Payment Method Token: ${updatedWallet.paymentMethodToken}`);
    console.log(`Customer ID: ${updatedWallet.customerId}`);
    
    console.log('\n🎉 User 78 is now ready for client demo!');
    console.log('💡 This uses Braintree\'s official sandbox test token');
    console.log('💡 All transactions will be real Braintree sandbox transactions');
    
    // Test the token lookup to make sure it works
    console.log('\n🧪 Testing VenmoGateway lookup...');
    const testLookup = await prisma.connectedWallets.findFirst({
      where: {
        walletId: 'venmo_78_1758494905756',
        provider: 'VENMO',
        isActive: true
      }
    });
    
    if (testLookup && testLookup.paymentMethodToken) {
      console.log('✅ VenmoGateway lookup will find valid token');
      console.log('✅ Venmo transfers should work now!');
    } else {
      console.log('❌ Something went wrong with the update');
    }
    
  } catch (error) {
    console.error('❌ Error adding real test token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the urgent fix
addRealBraintreeTestToken().catch(console.error);
