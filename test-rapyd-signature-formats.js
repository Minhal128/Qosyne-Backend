// Test different Rapyd signature formats to find the working one
const crypto = require('crypto');

const accessKey = "rak_35151028166B9A9DDEFE";
const secretKey = "rsk_f3f229c6e4d428d54b673e504e21cb6a6bbc4e22ac9149e7905c136ee1c66645435c025511f575ff";

const testData = {
  source_ewallet: "venmo_78_1758494905756",
  destination_ewallet: "wise_receiver_60_1758620967206",
  amount: "4.25",
  currency: "USD",
  metadata: {
    description: "Sending money from one wallet to another"
  }
};

const method = "post";
const urlPath = "/v1/account/transfer";
const timestamp = Math.floor(Date.now() / 1000);
const salt = crypto.randomBytes(12).toString("hex");
const bodyString = JSON.stringify(testData);

console.log('🧪 Testing Different Rapyd Signature Formats...\n');
console.log('📋 Test Data:');
console.log('  Method:', method);
console.log('  URL Path:', urlPath);
console.log('  Timestamp:', timestamp);
console.log('  Salt:', salt);
console.log('  Access Key:', accessKey);
console.log('  Body:', bodyString);
console.log('');

// Format 1: Newline-separated (current)
console.log('📋 Format 1: Newline-separated');
const stringToSign1 = [
  method.toLowerCase(),
  urlPath,
  salt,
  timestamp.toString(),
  accessKey,
  bodyString
].join('\n');

console.log('String to sign:', stringToSign1.replace(/\n/g, '\\n'));
const signature1 = crypto.createHmac("sha256", secretKey).update(stringToSign1, 'utf8').digest("base64");
console.log('Signature:', signature1);
console.log('');

// Format 2: Concatenated (no separators)
console.log('📋 Format 2: Concatenated (no separators)');
const stringToSign2 = method.toLowerCase() + urlPath + salt + timestamp + accessKey + bodyString;

console.log('String to sign:', stringToSign2);
const signature2 = crypto.createHmac("sha256", secretKey).update(stringToSign2, 'utf8').digest("base64");
console.log('Signature:', signature2);
console.log('');

// Format 3: With secret key in string (some implementations)
console.log('📋 Format 3: With secret key in string');
const stringToSign3 = [
  method.toLowerCase(),
  urlPath,
  salt,
  timestamp.toString(),
  accessKey,
  secretKey,
  bodyString
].join('\n');

console.log('String to sign:', stringToSign3.replace(/\n/g, '\\n'));
const signature3 = crypto.createHmac("sha256", secretKey).update(stringToSign3, 'utf8').digest("base64");
console.log('Signature:', signature3);
console.log('');

// Format 4: Empty body string (for comparison)
console.log('📋 Format 4: Empty body (for comparison)');
const stringToSign4 = [
  method.toLowerCase(),
  urlPath,
  salt,
  timestamp.toString(),
  accessKey,
  ""
].join('\n');

console.log('String to sign:', stringToSign4.replace(/\n/g, '\\n'));
const signature4 = crypto.createHmac("sha256", secretKey).update(stringToSign4, 'utf8').digest("base64");
console.log('Signature:', signature4);
console.log('');

// Format 5: Different encoding
console.log('📋 Format 5: Hex encoding instead of base64');
const signature5 = crypto.createHmac("sha256", secretKey).update(stringToSign1, 'utf8').digest("hex");
console.log('String to sign:', stringToSign1.replace(/\n/g, '\\n'));
console.log('Signature (hex):', signature5);
console.log('');

console.log('🎯 Summary of all signature formats:');
console.log('Format 1 (newlines):', signature1);
console.log('Format 2 (concat):', signature2);
console.log('Format 3 (with secret):', signature3);
console.log('Format 4 (empty body):', signature4);
console.log('Format 5 (hex):', signature5);
console.log('');
console.log('💡 Try switching between these formats to see which one works with Rapyd API.');
console.log('💡 The most common working format is usually Format 1 (newlines) or Format 2 (concat).');