const axios = require('axios');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

const WORKING_PROXY = 'http://140.174.52.105:8888';

class RapydSDKPattern {
  constructor() {
    this.accessKey = process.env.RAPYD_ACCESS_KEY;
    this.secretKey = process.env.RAPYD_SECRET_KEY;
    this.walletId = process.env.RAPYD_WALLET_ID;
    this.baseUrl = process.env.RAPYD_BASE_URL;
  }

  // Generate signature following official Rapyd SDK pattern
  generateSignature(httpMethod, urlPath, salt, timestamp, body = null) {
    // Convert body to string
    let bodyString = '';
    if (body !== null && body !== undefined) {
      if (typeof body === 'string') {
        bodyString = body;
      } else if (typeof body === 'object') {
        bodyString = JSON.stringify(body);
      }
    }

    console.log('📝 Signature Components:');
    console.log('- HTTP Method:', httpMethod);
    console.log('- URL Path:', urlPath);
    console.log('- Salt:', salt);
    console.log('- Timestamp:', timestamp);
    console.log('- Access Key:', this.accessKey);
    console.log('- Secret Key length:', this.secretKey.length);
    console.log('- Body:', bodyString || '[empty]');

    // Create the string to sign
    const stringToSign = httpMethod + urlPath + salt + timestamp + this.accessKey + this.secretKey + bodyString;
    
    console.log('🔗 String to sign (first 150 chars):', stringToSign.substring(0, 150) + '...');
    console.log('🔗 String to sign length:', stringToSign.length);

    // Generate the signature using HMAC-SHA256
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(stringToSign, 'utf8');
    const signature = hmac.digest('hex');
    
    console.log('🔐 HMAC-SHA256 hex:', signature);

    // Convert to base64
    const base64Signature = Buffer.from(signature, 'hex').toString('base64');
    
    console.log('📋 Base64 signature:', base64Signature);
    
    return base64Signature;
  }

  async makeRequest(method, endpoint, data = null) {
    console.log(`\n🚀 Making ${method} request to ${endpoint}`);
    
    const agent = new HttpsProxyAgent(WORKING_PROXY);
    const timestamp = Math.floor(Date.now() / 1000);
    const salt = crypto.randomBytes(12).toString('hex');
    
    console.log('⏰ Timestamp:', timestamp);
    console.log('🧂 Salt:', salt);
    
    const signature = this.generateSignature(method, endpoint, salt, timestamp, data);

    const headers = {
      'access_key': this.accessKey,
      'salt': salt,
      'timestamp': timestamp.toString(),
      'signature': signature,
      'Content-Type': 'application/json'
    };

    console.log('\n📤 Headers:');
    console.log(JSON.stringify(headers, null, 2));

    const config = {
      method: method,
      url: this.baseUrl + endpoint,
      headers: headers,
      httpsAgent: agent,
      timeout: 20000,
      validateStatus: function (status) {
        return status < 500; // Resolve only if the status code is less than 500
      }
    };

    if (data && method !== 'GET') {
      config.data = data;
    }

    try {
      const response = await axios(config);
      
      console.log('\n✅ Response received!');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      
      if (response.status === 200) {
        console.log('🎉 SUCCESS! Authenticated request worked!');
        console.log('Data:', JSON.stringify(response.data, null, 2));
        return response.data;
      } else if (response.status === 401) {
        console.log('🔐 Authentication failed - checking signature format');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        // Let's try a few signature variations
        return await this.trySignatureVariations(method, endpoint, data, agent, salt, timestamp);
      } else {
        console.log('📊 Unexpected status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }
      
      return response.data;
      
    } catch (error) {
      console.error('\n❌ Request failed');
      console.error('Error message:', error.message);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      }
      
      throw error;
    }
  }

  async trySignatureVariations(method, endpoint, data, agent, salt, timestamp) {
    console.log('\n🔧 Trying signature variations...');
    
    const variations = [
      // Variation 1: Different salt format
      () => {
        const newSalt = crypto.randomBytes(8).toString('hex');
        return { salt: newSalt, signature: this.generateSignature(method, endpoint, newSalt, timestamp, data) };
      },
      
      // Variation 2: Different timestamp format
      () => {
        const newTimestamp = Math.floor(Date.now() / 1000);
        return { timestamp: newTimestamp, signature: this.generateSignature(method, endpoint, salt, newTimestamp, data) };
      },
      
      // Variation 3: Empty body regardless
      () => {
        return { signature: this.generateSignature(method, endpoint, salt, timestamp, '') };
      },
      
      // Variation 4: Direct hex signature (not base64)
      () => {
        const stringToSign = method + endpoint + salt + timestamp + this.accessKey + this.secretKey + (data ? JSON.stringify(data) : '');
        const signature = crypto.createHmac('sha256', this.secretKey).update(stringToSign, 'utf8').digest('hex');
        return { signature: signature };
      }
    ];

    for (let i = 0; i < variations.length; i++) {
      try {
        console.log(`\n🔄 Trying variation ${i + 1}...`);
        const variation = variations[i]();
        
        const headers = {
          'access_key': this.accessKey,
          'salt': variation.salt || salt,
          'timestamp': (variation.timestamp || timestamp).toString(),
          'signature': variation.signature,
          'Content-Type': 'application/json'
        };

        const response = await axios({
          method: method,
          url: this.baseUrl + endpoint,
          headers: headers,
          httpsAgent: agent,
          timeout: 20000,
          data: data && method !== 'GET' ? data : undefined
        });

        if (response.status === 200) {
          console.log(`🎉 Variation ${i + 1} worked!`);
          return response.data;
        } else {
          console.log(`❌ Variation ${i + 1} failed with status:`, response.status);
        }
        
      } catch (error) {
        console.log(`❌ Variation ${i + 1} failed:`, error.response?.status || error.message);
      }
    }
    
    throw new Error('All signature variations failed');
  }

  async testWalletAccess() {
    console.log('🏦 Testing wallet access...');
    return await this.makeRequest('GET', `/v1/user/${this.walletId}`);
  }
}

async function main() {
  console.log('🧪 RAPYD SDK PATTERN TEST');
  console.log('========================');
  console.log('🌐 Proxy:', WORKING_PROXY);
  console.log('🎯 Testing official SDK signature pattern\n');
  
  const client = new RapydSDKPattern();
  
  if (!client.accessKey || !client.secretKey || !client.walletId) {
    console.error('❌ Missing credentials in .env file');
    return;
  }
  
  try {
    await client.testWalletAccess();
    console.log('\n🎉 SUCCESS! Rapyd API working through proxy!');
  } catch (error) {
    console.error('\n💀 Test failed:', error.message);
  }
}

main();
