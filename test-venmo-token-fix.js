// Test script to verify Venmo payment method token fixes
const { PrismaClient } = require('@prisma/client');

async function testVenmoTokenFix() {
  console.log('🧪 Testing Venmo Payment Method Token Fix...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Test 1: Check if walletService stores paymentMethodToken
    console.log('📋 TEST 1: Check Venmo Wallet Storage');
    console.log('-'.repeat(50));
    
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
    
    let walletsWithTokens = 0;
    let walletsNeedingReconnection = 0;
    
    venmoWallets.forEach((wallet, index) => {
      console.log(`\n${index + 1}. ${wallet.users.name} (ID: ${wallet.id})`);
      console.log(`   Wallet ID: ${wallet.walletId}`);
      console.log(`   Customer ID: ${wallet.customerId || 'Missing'}`);
      console.log(`   Access Token: ${wallet.accessToken ? 'Present' : 'Missing'}`);
      console.log(`   Payment Method Token: ${wallet.paymentMethodToken || 'Missing'}`);
      
      if (wallet.paymentMethodToken && wallet.paymentMethodToken !== 'NEEDS_REATTACHMENT') {
        walletsWithTokens++;
        console.log(`   ✅ Ready for transactions`);
      } else {
        walletsNeedingReconnection++;
        console.log(`   ⚠️ Needs reconnection to get Braintree token`);
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Wallets ready for transactions: ${walletsWithTokens}`);
    console.log(`⚠️ Wallets needing reconnection: ${walletsNeedingReconnection}`);
    
    // Test 2: Simulate VenmoGateway token lookup
    console.log('\n📋 TEST 2: VenmoGateway Token Lookup Simulation');
    console.log('-'.repeat(50));
    
    if (venmoWallets.length > 0) {
      const testWallet = venmoWallets[0];
      console.log(`Testing with wallet: ${testWallet.walletId}`);
      
      // Simulate the lookup logic from VenmoGateway
      const connectedWallet = await prisma.connectedWallets.findFirst({
        where: {
          walletId: testWallet.walletId,
          provider: 'VENMO',
          isActive: true
        }
      });
      
      if (!connectedWallet) {
        console.log('❌ Wallet lookup failed');
      } else if (!connectedWallet.paymentMethodToken) {
        console.log('⚠️ Wallet found but missing payment method token');
        console.log('💡 User needs to reconnect Venmo account');
      } else {
        console.log('✅ Wallet found with valid payment method token');
        console.log(`   Token: ${connectedWallet.paymentMethodToken.substring(0, 10)}...`);
        console.log(`   Customer ID: ${connectedWallet.customerId || connectedWallet.accessToken}`);
      }
    } else {
      console.log('No Venmo wallets found for testing');
    }
    
    // Test 3: Check if schema includes paymentMethodToken
    console.log('\n📋 TEST 3: Database Schema Check');
    console.log('-'.repeat(50));
    
    const columnCheck = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'connectedWallets' 
      AND COLUMN_NAME = 'paymentMethodToken'
    `;
    
    if (columnCheck.length > 0) {
      console.log('✅ paymentMethodToken column exists');
      console.log(`   Type: ${columnCheck[0].DATA_TYPE}`);
      console.log(`   Nullable: ${columnCheck[0].IS_NULLABLE}`);
    } else {
      console.log('❌ paymentMethodToken column missing');
    }
    
    console.log('\n🎉 Venmo token fix test completed!');
    console.log('\n💡 Next Steps:');
    console.log('1. Users with missing tokens need to reconnect their Venmo accounts');
    console.log('2. New Venmo connections will automatically store the Braintree token');
    console.log('3. VenmoGateway will now use the correct Braintree token for transactions');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testVenmoTokenFix().catch(console.error);
