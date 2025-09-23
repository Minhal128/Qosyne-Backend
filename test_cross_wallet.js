const axios = require('axios');

async function testCrossWalletTransfer() {
  const BASE_URL = 'http://localhost:3001';
  const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc4LCJyb2xlIjoiVVNFUiIsImlhdCI6MTc1ODYyOTExMCwiZXhwIjoxNzU5MjMzOTEwfQ.U5NGcfhKofY3cqo2blZc4hHtWwXIGWSHDbqdTQbqzss';

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`
  };

  console.log('🚀 Testing CROSS-WALLET transfer (Venmo → Wise)...\n');

  try {
    // This will trigger Rapyd because it's cross-provider
    const response = await axios.post(`${BASE_URL}/api/wallet-integration/transactions/transfer`, {
      fromWalletId: 'venmo_78_1758494905756', // Venmo wallet  
      toWalletId: 'wise_78_28660194',         // Wise wallet
      amount: '15.00',
      currency: 'USD',
      description: 'Cross-wallet test: Venmo → Wise via Rapyd'
    }, { headers });

    console.log('✅ Cross-wallet transfer initiated!');
    console.log('📊 Transaction details:', {
      transactionId: response.data.data.transaction.id,
      rapydPaymentId: response.data.data.transaction.rapydPaymentId,
      rapydPayoutId: response.data.data.transaction.rapydPayoutId,
      status: response.data.data.transaction.status,
      userReceived: response.data.data.rapydTransfer?.userReceived,
      adminFee: response.data.data.rapydTransfer?.adminFeeCollected
    });

    console.log('\n🎯 NOW CHECK YOUR RAPYD DASHBOARD:');
    console.log('   https://dashboard.rapyd.net/c/wallets/transactions/all');
    console.log('   You should see:');
    console.log(`   • Payment ID: ${response.data.data.transaction.rapydPaymentId || 'Processing...'}`);
    console.log(`   • Payout ID: ${response.data.data.transaction.rapydPayoutId || 'Processing...'}`);

  } catch (error) {
    console.error('❌ Transfer failed:', error.response?.data || error.message);
    console.error('Full error:', error);
  }
}

testCrossWalletTransfer();