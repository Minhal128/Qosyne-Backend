// Migration script to fix existing wallet IDs to new format
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateWalletIds() {
  console.log('🔄 Starting Wallet ID Migration...\n');
  
  try {
    // Get all wallets that need migration
    const walletsToMigrate = await prisma.connectedWallets.findMany({
      where: {
        OR: [
          // Venmo wallets that don't follow the new format
          {
            provider: 'VENMO',
            NOT: {
              walletId: {
                contains: 'venmo_'
              }
            }
          },
          // Venmo wallets with old format
          {
            provider: 'VENMO',
            walletId: {
              startsWith: 'venmo_venmo_'
            }
          },
          // Wise wallets that don't follow the new format
          {
            provider: 'WISE',
            walletId: {
              startsWith: 'wise_account_'
            }
          },
          // Wise wallets without userId prefix
          {
            provider: 'WISE',
            NOT: {
              walletId: {
                contains: '_'
              }
            }
          }
        ]
      }
    });

    console.log(`Found ${walletsToMigrate.length} wallets that need migration\n`);

    let migratedCount = 0;
    
    for (const wallet of walletsToMigrate) {
      try {
        let newWalletId;
        
        switch (wallet.provider) {
          case 'VENMO':
            // Generate new Venmo wallet ID
            if (wallet.walletId.startsWith('venmo_venmo_')) {
              // Extract timestamp from old format
              const parts = wallet.walletId.split('_');
              const timestamp = parts[2] || Date.now();
              newWalletId = `venmo_${wallet.userId}_${timestamp}`;
            } else {
              // Create new format with current timestamp
              newWalletId = `venmo_${wallet.userId}_${Date.now()}`;
            }
            break;
            
          case 'WISE':
            // Generate new Wise wallet ID
            if (wallet.walletId.startsWith('wise_account_')) {
              // Extract the account part
              const accountPart = wallet.walletId.replace('wise_account_', '');
              newWalletId = `wise_${wallet.userId}_${accountPart}`;
            } else if (wallet.walletId.startsWith('wise_') && !wallet.walletId.includes(`${wallet.userId}_`)) {
              // Add userId to existing wise_ format
              const wisePart = wallet.walletId.replace('wise_', '');
              newWalletId = `wise_${wallet.userId}_${wisePart}`;
            } else {
              // Create new format
              newWalletId = `wise_${wallet.userId}_${Date.now()}`;
            }
            break;
            
          default:
            console.log(`   Skipping ${wallet.provider} wallet (no migration needed)`);
            continue;
        }

        // Check if new wallet ID already exists
        const existingWallet = await prisma.connectedWallets.findFirst({
          where: { walletId: newWalletId }
        });

        if (existingWallet) {
          // Add random suffix to avoid conflicts
          newWalletId = `${newWalletId}_${Math.random().toString(36).substr(2, 6)}`;
        }

        // Update the wallet
        await prisma.connectedWallets.update({
          where: { id: wallet.id },
          data: { walletId: newWalletId }
        });

        console.log(`✅ Migrated ${wallet.provider} wallet:`);
        console.log(`   Old ID: ${wallet.walletId}`);
        console.log(`   New ID: ${newWalletId}`);
        console.log(`   User ID: ${wallet.userId}\n`);
        
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate wallet ${wallet.id}:`, error.message);
      }
    }

    console.log(`\n🎉 Migration completed! Migrated ${migratedCount} out of ${walletsToMigrate.length} wallets.`);
    
    // Verify migration
    await verifyMigration();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  try {
    // Check Venmo wallets
    const venmoWallets = await prisma.connectedWallets.findMany({
      where: { provider: 'VENMO' },
      select: { walletId: true, userId: true }
    });

    let venmoCorrect = 0;
    venmoWallets.forEach(wallet => {
      if (wallet.walletId.startsWith('venmo_') && wallet.walletId.includes(`${wallet.userId}_`)) {
        venmoCorrect++;
      }
    });

    console.log(`   Venmo wallets: ${venmoCorrect}/${venmoWallets.length} have correct format`);

    // Check Wise wallets
    const wiseWallets = await prisma.connectedWallets.findMany({
      where: { provider: 'WISE' },
      select: { walletId: true, userId: true }
    });

    let wiseCorrect = 0;
    wiseWallets.forEach(wallet => {
      if (wallet.walletId.startsWith('wise_') && wallet.walletId.includes(`${wallet.userId}_`)) {
        wiseCorrect++;
      }
    });

    console.log(`   Wise wallets: ${wiseCorrect}/${wiseWallets.length} have correct format`);

    if (venmoCorrect === venmoWallets.length && wiseCorrect === wiseWallets.length) {
      console.log('✅ All wallets now have correct format!');
    } else {
      console.log('⚠️  Some wallets still need attention');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

async function rollbackMigration() {
  console.log('⚠️  Rolling back migration is not recommended as it may cause data loss.');
  console.log('Please manually review the database if needed.');
}

// Run migration
if (require.main === module) {
  console.log('Wallet ID Migration Tool');
  console.log('This will update existing wallet IDs to the new format.');
  console.log('Make sure to backup your database before running this migration.\n');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--verify-only')) {
    verifyMigration().then(() => process.exit(0));
  } else if (args.includes('--help')) {
    console.log('Usage:');
    console.log('  node migrate-wallet-ids.js           # Run migration');
    console.log('  node migrate-wallet-ids.js --verify-only  # Only verify current state');
    console.log('  node migrate-wallet-ids.js --help    # Show this help');
  } else {
    migrateWalletIds().catch(console.error);
  }
}

module.exports = {
  migrateWalletIds,
  verifyMigration,
  rollbackMigration
};
