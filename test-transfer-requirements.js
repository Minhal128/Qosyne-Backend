const axios = require('axios');
const crypto = require('crypto');

const WISE_API_BASE = 'https://api.sandbox.transferwise.tech';
const ACCESS_TOKEN = '3bf00c8d-e209-4231-b904-4d564cd70b3f';
const PROFILE_ID = 28660194;

async function testTransferRequirements() {
  try {
    // Create recipient
    console.log('Step 1: Creating recipient...');
    const recipientResponse = await axios.post(
      `${WISE_API_BASE}/v1/accounts`,
      {
        currency: 'GBP',
        type: 'iban',
        profile: PROFILE_ID,
        accountHolderName: 'Ahmed Khan',
        legalType: 'PRIVATE',
        details: {
          iban: 'GB33BUKB20201555555555'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Recipient ID:', recipientResponse.data.id);

    // Create quote
    console.log('\nStep 2: Creating quote...');
    const quoteResponse = await axios.post(
      `${WISE_API_BASE}/v1/quotes`,
      {
        source: 'USD',
        target: 'GBP',
        sourceAmount: 100,
        profile: PROFILE_ID,
        rateType: 'FIXED'
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Quote ID:', quoteResponse.data.id);

    // Get transfer requirements
    console.log('\nStep 3: Getting transfer requirements...');
    const reqResponse = await axios.get(
      `${WISE_API_BASE}/v1/transfer-requirements?source=${quoteResponse.data.source}&target=${quoteResponse.data.target}&sourceAmount=${quoteResponse.data.sourceAmount}`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Transfer Requirements:');
    console.log(JSON.stringify(reqResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.status);
    console.error(JSON.stringify(error.response?.data, null, 2));
  }
}

testTransferRequirements();
