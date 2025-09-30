// Load environment variables
require('dotenv').config({ path: './src/backend/.env' });

const WiseGateway = require('../paymentGateways/gateways/WiseGateway');

/**
 * Test script for Wise Profiles functionality
 * This demonstrates how to use the new getProfiles method
 */

async function testWiseProfiles() {
  try {
    console.log('🚀 Testing Wise Profiles Integration...');
    console.log('Environment:', process.env.WISE_ENVIRONMENT || 'sandbox');
    console.log('API Base URL:', process.env.WISE_ENVIRONMENT === 'production' 
      ? 'https://api.transferwise.com' 
      : 'https://api.sandbox.transferwise.tech');
    
    // Debug environment variables
    console.log('API Token exists:', !!process.env.WISE_API_TOKEN);
    console.log('Profile ID:', process.env.WISE_PROFILE_ID);
    
    if (!process.env.WISE_API_TOKEN) {
      throw new Error('WISE_API_TOKEN not found in environment variables');
    }
    
    // Initialize Wise Gateway
    const wiseGateway = new WiseGateway();
    
    // Test the getProfiles method
    console.log('\n📋 Fetching Wise profiles...');
    const result = await wiseGateway.getProfiles();
    
    console.log('\n✅ Success!');
    console.log('Summary:', result.summary);
    console.log('Profile Count:', result.count);
    console.log('\n📊 Profile Details:');
    
    result.data.forEach((profile, index) => {
      console.log(`\n--- Profile ${index + 1} ---`);
      console.log('ID:', profile.id);
      console.log('Type:', profile.type);
      console.log('Details:', JSON.stringify(profile.details, null, 2));
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error testing Wise profiles:', error.message);
    throw error;
  }
}

// Example of how to call the API endpoint
function exampleAPICall() {
  console.log('\n🌐 Example API Call:');
  console.log('GET /api/payment/wise/profiles');
  console.log('Headers: { Authorization: "Bearer <your-jwt-token>" }');
  console.log('\nExpected Response:');
  console.log(`{
  "message": "Successfully retrieved X profile(s)",
  "data": {
    "profiles": [...],
    "count": X
  },
  "status_code": 200
}`);
}

// Run the test if this file is executed directly
if (require.main === module) {
  testWiseProfiles()
    .then(() => {
      exampleAPICall();
      console.log('\n🎉 Test completed successfully!');
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testWiseProfiles };
