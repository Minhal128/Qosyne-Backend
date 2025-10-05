const crypto = require('crypto');
require('dotenv').config();

function generateRapydSignature(httpMethod, urlPath, salt, timestamp, accessKey, secretKey, body = '') {
    console.log('=== Signature Generation Debug ===');
    console.log('httpMethod:', httpMethod);
    console.log('urlPath:', urlPath);
    console.log('salt:', salt);
    console.log('timestamp:', timestamp);
    console.log('accessKey:', accessKey);
    console.log('secretKey length:', secretKey ? secretKey.length : 'MISSING');
    console.log('body:', body);
    
    const toSign = httpMethod + urlPath + salt + timestamp + accessKey + secretKey + body;
    console.log('toSign:', toSign);
    
    const signature = crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
    console.log('hex signature:', signature);
    
    const base64 = Buffer.from(signature, 'hex').toString('base64');
    console.log('base64 signature:', base64);
    
    return base64;
}

// Test with your credentials
const accessKey = process.env.RAPYD_ACCESS_KEY;
const secretKey = process.env.RAPYD_SECRET_KEY;
const walletId = process.env.RAPYD_WALLET_ID;

const method = 'GET';
const path = `/v1/user/${walletId}`;
const timestamp = Math.floor(Date.now() / 1000);
const salt = 'abcd1234abcd1234'; // Fixed salt for testing

const signature = generateRapydSignature(method, path, salt, timestamp, accessKey, secretKey, '');

console.log('\n=== Final Headers ===');
console.log({
    'Content-Type': 'application/json',
    'access_key': accessKey,
    'salt': salt,
    'timestamp': timestamp.toString(),
    'signature': signature
});

// Test making request without proxy first
const axios = require('axios');

async function testDirectRequest() {
    try {
        const response = await axios.get(`${process.env.RAPYD_BASE_URL}${path}`, {
            headers: {
                'Content-Type': 'application/json',
                'access_key': accessKey,
                'salt': salt,
                'timestamp': timestamp.toString(),
                'signature': signature
            },
            timeout: 10000
        });
        console.log('\n✅ Direct request successful!');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('\n❌ Direct request failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            if (error.response.status === 403) {
                console.log('🌍 IP blocked - need proxy!');
            }
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
    }
}

testDirectRequest();
