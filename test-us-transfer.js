const axios = require('axios');
const crypto = require('crypto');

const WISE_API_BASE = 'https://api.sandbox.transferwise.tech';
const ACCESS_TOKEN = '3bf00c8d-e209-4231-b904-4d564cd70b3f';
const PROFILE_ID = 28660194;

async function testWithUSRecipient() {
  try {
    console.log('Testing with US bank account instead of IBAN...\n');

    // Step 1: Create US recipient (ACH)
    console.log('Step 1: Creating US recipient...');
    const recipientResponse = await axios.post(
      `${WISE_API_BASE}/v1/accounts`,
      {
        currency: 'USD',
        type: 'aba', // US ACH
        profile: PROFILE_ID,
        accountHolderName: 'John Doe',
        legalType: 'PRIVATE',
        details: {
          legalType: 'PRIVATE',
          abartn: '121000248', // Wells Fargo routing
          accountNumber: '12345678',
          accountType: 'CHECKING',
          address: {
            country: 'US',
            city: 'New York',
            state: 'NY',
            postCode: '10001',
            firstLine: '123 Main St'
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Recipient created:', recipientResponse.data.id);

    // Step 2: Create quote with v2
    console.log('\nStep 2: Creating quote (v2)...');
    const quoteResponse = await axios.post(
      `${WISE_API_BASE}/v2/quotes`,
      {
        sourceCurrency: 'USD',
        targetCurrency: 'USD',
        sourceAmount: 100,
        profile: PROFILE_ID
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Quote created:', quoteResponse.data.id);

    // Step 3: Create transfer
    console.log('\nStep 3: Creating transfer...');
    const transferResponse = await axios.post(
      `${WISE_API_BASE}/v1/transfers`,
      {
        targetAccount: recipientResponse.data.id,
        quoteUuid: quoteResponse.data.id,
        customerTransactionId: crypto.randomUUID(),
        details: {
          reference: 'Test payment',
          transferPurpose: 'verification.transfers.purpose.pay.bills',
          sourceOfFunds: 'verification.source.of.funds.other'
        }
      },
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

testWithUSRecipient();
