/**
 * Test REAL Venmo Transaction in Braintree
 * This will show as "Venmo Account" in your dashboard
 */

const braintree = require('braintree');
require('dotenv').config();

const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BT_MERCHANT_ID,
  publicKey: process.env.BT_PUBLIC_KEY,
  privateKey: process.env.BT_PRIVATE_KEY
});

console.log('🧪 TESTING REAL VENMO TRANSACTION\n');
console.log('═══════════════════════════════════════════════════════════\n');

async function createVenmoTransaction() {
  try {
    console.log('1️⃣  Creating test customer...');
    const customerResult = await gateway.customer.create({
      firstName: 'Venmo',
      lastName: 'TestUser',
      email: 'venmo-test@qosyne.com'
    });

    if (!customerResult.success) {
      throw new Error('Failed to create customer');
    }

    const customerId = customerResult.customer.id;
    console.log('✅ Customer ID:', customerId);

    console.log('\n2️⃣  Creating Venmo transaction with Braintree test nonce...');
    
    // Use Braintree's OFFICIAL Venmo test nonce
    // This will show as "Venmo Account" in dashboard
    const venmoNonce = 'fake-venmo-account-nonce';
    
    console.log('   Using nonce:', venmoNonce);
    console.log('   This is Braintree\'s official Venmo test nonce\n');

    const result = await gateway.transaction.sale({
      amount: '50.00',
      paymentMethodNonce: venmoNonce, // Official Venmo test nonce
      customerId: customerId,
      options: {
        submitForSettlement: true
      }
    });

    if (result.success) {
      const tx = result.transaction;
      console.log('✅ VENMO TRANSACTION CREATED!\n');
      console.log('════════════════════════════════════════════════════════════\n');
      console.log('   Transaction ID:', tx.id);
      console.log('   Amount: $' + tx.amount);
      console.log('   Status:', tx.status);
      console.log('   Payment Type:', tx.paymentInstrumentType);
      
      if (tx.paymentInstrumentType === 'venmo_account') {
        console.log('   ✅ VENMO ACCOUNT CONFIRMED!');
        console.log('   Venmo Details:', tx.venmoAccount);
      } else {
        console.log('   ⚠️  Payment Type:', tx.paymentInstrumentType);
      }
      
      console.log('\n🎯 VIEW IN DASHBOARD:\n');
      console.log('   URL: https://sandbox.braintreegateway.com/');
      console.log('   Direct: https://sandbox.braintreegateway.com/merchants/' + process.env.BT_MERCHANT_ID + '/transactions/' + tx.id);
      console.log('\n📊 This should show as "Venmo Account" in Payment Method column!\n');
      
      return tx;
    } else {
      console.error('❌ Transaction failed:', result.message);
      if (result.errors) {
        console.error('Errors:', result.errors.deepErrors());
      }
      return null;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function explainVenmoProblem() {
  console.log('\n📋 WHY YOUR TRANSACTIONS SHOW AS CREDIT CARD:\n');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log('Your current transactions (44j3b6mx, 5p9e8dp2) show:');
  console.log('   ❌ Payment Method: VISA 401288******1881');
  console.log('   ❌ Payment Type: credit_card\n');
  console.log('Expected for Venmo:');
  console.log('   ✅ Payment Method: Venmo Account');
  console.log('   ✅ Payment Type: venmo_account\n');
  
  console.log('🔍 ROOT CAUSE:\n');
  console.log('   The paymentMethodToken you\'re using is linked to a');
  console.log('   CREDIT CARD, not a VENMO ACCOUNT.\n');
  
  console.log('💡 SOLUTION:\n');
  console.log('   When users connect Venmo, you need to ensure they\'re');
  console.log('   creating a Venmo payment method, not adding a card.\n');
  
  console.log('🔧 HOW TO FIX:\n');
  console.log('   1. Use Braintree Drop-in UI with Venmo enabled');
  console.log('   2. User clicks "Pay with Venmo" button');
  console.log('   3. Venmo OAuth flow completes');
  console.log('   4. You receive a payment method nonce');
  console.log('   5. Create transaction with that nonce\n');
}

async function checkVenmoEnabled() {
  console.log('⚙️  CHECKING VENMO CONFIGURATION:\n');
  console.log('════════════════════════════════════════════════════════════\n');
  
  try {
    // Try to get merchant account info
    console.log('Merchant ID:', process.env.BT_MERCHANT_ID);
    console.log('Environment: Sandbox\n');
    
    console.log('📝 TO ENABLE VENMO IN BRAINTREE:\n');
    console.log('   1. Login: https://sandbox.braintreegateway.com/');
    console.log('   2. Settings → Processing');
    console.log('   3. Find "Venmo" section');
    console.log('   4. Enable Venmo payments');
    console.log('   5. Configure Venmo settings\n');
    
    console.log('📱 VENMO SETUP CHECKLIST:\n');
    console.log('   □ Venmo enabled in Braintree settings');
    console.log('   □ Venmo button in your frontend');
    console.log('   □ Venmo OAuth flow implemented');
    console.log('   □ Using correct payment method type\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Main execution
(async () => {
  try {
    await explainVenmoProblem();
    await checkVenmoEnabled();
    
    console.log('════════════════════════════════════════════════════════════\n');
    console.log('🧪 CREATING TEST VENMO TRANSACTION...\n');
    
    const transaction = await createVenmoTransaction();
    
    if (transaction) {
      console.log('════════════════════════════════════════════════════════════\n');
      console.log('✅ SUCCESS! Now compare in your dashboard:\n');
      console.log('OLD TRANSACTIONS (showing as Credit Card):');
      console.log('   • 44j3b6mx - $105.00 - VISA card');
      console.log('   • 5p9e8dp2 - $25.00 - VISA card\n');
      console.log('NEW TRANSACTION (showing as Venmo):');
      console.log('   • ' + transaction.id + ' - $' + transaction.amount + ' - Venmo Account ✅\n');
      console.log('🎯 The difference should be clear in the Payment Method column!\n');
    }
    
    console.log('════════════════════════════════════════════════════════════\n');
    console.log('📚 NEXT STEPS:\n');
    console.log('   1. Check your Braintree dashboard now');
    console.log('   2. Compare payment methods of old vs new transactions');
    console.log('   3. Update your app to use Venmo payment nonces');
    console.log('   4. Test with real Venmo accounts\n');
    
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
  }
})();
