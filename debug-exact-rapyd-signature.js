// Debug the exact Rapyd signature that's failing
const crypto = require('crypto');

function debugExactRapydSignature() {
  console.log('🔍 Debugging Exact Rapyd Signature Failure...\n');
  
  // Use the exact values from the failing request
  const method = 'post';
  const urlPath = '/v1/account/transfer';
  const salt = '8fc273fe0f5471294d651e20';
  const timestamp = 1758621562;
  const accessKey = 'rak_35151028166B9A9DDEFE';
  const secretKey = 'rsk_f3f229c6e4d428d54b673e504e21cb6a6bbc4e22ac9149e7905c136ee1c66645435c025511f575ff';
  const bodyString = '{"source_ewallet":"venmo_78_1758494905756","destination_ewallet":"wise_receiver_60_1758620967206","amount":"4.25","currency":"USD","metadata":{"description":"Sending money from one wallet to another"}}';
  
  console.log('📋 Exact Values from Failed Request:');
  console.log('Method:', method);
  console.log('URL Path:', urlPath);
  console.log('Salt:', salt);
  console.log('Timestamp:', timestamp);
  console.log('Access Key:', accessKey);
  console.log('Body String:', bodyString);
  console.log('');
  
  // Test different signature formats
  console.log('🧪 Testing Different Signature Formats:');
  console.log('');
  
  // Format 1: Current implementation (concatenated)
  console.log('1. Current Implementation (concatenated):');
  const toSign1 = method + urlPath + salt + timestamp + accessKey + bodyString;
  const signature1 = crypto.createHmac('sha256', secretKey).update(toSign1).digest('base64');
  console.log('String to sign:', toSign1);
  console.log('Signature:', signature1);
  console.log('');
  
  // Format 2: With newlines (original Rapyd docs)
  console.log('2. With Newlines (Original Rapyd Docs):');
  const toSign2 = `${method}\n${urlPath}\n${salt}\n${timestamp}\n${accessKey}\n${bodyString}`;
  const signature2 = crypto.createHmac('sha256', secretKey).update(toSign2).digest('base64');
  console.log('String to sign:', toSign2.replace(/\n/g, '\\n'));
  console.log('Signature:', signature2);
  console.log('');
  
  // Format 3: Include secretKey in string-to-sign
  console.log('3. Include SecretKey in String-to-Sign:');
  const toSign3 = method + urlPath + salt + timestamp + accessKey + secretKey + bodyString;
  const signature3 = crypto.createHmac('sha256', secretKey).update(toSign3).digest('base64');
  console.log('String to sign:', toSign3);
  console.log('Signature:', signature3);
  console.log('');
  
  // Format 4: With newlines AND secretKey
  console.log('4. With Newlines AND SecretKey:');
  const toSign4 = `${method}\n${urlPath}\n${salt}\n${timestamp}\n${accessKey}\n${secretKey}\n${bodyString}`;
  const signature4 = crypto.createHmac('sha256', secretKey).update(toSign4).digest('base64');
  console.log('String to sign:', toSign4.replace(/\n/g, '\\n'));
  console.log('Signature:', signature4);
  console.log('');
  
  // Format 5: Hex instead of base64
  console.log('5. Hex Digest Instead of Base64:');
  const toSign5 = method + urlPath + salt + timestamp + accessKey + secretKey + bodyString;
  const signature5 = crypto.createHmac('sha256', secretKey).update(toSign5).digest('hex');
  console.log('String to sign:', toSign5);
  console.log('Signature:', signature5);
  console.log('');
  
  console.log('💡 Try each of these signature formats to see which one Rapyd accepts');
  console.log('🎯 The failing signature was: tspg7k5ZPQJbUeDWYVpS36tyijfmdtC9nEMawsnD/N0=');
  console.log('📋 Compare with the generated signatures above');
}

// Run the debug
debugExactRapydSignature();
