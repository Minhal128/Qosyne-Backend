const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc5LCJyb2xlIjoiVVNFUiIsImlhdCI6MTc1ODYyODUyMCwiZXhwIjoxNzU5MjMzMzIwfQ.ubKmuUV3kNXhr0wsz40Vvl89GqDOfGAnZZAuHt-EsGE';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

async function connectVenmoWallet() {
  console.log('🔗 Connecting Venmo wallet...');
  try {
    const response = await axios.post(`${BASE_URL}/api/wallet-integration/wallets/connect`, {
      provider: 'VENMO',
      authCode: JSON.stringify({
        paymentMethodNonce: 'fake-valid-nonce',
        customerInfo: {
          firstName: 'John',
          lastName: 'Doe', 
          email: 'john@venmo.com'
        }
      })
    }, { headers });
    
    console.log('✅ Venmo wallet connected:', response.data.data.walletId);
    return response.data.data.walletId;
  } catch (error) {
    console.error('❌ Venmo connection failed:', error.response?.data || error.message);
    throw error;
  }
}

async function connectWiseWallet() {
  console.log('🔗 Connecting Wise wallet...');
  try {
    const response = await axios.post(`${BASE_URL}/api/wallet-integration/wallets/connect`, {
      provider: 'WISE',
      authCode: JSON.stringify({
        connectionType: 'email',
        identifier: 'user@wise.com',
        country: 'US'
      })
    }, { headers });
    
    console.log('✅ Wise wallet connected:', response.data.data.walletId);
    return response.data.data.walletId;
  } catch (error) {
    console.error('❌ Wise connection failed:', error.response?.data || error.message);
    throw error;
  }
}

async function initiateTransfer(fromWalletId, toWalletId) {
  console.log('💸 Initiating cross-wallet transfer (Venmo → Wise)...');
  try {
    const response = await axios.post(`${BASE_URL}/api/wallet-integration/transactions/transfer`, {
      fromWalletId,
      toWalletId,
      amount: '25.00',
      currency: 'USD',
      description: 'Test cross-wallet transfer via Rapyd sandbox'
    }, { headers });
    
    console.log('✅ Transfer initiated:', {
      transactionId: response.data.data.transaction.id,
      rapydTransferId: response.data.data.rapydTransfer?.transferId,
      userReceived: response.data.data.rapydTransfer?.userReceived,
      adminFee: response.data.data.rapydTransfer?.adminFeeCollected
    });
    
    return response.data.data.transaction;
  } catch (error) {
    console.error('❌ Transfer failed:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting end-to-end Rapyd sandbox test...\n');
    
    // Connect wallets
    const venmoWalletId = await connectVenmoWallet();
    const wiseWalletId = await connectWiseWallet();
    
    console.log('\n📋 Wallet Summary:');
    console.log(`   Venmo: ${venmoWalletId}`);
    console.log(`   Wise:  ${wiseWalletId}\n`);
    
    // Initiate transfer
    const transaction = await initiateTransfer(venmoWalletId, wiseWalletId);
    
    console.log('\n🎯 SUCCESS! Check your Rapyd dashboard for:');
    console.log(`   • Payment ID: ${transaction.rapydPaymentId || 'Processing...'}`);
    console.log(`   • Payout ID: ${transaction.rapydPayoutId || 'Processing...'}`);
    console.log(`   • Transaction Status: ${transaction.status}`);
    console.log('\n📡 Webhook URL configured: https://qosyne-sandbox.loca.lt/api/webhooks/rapyd');
    console.log('   Status updates will arrive via webhook in real-time!');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

main();