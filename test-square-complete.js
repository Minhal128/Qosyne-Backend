require('dotenv').config();
const axios = require('axios');

// Your Square credentials from .env
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || 'EAAAl5KqeT3c1wcEOXiC7kDKekzvSBfouF4wEbJ9HubFW3I04MIukoJ9PctZKtXF';
const SQUARE_APPLICATION_ID = process.env.SQUARE_APPLICATION_ID || 'sandbox-sq0idb-KRfDXDI6-9s-GO-YO8eXfg';
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || 'L04EV91EFARQF';
const SQUARE_API_BASE = 'https://connect.squareupsandbox.com';

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 SQUARE API COMPLETE TEST');
console.log('═══════════════════════════════════════════════════════════\n');

// Display credentials (masked)
console.log('📋 Configuration:');
console.log('   Access Token:', SQUARE_ACCESS_TOKEN.substring(0, 20) + '...');
console.log('   Application ID:', SQUARE_APPLICATION_ID);
console.log('   Location ID:', SQUARE_LOCATION_ID);
console.log('   API Base:', SQUARE_API_BASE);
console.log('\n');

// Test 1: Direct Square SDK Test
async function testSquareSDK() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Square SDK Direct Connection');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const { SquareClient, SquareEnvironment } = require('square');
    
    const client = new SquareClient({
      accessToken: SQUARE_ACCESS_TOKEN,
      environment: SquareEnvironment.Sandbox
    });

    console.log('✅ Square SDK initialized successfully');
    
    // Test merchant endpoint
    console.log('\n🔍 Fetching merchant information...');
    const { result: merchantResult } = await client.merchants.get('me');
    
    console.log('✅ Merchant API call successful!');
    console.log('\n📊 Merchant Details:');
    console.log('   ID:', merchantResult.merchant.id);
    console.log('   Business Name:', merchantResult.merchant.businessName || 'N/A');
    console.log('   Country:', merchantResult.merchant.country);
    console.log('   Currency:', merchantResult.merchant.currency);
    console.log('   Status:', merchantResult.merchant.status);
    
    // Test locations endpoint
    console.log('\n🔍 Fetching locations...');
    const { result: locationsResult } = await client.locations.list();
    
    console.log('✅ Locations API call successful!');
    console.log('\n📍 Locations Found:', locationsResult.locations?.length || 0);
    
    if (locationsResult.locations && locationsResult.locations.length > 0) {
      locationsResult.locations.forEach((loc, index) => {
        console.log(`\n   Location ${index + 1}:`);
        console.log('      ID:', loc.id);
        console.log('      Name:', loc.name || 'N/A');
        console.log('      Status:', loc.status);
        console.log('      Currency:', loc.currency);
        console.log('      Match:', loc.id === SQUARE_LOCATION_ID ? '✅ MATCHES ENV' : '❌ Different');
      });
    }
    
    return {
      success: true,
      merchantId: merchantResult.merchant.id,
      locationId: locationsResult.locations?.[0]?.id
    };
  } catch (error) {
    console.error('❌ Square SDK Test Failed!');
    console.error('   Error:', error.message);
    if (error.errors) {
      console.error('   Details:', JSON.stringify(error.errors, null, 2));
    }
    return { success: false, error: error.message };
  }
}

// Test 2: Direct API Call Test
async function testDirectAPI() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Direct Square REST API Call');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    console.log('🔍 Making direct API call to /v2/merchants/me...');
    
    const response = await axios.get(
      `${SQUARE_API_BASE}/v2/merchants/me`,
      {
        headers: {
          'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
          'Square-Version': '2024-11-20',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Direct API call successful!');
    console.log('\n📊 Response:');
    console.log('   Status:', response.status);
    console.log('   Merchant ID:', response.data.merchant?.id);
    console.log('   Business Name:', response.data.merchant?.businessName || 'N/A');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Direct API call failed!');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.response?.data || error.message);
    return { success: false };
  }
}

// Test 3: Test Backend Connect Endpoint (Local)
async function testBackendLocal() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Backend Local Endpoint Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    console.log('ℹ️  Skipping - requires running server and auth token');
    console.log('   To test manually:');
    console.log('   1. Start your server: node server.js');
    console.log('   2. Login to get JWT token');
    console.log('   3. Test with: POST http://localhost:5000/api/square-invoice/connect');
    
    return { success: null };
  } catch (error) {
    return { success: false };
  }
}

// Test 4: Test Vercel Endpoint
async function testVercelEndpoint() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Vercel Deployed Endpoint Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('⚠️  This test requires a valid JWT token from your backend');
  console.log('   Please login first to get your token, then uncomment the test\n');
  
  // Uncomment and add your JWT token to test Vercel
  /*
  const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE';
  
  try {
    console.log('🔍 Testing Vercel endpoint...');
    console.log('   URL: https://qosynebackend.vercel.app/api/square-invoice/connect');
    
    const response = await axios.post(
      'https://qosynebackend.vercel.app/api/square-invoice/connect',
      {
        squareEmail: 'test128@example.com',
        accessToken: SQUARE_ACCESS_TOKEN,
        locationId: SQUARE_LOCATION_ID
      },
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Vercel endpoint successful!');
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('❌ Vercel endpoint failed!');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.response?.data);
    return { success: false };
  }
  */
  
  return { success: null };
}

// Test 5: Create Customer Test
async function testCreateCustomer() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Create Square Customer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const { SquareClient, SquareEnvironment } = require('square');
    
    const client = new SquareClient({
      accessToken: SQUARE_ACCESS_TOKEN,
      environment: SquareEnvironment.Sandbox
    });

    const testEmail = `test${Date.now()}@example.com`;
    
    console.log('🔍 Creating test customer...');
    console.log('   Email:', testEmail);
    
    const { result } = await client.customers.create({
      emailAddress: testEmail,
      givenName: 'Test',
      familyName: 'User',
      idempotencyKey: `test_${Date.now()}`
    });
    
    console.log('✅ Customer created successfully!');
    console.log('\n📊 Customer Details:');
    console.log('   ID:', result.customer.id);
    console.log('   Email:', result.customer.emailAddress);
    console.log('   Name:', result.customer.givenName, result.customer.familyName);
    console.log('   Created:', result.customer.createdAt);
    
    return { success: true, customerId: result.customer.id };
  } catch (error) {
    console.error('❌ Customer creation failed!');
    console.error('   Error:', error.message);
    if (error.errors) {
      console.error('   Details:', JSON.stringify(error.errors, null, 2));
    }
    return { success: false };
  }
}

// Run all tests
async function runAllTests() {
  const results = {};
  
  results.sdkTest = await testSquareSDK();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.apiTest = await testDirectAPI();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.customerTest = await testCreateCustomer();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.backendLocal = await testBackendLocal();
  results.vercelTest = await testVercelEndpoint();
  
  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('Test 1 - Square SDK:', results.sdkTest.success ? '✅ PASS' : '❌ FAIL');
  console.log('Test 2 - Direct API:', results.apiTest.success ? '✅ PASS' : '❌ FAIL');
  console.log('Test 3 - Local Backend:', results.backendLocal.success === null ? '⏭️  SKIPPED' : (results.backendLocal.success ? '✅ PASS' : '❌ FAIL'));
  console.log('Test 4 - Vercel Endpoint:', results.vercelTest.success === null ? '⏭️  SKIPPED' : (results.vercelTest.success ? '✅ PASS' : '❌ FAIL'));
  console.log('Test 5 - Create Customer:', results.customerTest.success ? '✅ PASS' : '❌ FAIL');
  
  console.log('\n───────────────────────────────────────────────────────────');
  
  if (results.sdkTest.success && results.apiTest.success) {
    console.log('✅ YOUR SQUARE CREDENTIALS ARE VALID!');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Make sure these are set in Vercel environment variables:');
    console.log('      SQUARE_ACCESS_TOKEN=' + SQUARE_ACCESS_TOKEN.substring(0, 20) + '...');
    console.log('      SQUARE_APPLICATION_ID=' + SQUARE_APPLICATION_ID);
    console.log('      SQUARE_LOCATION_ID=' + SQUARE_LOCATION_ID);
    console.log('      SQUARE_ENVIRONMENT=sandbox');
    console.log('\n   2. Redeploy your Vercel app after adding env vars');
    console.log('\n   3. Test the endpoint with:');
    console.log('      POST https://qosynebackend.vercel.app/api/square-invoice/connect');
    console.log('      Body: { "squareEmail": "test128@example.com" }');
    console.log('      Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }');
  } else {
    console.log('❌ CREDENTIALS VALIDATION FAILED');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verify your credentials at: https://developer.squareup.com/apps');
    console.log('   2. Make sure you\'re using SANDBOX credentials');
    console.log('   3. Check if the access token is expired');
    console.log('   4. Regenerate the access token if needed');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Execute
runAllTests().catch(error => {
  console.error('\n❌ Test suite crashed:', error);
  process.exit(1);
});
