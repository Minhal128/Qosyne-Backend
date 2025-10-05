const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// Simple Rapyd signature test without proxy
class SimpleRapydTest {
    constructor() {
        this.accessKey = process.env.RAPYD_ACCESS_KEY;
        this.secretKey = process.env.RAPYD_SECRET_KEY;
        this.walletId = process.env.RAPYD_WALLET_ID;
        this.baseUrl = process.env.RAPYD_BASE_URL;
    }

    generateSignature(method, path, body = '', timestamp, salt) {
        let bodyString = '';
        if (body && typeof body === 'object') {
            bodyString = JSON.stringify(body);
            bodyString = bodyString.replace(/\s/g, '');
        } else if (body) {
            bodyString = String(body).replace(/\s/g, '');
        }
        
        const toSign = `${method}${path}${salt}${timestamp}${this.accessKey}${this.secretKey}${bodyString}`;
        
        console.log('🔐 Signature Components:');
        console.log('Method:', method);
        console.log('Path:', path);
        console.log('Salt:', salt);
        console.log('Timestamp:', timestamp);
        console.log('Access Key:', this.accessKey);
        console.log('Secret Key:', this.secretKey ? '***HIDDEN***' : 'MISSING');
        console.log('Body:', bodyString);
        console.log('String to sign:', toSign);
        
        const signature = crypto
            .createHmac('sha256', this.secretKey)
            .update(toSign)
            .digest('hex');
        
        const base64Signature = Buffer.from(signature, 'hex').toString('base64');
        
        console.log('Generated signature:', base64Signature);
        return base64Signature;
    }

    async testRequest() {
        const timestamp = Math.floor(Date.now() / 1000);
        const salt = crypto.randomBytes(8).toString('hex');
        const path = `/v1/user/${this.walletId}`;
        
        const signature = this.generateSignature('GET', path, '', timestamp, salt);
        
        const headers = {
            'Content-Type': 'application/json',
            'access_key': this.accessKey,
            'signature': signature,
            'salt': salt,
            'timestamp': timestamp.toString()
        };

        console.log('\n📡 Request headers:');
        console.log(headers);

        try {
            const response = await axios.get(`${this.baseUrl}${path}`, { 
                headers,
                timeout: 10000
            });
            console.log('\n✅ Success!');
            console.log(JSON.stringify(response.data, null, 2));
            return response.data;
        } catch (error) {
            console.error('\n❌ Request failed:');
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Response:', JSON.stringify(error.response.data, null, 2));
            } else {
                console.error('Error:', error.message);
            }
            throw error;
        }
    }
}

// Run test
async function runTest() {
    console.log('🧪 Testing Rapyd signature generation...\n');
    
    const test = new SimpleRapydTest();
    
    if (!test.accessKey || !test.secretKey || !test.walletId) {
        console.error('❌ Missing Rapyd credentials in .env file');
        return;
    }
    
    try {
        await test.testRequest();
        console.log('\n🎉 Signature test passed!');
    } catch (error) {
        console.error('\n💥 Test failed');
    }
}

runTest();
