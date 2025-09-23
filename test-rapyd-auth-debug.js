// Test script to debug Rapyd authentication issues
const crypto = require('node:crypto');
const axios = require('axios');

class RapydAuthDebugger {
  constructor() {
    this.accessKey = 'rak_35151028166B9A9DDEFE';
    this.secretKey = 'rsk_f3f229c6e4d428d54b673e504e21cb6a6bbc4e22ac9149e7905c136ee1c66645435c025511f575ff';
    this.baseUrl = 'https://sandboxapi.rapyd.net';
  }

  /**
   * Generate Rapyd signature with detailed logging
   */
  generateSignature(method, urlPath, body) {
    const timestamp = Math.floor(Date.now() / 1000);
    const salt = crypto.randomBytes(12).toString('hex');

    let bodyString = '';
    if (body && Object.keys(body).length > 0) {
      bodyString = JSON.stringify(body);
    }

    console.log('🔍 Signature Generation Debug:');
    console.log('Method:', method);
    console.log('URL Path:', urlPath);
    console.log('Body String:', bodyString);
    console.log('Timestamp:', timestamp);
    console.log('Salt:', salt);
    console.log('Access Key:', this.accessKey);

    const toSign = method.toLowerCase() + urlPath + salt + timestamp + this.accessKey + this.secretKey + bodyString;
    console.log('String to Sign:', toSign);

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(toSign)
      .digest('hex');

    console.log('Generated Signature:', signature);
    console.log('');

    return { signature, timestamp, salt };
  }

  /**
   * Test simple GET request to list wallets
   */
  async testGetWallets() {
    console.log('🧪 Testing GET /v1/user (List Wallets)...\n');
    
    const method = 'GET';
    const endpoint = '/user';
    const urlPath = `/v1${endpoint}`;
    
    const { signature, timestamp, salt } = this.generateSignature(method, urlPath, null);

    const headers = {
      'Content-Type': 'application/json',
      access_key: this.accessKey,
      signature,
      salt,
      timestamp: timestamp.toString(),
      idempotency: crypto.randomUUID()
    };

    console.log('📤 Request Headers:', headers);
    console.log('📤 Full URL:', `${this.baseUrl}${urlPath}`);
    console.log('');

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${urlPath}`,
        headers
      });

      console.log('✅ Success! Response Status:', response.status);
      console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ Request Failed!');
      console.error('Status:', error.response?.status);
      console.error('Status Text:', error.response?.statusText);
      console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Request Config URL:', error.config?.url);
      console.error('Request Headers:', JSON.stringify(error.config?.headers, null, 2));
      throw error;
    }
  }

  /**
   * Test POST request to transfer money
   */
  async testTransferMoney() {
    console.log('🧪 Testing POST /v1/account/transfer...\n');
    
    const method = 'POST';
    const endpoint = '/account/transfer';
    const urlPath = `/v1${endpoint}`;
    
    const transferData = {
      source_ewallet: 'ewallet_f87eb431d13',
      destination_ewallet: 'ewallet_d38b1ddd1dd',
      amount: '10.00',
      currency: 'USD',
      metadata: { 
        description: 'Test transfer',
        transfer_type: 'wallet_to_wallet',
        timestamp: new Date().toISOString()
      }
    };

    const { signature, timestamp, salt } = this.generateSignature(method, urlPath, transferData);

    const headers = {
      'Content-Type': 'application/json',
      access_key: this.accessKey,
      signature,
      salt,
      timestamp: timestamp.toString(),
      idempotency: crypto.randomUUID()
    };

    console.log('📤 Request Headers:', headers);
    console.log('📤 Full URL:', `${this.baseUrl}${urlPath}`);
    console.log('📤 Request Data:', JSON.stringify(transferData, null, 2));
    console.log('');

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${urlPath}`,
        headers,
        data: transferData
      });

      console.log('✅ Success! Response Status:', response.status);
      console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ Request Failed!');
      console.error('Status:', error.response?.status);
      console.error('Status Text:', error.response?.statusText);
      console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Request Config URL:', error.config?.url);
      console.error('Request Headers:', JSON.stringify(error.config?.headers, null, 2));
      throw error;
    }
  }
}

async function runAuthDebugTests() {
  const authDebugger = new RapydAuthDebugger();
  
  console.log('🚀 Starting Rapyd Authentication Debug Tests\n');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Simple GET request
    console.log('\n📋 TEST 1: GET Wallets');
    console.log('-'.repeat(30));
    await authDebugger.testGetWallets();
    
  } catch (error) {
    console.log('\n❌ GET test failed, continuing to POST test...\n');
  }
  
  try {
    // Test 2: POST request (the failing one)
    console.log('\n💸 TEST 2: POST Transfer');
    console.log('-'.repeat(30));
    await authDebugger.testTransferMoney();
    
  } catch (error) {
    console.log('\n❌ POST test failed as expected\n');
  }
  
  console.log('\n🏁 Debug tests completed!');
}

// Run the debug tests
runAuthDebugTests().catch(console.error);
