const axios = require('axios');
const crypto = require('crypto');

const WISE_API_BASE = 'https://api.sandbox.transferwise.tech';
const ACCESS_TOKEN = '3bf00c8d-e209-4231-b904-4d564cd70b3f';
const PROFILE_ID = 28660194;

// Test recipient data
const testData = {
  recipientName: "Ahmed Khan",
  recipientEmail: "ahmed@example.com",
  recipientIban: "GB33BUKB20201555555555",
  recipientBankName: "Barclays Bank UK",
  amount: 100.00,
  currency: "USD",
  note: "Payment for services",
  // Sender address for compliance
  address: {
    country: "US",
    city: "New York",
    postCode: "10001",
    firstLine: "123 Main Street"
  }
};

async function testFullWiseTransferWithAddress() {
  console.log('🧪 Testing Full Wise Transfer Flow with Address...\n');
  console.log('📋 Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Step 0: Get profile details
    console.log('Step 0: Fetching profile details...');
    const profileResponse = await axios.get(
      `${WISE_API_BASE}/v1/profiles/${PROFILE_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Profile fetched');
    console.log('Profile details:', JSON.stringify(profileResponse.data, null, 2));
    
    // Step 1: Determine recipient currency from IBAN
    const recipientCurrency = 'GBP'; // GB = GBP
    console.log(`\nStep 1: Recipient currency: ${recipientCurrency}`);
    
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
    
    // Step 3: Create quote
    console.log('\nStep 3: Creating quote...');
    const quoteData = {
      source: testData.currency,
      target: recipientCurrency,
      sourceAmount: testData.amount,
      profile: PROFILE_ID,
      rateType: 'FIXED'
    };
    
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
    
    // Step 4: Get transfer requirements
    console.log('\nStep 4: Fetching transfer requirements...');
    const requirementsResponse = await axios.post(
      `${WISE_API_BASE}/v1/quotes/${quoteResponse.data.id}/account-requirements`,
      {
        targetAccount: recipientResponse.data.id
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Transfer requirements:');
    console.log(JSON.stringify(requirementsResponse.data, null, 2));
    
    // Step 5: Create transfer with proper details
    console.log('\nStep 5: Creating transfer...');
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
        console.error(`  ${index + 1}. ${err.field}: ${err.message} (Code: ${err.code})`);
      });
    }
  }
}

// Run the test
testFullWiseTransferWithAddress().then(() => {
  console.log('\n✅ Test completed!');
}).catch(err => {
  console.error('Fatal error:', err.message);
});
