// Test script to check if VPN is working for Node.js requests
const axios = require('axios');

async function testVPNConnection() {
  console.log('🌐 Testing VPN Connection for Node.js...\n');
  
  try {
    // Test 1: Check current IP address
    console.log('📍 TEST 1: Checking Current IP Address');
    console.log('-'.repeat(40));
    
    const ipResponse = await axios.get('https://api.ipify.org?format=json');
    console.log('Current IP:', ipResponse.data.ip);
    
    // Get location info
    const locationResponse = await axios.get(`http://ip-api.com/json/${ipResponse.data.ip}`);
    console.log('Location:', locationResponse.data.country, '-', locationResponse.data.regionName);
    console.log('ISP:', locationResponse.data.isp);
    console.log('');
    
    // Test 2: Try to access Rapyd API
    console.log('🔗 TEST 2: Testing Rapyd API Access');
    console.log('-'.repeat(40));
    
    const rapydResponse = await axios.get('https://sandboxapi.rapyd.net', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ Rapyd API is accessible!');
    console.log('Status:', rapydResponse.status);
    console.log('Response length:', rapydResponse.data.length);
    
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.includes?.('Access denied')) {
      console.log('❌ Still blocked by geographical restrictions');
      console.log('Your VPN is not working properly for Node.js requests');
      console.log('');
      console.log('💡 Solutions:');
      console.log('1. Make sure your VPN routes ALL traffic (not just browser)');
      console.log('2. Try a different VPN server location (US, EU)');
      console.log('3. Use a system-wide VPN, not just browser extension');
      console.log('4. Consider using Rapyd production API if you have access');
    } else {
      console.log('❌ Connection error:', error.message);
    }
  }
}

// Run the test
testVPNConnection().catch(console.error);
