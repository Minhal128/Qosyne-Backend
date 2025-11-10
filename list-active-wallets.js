const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listActiveWallets() {
  console.log('📋 Listing all active wallets in the database...\n');

  try {
    const wallets = await prisma.connectedWallets.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        provider: true,
        accountEmail: true,
        fullName: true,
        username: true,
        users: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    console.log(`Total active wallets found: ${wallets.length}\n`);

    if (wallets.length === 0) {
      console.log('❌ No active wallets found in the database!');
    } else {
      console.log('📋 Active wallets:');
      wallets.forEach((wallet, index) => {
        console.log(`${index + 1}. Provider: ${wallet.provider}`);
        console.log(`   Wallet ID: ${wallet.id}`);
        console.log(`   Full Name: ${wallet.fullName}`);
        console.log(`   Username: ${wallet.username}`);
        console.log(`   Account Email: ${wallet.accountEmail}`);
        console.log(`   User Email: ${wallet.users.email}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error listing active wallets:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listActiveWallets();
