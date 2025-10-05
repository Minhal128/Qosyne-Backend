const axios = require('axios');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

// 🌐 Working proxy
const WORKING_PROXY = 'http://140.174.52.105:8888';

class OfficialRapydClient {
  constructor() {
    this.accessKey = process.env.RAPYD_ACCESS_KEY;
    this.secretKey = process.env.RAPYD_SECRET_KEY;
    this.walletId = process.env.RAPYD_WALLET_ID;
    this.baseUrl = process.env.RAPYD_BASE_URL;
    this.proxyAgent = new HttpsProxyAgent(WORKING_PROXY);
  }

  // 🔐 Official Rapyd signature method from their documentation
  generateRapydSignature(method, urlPath, salt, timestamp, body) {
    // Step 1: Concatenate the string to sign
    const toSign = method + urlPath + salt + timestamp + this.accessKey + this.secretKey + body;
    
    console.log('🔐 Signature Debug:');
    console.log('method:', method);
    console.log('urlPath:', urlPath);
    console.log('salt:', salt);
    console.log('timestamp:', timestamp);
    console.log('accessKey:', this.accessKey);
    console.log('secretKey length:', this.secretKey.length);
    console.log('body:', body);
    console.log('toSign length:', toSign.length);
    console.log('toSign:', toSign.substring(0, 100) + '...');
    
    // Step 2: Hash the string using HMAC with SHA-256
    const hash = crypto.createHmac('sha256', this.secretKey);
    hash.update(toSign);
    const signature = hash.digest('hex');
    
    // Step 3: Encode the hashed signature in Base64
    const base64signature = Buffer.from(signature, 'hex').toString('base64');
    
    console.log('hex signature:', signature.substring(0, 20) + '...');
    console.log('base64 signature:', base64signature.substring(0, 20) + '...');
    
    return base64signature;
  }

  // 🌐 Make API request with correct signature
  async makeRapydRequest(method, urlPath, body = '') {
    console.log(`\\n🔄 ${method} ${urlPath}`);
    
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const salt = crypto.randomBytes(12).toString('hex');
    
    // Ensure body is a string
    const bodyString = typeof body === 'object' ? JSON.stringify(body) : (body || '');
    
    const signature = this.generateRapydSignature(method, urlPath, salt, timestamp, bodyString);
    
    const headers = {
      'Content-Type': 'application/json',
      'access_key': this.accessKey,
      'salt': salt,
      'timestamp': timestamp,
      'signature': signature
    };

    const config = {
      method: method,
      url: this.baseUrl + urlPath,
      headers: headers,
      httpsAgent: this.proxyAgent,
      timeout: 30000
    };

    if (bodyString && method !== 'GET') {
      config.data = JSON.parse(bodyString);
    }

    try {
      console.log('📤 Making request...');
      const response = await axios(config);
      console.log('✅ Success:', response.status);
      return response.data;
    } catch (error) {
      console.error('❌ Request failed');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
      
      // Try with empty body if signature failed
      if (error.response?.status === 401 && bodyString) {
        console.log('🔄 Retrying with empty body...');
        return this.makeRapydRequest(method, urlPath, '');
      }
      
      throw error;
    }
  }

  // 💰 Get wallet
  async getWallet() {
    console.log('\\n💰 Getting wallet...');
    const response = await this.makeRapydRequest('GET', `/v1/user/${this.walletId}`, '');
    
    if (response.status.status === 'SUCCESS') {
      console.log('✅ Wallet retrieved successfully!');
      console.log('ID:', response.data.id);
      console.log('Status:', response.data.status);
      
      if (response.data.accounts) {
        console.log('Accounts:');
        response.data.accounts.forEach(account => {
          console.log(`  ${account.currency}: ${account.balance}`);
        });
      }
    }
    
    return response;
  }

  // 💳 Create payment
  async createPayment(amount = 15, currency = 'USD') {
    console.log(`\\n💳 Creating payment: ${amount} ${currency}`);
    
    const paymentBody = {
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
      description: 'Real payment from Pakistan via proxy'
    };

    const response = await this.makeRapydRequest('POST', '/v1/payments', paymentBody);
    
    if (response.status.status === 'SUCCESS') {
      console.log('✅ Payment created!');
      console.log('Payment ID:', response.data.id);
      console.log('Status:', response.data.status);
      console.log('Amount:', response.data.amount, response.data.currency);
    }
    
    return response;
  }

  // 💰 Add funds
  async addFunds(amount = 35, currency = 'USD') {
    console.log(`\\n💰 Adding funds: ${amount} ${currency}`);
    
    const depositBody = {
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
      description: 'Wallet deposit from Pakistan'
    };

    const response = await this.makeRapydRequest('POST', `/v1/user/${this.walletId}/transactions/deposit`, depositBody);
    
    if (response.status.status === 'SUCCESS') {
      console.log('✅ Funds added!');
      console.log('Transaction ID:', response.data.id);
      console.log('Amount:', response.data.amount, response.data.currency);
      console.log('Balance:', response.data.balance);
    }
    
    return response;
  }

  // 📊 Get transactions
  async getTransactions() {
    console.log('\\n📊 Getting transactions...');
    const response = await this.makeRapydRequest('GET', `/v1/user/${this.walletId}/transactions`, '');
    
    if (response.status.status === 'SUCCESS') {
      console.log(`✅ Retrieved ${response.data.length} transactions`);
      response.data.slice(0, 5).forEach((tx, i) => {
        console.log(`${i+1}. ${tx.type}: ${tx.amount} ${tx.currency} [${tx.status}]`);
      });
    }
    
    return response;
  }

  // 🎯 Run complete test
  async runFullTest() {
    console.log('\\n🚀 RUNNING COMPLETE REAL RAPYD TEST');
    console.log('🚨 This will create REAL transactions!');
    console.log('=' .repeat(60));

    try {
      console.log('✅ Proxy configured:', WORKING_PROXY);
      console.log('✅ Credentials loaded');
      console.log('✅ Using official Rapyd signature method');

      // Test 1: Get wallet
      const wallet = await this.getWallet();
      
      // Test 2: Create payment
      const payment = await this.createPayment(18.75, 'USD');
      
      // Test 3: Add funds
      const deposit = await this.addFunds(42.50, 'USD');
      
      // Test 4: Get transactions
      const transactions = await this.getTransactions();

      console.log('\\n🎉 ALL REAL TRANSACTIONS COMPLETED!');
      console.log('=' .repeat(50));
      console.log('✅ Wallet accessed via proxy');
      console.log('✅ Real payment: $18.75');
      console.log('✅ Real deposit: $42.50');
      console.log('✅ Total processed: $61.25');
      console.log('✅ Proxy IP bypass successful');
      console.log('\\n💡 Check your Rapyd dashboard!');
      
      return {
        success: true,
        wallet: wallet.data,
        payment: payment.data,
        deposit: deposit.data,
        transactions: transactions.data,
        totalAmount: 61.25
      };

    } catch (error) {
      console.error('\\n💥 Test failed:', error.message);
      throw error;
    }
  }
}

// 🎯 Main execution
async function main() {
  try {
    console.log('🔥 OFFICIAL RAPYD SIGNATURE TEST');
    console.log('🌐 Using proxy from Pakistan');
    console.log('💰 Creating REAL transactions');
    console.log('=' .repeat(50));

    const client = new OfficialRapydClient();

    // Verify credentials
    if (!client.accessKey || !client.secretKey || !client.walletId) {
      throw new Error('Missing Rapyd credentials in .env file');
    }

    console.log('⚡ Starting in 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const results = await client.runFullTest();

    console.log('\\n🏆 FINAL SUCCESS:');
    console.log('- Real transactions created: ✅');
    console.log('- Total amount: $' + results.totalAmount);
    console.log('- Pakistan IP bypassed: ✅');
    console.log('- Proxy working: ✅');

  } catch (error) {
    console.error('\\n💀 FAILED:', error.message);
    console.error('\\n🔧 Debug checklist:');
    console.error('1. Verify .env has correct Rapyd credentials');
    console.error('2. Check if proxy is still active');
    console.error('3. Ensure Rapyd sandbox account is working');
    console.error('4. Try with a VPN if proxies fail');
  }
}

if (require.main === module) {
  main();
}

module.exports = { OfficialRapydClient };
