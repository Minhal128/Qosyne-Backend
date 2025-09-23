const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuthLoginQuery() {
  console.log('🔧 Testing authController login query pattern...');
  
  try {
    // Test the exact query pattern from authController.login (line 115)
    const user = await prisma.users.findUnique({
      where: {
        email_isDeleted: {
          email: "test@example.com", // Using a test email that won't exist
          isDeleted: false,
        },
      },
    });
    
    console.log('✅ Auth login query executed successfully');
    console.log('User found:', user ? 'Yes' : 'No (expected for test email)');
    
    // Test that selectedWalletId and selectedWalletType are accessible
    if (user) {
      console.log('selectedWalletId:', user.selectedWalletId);
      console.log('selectedWalletType:', user.selectedWalletType);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Auth login query failed:', error.message);
    return false;
  }
}

async function testUserFieldsDirectly() {
  console.log('\n🔧 Testing direct access to selectedWallet fields...');
  
  try {
    // Test direct field access
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        selectedWalletId: true,
        selectedWalletType: true
      },
      take: 3
    });
    
    console.log('✅ Direct field access successful');
    console.log('Sample users with selectedWallet fields:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email})`);
      console.log(`     selectedWalletId: ${user.selectedWalletId}`);
      console.log(`     selectedWalletType: ${user.selectedWalletType}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Direct field access failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing auth login fix after adding missing columns\n');
  
  const authTest = await testAuthLoginQuery();
  const fieldsTest = await testUserFieldsDirectly();
  
  console.log('\n📊 Test Results:');
  console.log('Auth login query:', authTest ? '✅ PASSED' : '❌ FAILED');
  console.log('Direct field access:', fieldsTest ? '✅ PASSED' : '❌ FAILED');
  
  if (authTest && fieldsTest) {
    console.log('\n🎉 All tests passed! The selectedWalletId column issue has been resolved.');
    console.log('The authController.login function should now work without errors.');
  } else {
    console.log('\n⚠️  Some tests failed. The issue may not be fully resolved.');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
