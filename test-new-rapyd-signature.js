// Test the new Rapyd signature format
const crypto = require('crypto');

function testNewRapydSignature() {
  console.log('🧪 Testing New Rapyd Signature Format (Format 4)...\n');
  
  // Use the exact values from the failing request
  const method = 'post';
  const urlPath = '/v1/account/transfer';
  const salt = '8fc273fe0f5471294d651e20';
  const timestamp = 1758621562;
  const accessKey = 'rak_35151028166B9A9DDEFE';
  const secretKey = 'rsk_f3f229c6e4d428d54b673e504e21cb6a6bbc4e22ac9149e7905c136ee1c66645435c025511f575ff';
  const bodyString = '{"source_ewallet":"venmo_78_1758494905756","destination_ewallet":"wise_receiver_60_1758620967206","amount":"4.25","currency":"USD","metadata":{"description":"Sending money from one wallet to another"}}';
  
  // New format: With newlines AND secretKey
  const toSign = `${method}\n${urlPath}\n${salt}\n${timestamp}\n${accessKey}\n${secretKey}\n${bodyString}`;
  const signature = crypto.createHmac('sha256', secretKey).update(toSign).digest('base64');
  
  console.log('📋 New Signature Format (Format 4):');
  console.log('String to sign (with \\n):', toSign.replace(/\n/g, '\\n'));
  console.log('New Signature:', signature);
  console.log('');
  
  console.log('📊 Comparison:');
  console.log('❌ Old Signature (failing):', 'tspg7k5ZPQJbUeDWYVpS36tyijfmdtC9nEMawsnD/N0=');
  console.log('✅ New Signature (should work):', signature);
  console.log('');
  
  if (signature === 'I7vIzRWz3Diwg4gg9PRPfoGSKSRzoTPEMfRW0uU5L2A=') {
    console.log('✅ SUCCESS: New signature matches Format 4 from debug!');
  } else {
    console.log('❌ ERROR: Signature doesn\'t match expected Format 4');
  }
  
  console.log('');
  console.log('🚀 This new format should resolve the Rapyd authentication error');
  console.log('💡 Deploy this fix and try the transfer again');
}

// Run the test
testNewRapydSignature();
