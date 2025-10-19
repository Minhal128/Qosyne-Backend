const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTest313User() {
  console.log('🔍 Checking test313@example.com user and wallets...\n');
  
  try {
    // Find the user with email test313@example.com
    const user = await prisma.users.findFirst({
      where: { email: 'test313@example.com' }
    });
    
    if (!user) {
      console.log('❌ User test313@example.com not found');
      return;
    }
    
    console.log('✅ Found user:');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username || 'N/A'}`);
    console.log(`   Created: ${user.createdAt}`);
    
    // Get wallets for this user
    console.log('\n📱 Checking wallets for this user...');
    const wallets = await prisma.connectedWallets.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ Found ${wallets.length} wallets:`);
    wallets.forEach((wallet, index) => {
      console.log(`   ${index + 1}. ${wallet.provider}: ${wallet.walletId} (DB ID: ${wallet.id})`);
      console.log(`      - Active: ${wallet.isActive}`);
      console.log(`      - Email: ${wallet.accountEmail}`);
      console.log(`      - Name: ${wallet.fullName}`);
      console.log(`      - Created: ${wallet.createdAt}`);
      console.log('');
    });
    
    // Check if there's a recent Venmo connection
    const venmoWallet = wallets.find(w => w.provider === 'VENMO' && w.isActive);
    if (venmoWallet) {
      console.log('🎉 VENMO WALLET FOUND!');
      console.log(`   Wallet ID: ${venmoWallet.walletId}`);
      console.log(`   Created: ${venmoWallet.createdAt}`);
    } else {
      console.log('❌ No active Venmo wallet found for this user');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTest313User().catch(console.error);
