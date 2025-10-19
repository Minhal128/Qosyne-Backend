// Test Real Braintree Credentials
require('dotenv').config();
const braintree = require('braintree');

console.log('🧪 Testing Real Braintree Credentials...\n');

// Display credentials being tested (masked)
console.log('Configuration:');
console.log('  Environment:', process.env.BT_ENVIRONMENT);
console.log('  Merchant ID:', process.env.BT_MERCHANT_ID);
console.log('  Public Key:', process.env.BT_PUBLIC_KEY);
console.log('  Private Key:', '***' + process.env.BT_PRIVATE_KEY?.slice(-4));

// Create Braintree gateway
const gateway = new braintree.BraintreeGateway({
  environment: process.env.BT_ENVIRONMENT === 'production' 
    ? braintree.Environment.Production 
    : braintree.Environment.Sandbox,
  merchantId: process.env.BT_MERCHANT_ID,
  publicKey: process.env.BT_PUBLIC_KEY,
  privateKey: process.env.BT_PRIVATE_KEY
});

console.log('\n🔄 Attempting to generate client token...\n');

// Test client token generation
gateway.clientToken.generate({})
  .then(response => {
    console.log('✅ SUCCESS! Real Braintree credentials work!');
    console.log('✅ Client token generated successfully');
    console.log('📄 Token preview:', response.clientToken.substring(0, 50) + '...');
    console.log('📏 Token length:', response.clientToken.length);
    console.log('\n🎉 Your Braintree credentials are VALID and working!');
    console.log('💡 The mock mode should NOT be triggered with these credentials.');
    process.exit(0);
  })
  .catch(error => {
    console.log('❌ FAILED! Real Braintree credentials are NOT working');
    console.log('❌ Error:', error.message);
    console.log('❌ Error type:', error.type);
    console.log('❌ Error code:', error.code);
    
    console.log('\n🔧 SOLUTION REQUIRED:');
    console.log('Your current credentials are invalid. You need to:');
    console.log('1. Go to https://sandbox.braintreegateway.com/');
    console.log('2. Log in to your account');
    console.log('3. Go to Settings → API Keys');
    console.log('4. Copy your ACTUAL credentials');
    console.log('5. Update your .env file with the real values');
    console.log('\n⚠️ Current credentials in your .env are NOT from a valid Braintree account');
    process.exit(1);
  });