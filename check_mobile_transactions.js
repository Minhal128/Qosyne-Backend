const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMobileTransactions() {
  console.log('🔍 Checking recent mobile app transactions...\n');
  
  try {
    const recent = await prisma.transactions.findMany({
      where: { userId: 78 },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        provider: true,
        type: true,
        status: true,
        amount: true,
        rapydPaymentId: true,
        rapydPayoutId: true,
        metadata: true,
        createdAt: true,
        connectedWalletId: true
      }
    });

    console.log('📱 Recent transactions from your mobile app:');
    console.log('================================================');
    
    if (recent.length === 0) {
      console.log('No transactions found for user 78');
      return;
    }

    let rapydTransactionCount = 0;
    
    for (const t of recent) {
      console.log(`\n🔸 Transaction ID: ${t.id}`);
      console.log(`   Provider: ${t.provider}`);
      console.log(`   Type: ${t.type}`);
      console.log(`   Amount: $${t.amount}`);
      console.log(`   Status: ${t.status}`);
      console.log(`   Created: ${t.createdAt}`);
      console.log(`   Rapyd Payment ID: ${t.rapydPaymentId || '❌ None'}`);
      console.log(`   Rapyd Payout ID: ${t.rapydPayoutId || '❌ None'}`);
      
      if (t.rapydPaymentId || t.rapydPayoutId) {
        rapydTransactionCount++;
      }
      
      if (t.metadata) {
        try {
          const meta = JSON.parse(t.metadata);
          console.log(`   From: ${meta.fromProvider || 'N/A'}`);
          console.log(`   To: ${meta.toProvider || 'N/A'}`);
          console.log(`   Cross-platform: ${meta.isCrossPlatform || 'Unknown'}`);
        } catch (e) {
          console.log(`   Metadata: ${t.metadata.substring(0, 50)}...`);
        }
      }
    }

    console.log('\n📊 ANALYSIS:');
    console.log(`   • Total transactions: ${recent.length}`);
    console.log(`   • Transactions with Rapyd IDs: ${rapydTransactionCount}`);
    console.log(`   • Transactions missing Rapyd IDs: ${recent.length - rapydTransactionCount}`);

    if (rapydTransactionCount === 0) {
      console.log('\n❌ PROBLEM IDENTIFIED:');
      console.log('   None of your mobile transactions are using Rapyd!');
      console.log('   This means they are all same-provider transfers (Venmo→Venmo)');
      console.log('   or the cross-wallet logic is not triggering properly.');
    }

    // Check connected wallets to see what providers are available
    const wallets = await prisma.connectedWallets.findMany({
      where: { userId: 78, isActive: true },
      select: { id: true, provider: true, walletId: true }
    });

    console.log('\n💳 Your connected wallets:');
    wallets.forEach(w => {
      console.log(`   • ${w.provider}: ${w.walletId} (DB ID: ${w.id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMobileTransactions();