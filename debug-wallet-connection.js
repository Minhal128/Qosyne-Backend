const { PrismaClient } = require('@prisma/client');
const walletService = require('./services/walletService');

const prisma = new PrismaClient();

async function debugWalletConnection() {
  console.log('🔍 Debugging wallet connection and retrieval...\n');
  
  try {
    // Test 1: Check if we can query connectedWallets table directly
    console.log('1️⃣ Testing direct database query...');
    const allWallets = await prisma.connectedWallets.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`✅ Found ${allWallets.length} total wallets in database`);
    allWallets.forEach(wallet => {
      console.log(`   - User ${wallet.userId}: ${wallet.provider} (${wallet.walletId}) - Active: ${wallet.isActive}`);
    });
    
    // Test 2: Check specific user's wallets
    console.log('\n2️⃣ Testing specific user wallet retrieval...');
    
    // Get the most recent user ID from the wallets
    if (allWallets.length > 0) {
      const testUserId = allWallets[0].userId;
      console.log(`Testing with user ID: ${testUserId}`);
      
      const userWallets = await walletService.getUserWallets(testUserId);
      console.log(`✅ getUserWallets returned ${userWallets.length} wallets`);
      
      userWallets.forEach(wallet => {
        console.log(`   - ${wallet.provider}: ${wallet.walletId} (DB ID: ${wallet.id})`);
      });
      
      // Test 3: Check if there are any inactive wallets
      console.log('\n3️⃣ Checking for inactive wallets...');
      const inactiveWallets = await prisma.connectedWallets.findMany({
        where: { userId: testUserId, isActive: false }
      });
      
      console.log(`Found ${inactiveWallets.length} inactive wallets for user ${testUserId}`);
      inactiveWallets.forEach(wallet => {
        console.log(`   - INACTIVE: ${wallet.provider} (${wallet.walletId})`);
      });
      
    } else {
      console.log('❌ No wallets found in database');
    }
    
    // Test 4: Check users table
    console.log('\n4️⃣ Checking users table...');
    const users = await prisma.users.findMany({
      orderBy: { id: 'desc' },
      take: 5
    });
    
    console.log(`✅ Found ${users.length} users in database`);
    users.forEach(user => {
      console.log(`   - User ${user.id}: ${user.email || user.username || 'No email/username'}`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugWalletConnection().catch(console.error);
