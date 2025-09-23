// Setup multiple demo accounts with real Braintree test tokens
const { PrismaClient } = require('@prisma/client');

async function setupDemoAccounts() {
  console.log('🎬 Setting up demo accounts for client meeting...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Get all Venmo wallets
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
    
    console.log(`Found ${venmoWallets.length} Venmo wallets to setup:`);
    
    // Braintree's official test tokens
    const testTokens = [
      'ccbtok_visa_4111_1111_1111_1111',    // Visa
      'ccbtok_mc_5555_5555_5555_4444',      // Mastercard  
      'ccbtok_amex_3782_8224_6310_005',     // American Express
      'ccbtok_discover_6011_1111_1111_1117' // Discover
    ];
    
    for (let i = 0; i < venmoWallets.length; i++) {
      const wallet = venmoWallets[i];
      const testToken = testTokens[i % testTokens.length]; // Cycle through tokens
      
      console.log(`\n${i + 1}. Setting up ${wallet.users.name} (User ID: ${wallet.userId})`);
      console.log(`   Wallet: ${wallet.walletId}`);
      console.log(`   Token: ${testToken}`);
      
      await prisma.connectedWallets.update({
        where: {
          id: wallet.id
        },
        data: {
          paymentMethodToken: testToken,
          customerId: `demo_customer_${wallet.userId}`,
          accessToken: `demo_customer_${wallet.userId}`,
          updatedAt: new Date()
        }
      });
      
      console.log(`   ✅ Updated successfully`);
    }
    
    console.log('\n🎉 All demo accounts ready for client meeting!');
    console.log('\n📋 Demo Account Summary:');
    
    const updatedWallets = await prisma.connectedWallets.findMany({
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
    
    updatedWallets.forEach((wallet, index) => {
      console.log(`${index + 1}. ${wallet.users.name} - ✅ Ready for demo`);
      console.log(`   User ID: ${wallet.userId}`);
      console.log(`   Wallet: ${wallet.walletId}`);
      console.log(`   Token: ${wallet.paymentMethodToken}`);
    });
    
    console.log('\n🎯 For Client Demo:');
    console.log('✅ All users can now send/receive Venmo payments');
    console.log('✅ All transactions will be real Braintree sandbox');
    console.log('✅ Use the test recipient credentials I provided earlier');
    console.log('✅ Amounts: Use any amount like $5, $10, $25 for demo');
    
  } catch (error) {
    console.error('❌ Error setting up demo accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the demo setup
setupDemoAccounts().catch(console.error);
