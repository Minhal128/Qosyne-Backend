// Remove all mock data and prepare for real Braintree sandbox integration
const { PrismaClient } = require('@prisma/client');

async function removeMockDataMakeReal() {
  console.log('🧹 Removing all mock data and preparing for real Braintree sandbox...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Step 1: Clean up all mock payment method tokens
    console.log('📋 Step 1: Cleaning up mock payment method tokens...');
    
    const mockTokens = await prisma.connectedWallets.findMany({
      where: {
        OR: [
          { paymentMethodToken: { startsWith: 'bt_venmo_' } }, // Our mock tokens
          { paymentMethodToken: 'fake-valid-visa-nonce' }, // Test token we used
          { paymentMethodToken: 'NEEDS_REATTACHMENT' }, // Placeholder tokens
        ]
      },
      select: {
        id: true,
        walletId: true,
        userId: true,
        provider: true,
        paymentMethodToken: true
      }
    });
    
    console.log(`Found ${mockTokens.length} wallets with mock tokens:`);
    
    for (const wallet of mockTokens) {
      console.log(`- Wallet ${wallet.walletId} (User ${wallet.userId}, ${wallet.provider}): ${wallet.paymentMethodToken}`);
    }
    
    // Clear mock tokens - users will need to reconnect
    const updateResult = await prisma.connectedWallets.updateMany({
      where: {
        OR: [
          { paymentMethodToken: { startsWith: 'bt_venmo_' } },
          { paymentMethodToken: 'fake-valid-visa-nonce' },
          { paymentMethodToken: 'NEEDS_REATTACHMENT' },
        ]
      },
      data: {
        paymentMethodToken: null,
        customerId: null, // Also clear mock customer IDs
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Cleared ${updateResult.count} mock payment method tokens`);
    
    // Step 2: Verify Braintree configuration
    console.log('\n📋 Step 2: Verifying Braintree sandbox configuration...');
    
    const requiredEnvVars = [
      'BT_MERCHANT_ID',
      'BT_PUBLIC_KEY', 
      'BT_PRIVATE_KEY'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('❌ Missing Braintree environment variables:');
      missingVars.forEach(varName => console.log(`   - ${varName}`));
      console.log('💡 Add these to your .env file for real Braintree integration');
    } else {
      console.log('✅ Braintree sandbox credentials configured');
      console.log(`   Merchant ID: ${process.env.BT_MERCHANT_ID}`);
      console.log(`   Public Key: ${process.env.BT_PUBLIC_KEY}`);
      console.log(`   Private Key: ${process.env.BT_PRIVATE_KEY ? 'Present' : 'Missing'}`);
    }
    
    // Step 3: Check current wallet status
    console.log('\n📋 Step 3: Current wallet status after cleanup...');
    
    const allVenmoWallets = await prisma.connectedWallets.findMany({
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
    
    console.log(`Found ${allVenmoWallets.length} Venmo wallets:`);
    
    let walletsNeedingReconnection = 0;
    let walletsWithRealTokens = 0;
    
    allVenmoWallets.forEach((wallet, index) => {
      console.log(`\n${index + 1}. ${wallet.users.name} (User ID: ${wallet.userId})`);
      console.log(`   Wallet ID: ${wallet.walletId}`);
      console.log(`   Customer ID: ${wallet.customerId || 'Missing'}`);
      console.log(`   Payment Method Token: ${wallet.paymentMethodToken || 'Missing'}`);
      
      if (wallet.paymentMethodToken && !wallet.paymentMethodToken.startsWith('bt_') && wallet.paymentMethodToken !== 'fake-valid-visa-nonce') {
        walletsWithRealTokens++;
        console.log(`   ✅ Has real Braintree token - ready for transactions`);
      } else {
        walletsNeedingReconnection++;
        console.log(`   ⚠️ Needs reconnection to get real Braintree token`);
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Wallets with real tokens: ${walletsWithRealTokens}`);
    console.log(`⚠️ Wallets needing reconnection: ${walletsNeedingReconnection}`);
    
    console.log('\n🎯 Next Steps for Real-Time Integration:');
    console.log('1. Users need to reconnect their Venmo accounts');
    console.log('2. walletService.connectVenmo will create real Braintree customers & payment methods');
    console.log('3. Real Braintree sandbox tokens will be stored');
    console.log('4. VenmoGateway will use real tokens for actual transactions');
    console.log('5. All transactions will be real sandbox transactions');
    
    console.log('\n💡 For immediate testing:');
    console.log('- Use Braintree\'s Drop-in UI to get real payment method nonces');
    console.log('- Connect wallets through the proper flow (not mock data)');
    console.log('- All payments will be processed through Braintree sandbox');
    
  } catch (error) {
    console.error('❌ Error removing mock data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
removeMockDataMakeReal().catch(console.error);
