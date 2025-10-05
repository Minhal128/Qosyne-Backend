require('dotenv').config();
const axios = require('axios');

async function testSquareAuth() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const environment = process.env.SQUARE_ENVIRONMENT || 'sandbox';
  
  const baseUrl = environment === 'production' 
    ? 'https://connect.squareup.com/v2'
    : 'https://connect.squareupsandbox.com/v2';

  console.log('🔍 Testing Square Authentication...');
  console.log('Environment:', environment);
  console.log('Base URL:', baseUrl);
  console.log('Access Token (first 20 chars):', accessToken?.substring(0, 20) + '...');

  try {
    // Test with a simple locations API call
    const response = await axios.get(`${baseUrl}/locations`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-06-20',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Square Authentication SUCCESS!');
    console.log('Available locations:', response.data.locations?.length || 0);
    
    if (response.data.locations) {
      response.data.locations.forEach(location => {
        console.log(`  - ${location.name} (${location.id})`);
      });
    }

    return true;
  } catch (error) {
    console.log('❌ Square Authentication FAILED!');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
      
      if (error.response.status === 401) {
        console.log('\n🔧 SOLUTION:');
        console.log('1. Go to https://developer.squareup.com/apps');
        console.log('2. Select your application');
        console.log('3. Go to Credentials tab');
        console.log('4. Copy the fresh Sandbox Access Token');
        console.log('5. Update SQUARE_ACCESS_TOKEN in your .env file');
      }
    } else {
      console.log('Network Error:', error.message);
    }
    
    return false;
  }
}

// Run the test
testSquareAuth().then(success => {
  process.exit(success ? 0 : 1);
});
