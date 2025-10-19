const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('=== Apple Pay Configuration Verification ===');

// Check environment variables
console.log('\n1. Environment Variables:');
console.log('APPLE_PAY_MERCHANT_ID:', process.env.APPLE_PAY_MERCHANT_ID);
console.log('APPLE_PAY_MERCHANT_DOMAIN:', process.env.APPLE_PAY_MERCHANT_DOMAIN);
console.log('APPLE_PAY_ENVIRONMENT:', process.env.APPLE_PAY_ENVIRONMENT);

// Check certificate files
console.log('\n2. Certificate Files:');

const APPLE_PAY_CERTIFICATE_PATH = path.join(__dirname, '..', '..', 'apple_pay.csr');
const APPLE_PAY_PRIVATE_KEY_PATH = path.join(__dirname, '..', '..', 'apple_pay.key');

console.log('Certificate Path:', APPLE_PAY_CERTIFICATE_PATH);
console.log('Certificate Exists:', fs.existsSync(APPLE_PAY_CERTIFICATE_PATH));

console.log('Private Key Path:', APPLE_PAY_PRIVATE_KEY_PATH);
console.log('Private Key Exists:', fs.existsSync(APPLE_PAY_PRIVATE_KEY_PATH));

if (fs.existsSync(APPLE_PAY_CERTIFICATE_PATH)) {
    try {
        const cert = fs.readFileSync(APPLE_PAY_CERTIFICATE_PATH, 'utf8');
        console.log('Certificate Content Preview:', cert.substring(0, 100) + '...');
    } catch (error) {
        console.log('Error reading certificate:', error.message);
    }
}

if (fs.existsSync(APPLE_PAY_PRIVATE_KEY_PATH)) {
    try {
        const key = fs.readFileSync(APPLE_PAY_PRIVATE_KEY_PATH, 'utf8');
        console.log('Private Key Content Preview:', key.substring(0, 100) + '...');
    } catch (error) {
        console.log('Error reading private key:', error.message);
    }
}

console.log('\n3. Configuration Summary:');
const hasValidConfig = (
    process.env.APPLE_PAY_MERCHANT_ID === 'Merchant.com.qosyne' &&
    process.env.APPLE_PAY_MERCHANT_DOMAIN &&
    fs.existsSync(APPLE_PAY_CERTIFICATE_PATH) &&
    fs.existsSync(APPLE_PAY_PRIVATE_KEY_PATH)
);

console.log('Configuration Valid:', hasValidConfig);

if (!hasValidConfig) {
    console.log('\n❌ Issues found:');
    if (process.env.APPLE_PAY_MERCHANT_ID !== 'Merchant.com.qosyne') {
        console.log('- APPLE_PAY_MERCHANT_ID should be "Merchant.com.qosyne"');
    }
    if (!process.env.APPLE_PAY_MERCHANT_DOMAIN) {
        console.log('- APPLE_PAY_MERCHANT_DOMAIN is not set');
    }
    if (!fs.existsSync(APPLE_PAY_CERTIFICATE_PATH)) {
        console.log('- Apple Pay certificate file not found');
    }
    if (!fs.existsSync(APPLE_PAY_PRIVATE_KEY_PATH)) {
        console.log('- Apple Pay private key file not found');
    }
} else {
    console.log('✅ All configuration checks passed!');
}

console.log('\n=== End Verification ===');