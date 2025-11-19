const axios = require('axios');
const crypto = require('crypto');

const WISE_API_BASE = 'https://api.sandbox.transferwise.tech';
const ACCESS_TOKEN = '3bf00c8d-e209-4231-b904-4d564cd70b3f';
const PROFILE_ID = 28660194;

// Test recipient data (same as your request)
const testData = {
  recipientName: "Ahmed Khan",
  recipientEmail: "ahmed@example.com",
  recipientIban: "GB33BUKB20201555555555",
  recipientBankName: "Barclays Bank UK",
  amount: 100.00,
  currency: "USD",
  note: "Payment for services"
};

async function testFullWiseTransfer() {
  console.log('🧪 Testing Full Wise Transfer Flow...\n');
  console.log('📋 Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Step 1: Determine recipient currency from IBAN
    const recipientCurrency = 'GBP'; // GB = GBP
    console.log(`Step 1: Recipient currency: ${recipientCurrency}`);
    
    // Step 2: Create recipient account
    console.log('\nStep 2: Creating recipient account...');
    const recipientData = {
      currency: recipientCurrency,
      type: 'iban',
      profile: PROFILE_ID,
      accountHolderName: testData.recipientName,
      legalType: 'PRIVATE',
      details: {
        iban: testData.recipientIban
      }
    };
    
    console.log('Request:', JSON.stringify(recipientData, null, 2));
    
    const recipientResponse = await axios.post(
      `${WISE_API_BASE}/v1/accounts`,
      recipientData,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Recipient created:', recipientResponse.data.id);
    console.log('Response:', JSON.stringify(recipientResponse.data, null, 2));
    
    // Step 3: Create quote
    console.log('\nStep 3: Creating quote...');
    const quoteData = {
      source: testData.currency,
      target: recipientCurrency,
      sourceAmount: testData.amount,
      profile: PROFILE_ID,
      rateType: 'FIXED'
    };
    
    console.log('Request:', JSON.stringify(quoteData, null, 2));
    
    const quoteResponse = await axios.post(
      `${WISE_API_BASE}/v1/quotes`,
      quoteData,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Quote created:', quoteResponse.data.id);
    console.log('Response:', JSON.stringify(quoteResponse.data, null, 2));
    
    // Step 4: Create transfer
    console.log('\nStep 4: Creating transfer...');
    const transferData = {
      targetAccount: recipientResponse.data.id,
      quoteUuid: quoteResponse.data.id,
      customerTransactionId: crypto.randomUUID(),
      details: {
        reference: testData.note
      }
    };
    
    console.log('Request:', JSON.stringify(transferData, null, 2));
    
    const transferResponse = await axios.post(
      `${WISE_API_BASE}/v1/transfers`,
      transferData,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Transfer created:', transferResponse.data.id);
    console.log('Response:', JSON.stringify(transferResponse.data, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ FULL TRANSFER FLOW SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log(`  Recipient ID: ${recipientResponse.data.id}`);
    console.log(`  Quote ID: ${quoteResponse.data.id}`);
    console.log(`  Transfer ID: ${transferResponse.data.id}`);
    console.log(`  Amount: ${testData.amount} ${testData.currency}`);
    console.log(`  Recipient Gets: ${quoteResponse.data.targetAmount} ${recipientCurrency}`);
    console.log(`  Fee: ${quoteResponse.data.fee} ${testData.currency}`);
    console.log(`  Rate: ${quoteResponse.data.rate}`);
    console.log(`  Status: ${transferResponse.data.status}`);
    
  } catch (error) {
    console.error('\n❌ ERROR occurred at:', error.config?.url);
    console.error('Status:', error.response?.status);
    console.error('Error Details:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.data?.errors) {
      console.error('\n🔍 Validation Errors:');
      error.response.data.errors.forEach((err, index) => {
        console.error(`  ${index + 1}. ${err.path}: ${err.message} (Code: ${err.code})`);
      });
    }
  }
}

// Run the test
testFullWiseTransfer().then(() => {
  console.log('\n✅ Test completed!');
}).catch(err => {
  console.error('Fatal error:', err.message);
});
