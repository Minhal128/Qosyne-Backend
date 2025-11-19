require('dotenv').config();
const axios = require('axios');

async function testSquareToken() {
  console.log('🧪 Testing Square Access Token...');
  
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  console.log('🔍 Token preview:', accessToken ? accessToken.substring(0, 15) + '...' : 'MISSING');
  
  if (!accessToken) {
    console.error('❌ SQUARE_ACCESS_TOKEN not found in .env file');
    return;
  }
  
  try {
    // Test 1: Get merchant info
    console.log('\n1️⃣ Testing merchant API...');
    const merchantResponse = await axios.get('https://connect.squareupsandbox.com/v2/merchants/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-11-20',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Merchant API works!');
    console.log('✅ Merchant ID:', merchantResponse.data.merchant.id);
    console.log('✅ Business Name:', merchantResponse.data.merchant.business_name);
    
    // Test 2: Get locations
    console.log('\n2️⃣ Testing locations API...');
    const locationsResponse = await axios.get('https://connect.squareupsandbox.com/v2/locations', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-11-20',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Locations API works!');
    console.log('✅ Locations found:', locationsResponse.data.locations?.length || 0);
    if (locationsResponse.data.locations?.length > 0) {
      console.log('✅ First location ID:', locationsResponse.data.locations[0].id);
      console.log('✅ Location name:', locationsResponse.data.locations[0].name);
    }
    
    console.log('\n🎉 Square access token is VALID and working!');
    
  } catch (error) {
    console.error('\n❌ Square API test failed:');
    console.error('❌ Status:', error.response?.status);
    console.error('❌ Message:', error.message);
    console.error('❌ Response:', error.response?.data);
    
    if (error.response?.status === 401) {
      console.error('\n🔴 TOKEN IS EXPIRED/INVALID - Get new token from Square Developer Dashboard');
    }
  }
}

testSquareToken().catch(console.error);
