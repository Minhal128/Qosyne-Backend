const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Testing users.selectedWalletId field access...');
  
  try {
    // Simple test to see if selectedWalletId field is accessible
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        selectedWalletId: true,
        selectedWalletType: true
      },
      take: 1
    });
    
    console.log('SUCCESS: selectedWalletId field is accessible');
    console.log('Sample user data:', users[0] || 'No users found');
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
  
  await prisma.$disconnect();
}

main();
