const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema vs Prisma schema...\n');
  
  try {
    // Test 1: Try to query connectedWallets with all fields
    console.log('1️⃣ Testing connectedWallets query with all schema fields...');
    
    try {
      const wallets = await prisma.connectedWallets.findMany({
        take: 1,
        select: {
          id: true,
          userId: true,
          provider: true,
          walletId: true,
          accountEmail: true,
          fullName: true,
          balance: true,
          currency: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      console.log('✅ Basic fields work fine');
      console.log('Sample wallet:', wallets[0] || 'No wallets found');
      
    } catch (error) {
      console.log('❌ Basic fields failed:', error.message);
    }
    
    // Test 2: Try problematic fields
    console.log('\n2️⃣ Testing problematic fields (accessToken, refreshToken, etc.)...');
    
    const problematicFields = ['accessToken', 'refreshToken', 'paymentMethodToken', 'lastSync', 'capabilities'];
    
    for (const field of problematicFields) {
      try {
        const query = {
          take: 1,
          select: {
            id: true,
            [field]: true
          }
        };
        
        await prisma.connectedWallets.findMany(query);
        console.log(`  ✅ ${field}: EXISTS`);
        
      } catch (error) {
        console.log(`  ❌ ${field}: MISSING - ${error.message.split('\n')[0]}`);
      }
    }
    
    // Test 3: Check what the getUserConnectedWallets function is trying to do
    console.log('\n3️⃣ Testing getUserConnectedWallets query...');
    
    try {
      // This is likely what's failing in userDataController.js
      const wallets = await prisma.connectedWallets.findMany({
        where: {
          userId: 4, // Using the userId from your error log
          isActive: true
        },
        select: {
          id: true,
          provider: true,
          walletId: true,
          accountEmail: true,
          fullName: true,
          balance: true,
          currency: true,
          isActive: true,
          // These are probably the problematic ones:
          // accessToken: true,
          // refreshToken: true,
          // paymentMethodToken: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      console.log('✅ getUserConnectedWallets query works without problematic fields');
      console.log('Found wallets:', wallets.length);
      
    } catch (error) {
      console.log('❌ getUserConnectedWallets query failed:', error.message);
    }
    
    // Test 4: Show current database structure
    console.log('\n4️⃣ Current database structure:');
    
    try {
      // Get table info using a more compatible query
      const result = await prisma.$queryRaw`SELECT * FROM connectedWallets LIMIT 0`;
      console.log('Query executed successfully - table exists');
      
    } catch (error) {
      console.log('Error querying table:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseSchema();
