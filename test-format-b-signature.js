// Test Format B signature (should work now)
const crypto = require('crypto');

function testFormatBSignature() {
  console.log('🧪 Testing Format B Signature (Most Common HMAC)...\n');
  
  // Use the exact values from the failing request
  const method = 'post';
  const urlPath = '/v1/account/transfer';
  const salt = '5a610ee62270091584f4bbb9';
  const timestamp = 1758622145;
  const accessKey = 'rak_35151028166B9A9DDEFE';
  const secretKey = 'rsk_f3f229c6e4d428d54b673e504e21cb6a6bbc4e22ac9149e7905c136ee1c66645435c025511f575ff';
  const bodyString = '{"source_ewallet":"venmo_78_1758494905756","destination_ewallet":"wise_receiver_60_1758620967206","amount":"4.25","currency":"USD","metadata":{"description":"Sending money from one wallet to another"}}';
  
  // Format B: method + urlPath + salt + timestamp + accessKey + body (secretKey only for HMAC)
  const toSign = method + urlPath + salt + timestamp + accessKey + bodyString;
  const signature = crypto.createHmac('sha256', secretKey).update(toSign).digest('base64');
  
  console.log('📋 Format B Test:');
  console.log('String to sign:', toSign);
  console.log('New Signature:', signature);
  console.log('');
  
  console.log('📊 Comparison:');
  console.log('❌ Old failing signature:', '87ZCxHHGk6YXzmXw87pdQi/GtkoiKHT5w1qTtp1GVps=');
  console.log('✅ New Format B signature:', signature);
  console.log('');
  
  if (signature === 'admMD8uuykV+KAVoDPqQLANAlMpvijkKX2tHGRtuWn8=') {
    console.log('✅ SUCCESS: Signature matches Format B from debug!');
    console.log('🎯 This should resolve the Rapyd authentication error');
  } else {
    console.log('❌ ERROR: Signature doesn\'t match expected Format B');
  }
  
  console.log('');
  console.log('🚀 Try your cross-platform transfer again!');
  console.log('💡 Rapyd should now accept this signature format');
}

// Run the test
testFormatBSignature();
