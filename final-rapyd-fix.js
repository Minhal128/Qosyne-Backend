// FINAL Rapyd signature fix - test all possible formats
const crypto = require('crypto');

function finalRapydFix() {
  console.log('🔧 FINAL RAPYD SIGNATURE FIX...\n');
  
  // Exact values from the failing request
  const method = 'post';
  const urlPath = '/v1/account/transfer';
  const salt = '5a610ee62270091584f4bbb9';
  const timestamp = 1758622145;
  const accessKey = 'rak_35151028166B9A9DDEFE';
  const secretKey = 'rsk_f3f229c6e4d428d54b673e504e21cb6a6bbc4e22ac9149e7905c136ee1c66645435c025511f575ff';
  const bodyString = '{"source_ewallet":"venmo_78_1758494905756","destination_ewallet":"wise_receiver_60_1758620967206","amount":"4.25","currency":"USD","metadata":{"description":"Sending money from one wallet to another"}}';
  
  console.log('❌ Current failing signature: 87ZCxHHGk6YXzmXw87pdQi/GtkoiKHT5w1qTtp1GVps=');
  console.log('');
  
  // Let me try the EXACT Rapyd documentation format
  console.log('🧪 Testing EXACT Rapyd Documentation Formats:');
  console.log('');
  
  // Format A: Rapyd docs - HTTP method + URL path + salt + timestamp + access_key + secret_key + body
  console.log('Format A: method + urlPath + salt + timestamp + accessKey + secretKey + body');
  const toSignA = method + urlPath + salt + timestamp + accessKey + secretKey + bodyString;
  const signatureA = crypto.createHmac('sha256', secretKey).update(toSignA).digest('base64');
  console.log('Signature A:', signatureA);
  console.log('');
  
  // Format B: Without secretKey in string-to-sign (secretKey only for HMAC)
  console.log('Format B: method + urlPath + salt + timestamp + accessKey + body (secretKey only for HMAC)');
  const toSignB = method + urlPath + salt + timestamp + accessKey + bodyString;
  const signatureB = crypto.createHmac('sha256', secretKey).update(toSignB).digest('base64');
  console.log('Signature B:', signatureB);
  console.log('');
  
  // Format C: With empty body
  console.log('Format C: method + urlPath + salt + timestamp + accessKey + secretKey + "" (empty body)');
  const toSignC = method + urlPath + salt + timestamp + accessKey + secretKey + '';
  const signatureC = crypto.createHmac('sha256', secretKey).update(toSignC).digest('base64');
  console.log('Signature C:', signatureC);
  console.log('');
  
  // Format D: Uppercase method
  console.log('Format D: POST (uppercase) + urlPath + salt + timestamp + accessKey + secretKey + body');
  const toSignD = 'POST' + urlPath + salt + timestamp + accessKey + secretKey + bodyString;
  const signatureD = crypto.createHmac('sha256', secretKey).update(toSignD).digest('base64');
  console.log('Signature D:', signatureD);
  console.log('');
  
  // Format E: Try with different body formatting
  console.log('Format E: Compact JSON body (no spaces)');
  const compactBody = JSON.stringify(JSON.parse(bodyString));
  const toSignE = method + urlPath + salt + timestamp + accessKey + secretKey + compactBody;
  const signatureE = crypto.createHmac('sha256', secretKey).update(toSignE).digest('base64');
  console.log('Compact body:', compactBody);
  console.log('Signature E:', signatureE);
  console.log('');
  
  console.log('🎯 RECOMMENDATION:');
  console.log('Try Format B first (without secretKey in string-to-sign)');
  console.log('This is the most common format for HMAC authentication');
  console.log('');
  console.log('💡 If none work, the issue might be:');
  console.log('1. Rapyd credentials are invalid');
  console.log('2. Rapyd sandbox is down');
  console.log('3. IP/geographical restrictions');
  console.log('4. Different API version requirements');
}

// Run the final fix
finalRapydFix();
