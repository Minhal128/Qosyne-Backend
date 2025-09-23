// Test Venmo payment fix for wallet venmo_78_1758494905756
require('dotenv').config();
const VenmoGateway = require('./paymentGateways/gateways/VenmoGateway');

async function testVenmoPaymentFix() {
  console.log('🧪 Testing Venmo payment fix for wallet venmo_78_1758494905756...\n');
  
  const venmoGateway = new VenmoGateway();
  
  // Use the exact same parameters from the failing request
  const paymentData = {
    amount: 5,
    currency: 'USD',
    paymentMethodId: 'venmo_78_1758494905756',
    recipient: {
      name: '',
      bankName: 'N/A',
      accountNumber: 'N/A',
      accountType: 'EXTERNAL'
    },
    walletDeposit: false,
    connectedWalletId: 70,
    useQosyneBalance: false
  };
  
  try {
    console.log('📋 Test Parameters:');
    console.log('   Amount: $5');
    console.log('   Payment Method ID: venmo_78_1758494905756');
    console.log('   Wallet Deposit: false');
    console.log('   Connected Wallet ID: 70');
    console.log('   Use Qosyne Balance: false');
    console.log('   Recipient Name: (empty - should trigger wallet-to-wallet transfer)');
    
    console.log('\n🔍 Testing VenmoGateway.authorizePayment()...');
    
    const result = await venmoGateway.authorizePayment(paymentData);
    
    console.log('\n✅ SUCCESS: Venmo payment authorization worked!');
    console.log('📊 Result:', {
      paymentId: result.paymentId,
      payedAmount: result.payedAmount,
      status: result.status,
      transactionId: result.response?.transactionId
    });
    
    console.log('\n🎉 The Venmo payment method token fix is working correctly!');
    console.log('💡 User 78 can now make Venmo payments successfully');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('missing Braintree payment method token')) {
      console.log('💡 The payment method token is still missing - run add-real-braintree-test-token.js again');
    } else if (error.message.includes('Recipient information is required')) {
      console.log('💡 This is expected - the recipient name is empty, so it should require recipient info');
      console.log('💡 For wallet-to-wallet transfers, this validation should be bypassed');
    } else {
      console.log('💡 This might be a different issue - check the error details above');
    }
  }
}

// Run the test
testVenmoPaymentFix().catch(console.error);
