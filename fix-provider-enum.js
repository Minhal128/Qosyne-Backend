const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProviderValues() {
  console.log('🔧 Checking existing provider values in connectedWallets table...');
  
  try {
    // Get all unique provider values from the database
    const providers = await prisma.$queryRaw`
      SELECT DISTINCT provider 
      FROM connectedWallets 
      ORDER BY provider
    `;
    
    console.log('Existing provider values in database:');
    providers.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.provider}`);
    });
    
    return providers.map(row => row.provider);
    
  } catch (error) {
    console.error('❌ Error checking provider values:', error.message);
    return [];
  }
}

async function addMissingEnumValues() {
  console.log('\n🔧 Adding missing enum values to connectedWallets_provider...');
  
  const missingValues = ['QOSYNE']; // Add other values if needed
  
  try {
    for (const value of missingValues) {
      console.log(`Adding ${value} to enum...`);
      
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE connectedWallets 
          MODIFY COLUMN provider ENUM(
            'PAYPAL', 'GOOGLEPAY', 'WISE', 'SQUARE', 
            'VENMO', 'APPLEPAY', 'RAPYD', 'STRIPE', 
            'BRAINTREE', 'QOSYNE'
          ) NOT NULL
        `);
        
        console.log(`✅ ${value} added to enum successfully`);
      } catch (enumError) {
        console.log(`⚠️  Error adding ${value} to enum: ${enumError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error adding enum values:', error.message);
    throw error;
  }
}

async function testWalletQuery() {
  console.log('\n🔧 Testing wallet query after enum fix...');
  
  try {
    const wallets = await prisma.connectedWallets.findMany({
      where: { userId: 78 },
      select: {
        id: true,
        provider: true,
        walletId: true,
        accountEmail: true
      }
    });
    
    console.log(`✅ Query successful! Found ${wallets.length} wallets`);
    wallets.forEach((wallet, index) => {
      console.log(`  ${index + 1}. ${wallet.provider} - ${wallet.walletId} (${wallet.accountEmail})`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Wallet query failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Fixing provider enum for connectedWallets table\n');
  
  try {
    const existingProviders = await checkProviderValues();
    
    // Check if QOSYNE exists in the data
    if (existingProviders.includes('QOSYNE')) {
      console.log('\n⚠️  QOSYNE provider found in data but not in enum - fixing...');
      await addMissingEnumValues();
    } else {
      console.log('\n✅ No QOSYNE providers found in data');
    }
    
    const testResult = await testWalletQuery();
    
    if (testResult) {
      console.log('\n🎉 Provider enum fix completed successfully!');
      console.log('The /api/wallet/wallets endpoint should now work.');
    } else {
      console.log('\n⚠️  Still having issues with wallet queries.');
    }
    
  } catch (error) {
    console.error('\n💥 Fix failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
