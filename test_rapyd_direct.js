const rapydService = require('./services/rapydService');

async function testRapydDirectly() {
  console.log('🚀 Testing Rapyd sandbox directly...\n');
  
  try {
    // Test 1: Create a payment (simulating Venmo → Rapyd)
    console.log('1️⃣  Creating Rapyd payment...');
    const payment = await rapydService.createPayment({
      amount: 25.00,
      currency: 'USD',
      paymentMethod: 'venmo_wallet',
      description: 'Test cross-wallet payment from Venmo',
      metadata: {
        fromProvider: 'VENMO',
        toProvider: 'WISE',
        testMode: true
      },
      userId: 79
    });
    
    console.log('✅ Payment created:', {
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      currency: payment.currency
    });
    
    // Test 2: Create a payout (simulating Rapyd → Wise)
    console.log('\n2️⃣  Creating Rapyd payout...');
    const payout = await rapydService.createPayout({
      amount: 24.25, // After fees
      currency: 'USD',
      beneficiary: {
        type: 'wise_account',
        fields: {
          walletId: 'wise_test_wallet_123',
          recipientId: 'wise_recipient_456'
        }
      },
      description: 'Test cross-wallet payout to Wise',
      metadata: {
        fromProvider: 'VENMO',
        toProvider: 'WISE',
        testMode: true
      },
      userId: 79
    });
    
    console.log('✅ Payout created:', {
      id: payout.id,
      amount: payout.payout_amount,
      status: payout.status,
      currency: payout.payout_currency
    });
    
    console.log('\n🎯 SUCCESS! Check your Rapyd dashboard:');
    console.log(`   • Payment ID: ${payment.id}`);
    console.log(`   • Payout ID: ${payout.id}`);
    console.log('   • These should now appear in your sandbox dashboard!');
    
    console.log('\n📡 Webhook endpoint ready:');
    console.log('   https://qosyne-sandbox.loca.lt/api/webhooks/rapyd');
    console.log('   Will receive status updates for both transactions');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testRapydDirectly();