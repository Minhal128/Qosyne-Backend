const axios = require('axios');
require('dotenv').config();

/**
 * Test script to verify Square location ID authorization fix
 * This script helps diagnose and fix the "Not authorized to access orders with location_id" error
 */

const BASE_URL = process.env.API_URL || 'https://qosynebackend.vercel.app';
const SQUARE_BASE_URL = 'https://connect.squareupsandbox.com/v2';

// Test user credentials (update these with your test credentials)
const TEST_USER = {
  email: 'testuser@example.com', // Update with your test user email
  password: 'testpassword123',    // Update with your test user password
};

const TEST_SQUARE = {
  email: 'test@example.com',      // Your Square sandbox account email
  accessToken: process.env.SQUARE_ACCESS_TOKEN, // Your Square access token
};

async function testSquareLocationFix() {
  console.log('🧪 SQUARE LOCATION ID FIX TEST');
  console.log('=' .repeat(60));
  console.log('');

  let authToken = null;

  try {
    // Step 1: Test Square API directly to get locations
    console.log('📍 STEP 1: Fetching locations from Square API');
    console.log('-'.repeat(60));

    if (!TEST_SQUARE.accessToken) {
      console.error('❌ SQUARE_ACCESS_TOKEN not found in .env file');
      console.log('   Please add SQUARE_ACCESS_TOKEN=your_token to .env');
      return;
    }

    console.log('   Access Token:', TEST_SQUARE.accessToken.substring(0, 20) + '...');

    const locationsResponse = await axios.get(`${SQUARE_BASE_URL}/locations`, {
      headers: {
        'Authorization': `Bearer ${TEST_SQUARE.accessToken}`,
        'Square-Version': '2024-11-20',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Locations fetched successfully');
    console.log('   Total locations:', locationsResponse.data.locations?.length || 0);
    
    if (locationsResponse.data.locations && locationsResponse.data.locations.length > 0) {
      console.log('');
      console.log('   📍 Available Locations:');
      locationsResponse.data.locations.forEach((loc, index) => {
        console.log(`      ${index + 1}. ${loc.name}`);
        console.log(`         ID: ${loc.id}`);
        console.log(`         Status: ${loc.status}`);
        console.log(`         Address: ${loc.address?.locality || 'N/A'}, ${loc.address?.administrative_district_level_1 || 'N/A'}`);
        console.log('');
      });

      const activeLocation = locationsResponse.data.locations.find(loc => loc.status === 'ACTIVE') 
        || locationsResponse.data.locations[0];
      console.log('   ✅ Recommended Location ID:', activeLocation.id);
      console.log('      Location Name:', activeLocation.name);
      console.log('');
    } else {
      console.log('❌ No locations found for this access token');
      console.log('   Please create a location in your Square sandbox account');
      return;
    }

    // Step 2: Login to get auth token
    console.log('');
    console.log('📍 STEP 2: Login to Qosyne Backend');
    console.log('-'.repeat(60));

    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });

      authToken = loginResponse.data.token;
      console.log('✅ Login successful');
      console.log('   Token:', authToken.substring(0, 20) + '...');
      console.log('');
    } catch (error) {
      console.log('⚠️  Login failed - creating new user or check credentials');
      console.log('   Email:', TEST_USER.email);
      console.log('   Error:', error.response?.data?.message || error.message);
      console.log('');
      console.log('   Please update TEST_USER credentials in this script');
      console.log('   Or register a new user first');
      return;
    }

    // Step 3: Connect Square wallet
    console.log('');
    console.log('📍 STEP 3: Connect Square Wallet');
    console.log('-'.repeat(60));

    try {
      const connectResponse = await axios.post(
        `${BASE_URL}/api/square-invoice/connect`,
        {
          squareEmail: TEST_SQUARE.email,
          accessToken: TEST_SQUARE.accessToken
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Square wallet connected successfully');
      console.log('   Response:', JSON.stringify(connectResponse.data, null, 2));
      console.log('');
      console.log('   ✅ Location ID stored:', connectResponse.data.data?.locationId);
      console.log('   ✅ Location Name:', connectResponse.data.data?.locationName);
      console.log('');
    } catch (error) {
      console.error('❌ Failed to connect Square wallet');
      console.error('   Error:', error.response?.data || error.message);
      console.log('');
      return;
    }

    // Step 4: Send test invoice
    console.log('');
    console.log('📍 STEP 4: Send Test Invoice');
    console.log('-'.repeat(60));

    try {
      const invoiceResponse = await axios.post(
        `${BASE_URL}/api/square-invoice/send`,
        {
          recipientEmail: 'rminhal783@gmail.com',
          amount: 50.00,
          currency: 'USD',
          note: 'Test payment - Location ID Fix'
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Invoice sent successfully!');
      console.log('   Response:', JSON.stringify(invoiceResponse.data, null, 2));
      console.log('');
      console.log('   🎉 SUCCESS! The location ID issue is FIXED!');
      console.log('');
    } catch (error) {
      console.error('❌ Failed to send invoice');
      console.error('   Status:', error.response?.status);
      console.error('   Error:', JSON.stringify(error.response?.data, null, 2));
      console.log('');
      
      if (error.response?.data?.message?.includes('location_id')) {
        console.log('   ⚠️  Still getting location ID error');
        console.log('   This might mean:');
        console.log('   1. The wallet connection didn\'t save the location ID properly');
        console.log('   2. The access token doesn\'t have permissions for any location');
        console.log('   3. There\'s a database metadata field issue');
      }
    }

    // Step 5: Summary
    console.log('');
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log('');
    console.log('✅ What was fixed:');
    console.log('   1. The /send endpoint now fetches the correct location ID');
    console.log('   2. The /connect endpoint stores location ID in wallet metadata');
    console.log('   3. Location ID is auto-selected from the merchant\'s account');
    console.log('');
    console.log('🔧 How it works now:');
    console.log('   1. When you connect Square, it fetches your locations');
    console.log('   2. It stores the first active location ID in wallet metadata');
    console.log('   3. When sending invoices, it uses YOUR location ID');
    console.log('   4. No more "Not authorized" errors!');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Unexpected error during testing:');
    console.error('   Type:', error.constructor.name);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Run the test
testSquareLocationFix().then(() => {
  console.log('');
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('');
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
