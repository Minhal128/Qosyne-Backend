const axios = require('axios');

const WISE_API_BASE = 'https://api.sandbox.transferwise.tech';
const ACCESS_TOKEN = '3bf00c8d-e209-4231-b904-4d564cd70b3f'; // Your sandbox token

async function testWiseQuote() {
  console.log('🧪 Testing Wise Quote Creation...\n');

  // Test data
  const quoteData = {
    source: 'USD',
    target: 'GBP',
    sourceAmount: 100,
    profile: 28660194,
    rateType: 'FIXED'
  };

  console.log('📤 Sending request with data:');
  console.log(JSON.stringify(quoteData, null, 2));
  console.log('\n📍 Endpoint:', `${WISE_API_BASE}/v1/quotes`);
  console.log('🔑 Token:', ACCESS_TOKEN.substring(0, 20) + '...\n');

  try {
    const response = await axios.post(
      `${WISE_API_BASE}/v1/quotes`,
      quoteData,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SUCCESS! Quote created:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ ERROR occurred:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('\n📋 Error Details:');
    console.error(JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.data?.errors) {
      console.error('\n🔍 Validation Errors:');
      error.response.data.errors.forEach((err, index) => {
        console.error(`  ${index + 1}. ${err.path}: ${err.message} (Code: ${err.code})`);
      });
    }
  }
}

// Test different variations
async function testAllVariations() {
  console.log('=' .repeat(60));
  console.log('VARIATION 1: With source field');
  console.log('=' .repeat(60));
  await testWiseQuote();

  console.log('\n\n');
  console.log('=' .repeat(60));
  console.log('VARIATION 2: Without rateType');
  console.log('=' .repeat(60));
  
  try {
    const response = await axios.post(
      `${WISE_API_BASE}/v1/quotes`,
      {
        sourceCurrency: 'USD',
        targetCurrency: 'GBP',
        sourceAmount: 100,
        profile: 28660194
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ SUCCESS!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ ERROR:', error.response?.status);
    console.error(JSON.stringify(error.response?.data, null, 2));
  }

  console.log('\n\n');
  console.log('=' .repeat(60));
  console.log('VARIATION 3: Minimal required fields');
  console.log('=' .repeat(60));
  
  try {
    const response = await axios.post(
      `${WISE_API_BASE}/v1/quotes`,
      {
        source: 'USD',
        target: 'GBP',
        sourceAmount: 100,
        profile: 28660194
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ SUCCESS!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ ERROR:', error.response?.status);
    console.error(JSON.stringify(error.response?.data, null, 2));
  }
}

// Run the tests
testAllVariations().then(() => {
  console.log('\n✅ All tests completed!');
}).catch(err => {
  console.error('Fatal error:', err);
});
