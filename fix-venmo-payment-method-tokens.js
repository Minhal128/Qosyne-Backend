// Script to fix Venmo payment method token issues
const { PrismaClient } = require('@prisma/client');

async function fixVenmoPaymentMethodTokens() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing Venmo Payment Method Token Issues...\n');
    
    // Find all Venmo wallets that might need fixing
    console.log('📋 Checking Venmo wallets...');
    const venmoWallets = await prisma.connectedWallets.findMany({
      where: {
        provider: 'VENMO'
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log(`Found ${venmoWallets.length} Venmo wallets:`);
    
    for (const wallet of venmoWallets) {
      console.log(`\n🔍 Wallet ID ${wallet.id} (${wallet.users.name}):`);
      console.log(`   Wallet ID: ${wallet.walletId}`);
      console.log(`   Customer ID: ${wallet.customerId || 'Missing'}`);
      console.log(`   Access Token: ${wallet.accessToken ? 'Present' : 'Missing'}`);
      console.log(`   Payment Method Token: ${wallet.paymentMethodToken || 'Missing'}`);
      
      // If wallet has customerId but missing paymentMethodToken, we can try to fix it
      if (wallet.customerId && !wallet.paymentMethodToken) {
        console.log('   ⚠️ Has customer ID but missing payment method token');
        console.log('   💡 This wallet may need to be re-attached to get a valid Braintree token');
        
        // For now, let's set a placeholder that indicates it needs re-attachment
        await prisma.connectedWallets.update({
          where: { id: wallet.id },
          data: {
            paymentMethodToken: 'NEEDS_REATTACHMENT',
            updatedAt: new Date()
          }
        });
        
        console.log('   ✅ Marked for re-attachment');
      } else if (wallet.paymentMethodToken && wallet.paymentMethodToken !== 'NEEDS_REATTACHMENT') {
        console.log('   ✅ Has valid payment method token');
      }
    }
    
    console.log('\n📋 Summary:');
    const needsReattachment = venmoWallets.filter(w => !w.paymentMethodToken || w.paymentMethodToken === 'NEEDS_REATTACHMENT');
    const hasValidTokens = venmoWallets.filter(w => w.paymentMethodToken && w.paymentMethodToken !== 'NEEDS_REATTACHMENT');
    
    console.log(`✅ Wallets with valid tokens: ${hasValidTokens.length}`);
    console.log(`⚠️ Wallets needing re-attachment: ${needsReattachment.length}`);
    
    if (needsReattachment.length > 0) {
      console.log('\n💡 To fix wallets needing re-attachment:');
      console.log('1. Users need to disconnect and reconnect their Venmo accounts');
      console.log('2. Or update the walletService.js to store the Braintree payment method token');
      console.log('3. The token should come from the VenmoGateway.attachBankAccount() result');
    }
    
    console.log('\n🎉 Venmo payment method token analysis complete!');
    
  } catch (error) {
    console.error('❌ Error fixing Venmo payment method tokens:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixVenmoPaymentMethodTokens().catch(console.error);
