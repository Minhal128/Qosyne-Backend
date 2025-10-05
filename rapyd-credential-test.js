const axios = require('axios');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

console.log('🔍 RAPYD CREDENTIAL VERIFICATION TEST');
console.log('=====================================');

// Check credentials format
const accessKey = process.env.RAPYD_ACCESS_KEY;
const secretKey = process.env.RAPYD_SECRET_KEY;
const walletId = process.env.RAPYD_WALLET_ID;
const baseUrl = process.env.RAPYD_BASE_URL;

console.log('\n📋 Credential Analysis:');
console.log('- Access Key:', accessKey);
console.log('- Access Key length:', accessKey?.length || 'MISSING');
console.log('- Access Key format:', accessKey?.startsWith('rak_') ? '✅ Correct format' : '❌ Should start with rak_');

console.log('- Secret Key length:', secretKey?.length || 'MISSING');
console.log('- Secret Key format:', secretKey?.startsWith('rsk_') ? '✅ Correct format' : '❌ Should start with rsk_');
console.log('- Secret Key preview:', secretKey?.substring(0, 20) + '...' || 'MISSING');

console.log('- Wallet ID:', walletId);
console.log('- Wallet ID format:', walletId?.startsWith('ewallet_') ? '✅ Correct format' : '❌ Should start with ewallet_');

console.log('- Base URL:', baseUrl);

// Try a completely manual signature attempt following Rapyd docs EXACTLY
function testSignature() {
  console.log('\n🔐 MANUAL SIGNATURE TEST (Following Rapyd docs exactly)');
  console.log('========================================================');
  
  const method = 'GET';
  const urlPath = `/v1/user/${walletId}`;
  const salt = 'test1234test5678'; // Fixed salt for testing
  const timestamp = '1234567890'; // Fixed timestamp for testing
  const body = ''; // Empty for GET
  
  console.log('Components:');
  console.log('- Method:', method);
  console.log('- URL Path:', urlPath);
  console.log('- Salt:', salt);
  console.log('- Timestamp:', timestamp);
  console.log('- Access Key:', accessKey);
  console.log('- Secret Key (first 20):', secretKey.substring(0, 20) + '...');
  console.log('- Body:', body || '[empty]');
  
  // Build string to sign exactly as documented
  const stringToSign = method + urlPath + salt + timestamp + accessKey + secretKey + body;
  console.log('\nString to sign:');
  console.log('Length:', stringToSign.length);
  console.log('Full:', stringToSign);
  
  // Generate signature
  const signature = crypto.createHmac('sha256', secretKey)
                          .update(stringToSign, 'utf8')
                          .digest('hex');
  console.log('\nHMAC-SHA256 (hex):', signature);
  
  // Convert to base64
  const base64Sig = Buffer.from(signature, 'hex').toString('base64');
  console.log('Base64 signature:', base64Sig);
  
  return { salt, timestamp, signature: base64Sig };
}

async function testWithManualSignature() {
  console.log('\n🚀 TESTING WITH MANUAL SIGNATURE');
  console.log('=================================');
  
  const { salt, timestamp, signature } = testSignature();
  
  const agent = new HttpsProxyAgent('http://140.174.52.105:8888');
  
  const headers = {
    'access_key': accessKey,
    'salt': salt,
    'timestamp': timestamp,
    'signature': signature,
    'Content-Type': 'application/json'
  };
  
  console.log('\nRequest headers:');
  console.log(JSON.stringify(headers, null, 2));
  
  try {
    const response = await axios.get(baseUrl + `/v1/user/${walletId}`, {
      headers: headers,
      httpsAgent: agent,
      timeout: 15000,
      validateStatus: () => true // Accept all status codes
    });
    
    console.log('\n📊 RESPONSE:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('🎉 SUCCESS! Signature is correct!');
    } else if (response.status === 401) {
      console.log('🔐 Still getting 401 - signature issue persists');
      
      // Let's check if the error message gives more clues
      const errorMsg = response.data?.status?.message || '';
      if (errorMsg.includes('whitespace')) {
        console.log('💡 Hint: Remove whitespace that is not inside a string');
      }
      if (errorMsg.includes('trailing')) {
        console.log('💡 Hint: Remove trailing zeroes and decimal points');
      }
    } else {
      console.log('📋 Different status - may indicate progress');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function tryDifferentSignatureFormats() {
  console.log('\n🧪 TRYING DIFFERENT SIGNATURE FORMATS');
  console.log('======================================');
  
  const method = 'GET';
  const urlPath = `/v1/user/${walletId}`;
  const salt = crypto.randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = '';
  
  console.log('Using:');
  console.log('- Salt:', salt);
  console.log('- Timestamp:', timestamp);
  
  const formats = [
    {
      name: 'Standard (hex->base64)',
      generate: () => {
        const toSign = method + urlPath + salt + timestamp + accessKey + secretKey + body;
        const hex = crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
        return Buffer.from(hex, 'hex').toString('base64');
      }
    },
    {
      name: 'Direct base64',
      generate: () => {
        const toSign = method + urlPath + salt + timestamp + accessKey + secretKey + body;
        return crypto.createHmac('sha256', secretKey).update(toSign).digest('base64');
      }
    },
    {
      name: 'Raw hex',
      generate: () => {
        const toSign = method + urlPath + salt + timestamp + accessKey + secretKey + body;
        return crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
      }
    },
    {
      name: 'Different order (secret first)',
      generate: () => {
        const toSign = secretKey + method + urlPath + salt + timestamp + accessKey + body;
        const hex = crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
        return Buffer.from(hex, 'hex').toString('base64');
      }
    }
  ];
  
  const agent = new HttpsProxyAgent('http://140.174.52.105:8888');
  
  for (let i = 0; i < formats.length; i++) {
    const format = formats[i];
    console.log(`\n🔄 Trying format ${i + 1}: ${format.name}`);
    
    try {
      const signature = format.generate();
      console.log('Signature:', signature.substring(0, 30) + '...');
      
      const headers = {
        'access_key': accessKey,
        'salt': salt,
        'timestamp': timestamp,
        'signature': signature,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.get(baseUrl + urlPath, {
        headers: headers,
        httpsAgent: agent,
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log('Result:', response.status, response.statusText);
      
      if (response.status === 200) {
        console.log('🎉 SUCCESS with format:', format.name);
        console.log('Data:', JSON.stringify(response.data, null, 2));
        return;
      } else if (response.status !== 401) {
        console.log('🤔 Different status - may be progress:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }
      
    } catch (error) {
      console.log('❌ Failed:', error.message);
    }
  }
  
  console.log('\n💭 All formats failed - may need to check credentials or Rapyd account status');
}

async function main() {
  if (!accessKey || !secretKey || !walletId) {
    console.error('❌ Missing credentials in .env file');
    return;
  }
  
  await testWithManualSignature();
  await tryDifferentSignatureFormats();
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Verify credentials are active in Rapyd dashboard');
  console.log('2. Check if wallet ID exists and is accessible');
  console.log('3. Ensure sandbox environment is properly configured');
  console.log('4. Contact Rapyd support if signature keeps failing');
}

main();
