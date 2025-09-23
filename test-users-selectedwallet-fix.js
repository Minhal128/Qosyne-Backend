const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUsersSelectedWalletQuery() {
  console.log('Testing users.selectedWalletId query after schema fix...');
  
  try {
    // Test the exact query pattern that was failing in authController
    const user = await prisma.users.findUnique({
      where: {
        email_isDeleted: {
          email: "test@example.com", // Using a test email
          isDeleted: false,
        },
      },
    });
    
    console.log('✅ Query successful! User found:', user ? 'Yes' : 'No');
    
    if (user) {
      console.log('✅ selectedWalletId field accessible:', user.selectedWalletId);
      console.log('✅ selectedWalletType field accessible:', user.selectedWalletType);
    } else {
      console.log('ℹ️  No user found with test email, but query executed successfully');
    }
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    return false;
  }
  
  return true;
}

async function testAuthControllerLogin() {
  console.log('\nTesting authController.login function simulation...');
  
  try {
    // Test the specific query pattern from authController login function
    const user = await prisma.users.findUnique({
      where: {
        email_isDeleted: {
          email: "nonexistent@test.com", // Using non-existent email to avoid actual login
          isDeleted: false,
        },
      },
    });
    
    console.log('✅ Auth controller query pattern executed successfully');
    console.log('User found:', user ? 'Yes' : 'No (expected for test email)');
    
  } catch (error) {
    console.error('❌ Auth controller query pattern failed:', error.message);
    return false;
  }
  
  return true;
}

async function testUserFieldsAccess() {
  console.log('\nTesting direct access to selectedWallet fields...');
  
  try {
    // Test if we can query users with selectedWalletId filter
    const usersWithSelectedWallet = await prisma.users.findMany({
      where: {
        selectedWalletId: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        selectedWalletId: true,
        selectedWalletType: true
      }
    });
    
    console.log('✅ selectedWallet fields query successful');
    console.log('Users with selected wallets:', usersWithSelectedWallet.length);
    
  } catch (error) {
    console.error('❌ selectedWallet fields query failed:', error.message);
    return false;
  }
  
  return true;
}

async function main() {
  console.log('🔧 Testing database schema fix for users.selectedWalletId column\n');
  
  const basicTest = await testUsersSelectedWalletQuery();
  const authTest = await testAuthControllerLogin();
  const fieldsTest = await testUserFieldsAccess();
  
  console.log('\n📊 Test Results:');
  console.log('Basic users query:', basicTest ? '✅ PASSED' : '❌ FAILED');
  console.log('Auth controller pattern:', authTest ? '✅ PASSED' : '❌ FAILED');
  console.log('selectedWallet fields access:', fieldsTest ? '✅ PASSED' : '❌ FAILED');
  
  if (basicTest && authTest && fieldsTest) {
    console.log('\n🎉 All tests passed! The selectedWalletId column issue has been resolved.');
  } else {
    console.log('\n⚠️  Some tests failed. The issue may not be fully resolved.');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
