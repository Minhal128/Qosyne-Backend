const crypto = require('crypto');
require('dotenv').config();

class RapydSignatureDebug {
  constructor() {
    this.accessKey = process.env.RAPYD_ACCESS_KEY;
    this.secretKey = process.env.RAPYD_SECRET_KEY;
    this.walletId = process.env.RAPYD_WALLET_ID;
    this.baseUrl = process.env.RAPYD_BASE_URL;
  }

  // Method 1: Current implementation
  generateSignatureV1(method, urlPath, salt, timestamp, body = '') {
    const toSign = method + urlPath + salt + timestamp + this.accessKey + this.secretKey + body;
    const hash = crypto.createHmac('sha256', this.secretKey).update(toSign).digest('hex');
    return Buffer.from(hash, 'hex').toString('base64');
  }

  // Method 2: Try without encoding hex to base64 first
  generateSignatureV2(method, urlPath, salt, timestamp, body = '') {
    const toSign = method + urlPath + salt + timestamp + this.accessKey + this.secretKey + body;
    return crypto.createHmac('sha256', this.secretKey).update(toSign).digest('base64');
  }

  // Method 3: Following another signature pattern
  generateSignatureV3(method, urlPath, salt, timestamp, body = '') {
    const stringToSign = method + urlPath + salt + timestamp + this.accessKey + this.secretKey + body;
    return crypto.createHmac('sha256', this.secretKey).update(stringToSign, 'utf8').digest('base64');
  }

  // Method 4: With URL encoding
  generateSignatureV4(method, urlPath, salt, timestamp, body = '') {
    const encodedPath = encodeURIComponent(urlPath);
    const toSign = method + encodedPath + salt + timestamp + this.accessKey + this.secretKey + body;
    return crypto.createHmac('sha256', this.secretKey).update(toSign).digest('base64');
  }

  testSignatures() {
    console.log('🔍 RAPYD SIGNATURE DEBUG TEST');
    console.log('==============================');
    console.log('Access Key:', this.accessKey);
    console.log('Secret Key:', this.secretKey?.substring(0, 20) + '...');
    console.log('Wallet ID:', this.walletId);
    console.log('Base URL:', this.baseUrl);
    console.log('');

    const method = 'GET';
    const urlPath = `/v1/user/${this.walletId}`;
    const salt = crypto.randomBytes(8).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = '';

    console.log('Test Parameters:');
    console.log('- Method:', method);
    console.log('- URL Path:', urlPath);
    console.log('- Salt:', salt);
    console.log('- Timestamp:', timestamp);
    console.log('- Body:', body || '[empty]');
    console.log('');

    const sig1 = this.generateSignatureV1(method, urlPath, salt, timestamp, body);
    const sig2 = this.generateSignatureV2(method, urlPath, salt, timestamp, body);
    const sig3 = this.generateSignatureV3(method, urlPath, salt, timestamp, body);
    const sig4 = this.generateSignatureV4(method, urlPath, salt, timestamp, body);

    console.log('Generated Signatures:');
    console.log('V1 (hex->base64):', sig1);
    console.log('V2 (direct base64):', sig2);
    console.log('V3 (utf8 encoding):', sig3);
    console.log('V4 (url encoded):', sig4);
    console.log('');

    // Show the string that's being signed
    const stringToSign = method + urlPath + salt + timestamp + this.accessKey + this.secretKey + body;
    console.log('String to sign length:', stringToSign.length);
    console.log('String to sign (first 100 chars):', stringToSign.substring(0, 100) + '...');
    
    return {
      method, urlPath, salt, timestamp, body,
      signatures: { v1: sig1, v2: sig2, v3: sig3, v4: sig4 }
    };
  }
}

const tester = new RapydSignatureDebug();
tester.testSignatures();
