require('dotenv').config();
const axios = require('axios');

async function testWiseCredentials() {
  console.log('🔧 Testing Wise API credentials...');
  
  const WISE_API_BASE = 'https://api.sandbox.transferwise.tech';
  const WISE_API_TOKEN = process.env.WISE_API_TOKEN;
  const WISE_PROFILE_ID = process.env.WISE_PROFILE_ID;
  
  console.log('📋 Environment Variables:');
  console.log('- WISE_API_TOKEN:', WISE_API_TOKEN ? `${WISE_API_TOKEN.substring(0, 20)}...` : 'MISSING');
  console.log('- WISE_PROFILE_ID:', WISE_PROFILE_ID || 'MISSING');
  
  if (!WISE_API_TOKEN) {
    console.error('❌ WISE_API_TOKEN is missing from environment variables');
    return;
  }
  
  try {
    // Test 1: Get all profiles
    console.log('\n🔍 Test 1: Getting all profiles...');
    const profilesResponse = await axios.get(`${WISE_API_BASE}/v1/profiles`, {
      headers: {
        'Authorization': `Bearer ${WISE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const profiles = profilesResponse.data;
    console.log('✅ Profiles found:', profiles.length);
    
    profiles.forEach((profile, index) => {
      console.log(`   Profile ${index + 1}:`);
      console.log(`   - ID: ${profile.id}`);
      console.log(`   - Type: ${profile.type}`);
      console.log(`   - Details: ${JSON.stringify(profile.details)}`);
    });
    
    if (profiles.length === 0) {
      console.log('❌ No profiles found for this API token');
      return;
    }
    
    // Test 2: Test specific profile if provided
    if (WISE_PROFILE_ID) {
      console.log(`\n🔍 Test 2: Testing specific profile ID ${WISE_PROFILE_ID}...`);
      
      const foundProfile = profiles.find(p => p.id.toString() === WISE_PROFILE_ID.toString());
      if (!foundProfile) {
        console.log('❌ Provided WISE_PROFILE_ID not found in available profiles');
        console.log('✅ Available profile IDs:', profiles.map(p => p.id));
        return;
      }
      
      try {
        const profileResponse = await axios.get(`${WISE_API_BASE}/v1/profiles/${WISE_PROFILE_ID}`, {
          headers: {
            'Authorization': `Bearer ${WISE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Profile details retrieved successfully');
        console.log('   Profile:', JSON.stringify(profileResponse.data, null, 2));
        
        // Test 3: Get balances
        console.log(`\n🔍 Test 3: Getting balances for profile ${WISE_PROFILE_ID}...`);
        const balancesResponse = await axios.get(`${WISE_API_BASE}/v1/profiles/${WISE_PROFILE_ID}/balances`, {
          headers: {
            'Authorization': `Bearer ${WISE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Balances retrieved successfully');
        console.log('   Balances:', JSON.stringify(balancesResponse.data, null, 2));
        
      } catch (error) {
        console.error('❌ Error testing specific profile:', error.response?.data || error.message);
      }
    } else {
      console.log('\n💡 WISE_PROFILE_ID not set. Using first available profile...');
      const firstProfile = profiles[0];
      console.log(`✅ Recommended WISE_PROFILE_ID: ${firstProfile.id}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing Wise credentials:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 Suggestion: Check if your WISE_API_TOKEN is valid and not expired');
    } else if (error.response?.status === 404) {
      console.log('💡 Suggestion: Check if your WISE_PROFILE_ID exists');
    }
  }
}

testWiseCredentials().catch(console.error);
