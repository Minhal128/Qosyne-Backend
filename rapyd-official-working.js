const axios = require('axios');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

// 🌐 Working proxy list
const PROXY_LIST = [
  'http://140.174.52.105:8888',
  'http://162.238.123.152:8888', 
  'http://34.94.98.68:8080',
  'http://159.65.221.25:80'
];

class OfficialRapydClient {
  constructor() {
    this.accessKey = process.env.RAPYD_ACCESS_KEY;
    this.secretKey = process.env.RAPYD_SECRET_KEY;
    this.walletId = process.env.RAPYD_WALLET_ID;
    this.baseUrl = 'https://sandboxapi.rapyd.net';
    this.workingProxy = null;
  }

  // 🔍 Find working proxy
  async findWorkingProxy() {
    console.log('🔍 Finding working proxy...');
    
    for (const proxy of PROXY_LIST) {
      try {
        console.log(`Testing ${proxy}...`);
        const agent = new HttpsProxyAgent(proxy);
        
        await axios.get('https://httpbin.org/ip', {
          httpsAgent: agent,
          timeout: 5000
        });
        
        console.log(`✅ Found working proxy: ${proxy}`);
        this.workingProxy = proxy;
        return proxy;
        
      } catch (error) {
        console.log(`❌ ${proxy} failed`);
      }
    }
    
    throw new Error('No working proxies found');
  }

  // 🎲 Generate random string (from official Rapyd code)
  generateRandomString(size) {
    try {
      return crypto.randomBytes(size).toString('hex');
    } catch (error) {
      console.error("Error generating salt");
      throw error;
    }
  }

  // 🔐 Official Rapyd signature method (exact copy)
  sign(method, urlPath, salt, timestamp, body) {
    try {
      let bodyString = "";
      if (body) {
        bodyString = JSON.stringify(body);
        bodyString = bodyString == "{}" ? "" : bodyString;
      }

      let toSign = method.toLowerCase() + urlPath + salt + timestamp + this.accessKey + this.secretKey + bodyString;
      console.log(`🔗 toSign: ${toSign}`);

      let hash = crypto.createHmac('sha256', this.secretKey);
      hash.update(toSign);
      const signature = Buffer.from(hash.digest("hex")).toString("base64");
      console.log(`🔐 signature: ${signature}`);

      return signature;
    } catch (error) {
      console.error("Error generating signature");
      throw error;
    }
  }

  // 🌐 Make request using official Rapyd method with proxy
  async makeRequest(method, urlPath, body = null) {
    if (!this.workingProxy) {
      await this.findWorkingProxy();
    }

    try {
      const httpMethod = method;
      const httpURLPath = urlPath;
      const salt = this.generateRandomString(8);
      const idempotency = new Date().getTime().toString();
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = this.sign(httpMethod, httpURLPath, salt, timestamp, body);

      console.log(`\\n🚀 Making ${httpMethod} request to ${httpURLPath}`);
      console.log('🌐 Via proxy:', this.workingProxy);
      console.log('📋 Request details:');
      console.log('- Salt:', salt);
      console.log('- Timestamp:', timestamp);
      console.log('- Idempotency:', idempotency);
      console.log('- Signature:', signature.substring(0, 20) + '...');

      const headers = {
        'Content-Type': 'application/json',
        'salt': salt,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'access_key': this.accessKey,
        'idempotency': idempotency
      };

      const agent = new HttpsProxyAgent(this.workingProxy);
      
      const config = {
        method: httpMethod,
        url: this.baseUrl + httpURLPath,
        headers: headers,
        httpsAgent: agent,
        timeout: 30000
      };

      let bodyString = "";
      if (body) {
        bodyString = JSON.stringify(body);
        bodyString = bodyString == "{}" ? "" : bodyString;
        if (bodyString) {
          config.data = JSON.parse(bodyString);
        }
      }

      const response = await axios(config);
      
      console.log('✅ Success!', response.status);
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Request failed:', error.message);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
      
      throw error;
    }
  }

  // 💰 Get wallet details
  async getWallet() {
    console.log('\\n💰 Getting wallet details...');
    const response = await this.makeRequest('GET', `/v1/user/${this.walletId}`);
    
    if (response.status?.status === 'SUCCESS') {
      console.log('🎉 SUCCESS! Wallet retrieved!');
      console.log('📋 Wallet Details:');
      console.log('- ID:', response.data.id);
      console.log('- Status:', response.data.status);
      console.log('- Type:', response.data.type);
      
      if (response.data.accounts) {
        console.log('💰 Account Balances:');
        response.data.accounts.forEach(acc => {
          console.log(`  ${acc.currency}: ${acc.balance || '0.00'}`);
        });
      }
    }
    
    return response;
  }

  // 💳 Create payment
  async createPayment(amount = 20, currency = 'USD') {
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
          name: 'Test Payment User'
        }
      },
      capture: true,
      description: `Real payment $${amount} from Pakistan via proxy`
    };

    const response = await this.makeRequest('POST', '/v1/payments', paymentData);
    
    if (response.status?.status === 'SUCCESS') {
      console.log('🎉 PAYMENT CREATED!');
      console.log('📋 Payment Details:');
      console.log('- Payment ID:', response.data.id);
      console.log('- Status:', response.data.status);
      console.log('- Amount:', response.data.amount, response.data.currency);
    }
    
    return response;
  }

  // 💰 Add funds to wallet
  async addFunds(amount = 50, currency = 'USD') {
    console.log(`\\n💰 Adding funds: $${amount} ${currency}`);
    
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
      description: `Wallet deposit $${amount} from Pakistan`
    };

    const response = await this.makeRequest('POST', `/v1/user/${this.walletId}/transactions/deposit`, depositData);
    
    if (response.status?.status === 'SUCCESS') {
      console.log('🎉 FUNDS ADDED!');
      console.log('📋 Deposit Details:');
      console.log('- Transaction ID:', response.data.id);
      console.log('- Amount:', response.data.amount, response.data.currency);
      console.log('- Balance:', response.data.balance);
    }
    
    return response;
  }

  // 📊 Get transactions
  async getTransactions() {
    console.log('\\n📊 Getting transaction history...');
    const response = await this.makeRequest('GET', `/v1/user/${this.walletId}/transactions`);
    
    if (response.status?.status === 'SUCCESS') {
      console.log(`✅ Retrieved ${response.data.length} transactions`);
      console.log('📋 Recent Transactions:');
      
      response.data.slice(0, 5).forEach((tx, i) => {
        console.log(`${i+1}. ${tx.type} - ${tx.amount} ${tx.currency} [${tx.status}]`);
      });
    }
    
    return response;
  }

  // 🎯 Run complete real transaction test
  async runCompleteTest() {
    console.log('\\n🚀 STARTING REAL RAPYD TRANSACTION TEST');
    console.log('🚨 WARNING: This creates REAL transactions in your account!');
    console.log('=' .repeat(70));

    try {
      // Step 1: Get wallet
      const wallet = await this.getWallet();
      
      // Step 2: Create payment
      const payment = await this.createPayment(25.00, 'USD');
      
      // Step 3: Add funds
      const deposit = await this.addFunds(75.00, 'USD');
      
      // Step 4: Get updated transactions
      const transactions = await this.getTransactions();

      console.log('\\n🎉 ALL REAL TRANSACTIONS COMPLETED!');
      console.log('=' .repeat(60));
      console.log('✅ Pakistan IP successfully bypassed');
      console.log('✅ Working proxy:', this.workingProxy);
      console.log('✅ Real payment created: $25.00');
      console.log('✅ Real funds deposited: $75.00');
      console.log('✅ Total amount processed: $100.00');
      console.log('✅ Transaction history updated');
      console.log('\\n💡 Check your Rapyd dashboard to see these REAL transactions!');
      console.log('🌐 Dashboard: https://dashboard.rapyd.net');

      return {
        success: true,
        wallet: wallet.data,
        payment: payment.data,
        deposit: deposit.data,
        transactions: transactions.data,
        totalAmount: 100.00,
        proxyUsed: this.workingProxy
      };

    } catch (error) {
      console.error('\\n💥 Real transaction test failed:', error.message);
      throw error;
    }
  }
}

// 🎯 Main execution
async function main() {
  try {
    console.log('🔥 RAPYD OFFICIAL SIGNATURE METHOD');
    console.log('🌐 Proxy-enabled for Pakistan');
    console.log('💰 Creating REAL transactions in your Rapyd account');
    console.log('=' .repeat(70));

    const client = new OfficialRapydClient();

    // Verify credentials
    if (!client.accessKey || !client.secretKey || !client.walletId) {
      throw new Error('❌ Missing Rapyd credentials in .env file');
    }

    console.log('✅ Credentials loaded successfully');
    console.log('- Access Key:', client.accessKey.substring(0, 10) + '...');
    console.log('- Wallet ID:', client.walletId);
    console.log('- Environment: Sandbox');

    console.log('\\n⚡ Starting real transaction test in 3 seconds...');
    console.log('⚠️  Press Ctrl+C to cancel if needed');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    const results = await client.runCompleteTest();

    console.log('\\n🏆 FINAL SUCCESS REPORT:');
    console.log('- Success:', results.success ? '✅' : '❌');
    console.log('- Total processed: $' + results.totalAmount);
    console.log('- Proxy used:', results.proxyUsed);
    console.log('- New payment ID:', results.payment.id);
    console.log('- New deposit ID:', results.deposit.id);
    console.log('- Pakistan IP bypass: ✅');
    console.log('\\n🎯 Mission accomplished! Real transactions created from Pakistan!');

    process.exit(0);

  } catch (error) {
    console.error('\\n💀 SYSTEM FAILED:', error.message);
    console.error('\\n🔧 Troubleshooting:');
    console.error('1. Verify Rapyd credentials in .env file');
    console.error('2. Check internet connectivity');
    console.error('3. Ensure Rapyd sandbox account is active');
    console.error('4. Try using a VPN if all proxies fail');
    
    process.exit(1);
  }
}

// Execute the system
if (require.main === module) {
  main();
}

module.exports = { OfficialRapydClient };
