// Enhanced Braintree Credential Diagnostic
require('dotenv').config();
const braintree = require('braintree');

console.log('🔬 ENHANCED BRAINTREE DIAGNOSTIC TEST\n');
console.log('=' .repeat(60));

// Display all configuration
console.log('\n📋 Current Configuration:');
console.log('  Environment:', process.env.BT_ENVIRONMENT);
console.log('  Merchant ID:', process.env.BT_MERCHANT_ID);
console.log('  Public Key:', process.env.BT_PUBLIC_KEY);
console.log('  Private Key:', process.env.BT_PRIVATE_KEY ? 
  process.env.BT_PRIVATE_KEY.substring(0, 8) + '...' + process.env.BT_PRIVATE_KEY.slice(-4) : 'NOT SET');
console.log('  Private Key Length:', process.env.BT_PRIVATE_KEY?.length || 0);

// Check for common issues
console.log('\n🔍 Pre-flight Checks:');
const checks = {
  merchantIdSet: !!process.env.BT_MERCHANT_ID,
  publicKeySet: !!process.env.BT_PUBLIC_KEY,
  privateKeySet: !!process.env.BT_PRIVATE_KEY,
  environmentSet: !!process.env.BT_ENVIRONMENT,
  privateKeyLength: process.env.BT_PRIVATE_KEY?.length === 32
};

Object.entries(checks).forEach(([check, passed]) => {
  console.log(`  ${passed ? '✅' : '❌'} ${check}:`, passed);
});

// Try multiple Braintree environment configurations
const environments = [
  { name: 'Sandbox', env: braintree.Environment.Sandbox },
  { name: 'Production', env: braintree.Environment.Production }
];

console.log('\n🧪 Testing Environments:\n');

async function testEnvironment(envConfig) {
  console.log(`Testing ${envConfig.name}...`);
  
  const gateway = new braintree.BraintreeGateway({
    environment: envConfig.env,
    merchantId: process.env.BT_MERCHANT_ID,
    publicKey: process.env.BT_PUBLIC_KEY,
    privateKey: process.env.BT_PRIVATE_KEY
  });

  try {
    const response = await gateway.clientToken.generate({});
    console.log(`  ✅ SUCCESS in ${envConfig.name}!`);
    console.log(`  📄 Token preview:`, response.clientToken.substring(0, 50) + '...');
    console.log(`  📏 Token length:`, response.clientToken.length);
    return { success: true, environment: envConfig.name, token: response.clientToken };
  } catch (error) {
    console.log(`  ❌ FAILED in ${envConfig.name}`);
    console.log(`  ❌ Error type:`, error.type || 'unknown');
    console.log(`  ❌ Error message:`, error.message);
    return { success: false, environment: envConfig.name, error: error.message };
  }
}

async function runAllTests() {
  const results = [];
  
  for (const env of environments) {
    const result = await testEnvironment(env);
    results.push(result);
    console.log('');
  }

  console.log('=' .repeat(60));
  console.log('\n📊 TEST RESULTS SUMMARY:\n');
  
  const successfulEnv = results.find(r => r.success);
  
  if (successfulEnv) {
    console.log('🎉 SUCCESS! Credentials work in:', successfulEnv.environment);
    console.log('\n✅ SOLUTION:');
    console.log(`Update your .env file:`);
    console.log(`BT_ENVIRONMENT=${successfulEnv.environment.toLowerCase()}`);
    console.log('\nYour credentials are VALID! The environment setting was incorrect.');
    process.exit(0);
  } else {
    console.log('❌ FAILED in all environments\n');
    console.log('🔧 POSSIBLE ISSUES:');
    console.log('1. Private key might be incorrect (check screenshot carefully)');
    console.log('2. Account might not be activated yet');
    console.log('3. API keys might be from a different Braintree account');
    console.log('4. Keys might have been regenerated after screenshot');
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Double-check private key from screenshot');
    console.log('2. Verify account is activated in Braintree dashboard');
    console.log('3. Try copying keys again from dashboard');
    console.log('4. Check if you have multiple Braintree accounts');
    process.exit(1);
  }
}

runAllTests();