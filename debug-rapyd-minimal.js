// Minimal Rapyd API test to debug credentials
const crypto = require('crypto');
const axios = require('axios');

const accessKey = "rak_35151028166B9A9DDEFE";
const secretKey = "rsk_f3f229c6e4d428d54b673e504e21cb6a6bbc4e22ac9149e7905c136ee1c66645435c025511f575ff";
const baseUrl = "https://sandboxapi.rapyd.net";

async function testMinimalRapydCall() {
  console.log('🧪 Testing Minimal Rapyd API Call...\n');
  
  // Try the simplest possible API call - get currencies (no body required)
  const method = 'get';
  const urlPath = '/v1/data/currencies';
  const timestamp = Math.floor(Date.now() / 1000);
  const salt = crypto.randomBytes(12).toString('hex');
  const bodyString = ''; // Empty body for GET request
  
  // Format 1: Standard newlines format
  const stringToSign = [
    method.toLowerCase(),
    urlPath,
    salt,
    timestamp.toString(),
    accessKey,
    bodyString
  ].join('\n');
  
  console.log('📋 Request Details:');
  console.log('  Method:', method);
  console.log('  URL Path:', urlPath);
  console.log('  Timestamp:', timestamp);
  console.log('  Salt:', salt);
  console.log('  Access Key:', accessKey);
  console.log('  Body String:', bodyString || '(empty)');
  console.log('  String to Sign:', stringToSign.replace(/\n/g, '\\n'));
  
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(stringToSign, 'utf8')
    .digest('base64');
    
  console.log('  Generated Signature:', signature);
  console.log('');
  
  const headers = {
    'Content-Type': 'application/json',
    'access_key': accessKey,
    'signature': signature,
    'salt': salt,
    'timestamp': timestamp.toString(),
    'idempotency': crypto.randomUUID()
  };
  
  console.log('📋 Request Headers:', JSON.stringify(headers, null, 2));
  console.log('');
  
  try {
    const response = await axios({
      method,
      url: `${baseUrl}${urlPath}`,
      headers
    });
    
    console.log('✅ SUCCESS! Rapyd API call worked!');
    console.log('Response Status:', response.status);
    console.log('Response Data (first 200 chars):', JSON.stringify(response.data).substring(0, 200) + '...');
    
  } catch (error) {
    console.log('❌ FAILED! Rapyd API call failed');
    console.log('Error Status:', error.response?.status);
    console.log('Error Data:', JSON.stringify(error.response?.data || error.message, null, 2));
    
    // Check if it's geographical blocking vs authentication
    if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('Cloudflare')) {
      console.log('\n💡 This looks like geographical blocking by Cloudflare, not authentication issues');
    } else if (error.response?.data?.status?.error_code === 'UNAUTHENTICATED_API_CALL') {
      console.log('\n💡 This is definitely an authentication/signature issue');
    }
  }
  
  console.log('\n🎯 If you see geographical blocking (Cloudflare), the signature is probably correct');
  console.log('🎯 If you see UNAUTHENTICATED_API_CALL, we need to try different signature formats');
}

testMinimalRapydCall().catch(console.error);