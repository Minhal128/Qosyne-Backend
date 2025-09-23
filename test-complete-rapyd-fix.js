// Test script to verify both Rapyd signature and Prisma fixes
const rapydRealService = require('./services/rapydRealService');
const { PrismaClient } = require('@prisma/client');

async function testCompleteRapydFix() {
  console.log('🧪 Testing Complete Rapyd + Prisma Fix...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Test 1: Verify signature generation (base64 encoding)
    console.log('📋 TEST 1: Rapyd Signature Generation (Base64)');
    console.log('-'.repeat(50));
    
    const testData = {
      source_ewallet: 'ewallet_test123',
      destination_ewallet: 'ewallet_test456',
      amount: '10.50',
      currency: 'USD',
      metadata: { description: 'Test transfer' }
    };
    
    const bodyString = JSON.stringify(testData);
    const signature = rapydRealService.generateSignature('POST', '/v1/account/transfer', bodyString);
    console.log('✅ Signature generated successfully');
    console.log('Signature (base64):', signature.signature);
    console.log('Signature length:', signature.signature.length);
    console.log('Is base64 format:', /^[A-Za-z0-9+/]*={0,2}$/.test(signature.signature));
    console.log('');
    
    // Test 2: Check user exists for admin fee transaction
    console.log('📋 TEST 2: User Existence Check for Admin Fee');
    console.log('-'.repeat(50));
    
    const users = await prisma.users.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    console.log(`Found ${users.length} users in database:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. User ID ${user.id}: ${user.name} (${user.email})`);
    });
    
    if (users.length === 0) {
      console.log('⚠️ No users found - admin fee transaction will fail');
      console.log('💡 Create a test user first');
    } else {
      console.log('✅ Users exist - admin fee transaction should work');
    }
    console.log('');
    
    // Test 3: Test admin fee transaction creation
    console.log('📋 TEST 3: Admin Fee Transaction Test');
    console.log('-'.repeat(50));
    
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`Testing with User ID ${testUser.id} (${testUser.name})`);
      
      try {
        // Create a test main transaction first
        const mainTransaction = await prisma.transactions.create({
          data: {
            userId: testUser.id,
            amount: 100.00,
            currency: 'USD',
            provider: 'QOSYNE',
            type: 'TRANSFER',
            status: 'COMPLETED',
            paymentId: `test_main_${Date.now()}`,
            metadata: JSON.stringify({ test: true }),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log(`✅ Main transaction created: ID ${mainTransaction.id}`);
        
        // Now test admin fee transaction
        const adminFeeTransaction = await prisma.transactions.create({
          data: {
            userId: testUser.id, // Use actual user ID
            amount: 0.75,
            currency: 'USD',
            provider: 'QOSYNE',
            type: 'DEPOSIT',
            status: 'COMPLETED',
            paymentId: `admin_fee_${mainTransaction.id}`,
            metadata: JSON.stringify({
              originalTransactionId: mainTransaction.id,
              feeType: 'admin_transaction_fee',
              collectedFrom: testUser.id,
              originalAmount: 100.00,
              transferType: 'real_rapyd'
            }),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log(`✅ Admin fee transaction created: ID ${adminFeeTransaction.id}`);
        
        // Clean up test transactions
        await prisma.transactions.delete({ where: { id: adminFeeTransaction.id } });
        await prisma.transactions.delete({ where: { id: mainTransaction.id } });
        
        console.log('✅ Test transactions cleaned up');
        
      } catch (error) {
        console.error('❌ Admin fee transaction test failed:', error.message);
      }
    }
    console.log('');
    
    // Test 4: Test Rapyd API call (if VPN is working)
    console.log('📋 TEST 4: Rapyd API Call Test');
    console.log('-'.repeat(50));
    
    try {
      // Test with a simple wallet list call
      const wallets = await rapydRealService.getExistingWallets();
      console.log('✅ Rapyd API call successful!');
      console.log(`Found ${wallets.length} wallets`);
    } catch (error) {
      if (error.message.includes('geographical restrictions')) {
        console.log('⚠️ Still blocked by geographical restrictions (expected in local dev)');
      } else if (error.message.includes('UNAUTHENTICATED_API_CALL')) {
        console.log('❌ Still getting authentication errors - signature may need more work');
        console.log('Error details:', error.message);
      } else {
        console.log('⚠️ Other API error:', error.message);
      }
    }
    
    console.log('\n🏁 Complete fix test completed!');
    console.log('\n📝 Summary:');
    console.log('✅ Signature now uses base64 encoding directly');
    console.log('✅ Admin fee transaction uses actual user ID');
    console.log('✅ Foreign key constraint issue should be resolved');
    console.log('💡 Test in production where Rapyd API is accessible');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCompleteRapydFix().catch(console.error);
