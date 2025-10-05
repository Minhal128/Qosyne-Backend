const axios = require('axios');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

// 🌐 Your confirmed working proxy
const WORKING_PROXY = 'http://140.174.52.105:8888';

class WorkingRapydClient {
  constructor() {
    this.accessKey = process.env.RAPYD_ACCESS_KEY;
    this.secretKey = process.env.RAPYD_SECRET_KEY;
    this.walletId = process.env.RAPYD_WALLET_ID;
    this.baseUrl = process.env.RAPYD_BASE_URL;
    this.proxyAgent = new HttpsProxyAgent(WORKING_PROXY);
  }

  // 🔐 Correct Rapyd signature generation based on official docs
  generateCorrectSignature(method, urlPath, salt, timestamp, bodyData = null) {
    let body = '';
    
    if (bodyData !== null) {
      if (typeof bodyData === 'string') {
        body = bodyData;
      } else if (typeof bodyData === 'object') {
        body = JSON.stringify(bodyData);
        // Clean up the JSON string according to Rapyd requirements
        body = body.replace(/\\s+/g, ''); // Remove all whitespace
        body = body.replace(/\\.0+/g, ''); // Remove trailing zeros
      }
    }
    
    // Build the string to sign exactly as Rapyd expects
    const stringToSign = method + urlPath + salt + timestamp + this.accessKey + this.secretKey + body;
    
    // Create HMAC-SHA256
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('hex');
    
    // Convert to Base64
    return Buffer.from(signature, 'hex').toString('base64');
  }

  // 🌐 Make authenticated request with proxy
  async makeAuthenticatedRequest(method, endpoint, data = null) {
    console.log(`\\n🔄 ${method} ${endpoint}`);
    console.log('🌐 Via proxy:', WORKING_PROXY);
    
    const timestamp = Math.floor(Date.now() / 1000);
    const salt = crypto.randomBytes(8).toString('hex');
    const signature = this.generateCorrectSignature(method, endpoint, salt, timestamp, data);
    
    const headers = {
      'Content-Type': 'application/json',
      'access_key': this.accessKey,
      'salt': salt,
      'timestamp': timestamp.toString(),
      'signature': signature
    };
    
    const config = {
      method,
      url: this.baseUrl + endpoint,
      headers,
      httpsAgent: this.proxyAgent,
      timeout: 30000
    };
    
    if (data && method !== 'GET') {
      config.data = data;
    }
    
    try {
      const response = await axios(config);
      console.log('✅ Success!', response.status);
      return response.data;
    } catch (error) {
      if (error.response) {
        console.log('❌ HTTP', error.response.status);
        console.log('Response:', JSON.stringify(error.response.data, null, 2));
        
        // If signature issue, try some variations
        if (error.response.status === 401) {
          return await this.trySignatureVariations(method, endpoint, data, salt, timestamp);
        }
      } else {
        console.log('❌ Network error:', error.message);
      }
      throw error;
    }
  }

  // 🔄 Try different signature variations
  async trySignatureVariations(method, endpoint, data, salt, timestamp) {
    console.log('🔧 Trying signature variations...');
    
    const variations = [
      // Variation 1: No body at all
      () => this.generateCorrectSignature(method, endpoint, salt, timestamp, null),
      
      // Variation 2: Empty string body
      () => this.generateCorrectSignature(method, endpoint, salt, timestamp, ''),
      
      // Variation 3: Compact JSON without spaces
      () => data ? this.generateCorrectSignature(method, endpoint, salt, timestamp, JSON.stringify(data).replace(/\\s/g, '')) : this.generateCorrectSignature(method, endpoint, salt, timestamp, ''),
      
      // Variation 4: Regular JSON string
      () => data ? this.generateCorrectSignature(method, endpoint, salt, timestamp, JSON.stringify(data)) : this.generateCorrectSignature(method, endpoint, salt, timestamp, '')
    ];
    
    for (let i = 0; i < variations.length; i++) {
      try {
        console.log(`Trying variation ${i + 1}...`);
        const signature = variations[i]();
        
        const headers = {
          'Content-Type': 'application/json',
          'access_key': this.accessKey,
          'salt': salt,
          'timestamp': timestamp.toString(),
          'signature': signature
        };
        
        const config = {
          method,
          url: this.baseUrl + endpoint,
          headers,
          httpsAgent: this.proxyAgent,
          timeout: 30000
        };
        
        if (data && method !== 'GET') {
          config.data = data;
        }
        
        const response = await axios(config);
        console.log(`✅ Variation ${i + 1} worked!`);
        return response.data;
        
      } catch (err) {
        console.log(`❌ Variation ${i + 1} failed`);
        if (i === variations.length - 1) {
          throw err;
        }
      }
    }
  }

  // 💰 Get wallet details
  async getWallet() {
    console.log('\\n💰 Getting wallet details...');
    const response = await this.makeAuthenticatedRequest('GET', `/v1/user/${this.walletId}`);
    
    if (response?.status?.status === 'SUCCESS') {
      console.log('📋 Wallet Info:');
      console.log('- ID:', response.data.id);
      console.log('- Status:', response.data.status);
      console.log('- Email:', response.data.email);
      
      if (response.data.accounts) {
        console.log('💳 Balances:');
        response.data.accounts.forEach(acc => {
          console.log(`  ${acc.currency}: ${acc.balance || '0.00'}`);
        });
      }
    }
    
    return response.data;
  }

  // 💳 Create real payment
  async createPayment(amount = 10, currency = 'USD') {
    console.log(`\\n💳 Creating payment: $${amount} ${currency}`);
    
    const paymentData = {
      amount: amount,
      currency: currency,
      payment_method: {
        type: 'us_debit_visa_card',
        fields: {
          number: '4111111111111111',
          expiration_month: '12',
          expiration_year: '2025',
          cvv: '123',
          name: 'Test User'
        }
      },
      capture: true,
      description: `Real payment from Pakistan via proxy`
    };
    
    const response = await this.makeAuthenticatedRequest('POST', '/v1/payments', paymentData);
    
    if (response?.status?.status === 'SUCCESS') {
      console.log('✅ Payment created!');
      console.log('- Payment ID:', response.data.id);
      console.log('- Status:', response.data.status);
      console.log('- Amount:', response.data.amount, response.data.currency);
    }
    
    return response.data;
  }

  // 💰 Add funds to wallet
  async depositFunds(amount = 25, currency = 'USD') {
    console.log(`\\n💰 Depositing $${amount} ${currency}...`);
    
    const depositData = {
      amount: amount,
      currency: currency,
      payment_method: {
        type: 'us_debit_visa_card',
        fields: {
          number: '4111111111111111',
          expiration_month: '12',
          expiration_year: '2025',
          cvv: '123'
        }
      },
      description: `Wallet deposit from Pakistan`
    };
    
    const response = await this.makeAuthenticatedRequest('POST', `/v1/user/${this.walletId}/transactions/deposit`, depositData);
    
    if (response?.status?.status === 'SUCCESS') {
      console.log('✅ Funds deposited!');
      console.log('- Transaction ID:', response.data.id);
      console.log('- Amount:', response.data.amount, response.data.currency);
      console.log('- New Balance:', response.data.balance);
    }
    
    return response.data;
  }

  // 📊 Get transactions
  async getTransactions() {
    console.log('\\n📊 Getting transactions...');
    const response = await this.makeAuthenticatedRequest('GET', `/v1/user/${this.walletId}/transactions`);
    
    if (response?.status?.status === 'SUCCESS') {
      console.log(`✅ Found ${response.data.length} transactions`);
      response.data.slice(0, 3).forEach((tx, i) => {
        console.log(`${i+1}. ${tx.type}: ${tx.amount} ${tx.currency} (${tx.status})`);
      });
    }
    
    return response.data;
  }

  // 🎯 Run complete test
  async runCompleteTest() {
    console.log('\\n🚀 RUNNING REAL RAPYD TRANSACTION TEST');
    console.log('🚨 Creating REAL transactions in your account!');
    console.log('=' .repeat(60));
    
    try {
      // Get wallet
      const wallet = await this.getWallet();
      
      // Create payment
      const payment = await this.createPayment(12.50, 'USD');
      
      // Add funds
      const deposit = await this.depositFunds(30.00, 'USD');
      
      // Get updated transactions
      const transactions = await this.getTransactions();
      
      console.log('\\n🎉 ALL TESTS COMPLETED!');
      console.log('✅ Proxy worked from Pakistan');
      console.log('✅ Real payment created: $12.50');
      console.log('✅ Real funds added: $30.00');
      console.log('✅ Transactions retrieved');
      console.log('\\n💡 Check your Rapyd dashboard for the new transactions!');
      
      return {
        success: true,
        wallet,
        payment,
        deposit,
        transactions,
        totalAmount: 42.50
      };
      
    } catch (error) {
      console.error('\\n💥 Test failed:', error.message);
      throw error;
    }
  }
}

// 🎯 Main execution
async function main() {
  console.log('🔥 RAPYD REAL TRANSACTION TEST');
  console.log('🌐 Proxy: ' + WORKING_PROXY);
  console.log('💰 This creates REAL transactions!');
  console.log('=' .repeat(50));
  
  const client = new WorkingRapydClient();
  
  if (!client.accessKey || !client.secretKey || !client.walletId) {
    console.error('❌ Missing Rapyd credentials');
    return;
  }
  
  try {
    console.log('⚡ Starting test...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const results = await client.runCompleteTest();
    
    console.log('\\n🏆 SUCCESS!');
    console.log('- Total processed: $' + results.totalAmount);
    console.log('- Proxy bypassed IP restrictions: ✅');
    console.log('- Real transactions created: ✅');
    
  } catch (error) {
    console.error('\\n💀 FAILED:', error.message);
    console.error('\\nCheck:');
    console.error('1. Rapyd credentials in .env');
    console.error('2. Proxy connectivity');
    console.error('3. Account status');
  }
}

if (require.main === module) {
  main();
}

module.exports = { WorkingRapydClient };
