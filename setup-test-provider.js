const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import the wallet service
const walletService = require('./services/walletService');

async function setupTestPayPalWallet() {
  console.log('🔧 Setting up test PayPal wallet for money transfer testing...');
  
  try {
    const testUserId = 78; // Using your user ID
    
    // Connect a test PayPal wallet
    console.log('Connecting test PayPal wallet...');
    const paypalWallet = await walletService.connectWallet(testUserId, {
      provider: 'PAYPAL',
      authCode: 'test_auth_code_for_paypal'
    });
    
    console.log('✅ PayPal wallet connected successfully!');
    console.log('Wallet details:', {
      id: paypalWallet.id,
      provider: paypalWallet.provider,
      walletId: paypalWallet.walletId,
      accountEmail: paypalWallet.accountEmail,
      fullName: paypalWallet.fullName,
      capabilities: JSON.parse(paypalWallet.capabilities)
    });
    
    return paypalWallet;
    
  } catch (error) {
    console.error('❌ Error setting up PayPal wallet:', error.message);
    throw error;
  }
}

async function setupTestWiseWallet() {
  console.log('\n🔧 Setting up test Wise wallet for international transfers...');
  
  try {
    const testUserId = 78;
    
    // Connect a test Wise wallet
    console.log('Connecting test Wise wallet...');
    const wiseCredentials = JSON.stringify({
      connectionType: 'email',
      identifier: 'test@wise.com',
      country: 'US'
    });
    
    const wiseWallet = await walletService.connectWallet(testUserId, {
      provider: 'WISE',
      authCode: wiseCredentials
    });
    
    console.log('✅ Wise wallet connected successfully!');
    console.log('Wallet details:', {
      id: wiseWallet.id,
      provider: wiseWallet.provider,
      walletId: wiseWallet.walletId,
      accountEmail: wiseWallet.accountEmail,
      fullName: wiseWallet.fullName,
      capabilities: JSON.parse(wiseWallet.capabilities)
    });
    
    return wiseWallet;
    
  } catch (error) {
    console.error('❌ Error setting up Wise wallet:', error.message);
    throw error;
  }
}

async function setupTestSquareWallet() {
  console.log('\n🔧 Setting up test Square wallet for business payments...');
  
  try {
    const testUserId = 78;
    
    // Connect a test Square wallet
    console.log('Connecting test Square wallet...');
    const squareCredentials = JSON.stringify({
      identifier: 'test_merchant_123'
    });
    
    const squareWallet = await walletService.connectWallet(testUserId, {
      provider: 'SQUARE',
      authCode: squareCredentials
    });
    
    console.log('✅ Square wallet connected successfully!');
    console.log('Wallet details:', {
      id: squareWallet.id,
      provider: squareWallet.provider,
      walletId: squareWallet.walletId,
      accountEmail: squareWallet.accountEmail,
      fullName: squareWallet.fullName,
      capabilities: JSON.parse(squareWallet.capabilities)
    });
    
    return squareWallet;
    
  } catch (error) {
    console.error('❌ Error setting up Square wallet:', error.message);
    throw error;
  }
}

async function listUserWallets(userId) {
  console.log(`\n📋 Current wallets for user ${userId}:`);
  
  try {
    const wallets = await prisma.connectedWallets.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        provider: true,
        walletId: true,
        accountEmail: true,
        fullName: true,
        capabilities: true,
        currency: true,
        balance: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (wallets.length === 0) {
      console.log('No active wallets found.');
      return [];
    }
    
    wallets.forEach((wallet, index) => {
      console.log(`\n${index + 1}. ${wallet.provider} Wallet:`);
      console.log(`   ID: ${wallet.id}`);
      console.log(`   Wallet ID: ${wallet.walletId}`);
      console.log(`   Email: ${wallet.accountEmail}`);
      console.log(`   Name: ${wallet.fullName}`);
      console.log(`   Capabilities: ${wallet.capabilities}`);
      console.log(`   Currency: ${wallet.currency}`);
      console.log(`   Balance: ${wallet.balance}`);
      console.log(`   Created: ${wallet.createdAt}`);
    });
    
    return wallets;
    
  } catch (error) {
    console.error('❌ Error listing wallets:', error.message);
    return [];
  }
}

async function createTestTransferScenario() {
  console.log('\n🚀 Creating test transfer scenario...');
  
  try {
    const userId = 78;
    const wallets = await listUserWallets(userId);
    
    if (wallets.length < 2) {
      console.log('⚠️  You need at least 2 wallets to test transfers. Setting up additional wallets...');
      
      // Set up PayPal if not exists
      const hasPayPal = wallets.some(w => w.provider === 'PAYPAL');
      if (!hasPayPal) {
        await setupTestPayPalWallet();
      }
      
      // Set up Wise if not exists
      const hasWise = wallets.some(w => w.provider === 'WISE');
      if (!hasWise) {
        await setupTestWiseWallet();
      }
      
      // Refresh wallet list
      await listUserWallets(userId);
    }
    
    console.log('\n✅ Test scenario ready! You can now test money transfers between wallets.');
    console.log('\n📝 Next steps for testing:');
    console.log('1. Use the wallet IDs above to create transfer requests');
    console.log('2. Test sending money from one wallet to another');
    console.log('3. Check transaction history and balance updates');
    
  } catch (error) {
    console.error('❌ Error creating test scenario:', error.message);
  }
}

async function main() {
  console.log('🚀 Setting up test providers for money transfer testing\n');
  
  try {
    // First, list current wallets
    await listUserWallets(78);
    
    // Ask user what they want to set up
    console.log('\n🔧 Available test providers:');
    console.log('1. PayPal - Best for general testing (send, receive, balance_check)');
    console.log('2. Wise - Best for international transfers (multi_currency support)');
    console.log('3. Square - Best for business payments');
    console.log('4. All providers - Complete test setup');
    
    // For now, let's set up PayPal as it's most reliable for testing
    console.log('\n🎯 Setting up PayPal for testing (most reliable option)...');
    
    const paypalWallet = await setupTestPayPalWallet();
    
    // Create a complete test scenario
    await createTestTransferScenario();
    
    console.log('\n🎉 Test provider setup complete!');
    console.log('\n💡 Pro tip: PayPal sandbox allows you to:');
    console.log('- Send test payments');
    console.log('- Receive test payments');
    console.log('- Check balances');
    console.log('- Test different currencies');
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Allow running specific setup functions
if (process.argv[2]) {
  const command = process.argv[2].toLowerCase();
  
  switch (command) {
    case 'paypal':
      setupTestPayPalWallet().then(() => prisma.$disconnect());
      break;
    case 'wise':
      setupTestWiseWallet().then(() => prisma.$disconnect());
      break;
    case 'square':
      setupTestSquareWallet().then(() => prisma.$disconnect());
      break;
    case 'list':
      listUserWallets(78).then(() => prisma.$disconnect());
      break;
    default:
      main();
  }
} else {
  main();
}

module.exports = {
  setupTestPayPalWallet,
  setupTestWiseWallet,
  setupTestSquareWallet,
  listUserWallets
};
