const axios = require('axios');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

// Updated proxies list
const FREE_PROXIES = [
    'http://140.174.52.105:8888',
    'http://34.94.98.68:8080', 
    'http://162.238.123.152:8888',
    'http://199.188.204.105:8080',
    'http://157.250.203.202:8080',
    'http://66.29.156.102:8080',
    'http://209.97.150.167:8080',
    'http://159.65.221.25:80',
    'http://138.68.60.8:80',
    'http://50.122.86.118:80'
];

class RapydClient {
    constructor() {
        this.accessKey = process.env.RAPYD_ACCESS_KEY;
        this.secretKey = process.env.RAPYD_SECRET_KEY;
        this.walletId = process.env.RAPYD_WALLET_ID;
        this.baseUrl = process.env.RAPYD_BASE_URL;
        this.workingProxies = [];
    }

    // Exact Rapyd signature implementation
    generateSignature(method, path, body, timestamp, salt) {
        // Convert body to string exactly as Rapyd expects
        let bodyStr = '';
        if (body) {
            if (typeof body === 'object') {
                bodyStr = JSON.stringify(body);
            } else {
                bodyStr = String(body);
            }
        }

        // Build signature string exactly as Rapyd docs specify
        const signatureData = method + path + salt + timestamp + this.accessKey + this.secretKey + bodyStr;
        
        // Generate HMAC-SHA256 signature
        const signature = crypto
            .createHmac('sha256', this.secretKey)
            .update(signatureData, 'utf8')
            .digest('hex');

        // Return as base64
        return Buffer.from(signature, 'hex').toString('base64');
    }

    // Find working proxies
    async findWorkingProxies() {
        console.log('🔍 Testing proxies...');
        
        for (const proxy of FREE_PROXIES) {
            try {
                const agent = new HttpsProxyAgent(proxy);
                await axios.get('https://httpbin.org/ip', {
                    httpsAgent: agent,
                    timeout: 3000
                });
                this.workingProxies.push(proxy);
                console.log(`✅ Working: ${proxy}`);
            } catch (error) {
                console.log(`❌ Failed: ${proxy}`);
            }
        }
        
        console.log(`\n📊 Found ${this.workingProxies.length} working proxies\n`);
        return this.workingProxies;
    }

    // Get random working proxy
    getRandomProxy() {
        if (this.workingProxies.length === 0) {
            throw new Error('No working proxies available');
        }
        return this.workingProxies[Math.floor(Math.random() * this.workingProxies.length)];
    }

    // Make Rapyd API request
    async makeRequest(method, endpoint, body = null) {
        if (this.workingProxies.length === 0) {
            await this.findWorkingProxies();
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const salt = crypto.randomBytes(12).toString('hex');
        const signature = this.generateSignature(method, endpoint, body, timestamp, salt);

        const headers = {
            'Content-Type': 'application/json',
            'access_key': this.accessKey,
            'salt': salt,
            'timestamp': timestamp.toString(),
            'signature': signature,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };

        for (let attempt = 0; attempt < 3; attempt++) {
            const proxy = this.getRandomProxy();
            console.log(`🔄 Attempt ${attempt + 1} using proxy: ${proxy}`);

            try {
                const agent = new HttpsProxyAgent(proxy);
                const config = {
                    method,
                    url: `${this.baseUrl}${endpoint}`,
                    headers,
                    httpsAgent: agent,
                    timeout: 15000
                };

                if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
                    config.data = body;
                }

                const response = await axios(config);
                console.log(`✅ Success with proxy: ${proxy}`);
                return response.data;

            } catch (error) {
                console.log(`❌ Failed with ${proxy}: ${error.message}`);
                if (error.response && error.response.status < 500) {
                    console.log('Response:', JSON.stringify(error.response.data, null, 2));
                }
                
                if (attempt === 2) {
                    throw error;
                }
            }
        }
    }

    // Get wallet information
    async getWallet() {
        console.log('💰 Getting wallet information...');
        return await this.makeRequest('GET', `/v1/user/${this.walletId}`);
    }

    // Create payment
    async createPayment(amount = 10, currency = 'USD') {
        console.log(`💳 Creating payment: ${amount} ${currency}`);
        
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
            description: 'Test payment via proxy'
        };

        return await this.makeRequest('POST', '/v1/payments', paymentData);
    }

    // Add money to wallet
    async depositToWallet(amount = 100, currency = 'USD') {
        console.log(`💰 Depositing ${amount} ${currency} to wallet...`);
        
        const depositData = {
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
            }
        };

        return await this.makeRequest('POST', `/v1/user/${this.walletId}/transactions/deposit`, depositData);
    }

    // Get transactions
    async getTransactions() {
        console.log('📋 Getting transaction history...');
        return await this.makeRequest('GET', `/v1/user/${this.walletId}/transactions`);
    }

    // Transfer money
    async transferMoney(toWalletId, amount = 25, currency = 'USD') {
        console.log(`🔄 Transferring ${amount} ${currency} to ${toWalletId}...`);
        
        const transferData = {
            amount: amount,
            currency: currency,
            destination_ewallet: toWalletId,
            source_ewallet: this.walletId
        };

        return await this.makeRequest('POST', '/v1/account/transfer', transferData);
    }
}

// Main test function
async function runFullTest() {
    console.log('🚀 Starting Rapyd Proxy Test');
    console.log('=' .repeat(50));

    const rapyd = new RapydClient();

    try {
        // Test 1: Get wallet info
        const wallet = await rapyd.getWallet();
        console.log('✅ Wallet retrieved:', wallet.data?.id || 'No ID');

        // Test 2: Create a payment
        const payment = await rapyd.createPayment(5, 'USD');
        console.log('✅ Payment created:', payment.data?.id || 'No ID');

        // Test 3: Get transactions
        const transactions = await rapyd.getTransactions();
        console.log('✅ Transactions retrieved:', transactions.data?.length || 0, 'items');

        console.log('\n🎉 All tests completed successfully!');
        return { wallet, payment, transactions };

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

// Run the test
if (require.main === module) {
    runFullTest()
        .then(() => {
            console.log('\n✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { RapydClient, runFullTest };
