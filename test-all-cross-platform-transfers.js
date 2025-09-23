const WiseGateway = require('./paymentGateways/gateways/WiseGateway');
const GooglePayGateway = require('./paymentGateways/gateways/GooglePayGateway');
const SquareGateway = require('./paymentGateways/gateways/SquareGateway');
const VenmoGateway = require('./paymentGateways/gateways/VenmoGateway');

async function testAllCrossPlatformTransfers() {
  try {
    console.log('🧪 Testing ALL cross-platform transfers...\n');

    const testAmount = 5;
    const testCurrency = 'USD';
    const testConnectedWalletId = 84; // Venmo wallet ID from your logs

    // Test data for cross-platform transfers
    const crossPlatformData = {
      amount: testAmount,
      currency: testCurrency,
      connectedWalletId: testConnectedWalletId,
      recipient: {
        name: '',
        bankName: 'N/A',
        accountNumber: 'N/A',
        accountType: 'EXTERNAL'
      },
      walletDeposit: false,
      useQosyneBalance: false
    };

    const results = {
      wise: { status: '❌', details: '' },
      googlepay: { status: '❌', details: '' },
      square: { status: '❌', details: '' },
      venmo: { status: '❌', details: '' }
    };

    // 1. Test Wise → Other Wallet
    console.log('1️⃣ Testing Wise → Other Wallet transfer...');
    try {
      const wiseGateway = new WiseGateway();
      const wiseResult = await wiseGateway.authorizePayment({
        ...crossPlatformData,
        paymentToken: 'wise_78_28660194'
      });
      
      if (wiseResult.response.transferType === 'CROSS_PLATFORM') {
        results.wise.status = '✅';
        results.wise.details = `Cross-platform transfer successful (${wiseResult.paymentId})`;
        console.log('✅ Wise cross-platform transfer working');
      }
    } catch (error) {
      results.wise.details = `Failed: ${error.message}`;
      console.log('❌ Wise cross-platform transfer failed:', error.message);
    }

    // 2. Test Google Pay → Other Wallet
    console.log('\n2️⃣ Testing Google Pay → Other Wallet transfer...');
    try {
      const googlePayGateway = new GooglePayGateway();
      const googlePayResult = await googlePayGateway.authorizePayment({
        ...crossPlatformData,
        paymentToken: 'googlepay_78_1758642097702'
      });
      
      if (googlePayResult.response.transferType === 'CROSS_PLATFORM') {
        results.googlepay.status = '✅';
        results.googlepay.details = `Cross-platform transfer successful (${googlePayResult.paymentId})`;
        console.log('✅ Google Pay cross-platform transfer working');
      }
    } catch (error) {
      results.googlepay.details = `Failed: ${error.message}`;
      console.log('❌ Google Pay cross-platform transfer failed:', error.message);
    }

    // 3. Test Square → Other Wallet
    console.log('\n3️⃣ Testing Square → Other Wallet transfer...');
    try {
      const squareGateway = new SquareGateway();
      const squareResult = await squareGateway.authorizePayment({
        ...crossPlatformData,
        paymentToken: 'square_test_token'
      });
      
      if (squareResult.response.transferType === 'CROSS_PLATFORM') {
        results.square.status = '✅';
        results.square.details = `Cross-platform transfer successful (${squareResult.paymentId})`;
        console.log('✅ Square cross-platform transfer working');
      }
    } catch (error) {
      results.square.details = `Failed: ${error.message}`;
      console.log('❌ Square cross-platform transfer failed:', error.message);
    }

    // 4. Test Venmo → Other Wallet
    console.log('\n4️⃣ Testing Venmo → Other Wallet transfer...');
    try {
      const venmoGateway = new VenmoGateway();
      const venmoResult = await venmoGateway.authorizePayment({
        ...crossPlatformData,
        paymentToken: 'venmo_test_token',
        connectedWalletId: 72 // Different wallet ID for testing
      });
      
      if (venmoResult.paymentId) {
        results.venmo.status = '✅';
        results.venmo.details = `Cross-platform transfer successful (${venmoResult.paymentId})`;
        console.log('✅ Venmo cross-platform transfer working');
      }
    } catch (error) {
      results.venmo.details = `Failed: ${error.message}`;
      console.log('❌ Venmo cross-platform transfer failed:', error.message);
    }

    // Summary
    console.log('\n📊 Cross-Platform Transfer Test Results:');
    console.log('==========================================');
    console.log(`${results.wise.status} Wise → Other Wallets: ${results.wise.details}`);
    console.log(`${results.googlepay.status} Google Pay → Other Wallets: ${results.googlepay.details}`);
    console.log(`${results.square.status} Square → Other Wallets: ${results.square.details}`);
    console.log(`${results.venmo.status} Venmo → Other Wallets: ${results.venmo.details}`);

    const successCount = Object.values(results).filter(r => r.status === '✅').length;
    console.log(`\n🎯 ${successCount}/4 cross-platform transfers are working!`);

    if (successCount === 4) {
      console.log('\n🎉 ALL cross-platform transfers are fully functional!');
      console.log('📱 Your mobile app can now transfer between ANY wallet providers:');
      console.log('   • Wise ↔ Venmo, Google Pay, Square');
      console.log('   • Google Pay ↔ Wise, Venmo, Square');
      console.log('   • Square ↔ Wise, Venmo, Google Pay');
      console.log('   • Venmo ↔ Wise, Google Pay, Square');
    } else {
      console.log('\n⚠️  Some cross-platform transfers need attention');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testAllCrossPlatformTransfers()
    .then(() => {
      console.log('\n✅ All cross-platform transfer tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Cross-platform transfer tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testAllCrossPlatformTransfers };
