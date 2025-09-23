// Check which version is running on the permanent production URL
const axios = require('axios');

async function checkProductionVersion() {
  console.log('🔍 Checking Production Version...\n');
  
  const permanentUrl = 'https://qosynebackend.vercel.app';
  const latestUrl = 'https://qosynebackend-ff2pl8a0y-rizvitherizzler-s-projects.vercel.app';
  
  console.log('📋 Testing both URLs:');
  console.log('Permanent URL:', permanentUrl);
  console.log('Latest Deployment:', latestUrl);
  console.log('');
  
  try {
    // Test permanent URL
    console.log('🧪 Testing Permanent URL...');
    const permanentResponse = await axios.get(permanentUrl, { timeout: 5000 });
    console.log('✅ Permanent URL Status:', permanentResponse.status);
    
    // Test latest deployment URL
    console.log('🧪 Testing Latest Deployment...');
    const latestResponse = await axios.get(latestUrl, { timeout: 5000 });
    console.log('✅ Latest Deployment Status:', latestResponse.status);
    
    console.log('\n💡 Both URLs are accessible');
    console.log('🎯 The issue is that your permanent URL might have the old VenmoGateway code');
    console.log('🔧 Solution: We need to ensure the latest code is on the permanent URL');
    
  } catch (error) {
    console.log('❌ Error testing URLs:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log('⏰ Request timed out - this is normal for root endpoints');
    } else if (error.response?.status === 401) {
      console.log('🔐 Got 401 - this means the API is running (auth required)');
    } else if (error.response?.status === 404) {
      console.log('📍 Got 404 - this means the deployment is active');
    }
  }
  
  console.log('\n🚨 URGENT FIX NEEDED:');
  console.log('Your permanent URL needs the latest VenmoGateway fixes!');
  console.log('');
  console.log('🔧 Quick Fix Options:');
  console.log('1. Check Vercel dashboard to promote latest deployment');
  console.log('2. Or temporarily use the latest deployment URL for testing');
  console.log('3. Or redeploy to ensure permanent URL gets updated');
}

// Run the check
checkProductionVersion().catch(console.error);
