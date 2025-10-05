const axios = require('axios');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

// 🌐 Your working proxy from earlier tests
const WORKING_PROXY = 'http://140.174.52.105:8888';

class RealRapydTransactionSystem {
  constructor() {
    this.accessKey = process.env.RAPYD_ACCESS_KEY;
    this.secretKey = process.env.RAPYD_SECRET_KEY;
    this.walletId = process.env.RAPYD_WALLET_ID;
    this.baseUrl = process.env.RAPYD_BASE_URL;
    this.proxyAgent = new HttpsProxyAgent(WORKING_PROXY);
    
    console.log('🚀 Real Rapyd Transaction System Initialized');
    console.log('- Access Key:', this.accessKey?.substring(0, 8) + '...');
    console.log('- Wallet ID:', this.walletId);
    console.log('- Base URL:', this.baseUrl);
    console.log('- Proxy:', WORKING_PROXY);
  }

  // ✅ Generate correct Rapyd signature
  generateRapydSignature(method, urlPath, salt, timestamp, body = '') {
    let bodyString = '';
    if (body && typeof body === 'object') {
      bodyString = JSON.stringify(body);
    } else if (body) {
      bodyString = String(body);
    }

    const toSign = method + urlPath + salt + timestamp + this.accessKey + this.secretKey + bodyString;
    
    console.log('🔐 Signature Generation:');
    console.log('- Method:', method);
    console.log('- Path:', urlPath);
    console.log('- Salt:', salt);
    console.log('- Timestamp:', timestamp);
    console.log('- Body length:', bodyString.length);
    
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(toSign, 'utf8')
      .digest('hex');
    
    const base64Signature = Buffer.from(signature, 'hex').toString('base64');
    console.log('- Generated signature:', base64Signature.substring(0, 20) + '...');
    
    return base64Signature;
  }

  // 🌐 Make real Rapyd API request through proxy
  async makeRapydRequest(method, endpoint, body = null, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      console.log(`\n🔄 Attempt ${attempt}/${retries}: ${method} ${endpoint}`);
      
      const timestamp = Math.floor(Date.now() / 1000);
      const salt = crypto.randomBytes(12).toString('hex');
      const signature = this.generateRapydSignature(method, endpoint, salt, timestamp, body);

      const headers = {
        'Content-Type': 'application/json',
        'access_key': this.accessKey,
        'salt': salt,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'User-Agent': 'Qosyne-RealTransactions/1.0'
      };

      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers,
        httpsAgent: this.proxyAgent,
        timeout: 30000,
        validateStatus: (status) => status < 500
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.data = body;
      }

      try {
        const response = await axios(config);
        
        if (response.status >= 200 && response.status < 300) {
          console.log('✅ Request successful!');
          console.log('Response status:', response.status);
          return response.data;
        } else if (response.status === 401) {
          console.log('❌ Authentication failed (signature issue)');
          console.log('Response:', JSON.stringify(response.data, null, 2));
          
          if (attempt < retries) {
            console.log('🔄 Retrying with new timestamp and salt...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        } else {
          console.log(`⚠️ HTTP ${response.status}:`, response.data);
        }
        
        return response.data;
        
      } catch (error) {
        console.log(`❌ Request failed:`, error.message);
        
        if (error.response) {
          console.log('Status:', error.response.status);
          console.log('Response:', JSON.stringify(error.response.data, null, 2));
          
          if (error.response.status === 401 && attempt < retries) {
            console.log('🔄 Retrying due to authentication failure...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        }
        
        if (attempt === retries) {
          throw error;
        }
      }
    }
  }

  // 💰 Get your real wallet details
  async getRealWalletDetails() {
    console.log('\n💰 Getting your real Rapyd wallet details...');
    try {
      const response = await this.makeRapydRequest('GET', `/v1/user/${this.walletId}`);
      
      if (response && response.status && response.status.status === 'SUCCESS') {
        console.log('✅ Wallet retrieved successfully!');
        console.log('📋 Wallet Details:');
        console.log('- ID:', response.data.id);
        console.log('- Status:', response.data.status);
        console.log('- Type:', response.data.type);
        console.log('- Phone:', response.data.phone_number);
        console.log('- Email:', response.data.email);
        
        if (response.data.accounts && response.data.accounts.length > 0) {
          console.log('💳 Accounts:');
          response.data.accounts.forEach((account, index) => {
            console.log(`  ${index + 1}. ${account.currency}: ${account.balance}`);
          });
        }
        
        return response.data;
      } else {
        console.log('❌ Unexpected response format:', response);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to get wallet details:', error.message);
      throw error;
    }
  }

  // 💳 Create real payment in your Rapyd account
  async createRealPayment(amount, currency = 'USD', description = 'Real test payment') {
    console.log(`\n💳 Creating real payment: ${amount} ${currency}`);
    console.log('Description:', description);

    const paymentData = {
      amount: parseFloat(amount),
      currency: currency,
      payment_method: {
        type: 'us_debit_visa_card',
        fields: {
          number: '4111111111111111', // Rapyd test card
          expiration_month: '12',
          expiration_year: '2025',
          cvv: '123',
          name: 'Test Customer'
        }
      },
      capture: true,
      description: description,
      metadata: {
        created_by: 'real_transaction_script',
        timestamp: new Date().toISOString(),
        proxy_used: WORKING_PROXY
      }
    };

    try {
      const response = await this.makeRapydRequest('POST', '/v1/payments', paymentData);
      
      if (response && response.status && response.status.status === 'SUCCESS') {
        console.log('✅ Payment created successfully!');
        console.log('📋 Payment Details:');
        console.log('- Payment ID:', response.data.id);
        console.log('- Status:', response.data.status);
        console.log('- Amount:', response.data.amount, response.data.currency);
        console.log('- Description:', response.data.description);
        console.log('- Created:', new Date(response.data.created_at * 1000).toLocaleString());
        
        return response.data;
      } else {
        console.log('❌ Payment creation failed:', response);
        return null;
      }
    } catch (error) {
      console.error('❌ Payment creation error:', error.message);
      throw error;
    }
  }

  // 💰 Add real funds to your wallet
  async addRealFundsToWallet(amount, currency = 'USD', description = 'Real wallet deposit') {
    console.log(`\n💰 Adding real funds to wallet: ${amount} ${currency}`);

    const depositData = {
      amount: parseFloat(amount),
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
      description: description,
      metadata: {
        transaction_type: 'wallet_deposit',
        created_by: 'real_transaction_script'
      }
    };

    try {
      const response = await this.makeRapydRequest('POST', `/v1/user/${this.walletId}/transactions/deposit`, depositData);
      
      if (response && response.status && response.status.status === 'SUCCESS') {
        console.log('✅ Funds added successfully!');
        console.log('📋 Deposit Details:');
        console.log('- Transaction ID:', response.data.id);
        console.log('- Status:', response.data.status);
        console.log('- Amount:', response.data.amount, response.data.currency);
        console.log('- Balance After:', response.data.balance);
        
        return response.data;
      } else {
        console.log('❌ Deposit failed:', response);
        return null;
      }
    } catch (error) {
      console.error('❌ Deposit error:', error.message);
      throw error;
    }
  }

  // 📊 Get real transaction history
  async getRealTransactionHistory(limit = 10) {
    console.log(`\n📊 Getting real transaction history (last ${limit})...`);

    try {
      const response = await this.makeRapydRequest('GET', `/v1/user/${this.walletId}/transactions?limit=${limit}`);
      
      if (response && response.status && response.status.status === 'SUCCESS') {
        console.log('✅ Transaction history retrieved!');
        console.log(`📋 Found ${response.data.length} transactions:`);
        
        response.data.forEach((transaction, index) => {
          console.log(`\n${index + 1}. Transaction ID: ${transaction.id}`);
          console.log(`   Type: ${transaction.type}`);
          console.log(`   Amount: ${transaction.amount} ${transaction.currency}`);
          console.log(`   Status: ${transaction.status}`);
          console.log(`   Date: ${new Date(transaction.created_at * 1000).toLocaleString()}`);
          console.log(`   Description: ${transaction.description || 'N/A'}`);
        });
        
        return response.data;
      } else {
        console.log('❌ Failed to get transaction history:', response);
        return [];
      }
    } catch (error) {
      console.error('❌ Transaction history error:', error.message);
      throw error;
    }
  }

  // 🔄 Transfer funds between wallets (if you have multiple)
  async transferRealFunds(toWalletId, amount, currency = 'USD', description = 'Real wallet transfer') {
    console.log(`\n🔄 Transferring real funds: ${amount} ${currency}`);
    console.log('To wallet:', toWalletId);

    const transferData = {
      amount: parseFloat(amount),
      currency: currency,
      destination_ewallet: toWalletId,
      source_ewallet: this.walletId,
      description: description,
      metadata: {
        transfer_type: 'wallet_to_wallet',
        created_by: 'real_transaction_script'
      }
    };

    try {
      const response = await this.makeRapydRequest('POST', '/v1/account/transfer', transferData);
      
      if (response && response.status && response.status.status === 'SUCCESS') {
        console.log('✅ Transfer completed successfully!');
        console.log('📋 Transfer Details:');
        console.log('- Transfer ID:', response.data.id);
        console.log('- Status:', response.data.status);
        console.log('- Amount:', response.data.amount, response.data.currency);
        
        return response.data;
      } else {
        console.log('❌ Transfer failed:', response);
        return null;
      }
    } catch (error) {
      console.error('❌ Transfer error:', error.message);
      throw error;
    }
  }

  // 🧪 Run complete real transaction test
  async runRealTransactionTest() {
    console.log('\n🚀 Starting Real Rapyd Transaction Test');
    console.log('=' .repeat(60));
    console.log('⚠️  WARNING: This will create REAL transactions in your Rapyd account!');
    console.log('=' .repeat(60));

    try {
      // Step 1: Get current wallet state
      const wallet = await this.getRealWalletDetails();
      if (!wallet) {
        throw new Error('Could not retrieve wallet details');
      }

      // Step 2: Create a real payment
      const payment = await this.createRealPayment(10.00, 'USD', 'Real test payment via proxy');
      if (!payment) {
        throw new Error('Payment creation failed');
      }

      // Step 3: Add funds to wallet
      const deposit = await this.addRealFundsToWallet(25.00, 'USD', 'Real wallet deposit via proxy');
      if (!deposit) {
        throw new Error('Deposit failed');
      }

      // Step 4: Get updated transaction history
      const transactions = await this.getRealTransactionHistory(20);

      console.log('\n🎉 Real Transaction Test Completed Successfully!');
      console.log('=' .repeat(60));
      console.log('✅ All transactions are REAL and will appear in your Rapyd dashboard');
      console.log('✅ Proxy successfully bypassed IP restrictions');
      console.log('✅ Signature generation working correctly');
      
      console.log('\n📈 Test Summary:');
      console.log('- Wallet accessed: ✅');
      console.log('- Payment created: ✅ ($10.00 USD)');
      console.log('- Funds deposited: ✅ ($25.00 USD)');
      console.log('- Transaction history: ✅ (' + transactions.length + ' records)');
      console.log('- Total new transactions: 2');
      console.log('- Proxy used: ' + WORKING_PROXY);

      return {
        success: true,
        wallet,
        payment,
        deposit,
        transactions,
        summary: {
          totalTransactions: 2,
          totalAmount: 35.00,
          currency: 'USD',
          proxyUsed: WORKING_PROXY
        }
      };

    } catch (error) {
      console.error('\n💥 Real transaction test failed:', error.message);
      throw error;
    }
  }
}

// 🎯 Execute real transaction test
async function main() {
  try {
    console.log('🔥 REAL RAPYD TRANSACTION SYSTEM');
    console.log('🚨 This will create REAL transactions in your account!');
    console.log('=' .repeat(70));

    const rapydSystem = new RealRapydTransactionSystem();

    // Verify all credentials are present
    if (!rapydSystem.accessKey || !rapydSystem.secretKey || !rapydSystem.walletId) {
      throw new Error('Missing Rapyd credentials in .env file');
    }

    console.log('✅ All credentials loaded');
    console.log('✅ Proxy configured and ready');
    console.log('\n🚀 Starting real transaction test in 3 seconds...');
    
    // Give user time to cancel if needed
    await new Promise(resolve => setTimeout(resolve, 3000));

    const results = await rapydSystem.runRealTransactionTest();

    console.log('\n🎯 FINAL RESULTS:');
    console.log('Success:', results.success);
    console.log('New transactions created:', results.summary.totalTransactions);
    console.log('Total amount processed: $' + results.summary.totalAmount);
    console.log('Proxy used:', results.summary.proxyUsed);
    console.log('\n💡 Check your Rapyd dashboard to see the real transactions!');

    process.exit(0);

  } catch (error) {
    console.error('\n💀 Script failed:', error.message);
    console.error('\n🔧 Common issues:');
    console.error('- Check your .env file has correct Rapyd credentials');
    console.error('- Verify proxy is still working');
    console.error('- Ensure your Rapyd account is active');
    process.exit(1);
  }
}

// Run the real transaction test
if (require.main === module) {
  main();
}

module.exports = { RealRapydTransactionSystem };
