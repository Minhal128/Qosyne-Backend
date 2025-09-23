// Test real Braintree transaction without customer ID conflict
require('dotenv').config();
const braintree = require('braintree');

async function testRealBraintreeTransaction() {
  console.log('🧪 Testing Real Braintree Transaction Fix...\n');
  
  try {
    // Initialize Braintree gateway
    const gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox,
      merchantId: process.env.BT_MERCHANT_ID,
      publicKey: process.env.BT_PUBLIC_KEY,
      privateKey: process.env.BT_PRIVATE_KEY,
    });
    
    // Test transaction request (same format as VenmoGateway)
    const transactionRequest = {
      amount: '5.00',
      paymentMethodToken: '108j9t7b', // User 78's real token
      options: {
        submitForSettlement: true,
      }
      // No customer object - this was causing the error
    };
    
    console.log('📋 Testing transaction request:');
    console.log(JSON.stringify(transactionRequest, null, 2));
    console.log('');
    
    console.log('💳 Processing transaction...');
    const result = await gateway.transaction.sale(transactionRequest);
    
    if (result.success) {
      console.log('✅ SUCCESS: Real Braintree transaction worked!');
      console.log(`   Transaction ID: ${result.transaction.id}`);
      console.log(`   Status: ${result.transaction.status}`);
      console.log(`   Amount: $${result.transaction.amount}`);
      console.log('');
      console.log('🎉 The fix is working - no more customer ID conflicts!');
    } else {
      console.log('❌ Transaction failed:', result.message);
      console.log('Errors:', result.errors);
    }
    
  } catch (error) {
    console.error('❌ Error testing transaction:', error);
  }
}

// Run the test
testRealBraintreeTransaction().catch(console.error);
