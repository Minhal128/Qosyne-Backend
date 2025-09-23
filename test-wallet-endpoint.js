const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWalletEndpoint() {
  console.log('🔧 Testing wallet endpoint functionality...');
  
  try {
    // Test the exact query from getConnectedWallets
    const testUserId = 78; // Using the userId from the original error logs
    
    console.log(`Testing for userId: ${testUserId}`);
    
    // First, check if user exists
    const user = await prisma.users.findUnique({
      where: { id: testUserId }
    });
    
    if (!user) {
      console.log('❌ User not found, trying with a different user...');
      
      // Get any user for testing
      const anyUser = await prisma.users.findFirst();
      if (!anyUser) {
        console.log('❌ No users found in database');
        return false;
      }
      
      console.log(`Using user: ${anyUser.id} (${anyUser.name})`);
      testUserId = anyUser.id;
    } else {
      console.log(`✅ User found: ${user.name} (${user.email})`);
    }
    
    // Test the connectedWallets query with isActive filter
    console.log('\n1. Testing connectedWallets query with isActive=true...');
    const activeWallets = await prisma.connectedWallets.findMany({
      where: { userId: testUserId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${activeWallets.length} active wallets`);
    
    // Test the fallback query without isActive filter
    console.log('\n2. Testing fallback query without isActive filter...');
    const allWallets = await prisma.connectedWallets.findMany({
      where: { userId: testUserId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${allWallets.length} total wallets`);
    
    // Test the problematic JSON parsing
    console.log('\n3. Testing JSON parsing of capabilities field...');
    const walletsToProcess = activeWallets.length > 0 ? activeWallets : allWallets;
    
    for (let i = 0; i < walletsToProcess.length; i++) {
      const wallet = walletsToProcess[i];
      console.log(`  Wallet ${i + 1}: ${wallet.provider} - ${wallet.walletId}`);
      console.log(`    capabilities raw: ${wallet.capabilities}`);
      
      try {
        const capabilities = wallet.capabilities ? JSON.parse(wallet.capabilities) : [];
        console.log(`    ✅ capabilities parsed:`, capabilities);
      } catch (parseError) {
        console.log(`    ❌ JSON parse error: ${parseError.message}`);
        console.log(`    Raw capabilities value: "${wallet.capabilities}"`);
        return false;
      }
    }
    
    console.log('\n✅ All wallet queries and JSON parsing successful');
    return true;
    
  } catch (error) {
    console.error('❌ Wallet endpoint test failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

async function simulateWalletController() {
  console.log('\n🔧 Simulating full wallet controller logic...');
  
  try {
    // Simulate the exact logic from getConnectedWallets
    const testUserId = 78;
    const numericUserId = Number(testUserId);
    
    if (!numericUserId || Number.isNaN(numericUserId)) {
      console.log('❌ Invalid user ID');
      return false;
    }
    
    // Fetch user's external connected wallets
    let externalWallets = await prisma.connectedWallets.findMany({
      where: { userId: numericUserId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    // Fallback: if none found, try without isActive filter
    if (externalWallets.length === 0) {
      externalWallets = await prisma.connectedWallets.findMany({
        where: { userId: numericUserId },
        orderBy: { createdAt: 'desc' }
      });
    }
    
    // Format provider names (helper function)
    const formatProviderName = (provider) => {
      switch (provider.toUpperCase()) {
        case 'PAYPAL': return 'PayPal';
        case 'GOOGLEPAY': return 'Google Pay';
        case 'SQUARE': return 'Square';
        case 'WISE': return 'Wise';
        case 'VENMO': return 'Venmo';
        case 'APPLEPAY': return 'Apple Pay';
        case 'RAPYD': return 'Rapyd';
        default:
          return provider
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
      }
    };
    
    // Format the wallets for response (this is where the error likely occurs)
    const wallets = externalWallets.map((cw) => ({
      id: cw.id,
      provider: formatProviderName(cw.provider),
      type: 'EXTERNAL',
      walletId: cw.walletId,
      accountEmail: cw.accountEmail,
      fullName: cw.fullName,
      username: cw.username,
      balance: parseFloat(cw.balance) || 0,
      currency: cw.currency,
      isActive: cw.isActive,
      lastSync: cw.lastSync,
      capabilities: cw.capabilities ? JSON.parse(cw.capabilities) : [],
      connectionStatus: cw.isActive ? 'connected' : 'disconnected',
      displayName: `${formatProviderName(cw.provider)} - ${cw.fullName || cw.username || cw.accountEmail}`
    }));
    
    console.log(`✅ Successfully processed ${wallets.length} wallets`);
    console.log('Sample wallet data:', wallets[0] || 'No wallets found');
    
    return true;
    
  } catch (error) {
    console.error('❌ Controller simulation failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Investigating /api/wallet/wallets endpoint 500 error\n');
  
  const basicTest = await testWalletEndpoint();
  const controllerTest = await simulateWalletController();
  
  console.log('\n📊 Test Results:');
  console.log('Basic wallet queries:', basicTest ? '✅ PASSED' : '❌ FAILED');
  console.log('Controller simulation:', controllerTest ? '✅ PASSED' : '❌ FAILED');
  
  if (basicTest && controllerTest) {
    console.log('\n🎉 Wallet endpoint should be working. The 500 error might be due to:');
    console.log('- Authentication issues (invalid token)');
    console.log('- Different user ID in production');
    console.log('- Network/deployment issues');
  } else {
    console.log('\n⚠️  Found issues that could cause the 500 error.');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
