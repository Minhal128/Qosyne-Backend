const axios = require('axios');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

const WORKING_PROXIES = [
    'http://140.174.52.105:8888',
    'http://162.238.123.152:8888',
    'http://34.94.98.68:8080',
    'http://159.65.221.25:80'
];

class RapydProxyClient {
    constructor() {
        this.accessKey = process.env.RAPYD_ACCESS_KEY;
        this.secretKey = process.env.RAPYD_SECRET_KEY;
        this.walletId = process.env.RAPYD_WALLET_ID;
        this.baseUrl = process.env.RAPYD_BASE_URL;
    }

    // Generate signature exactly as per Rapyd API documentation
    generateRapydSignature(httpMethod, urlPath, salt, timestamp, body = '') {
        // Prepare body string - must be exactly as sent in the request
        let bodyString = '';
        if (body) {
            if (typeof body === 'object') {
                bodyString = JSON.stringify(body);
                // Remove whitespace but preserve strings
                bodyString = bodyString.replace(/(?<!:\\s*\"[^\"]*?)\\s+(?![^\"]*?\"\\s*[,}])/g, '');
            } else {
                bodyString = body.toString();
            }
        }

        // Create the signature string as per Rapyd format
        const stringToSign = httpMethod + urlPath + salt + timestamp + this.accessKey + this.secretKey + bodyString;

        console.log('Debug signature generation:');
        console.log('httpMethod:', httpMethod);
        console.log('urlPath:', urlPath);
        console.log('salt:', salt);
        console.log('timestamp:', timestamp);
        console.log('accessKey:', this.accessKey);
        console.log('bodyString:', bodyString);
        console.log('stringToSign:', stringToSign.substring(0, 100) + '...');

        // Create HMAC SHA256 and return as base64
        const signature = crypto
            .createHmac('sha256', this.secretKey)
            .update(stringToSign)
            .digest('hex');

        const base64Signature = Buffer.from(signature, 'hex').toString('base64');
        console.log('Final signature:', base64Signature);

        return base64Signature;
    }

    // Test a proxy
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

    // Find working proxy
    async findWorkingProxy() {
        console.log('🔍 Testing proxies...');
        for (const proxy of WORKING_PROXIES) {
            const isWorking = await this.testProxy(proxy);
            if (isWorking) {
                console.log(`✅ Using proxy: ${proxy}`);
                return proxy;
            }
            console.log(`❌ Proxy failed: ${proxy}`);
        }
        throw new Error('No working proxies found');
    }

    // Make API request
    async makeApiRequest(method, endpoint, body = null) {
        const proxy = await this.findWorkingProxy();
        
        const timestamp = Math.floor(Date.now() / 1000);
        const salt = crypto.randomBytes(8).toString('hex');
        const signature = this.generateRapydSignature(method, endpoint, salt, timestamp, body);

        const headers = {
            'Content-Type': 'application/json',
            'access_key': this.accessKey,
            'salt': salt,
            'timestamp': timestamp.toString(),
            'signature': signature
        };

        const agent = new HttpsProxyAgent(proxy);
        const config = {
            method,
            url: `${this.baseUrl}${endpoint}`,
            headers,
            httpsAgent: agent,
            timeout: 20000
        };

        if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            config.data = body;
        }

        console.log(`🌐 Making ${method} request to ${endpoint}`);
        console.log('Headers:', JSON.stringify(headers, null, 2));

        try {
            const response = await axios(config);
            console.log('✅ Request successful');
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

    // Get wallet details
    async getWalletDetails() {
        console.log('\\n💰 Getting wallet details...');
        const result = await this.makeApiRequest('GET', `/v1/user/${this.walletId}`);
        console.log('Wallet ID:', result.data?.id);
        console.log('Wallet Balance:', result.data?.accounts);
        return result;
    }

    // Create a payment
    async createTestPayment(amount = 10, currency = 'USD') {
        console.log(`\\n💳 Creating test payment: ${amount} ${currency}`);
        
        const paymentData = {
            amount,
            currency,
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
            description: 'Test payment through proxy'
        };

        const result = await this.makeApiRequest('POST', '/v1/payments', paymentData);
        console.log('Payment ID:', result.data?.id);
        console.log('Payment Status:', result.data?.status);
        return result;
    }

    // Add funds to wallet
    async addFundsToWallet(amount = 50, currency = 'USD') {
        console.log(`\\n💰 Adding ${amount} ${currency} to wallet...`);
        
        const fundData = {
            amount,
            currency,
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

        const result = await this.makeApiRequest('POST', `/v1/user/${this.walletId}/transactions/deposit`, fundData);
        console.log('Deposit ID:', result.data?.id);
        console.log('Deposit Status:', result.data?.status);
        return result;
    }

    // Get transaction history
    async getTransactionHistory() {
        console.log('\\n📋 Getting transaction history...');
        const result = await this.makeApiRequest('GET', `/v1/user/${this.walletId}/transactions`);
        console.log('Number of transactions:', result.data?.length || 0);
        return result;
    }
}

// Main execution function
async function main() {
    console.log('🚀 Starting Rapyd API Integration with Proxy Support');
    console.log('=' .repeat(60));

    const client = new RapydProxyClient();

    // Validate environment variables
    if (!client.accessKey || !client.secretKey || !client.walletId) {
        console.error('❌ Missing Rapyd environment variables!');
        console.error('Required: RAPYD_ACCESS_KEY, RAPYD_SECRET_KEY, RAPYD_WALLET_ID');
        process.exit(1);
    }

    try {
        // Test 1: Get wallet info
        const walletInfo = await client.getWalletDetails();
        
        // Test 2: Create a payment
        const payment = await client.createTestPayment(15, 'USD');
        
        // Test 3: Add funds to wallet 
        const deposit = await client.addFundsToWallet(100, 'USD');
        
        // Test 4: Get transaction history
        const transactions = await client.getTransactionHistory();

        console.log('\\n🎉 All operations completed successfully!');
        console.log('Summary:');
        console.log('- Wallet accessed:', !!walletInfo.data);
        console.log('- Payment created:', !!payment.data);
        console.log('- Funds deposited:', !!deposit.data);
        console.log('- Transactions retrieved:', !!transactions.data);

        return {
            wallet: walletInfo,
            payment,
            deposit,
            transactions
        };

    } catch (error) {
        console.error('\\n💥 Operation failed:', error.message);
        throw error;
    }
}

// Run the script
if (require.main === module) {
    main()
        .then(() => {
            console.log('\\n✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\\n❌ Script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { RapydProxyClient, main };
