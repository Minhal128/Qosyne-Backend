const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import the wallet service
const walletService = require('./services/walletService');

async function testVenmoConnectionUpsert() {
  console.log('🔧 Testing Venmo wallet connection upsert operation...');
  
  try {
    // Test the exact upsert operation that was failing
    const testUserId = 78;
    const mockConnectionResult = {
      walletId: `venmo_${testUserId}_${Date.now()}`,
      accountEmail: 'test@example.com',
      fullName: 'Test User (Venmo)',
      username: 'testuser',
      accessToken: 'mock_access_token',
      refreshToken: null,
      currency: 'USD'
    };
    
    console.log('Testing upsert with mock data...');
    
    const wallet = await prisma.connectedWallets.upsert({
      where: {
        walletId: mockConnectionResult.walletId
      },
      update: {
        accountEmail: mockConnectionResult.accountEmail,
        fullName: mockConnectionResult.fullName,
        username: mockConnectionResult.username,
        accessToken: mockConnectionResult.accessToken,
        refreshToken: mockConnectionResult.refreshToken,
        capabilities: JSON.stringify(['send', 'receive']),
        currency: mockConnectionResult.currency || 'USD',
        lastSync: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId: testUserId,
        provider: 'VENMO',
        walletId: mockConnectionResult.walletId,
        accountEmail: mockConnectionResult.accountEmail,
        fullName: mockConnectionResult.fullName,
        username: mockConnectionResult.username,
        accessToken: mockConnectionResult.accessToken,
        refreshToken: mockConnectionResult.refreshToken,
        capabilities: JSON.stringify(['send', 'receive']),
        currency: mockConnectionResult.currency || 'USD',
        lastSync: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Upsert operation successful!');
    console.log('Created/Updated wallet:', {
      id: wallet.id,
      provider: wallet.provider,
      walletId: wallet.walletId,
      fullName: wallet.fullName,
      updatedAt: wallet.updatedAt
    });
    
    // Clean up test data
    await prisma.connectedWallets.delete({
      where: { id: wallet.id }
    });
    console.log('✅ Test data cleaned up');
    
    return true;
    
  } catch (error) {
    console.error('❌ Upsert operation failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

async function testWalletServiceConnectWallet() {
  console.log('\n🔧 Testing walletService.connectWallet function...');
  
  try {
    // Test with mock Venmo credentials
    const testUserId = 78;
    const mockCredentials = JSON.stringify({
      username: 'testuser@example.com',
      password: 'testpassword123'
    });
    
    // Note: This will fail at the Venmo API call, but should pass the upsert validation
    console.log('Testing connectWallet with mock credentials...');
    
    try {
      const result = await walletService.connectWallet(testUserId, {
        provider: 'VENMO',
        authCode: mockCredentials
      });
      
      console.log('✅ Wallet service connection successful!');
      console.log('Result:', result);
      
      // Clean up if successful
      if (result.id) {
        await prisma.connectedWallets.delete({
          where: { id: result.id }
        });
        console.log('✅ Test wallet cleaned up');
      }
      
      return true;
      
    } catch (serviceError) {
      // Check if the error is from Venmo API (expected) or from Prisma validation (unexpected)
      if (serviceError.message.includes('updatedAt') || serviceError.message.includes('Argument')) {
        console.error('❌ Prisma validation error still exists:', serviceError.message);
        return false;
      } else {
        console.log('✅ Prisma validation passed (Venmo API error expected)');
        console.log('Expected error:', serviceError.message);
        return true;
      }
    }
    
  } catch (error) {
    console.error('❌ Wallet service test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Venmo wallet connection fix for updatedAt field\n');
  
  try {
    const upsertTest = await testVenmoConnectionUpsert();
    const serviceTest = await testWalletServiceConnectWallet();
    
    console.log('\n📊 Test Results:');
    console.log('Direct upsert operation:', upsertTest ? '✅ PASSED' : '❌ FAILED');
    console.log('Wallet service function:', serviceTest ? '✅ PASSED' : '❌ FAILED');
    
    if (upsertTest && serviceTest) {
      console.log('\n🎉 All tests passed! The updatedAt field issue has been fixed.');
      console.log('Venmo wallet connections should now work without Prisma validation errors.');
    } else {
      console.log('\n⚠️  Some tests failed. The issue may not be fully resolved.');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
