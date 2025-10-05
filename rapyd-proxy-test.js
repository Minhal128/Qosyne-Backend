const axios = require('axios');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

// Free proxies list from your data
const FREE_PROXIES = [
    'http://199.188.204.105:8080',
    'http://66.29.156.102:8080',
    'http://157.250.203.202:8080',
    'http://35.197.89.213:80',
    'http://4.156.78.45:80',
    'http://140.174.52.105:8888',
    'http://5.78.67.134:8088',
    'http://103.214.109.68:80',
    'http://103.214.109.69:80',
    'http://159.65.221.25:80',
    'http://162.238.123.152:8888',
    'http://209.97.150.167:8080',
    'http://32.223.6.94:80',
    'http://50.122.86.118:80',
    'http://138.68.60.8:80',
    'http://192.73.244.36:80',
    'http://107.174.123.200:80',
    'http://23.247.136.254:80',
    'http://34.94.98.68:8080',
    'http://194.104.156.179:8080'
];

class RapydProxyClient {
    constructor() {
        this.accessKey = process.env.RAPYD_ACCESS_KEY;
        this.secretKey = process.env.RAPYD_SECRET_KEY;
        this.walletId = process.env.RAPYD_WALLET_ID;
        this.baseUrl = process.env.RAPYD_BASE_URL;
        this.currentProxyIndex = 0;
        this.workingProxies = [];
    }

    // Generate Rapyd API signature following official Rapyd documentation
    generateSignature(method, path, body = '', timestamp, salt) {
        let bodyString = '';
        if (body && typeof body === 'object') {
            bodyString = JSON.stringify(body);
            // Remove all whitespace
            bodyString = bodyString.replace(/\s/g, '');
        } else if (body) {
            bodyString = String(body).replace(/\s/g, '');
        }
        
        // Rapyd signature format: method + url_path + salt + timestamp + access_key + secret_key + body
        const toSign = `${method}${path}${salt}${timestamp}${this.accessKey}${this.secretKey}${bodyString}`;
        
        console.log('🔐 Signature Debug:');
        console.log('Method:', method);
        console.log('Path:', path);
        console.log('Salt:', salt);
        console.log('Timestamp:', timestamp);
        console.log('Access Key:', this.accessKey);
        console.log('Body String:', bodyString);
        console.log('To Sign Length:', toSign.length);
        console.log('To Sign:', toSign.substring(0, 200) + '...');
        
        // Create HMAC-SHA256 hash
        const signature = crypto
            .createHmac('sha256', this.secretKey)
            .update(toSign)
            .digest('hex');
        
        // Convert to base64
        const base64Signature = Buffer.from(signature, 'hex').toString('base64');
        
        console.log('Hex Signature:', signature.substring(0, 32) + '...');
        console.log('Base64 Signature:', base64Signature.substring(0, 32) + '...');
        
        return base64Signature;
    }

    // Get random proxy from list
    getRandomProxy() {
        return FREE_PROXIES[Math.floor(Math.random() * FREE_PROXIES.length)];
    }

    // Get next proxy in rotation
    getNextProxy() {
        if (this.workingProxies.length > 0) {
            const proxy = this.workingProxies[this.currentProxyIndex];
            this.currentProxyIndex = (this.currentProxyIndex + 1) % this.workingProxies.length;
            return proxy;
        }
        return this.getRandomProxy();
    }

    // Test proxy connectivity
    async testProxy(proxy) {
        try {
            const agent = new HttpsProxyAgent(proxy);
            await axios.get('https://httpbin.org/ip', {
                httpsAgent: agent,
                timeout: 5000
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    // Find working proxies
    async findWorkingProxies() {
        console.log('🔍 Testing proxies for connectivity...');
        const testPromises = FREE_PROXIES.map(async (proxy) => {
            const isWorking = await this.testProxy(proxy);
            if (isWorking) {
                console.log(`✅ Working proxy: ${proxy}`);
                return proxy;
            } else {
                console.log(`❌ Failed proxy: ${proxy}`);
                return null;
            }
        });

        const results = await Promise.all(testPromises);
        this.workingProxies = results.filter(proxy => proxy !== null);
        
        console.log(`\n📊 Found ${this.workingProxies.length} working proxies out of ${FREE_PROXIES.length}`);
        return this.workingProxies;
    }

    // Make Rapyd API request with proxy rotation
    async makeRequest(method, endpoint, body = null, maxRetries = 5) {
        if (this.workingProxies.length === 0) {
            await this.findWorkingProxies();
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const salt = crypto.randomBytes(8).toString('hex');
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        const signature = this.generateSignature(method, path, body, timestamp, salt);
        
        const headers = {
            'Content-Type': 'application/json',
            'access_key': this.accessKey,
            'signature': signature,
            'salt': salt,
            'timestamp': timestamp,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const proxy = this.getNextProxy();
            console.log(`🔄 Attempt ${attempt + 1}/${maxRetries} using proxy: ${proxy}`);
            
            try {
                const agent = new HttpsProxyAgent(proxy);
                const config = {
                    method,
                    url: `${this.baseUrl}${path}`,
                    headers,
                    httpsAgent: agent,
                    timeout: 15000,
                    validateStatus: (status) => status < 500
                };

                if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                    config.data = body;
                }

                const response = await axios(config);
                
                if (response.status >= 200 && response.status < 300) {
                    console.log(`✅ Success with proxy: ${proxy}`);
                    return response.data;
                } else {
                    console.log(`⚠️ API Error ${response.status}:`, response.data);
                    if (response.status >= 400 && response.status < 500) {
                        // Client error - don't retry with different proxy
                        throw new Error(`API Error ${response.status}: ${JSON.stringify(response.data)}`);
                    }
                }
            } catch (error) {
                console.log(`❌ Failed with proxy ${proxy}:`, error.message);
                
                if (attempt === maxRetries - 1) {
                    throw new Error(`All proxy attempts failed. Last error: ${error.message}`);
                }
                
                // Wait a bit before next attempt
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    // Get wallet details
    async getWallet() {
        console.log('\n🔍 Getting wallet details...');
        try {
            const response = await this.makeRequest('GET', `/v1/user/${this.walletId}`);
            console.log('💰 Wallet Details:', JSON.stringify(response, null, 2));
            return response;
        } catch (error) {
            console.error('❌ Failed to get wallet:', error.message);
            throw error;
        }
    }

    // Create a payment (transaction)
    async createPayment(amount = 10, currency = 'USD') {
        console.log(`\n💳 Creating payment of ${amount} ${currency}...`);
        
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
            description: 'Test payment via proxy',
            metadata: {
                merchant_defined: true,
                test_payment: true
            }
        };

        try {
            const response = await this.makeRequest('POST', '/v1/payments', paymentData);
            console.log('✅ Payment Created:', JSON.stringify(response, null, 2));
            return response;
        } catch (error) {
            console.error('❌ Failed to create payment:', error.message);
            throw error;
        }
    }

    // Add funds to wallet
    async addFundsToWallet(amount = 50, currency = 'USD') {
        console.log(`\n💰 Adding ${amount} ${currency} to wallet...`);
        
        const fundsData = {
            amount: amount,
            currency: currency,
            source: {
                type: 'us_debit_visa_card',
                fields: {
                    number: '4111111111111111',
                    expiration_month: '12',
                    expiration_year: '2025',
                    cvv: '123'
                }
            },
            metadata: {
                source: 'proxy_test'
            }
        };

        try {
            const response = await this.makeRequest('POST', `/v1/user/${this.walletId}/transactions/deposit`, fundsData);
            console.log('✅ Funds Added:', JSON.stringify(response, null, 2));
            return response;
        } catch (error) {
            console.error('❌ Failed to add funds:', error.message);
            throw error;
        }
    }

    // Transfer funds between wallets
    async transferFunds(toWalletId, amount = 25, currency = 'USD') {
        console.log(`\n🔄 Transferring ${amount} ${currency} to wallet ${toWalletId}...`);
        
        const transferData = {
            amount: amount,
            currency: currency,
            destination_ewallet: toWalletId,
            source_ewallet: this.walletId,
            metadata: {
                transfer_reason: 'test_via_proxy'
            }
        };

        try {
            const response = await this.makeRequest('POST', '/v1/account/transfer', transferData);
            console.log('✅ Transfer Completed:', JSON.stringify(response, null, 2));
            return response;
        } catch (error) {
            console.error('❌ Failed to transfer funds:', error.message);
            throw error;
        }
    }

    // Get transaction history
    async getTransactions() {
        console.log('\n📋 Getting transaction history...');
        try {
            const response = await this.makeRequest('GET', `/v1/user/${this.walletId}/transactions`);
            console.log('📊 Transactions:', JSON.stringify(response, null, 2));
            return response;
        } catch (error) {
            console.error('❌ Failed to get transactions:', error.message);
            throw error;
        }
    }
}

// Main test function
async function runRapydTest() {
    console.log('🚀 Starting Rapyd API Test with Proxy Support');
    console.log('=' .repeat(50));
    
    const client = new RapydProxyClient();
    
    try {
        // Step 1: Find working proxies
        await client.findWorkingProxies();
        
        if (client.workingProxies.length === 0) {
            console.error('❌ No working proxies found. Exiting...');
            return;
        }

        // Step 2: Get wallet details
        const wallet = await client.getWallet();
        
        // Step 3: Create a payment
        const payment = await client.createPayment(10, 'USD');
        
        // Step 4: Add funds to wallet (if needed)
        const deposit = await client.addFundsToWallet(50, 'USD');
        
        // Step 5: Get transaction history
        const transactions = await client.getTransactions();
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('=' .repeat(50));
        
        return {
            wallet,
            payment,
            deposit,
            transactions
        };
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    runRapydTest()
        .then((results) => {
            console.log('\n✅ Test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { RapydProxyClient, runRapydTest };
