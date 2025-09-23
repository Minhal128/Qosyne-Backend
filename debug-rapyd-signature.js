// Debug script to analyze Rapyd signature generation in detail
const crypto = require('node:crypto');

class RapydSignatureDebugger {
  constructor() {
    this.accessKey = 'rak_35151028166B9A9DDEFE';
    this.secretKey = 'rsk_f3f229c6e4d428d54b673e504e21cb6a6bbc4e22ac9149e7905c136ee1c66645435c025511f575ff';
  }

  /**
   * Test different signature generation methods
   */
  testSignatureGeneration() {
    console.log('🔍 Testing Rapyd Signature Generation Methods...\n');
    
    const method = 'POST';
    const urlPath = '/v1/account/transfer';
    const timestamp = Math.floor(Date.now() / 1000);
    const salt = crypto.randomBytes(12).toString('hex');
    
    const testData = {
      source_ewallet: 'ewallet_f87eb431d13',
      destination_ewallet: 'ewallet_d38b1ddd1dd',
      amount: '127.25',
      currency: 'USD',
      metadata: {
        description: 'Sending money from one wallet to another',
        transfer_type: 'wallet_to_wallet',
        timestamp: '2025-09-23T08:19:53.117Z'
      }
    };
    
    console.log('📋 Test Data:');
    console.log('Method:', method);
    console.log('URL Path:', urlPath);
    console.log('Timestamp:', timestamp);
    console.log('Salt:', salt);
    console.log('Test Data:', JSON.stringify(testData, null, 2));
    console.log('');
    
    // Method 1: Current implementation (with fixes)
    console.log('🔧 Method 1: Current Implementation');
    console.log('-'.repeat(40));
    const bodyString1 = JSON.stringify(testData, (key, value) => {
      if (typeof value === 'number') {
        return value.toString();
      }
      return value;
    }).replace(/\s/g, '');
    
    const toSign1 = method.toLowerCase() + urlPath + salt + timestamp + this.accessKey + this.secretKey + bodyString1;
    const signature1 = crypto.createHmac('sha256', this.secretKey).update(toSign1).digest('hex');
    
    console.log('Body String:', bodyString1);
    console.log('String to Sign Length:', toSign1.length);
    console.log('Signature:', signature1);
    console.log('');
    
    // Method 2: Rapyd documentation example
    console.log('🔧 Method 2: Rapyd Documentation Style');
    console.log('-'.repeat(40));
    const bodyString2 = JSON.stringify(testData);
    const toSign2 = method.toLowerCase() + urlPath + salt + timestamp + this.accessKey + this.secretKey + bodyString2;
    const signature2 = crypto.createHmac('sha256', this.secretKey).update(toSign2).digest('hex');
    
    console.log('Body String:', bodyString2);
    console.log('String to Sign Length:', toSign2.length);
    console.log('Signature:', signature2);
    console.log('');
    
    // Method 3: Minimal body (no metadata)
    console.log('🔧 Method 3: Minimal Body');
    console.log('-'.repeat(40));
    const minimalData = {
      source_ewallet: 'ewallet_f87eb431d13',
      destination_ewallet: 'ewallet_d38b1ddd1dd',
      amount: '127.25',
      currency: 'USD'
    };
    
    const bodyString3 = JSON.stringify(minimalData);
    const toSign3 = method.toLowerCase() + urlPath + salt + timestamp + this.accessKey + this.secretKey + bodyString3;
    const signature3 = crypto.createHmac('sha256', this.secretKey).update(toSign3).digest('hex');
    
    console.log('Body String:', bodyString3);
    console.log('String to Sign Length:', toSign3.length);
    console.log('Signature:', signature3);
    console.log('');
    
    // Method 4: String amounts
    console.log('🔧 Method 4: All String Values');
    console.log('-'.repeat(40));
    const stringData = {
      source_ewallet: 'ewallet_f87eb431d13',
      destination_ewallet: 'ewallet_d38b1ddd1dd',
      amount: '127.25',
      currency: 'USD',
      metadata: {
        description: 'Sending money from one wallet to another',
        transfer_type: 'wallet_to_wallet',
        timestamp: '2025-09-23T08:19:53.117Z'
      }
    };
    
    const bodyString4 = JSON.stringify(stringData).replace(/\s+/g, '');
    const toSign4 = method.toLowerCase() + urlPath + salt + timestamp + this.accessKey + this.secretKey + bodyString4;
    const signature4 = crypto.createHmac('sha256', this.secretKey).update(toSign4).digest('hex');
    
    console.log('Body String:', bodyString4);
    console.log('String to Sign Length:', toSign4.length);
    console.log('Signature:', signature4);
    console.log('');
    
    // Method 5: Exact Rapyd format (sorted keys)
    console.log('🔧 Method 5: Sorted Keys');
    console.log('-'.repeat(40));
    const sortedData = {
      amount: '127.25',
      currency: 'USD',
      destination_ewallet: 'ewallet_d38b1ddd1dd',
      metadata: {
        description: 'Sending money from one wallet to another',
        timestamp: '2025-09-23T08:19:53.117Z',
        transfer_type: 'wallet_to_wallet'
      },
      source_ewallet: 'ewallet_f87eb431d13'
    };
    
    const bodyString5 = JSON.stringify(sortedData, Object.keys(sortedData).sort());
    const toSign5 = method.toLowerCase() + urlPath + salt + timestamp + this.accessKey + this.secretKey + bodyString5;
    const signature5 = crypto.createHmac('sha256', this.secretKey).update(toSign5).digest('hex');
    
    console.log('Body String:', bodyString5);
    console.log('String to Sign Length:', toSign5.length);
    console.log('Signature:', signature5);
    console.log('');
    
    console.log('🏁 Signature Generation Test Complete!');
    console.log('Try each method to see which one works with Rapyd API');
  }
}

// Run the debug test
const signatureDebugger = new RapydSignatureDebugger();
signatureDebugger.testSignatureGeneration();
