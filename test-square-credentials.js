require('dotenv').config();

async function testSquareCredentials() {
  console.log('🧪 Testing Square Credentials...');
  
  try {
    // Load Square SDK
    const square = require('square');
    console.log('\n1️⃣ Loading Square SDK...');
    console.log('✅ Square SDK loaded');
    
    // Extract SquareClient and SquareEnvironment (v42.3.0)
    console.log('\n2️⃣ Extracting SquareClient and SquareEnvironment...');
    const { SquareClient, SquareEnvironment } = square;
    console.log('✅ SquareClient type:', typeof SquareClient);
    console.log('✅ SquareEnvironment type:', typeof SquareEnvironment);
    console.log('✅ SquareEnvironment keys:', Object.keys(SquareEnvironment));

    // Get credentials from .env
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    console.log('🔍 Access token from .env:', accessToken ? accessToken.substring(0, 15) + '...' : 'MISSING');
    
    if (!accessToken) {
      console.error('❌ SQUARE_ACCESS_TOKEN not found in .env file');
      return;
    }
    
    // Test 3: Create client instance
    console.log('\n3️⃣ Creating Square client...');
    const client = new SquareClient({
      accessToken: accessToken,
      environment: SquareEnvironment.Sandbox,
    });
    
    console.log('✅ Square client created');
    
    // Check client structure
    console.log('🔍 Client structure:', Object.getOwnPropertyNames(client));
    console.log('🔍 Client prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
    
    // Test API call - try accessing APIs through getter methods
    console.log('🔍 Testing Square API call...');
    
    try {
      // Test merchants.get (Square SDK v42.3.0)
      console.log('🔍 Testing merchants.get...');
      const { result } = await client.merchants.get('me');
      
      console.log('✅ Square API call successful!');
      console.log('✅ Merchant ID:', result.merchant.id);
      console.log('✅ Business Name:', result.merchant.businessName);
      console.log('✅ Country:', result.merchant.country);
      console.log('✅ Status:', result.merchant.status);
    } catch (apiError) {
      console.error('❌ API access error:', apiError.message);
      
      // Try alternative approach - direct API call
      console.log('🔍 Trying direct API approach...');
      try {
        // Use Square's direct API approach
        const response = await fetch('https://connect.squareupsandbox.com/v2/locations', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Direct API call successful!');
          console.log('✅ Locations:', data.locations?.length || 0);
        } else {
          console.error('❌ Direct API call failed:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('❌ Error response:', errorText);
        }
      } catch (fetchError) {
        console.error('❌ Fetch error:', fetchError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Square credentials test failed');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Status code:', error.statusCode || error.status);
    
    if (error.errors && error.errors.length > 0) {
      console.error('❌ API errors:');
      error.errors.forEach((err, index) => {
        console.error(`   ${index + 1}. ${err.category}: ${err.detail}`);
      });
    }
    
    // Suggestions based on error type
    if (error.statusCode === 401 || error.status === 401) {
      console.log('\n💡 Suggestions:');
      console.log('   1. Check if your Square access token is correct');
      console.log('   2. Verify the token is for Sandbox environment');
      console.log('   3. Make sure the token hasn\'t expired');
      console.log('   4. Generate a new token from Square Developer Dashboard');
    }
  }
}

testSquareCredentials();
