const axios = require('axios');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

const PROXIES = [
    'http://140.174.52.105:8888',
    'http://162.238.123.152:8888', 
    'http://34.94.98.68:8080',
    'http://159.65.221.25:80'
];

class RapydClient {
    constructor() {
        this.accessKey = process.env.RAPYD_ACCESS_KEY;
        this.secretKey = process.env.RAPYD_SECRET_KEY;  
        this.walletId = process.env.RAPYD_WALLET_ID;
        this.baseUrl = process.env.RAPYD_BASE_URL;
    }

    // Generate signature exactly as Rapyd expects
    createSignature(method, path, salt, timestamp, body = '') {
        const toSign = method + path + salt + timestamp + this.accessKey + this.secretKey + body;
        const signature = crypto.createHmac('sha256', this.secretKey).update(toSign, 'utf8').digest('hex');
        return Buffer.from(signature, 'hex').toString('base64');
    }

    // Test proxy with external service
    async testProxy(proxy) {
        try {
            const agent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://httpbin.org/ip', {
                httpsAgent: agent,
                timeout: 5000
            });
            return { working: true, ip: response.data.origin };
        } catch (error) {
            return { working: false, error: error.message };
        }
    }

    // Make request with proper proxy setup
    async makeRequest(method, endpoint, data = null) {
        console.log(`\\n🔄 Making ${method} request to ${endpoint}`);
        
        // Test all proxies and find working ones
        console.log('🔍 Testing proxy connectivity...');
        let workingProxy = null;
        
        for (const proxy of PROXIES) {
            const test = await this.testProxy(proxy);
            if (test.working) {
                console.log(`✅ Proxy ${proxy} is working (IP: ${test.ip})`);
                workingProxy = proxy;
                break;
            } else {
                console.log(`❌ Proxy ${proxy} failed: ${test.error}`);
            }
        }

        if (!workingProxy) {
            throw new Error('No working proxies found');
        }

        // Prepare request
        const timestamp = Math.floor(Date.now() / 1000);
        const salt = crypto.randomBytes(12).toString('hex');
        
        let bodyStr = '';
        if (data) {
            bodyStr = JSON.stringify(data);
            // Clean whitespace as Rapyd requires
            bodyStr = bodyStr.replace(/\\s+/g, ' ').trim();
        }

        const signature = this.createSignature(method, endpoint, salt, timestamp, bodyStr);

        const headers = {
            'Content-Type': 'application/json',
            'access_key': this.accessKey,
            'salt': salt,
            'timestamp': timestamp.toString(),
            'signature': signature,
            'User-Agent': 'Node.js/Rapyd-Client'
        };

        console.log('📋 Request details:');
        console.log('- Proxy:', workingProxy);  
        console.log('- Timestamp:', timestamp);
        console.log('- Salt:', salt);
        console.log('- Signature:', signature.substring(0, 20) + '...');

        const config = {
            method,
            url: this.baseUrl + endpoint,
            headers,
            httpsAgent: new HttpsProxyAgent(workingProxy),
            timeout: 25000,
            maxRedirects: 0
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
            config.data = data;
        }

        try {
            const response = await axios(config);
            console.log('✅ Request successful!');
            return response.data;
        } catch (error) {
            console.error('❌ Request failed:', error.message);
            
            if (error.response) {
                console.error('Status Code:', error.response.status);
                console.error('Response Headers:', error.response.headers);
                console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
                
                // If signature error, try with different body formatting
                if (error.response.status === 401 && error.response.data?.status?.error_code === 'UNAUTHENTICATED_API_CALL') {
                    console.log('\\n🔧 Signature mismatch detected, trying alternative formatting...');
                    
                    // Try with completely empty body
                    const altSignature = this.createSignature(method, endpoint, salt, timestamp, '');
                    const altHeaders = { ...headers, signature: altSignature };
                    
                    try {
                        const altResponse = await axios({ 
                            ...config, 
                            headers: altHeaders 
                        });
                        console.log('✅ Alternative formatting worked!');
                        return altResponse.data;
                    } catch (altError) {
                        console.error('❌ Alternative formatting also failed');
                    }
                }
            }
            
            throw error;
        }
    }

    // Wallet operations
    async getWalletInfo() {
        console.log('💰 Retrieving wallet information...');
        const result = await this.makeRequest('GET', `/v1/user/${this.walletId}`);
        
        if (result.data) {
            console.log('📋 Wallet Details:');
            console.log('- ID:', result.data.id);
            console.log('- Status:', result.data.status);
            console.log('- Type:', result.data.type);
            
            if (result.data.accounts) {
                console.log('- Balances:');
                result.data.accounts.forEach(account => {
                    console.log(`  ${account.currency}: ${account.balance}`);
                });
            }
        }
        
        return result;
    }

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
                    name: 'Test Customer'
                }
            },
            capture: true,
            description: `Test payment of ${amount} ${currency} via proxy`
        };

        const result = await this.makeRequest('POST', '/v1/payments', paymentData);
        
        if (result.data) {
            console.log('📋 Payment Details:');
            console.log('- Payment ID:', result.data.id);
            console.log('- Status:', result.data.status);
            console.log('- Amount:', result.data.amount, result.data.currency);
        }
        
        return result;
    }

    async addFunds(amount = 100, currency = 'USD') {
        console.log(`💰 Adding ${amount} ${currency} to wallet`);
        
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
            }
        };

        const result = await this.makeRequest('POST', `/v1/user/${this.walletId}/transactions/deposit`, depositData);
        
        if (result.data) {
            console.log('📋 Deposit Details:');
            console.log('- Transaction ID:', result.data.id);
            console.log('- Status:', result.data.status);
            console.log('- Amount:', result.data.amount, result.data.currency);
        }
        
        return result;
    }

    async getTransactions() {
        console.log('📋 Fetching transaction history...');
        const result = await this.makeRequest('GET', `/v1/user/${this.walletId}/transactions`);
        
        if (result.data) {
            console.log(`Found ${result.data.length} transactions`);
            if (result.data.length > 0) {
                console.log('Recent transactions:');
                result.data.slice(0, 5).forEach((tx, i) => {
                    console.log(`  ${i+1}. ${tx.type}: ${tx.amount} ${tx.currency} [${tx.status}]`);
                });
            }
        }
        
        return result;
    }
}

// Main execution
async function main() {
    console.log('🚀 Rapyd API Integration Test with Proxy Support');
    console.log('=' .repeat(60));
    
    const rapyd = new RapydClient();
    
    // Verify configuration
    if (!rapyd.accessKey || !rapyd.secretKey || !rapyd.walletId) {
        console.error('❌ Missing environment variables!');
        console.error('Please set RAPYD_ACCESS_KEY, RAPYD_SECRET_KEY, and RAPYD_WALLET_ID');
        return;
    }

    try {
        console.log('🔧 Configuration verified');
        console.log('- Access Key:', rapyd.accessKey.substring(0, 8) + '...');
        console.log('- Wallet ID:', rapyd.walletId);
        console.log('- Base URL:', rapyd.baseUrl);

        // Execute tests
        const walletInfo = await rapyd.getWalletInfo();
        const payment = await rapyd.createPayment(15, 'USD');
        const deposit = await rapyd.addFunds(75, 'USD');
        const transactions = await rapyd.getTransactions();

        console.log('\\n🎉 SUCCESS! All operations completed');
        console.log('\\n📊 Summary:');
        console.log('✅ Wallet information retrieved');
        console.log('✅ Payment created and processed');
        console.log('✅ Funds deposited successfully');
        console.log('✅ Transaction history fetched');
        console.log('\\n💡 Your Rapyd integration is working through proxy!');

        return { walletInfo, payment, deposit, transactions };

    } catch (error) {
        console.error('\\n💥 Error:', error.message);
        console.error('\\nPossible issues:');
        console.error('• Proxy connectivity problems');
        console.error('• Invalid Rapyd credentials');
        console.error('• API rate limiting');
        console.error('• Network restrictions');
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    main()
        .then(() => {
            console.log('\\n✅ Script completed successfully!');
            process.exit(0);
        })
        .catch(() => {
            console.log('\\n❌ Script failed!');
            process.exit(1);
        });
}

module.exports = { RapydClient, main };
