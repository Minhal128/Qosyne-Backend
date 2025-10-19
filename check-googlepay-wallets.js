const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGooglePayWallets() {
  try {
    console.log('🔍 Checking all Google Pay wallets in database...\n');
    
    const googlePayWallets = await prisma.connectedWallets.findMany({
      where: {
        provider: 'GOOGLEPAY'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${googlePayWallets.length} Google Pay wallet(s):\n`);
    
    googlePayWallets.forEach((wallet, index) => {
      console.log(`Wallet #${index + 1}:`);
      console.log(`  ID: ${wallet.id}`);
      console.log(`  User ID: ${wallet.userId}`);
      console.log(`  Provider: ${wallet.provider}`);
      console.log(`  Wallet ID: ${wallet.walletId}`);
      console.log(`  Account Email: ${wallet.accountEmail}`);
      console.log(`  Full Name: ${wallet.fullName}`);
      console.log(`  Is Active: ${wallet.isActive}`);
      console.log(`  Created At: ${wallet.createdAt}`);
      console.log(`  Updated At: ${wallet.updatedAt}`);
      console.log('');
    });

    // Check for active vs inactive
    const activeCount = googlePayWallets.filter(w => w.isActive).length;
    const inactiveCount = googlePayWallets.filter(w => !w.isActive).length;
    
    console.log(`Active: ${activeCount}, Inactive: ${inactiveCount}`);
    
  } catch (error) {
    console.error('Error checking wallets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGooglePayWallets();
