// Database connection test script
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');
  
  // Show current DATABASE_URL (masked for security)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const maskedUrl = dbUrl.replace(/:[^:@]*@/, ':****@');
    console.log('📍 Database URL:', maskedUrl);
  } else {
    console.log('❌ DATABASE_URL environment variable not found');
    return;
  }
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('\n⏳ Attempting to connect to database...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    console.log('\n⏳ Testing simple query...');
    const userCount = await prisma.users.count();
    console.log(`✅ Query successful! Found ${userCount} users in database`);
    
    // Test connectedWallets table
    console.log('\n⏳ Testing connectedWallets table...');
    const walletCount = await prisma.connectedWallets.count();
    console.log(`✅ ConnectedWallets query successful! Found ${walletCount} wallets`);
    
    console.log('\n🎉 All database tests passed!');
    
  } catch (error) {
    console.error('\n❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.message.includes("Can't reach database server")) {
      console.log('\n💡 Troubleshooting suggestions:');
      console.log('1. Check if Railway database service is running');
      console.log('2. Verify your DATABASE_URL is correct');
      console.log('3. Check your internet connection');
      console.log('4. Railway might be experiencing downtime');
      console.log('5. Database credentials might have changed');
    }
    
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testDatabaseConnection().catch(console.error);
