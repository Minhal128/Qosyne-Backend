const axios = require('axios');
const crypto = require('crypto');

const WISE_API_BASE = 'https://api.sandbox.transferwise.tech';
const ACCESS_TOKEN = '3bf00c8d-e209-4231-b904-4d564cd70b3f';
const PROFILE_ID = 28660194;

async function testMinimalTransfer() {
  try {
    // Create recipient (reuse existing)
    const recipientId = 701794254;
    console.log('✅ Using recipient ID:', recipientId);

    // Create quote
    console.log('\nCreating quote...');
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

    // Try minimal transfer
    console.log('\nTrying minimal transfer...');
    const transferData = {
      targetAccount: recipientId,
      quoteUuid: quoteResponse.data.id,
      customerTransactionId: crypto.randomUUID(),
      details: {
        reference: 'Payment for services'
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

    console.log('\n✅ SUCCESS! Transfer created:');
    console.log(JSON.stringify(transferResponse.data, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.response?.status);
    console.error('Details:', JSON.stringify(error.response?.data, null, 2));
  }
}

testMinimalTransfer();
