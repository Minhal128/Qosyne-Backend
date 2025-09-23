// Debug script to check Venmo payment method token issues
const { PrismaClient } = require('@prisma/client');

async function debugVenmoToken() {
  console.log('🔍 Debugging Venmo Payment Method Token Issues...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Check connected wallets for Venmo
    console.log('📋 Checking Connected Venmo Wallets');
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
    
    venmoWallets.forEach((wallet, index) => {
      console.log(`\n${index + 1}. Wallet ID: ${wallet.id}`);
      console.log(`   User: ${wallet.users.name} (${wallet.users.email})`);
      console.log(`   Wallet ID: ${wallet.walletId}`);
      console.log(`   Account Email: ${wallet.accountEmail}`);
      console.log(`   Connection Status: ${wallet.connectionStatus}`);
      console.log(`   Is Active: ${wallet.isActive}`);
      console.log(`   Access Token: ${wallet.accessToken ? 'Present' : 'Missing'}`);
      console.log(`   Created: ${wallet.createdAt}`);
      console.log(`   Updated: ${wallet.updatedAt}`);
    });
    
    // Check recent transactions that failed
    console.log('\n📋 Checking Recent Failed Transactions');
    console.log('-'.repeat(50));
    
    const recentTransactions = await prisma.transactions.findMany({
      where: {
        provider: 'VENMO',
        status: 'FAILED',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log(`Found ${recentTransactions.length} recent failed Venmo transactions:`);
    
    recentTransactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. Transaction ID: ${tx.id}`);
      console.log(`   Amount: ${tx.amount} ${tx.currency}`);
      console.log(`   Payment ID: ${tx.paymentId}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Created: ${tx.createdAt}`);
      
      try {
        const metadata = JSON.parse(tx.metadata || '{}');
        console.log(`   Error: ${metadata.error || 'No error details'}`);
      } catch (e) {
        console.log(`   Metadata: ${tx.metadata}`);
      }
    });
    
    // Check if there are any successful Venmo transactions
    console.log('\n📋 Checking Recent Successful Transactions');
    console.log('-'.repeat(50));
    
    const successfulTransactions = await prisma.transactions.findMany({
      where: {
        provider: 'VENMO',
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    });
    
    console.log(`Found ${successfulTransactions.length} successful Venmo transactions:`);
    
    successfulTransactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. Transaction ID: ${tx.id}`);
      console.log(`   Amount: ${tx.amount} ${tx.currency}`);
      console.log(`   Payment ID: ${tx.paymentId}`);
      console.log(`   Created: ${tx.createdAt}`);
    });
    
    console.log('\n💡 Potential Issues to Check:');
    console.log('1. Are Venmo wallets properly connected with valid tokens?');
    console.log('2. Are the Braintree credentials correct for Venmo?');
    console.log('3. Is the payment method token being passed correctly?');
    console.log('4. Are the tokens expired or invalid?');
    
  } catch (error) {
    console.error('❌ Error debugging Venmo tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugVenmoToken().catch(console.error);
