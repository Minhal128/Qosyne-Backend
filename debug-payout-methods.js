const { WorkingRapydClient } = require('./rapyd-working-final');

async function debugPayoutMethods() {
  console.log('🔍 Debugging Available Payout Methods...');
  
  try {
    const rapydClient = new WorkingRapydClient();
    
    // Test 1: Check payout methods
    console.log('\n📊 Step 1: Getting payout methods...');
    try {
      const payoutMethods = await rapydClient.makeRequest('GET', '/v1/payouts/supported_types?country=US');
      console.log('✅ Payout methods response:', JSON.stringify(payoutMethods, null, 2));
    } catch (error) {
      console.error('❌ Payout methods failed:', error.message);
    }
    
    // Test 2: Check payment methods (working)
    console.log('\n📊 Step 2: Getting payment methods (for comparison)...');
    try {
      const paymentMethods = await rapydClient.getPaymentMethods('US');
      console.log('✅ Payment methods available:');
      paymentMethods.slice(0, 5).forEach((method, i) => {
        console.log(`  ${i+1}. ${method.type} - ${method.name}`);
      });
    } catch (error) {
      console.error('❌ Payment methods failed:', error.message);
    }
    
    // Test 3: Check wallet info
    console.log('\n💰 Step 3: Getting wallet info...');
    try {
      const walletInfo = await rapydClient.getWallet();
      console.log('✅ Wallet info available');
    } catch (error) {
      console.error('❌ Wallet info failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

if (require.main === module) {
  debugPayoutMethods().catch(console.error);
}
