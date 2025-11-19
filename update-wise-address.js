const axios = require('axios');

const WISE_API_BASE = 'https://api.sandbox.transferwise.tech';
const ACCESS_TOKEN = '3bf00c8d-e209-4231-b904-4d564cd70b3f';
const PROFILE_ID = 28660194;
const ADDRESS_ID = 49710126;

async function updateProfileAddress() {
  try {
    console.log('Updating profile address to US address...\n');
    
    const response = await axios.put(
      `${WISE_API_BASE}/v1/addresses/${ADDRESS_ID}`,
      {
        profile: PROFILE_ID,
        details: {
          country: 'US',
          state: 'NY',
          city: 'New York',
          postCode: '10001',
          firstLine: '123 Main Street'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Address Updated:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status);
    console.error(JSON.stringify(error.response?.data, null, 2));
  }
}

updateProfileAddress();
