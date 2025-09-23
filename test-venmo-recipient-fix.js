// Test script to verify VenmoGateway recipient validation fix
const VenmoGateway = require('./paymentGateways/gateways/VenmoGateway');

async function testVenmoRecipientValidation() {
  console.log('🧪 Testing VenmoGateway Recipient Validation Fix...\n');
  
  try {
    const venmoGateway = new VenmoGateway();
    
    // Test case 1: Should PASS - has connectedWalletId (wallet-to-wallet transfer)
    console.log('📋 Test 1: Wallet-to-wallet transfer with empty recipient name');
    
    const testPayment1 = {
      amount: 5,
      paymentMethodId: 'test_payment_method',
      recipient: {
        name: '',           // Empty name - this should be OK with connectedWalletId
        bankName: 'N/A',
        accountNumber: 'N/A',
        accountType: 'EXTERNAL'
      },
      walletDeposit: false,
      connectedWalletId: 70  // This should make validation pass
    };
    
    console.log('Test data:', testPayment1);
    
    // This will fail because we don't have real Braintree setup, but we should see the validation pass
    try {
      await venmoGateway.authorizePayment(testPayment1);
    } catch (error) {
      if (error.message.includes('Recipient information is required')) {
        console.log('❌ Validation failed - recipient validation still broken');
      } else if (error.message.includes('Venmo wallet not found')) {
        console.log('✅ Validation passed - error is about wallet lookup (expected)');
        console.log('   This means the recipient validation is now working correctly');
      } else {
        console.log('✅ Validation passed - different error occurred:', error.message.substring(0, 100));
      }
    }
    
    console.log('');
    
    // Test case 2: Should FAIL - no connectedWalletId and empty recipient name
    console.log('📋 Test 2: Regular transfer without recipient name (should fail)');
    
    const testPayment2 = {
      amount: 5,
      paymentMethodId: 'test_payment_method',
      recipient: {
        name: '',           // Empty name
        bankName: 'N/A',
        accountNumber: 'N/A',
        accountType: 'EXTERNAL'
      },
      walletDeposit: false,
      // No connectedWalletId - should require recipient name
    };
    
    try {
      await venmoGateway.authorizePayment(testPayment2);
    } catch (error) {
      if (error.message.includes('Recipient information is required')) {
        console.log('✅ Validation correctly failed - recipient information required');
      } else {
        console.log('❌ Expected recipient validation error, got:', error.message);
      }
    }
    
    console.log('\n🎉 VenmoGateway recipient validation fix test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testVenmoRecipientValidation().catch(console.error);