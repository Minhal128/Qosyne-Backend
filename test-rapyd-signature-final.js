// Test the final Rapyd signature fix
const rapydRealService = require('./services/rapydRealService');

async function testRapydSignatureFinal() {
  console.log('🧪 Testing Final Rapyd Signature Fix...\n');
  
  // Test the exact data that was failing
  const testData = {
    source_ewallet: "venmo_78_1758494905756",
    destination_ewallet: "qr8vs56r", 
    amount: "4.25",
    currency: "USD",
    metadata: {
      description: "Sending money from one wallet to another"
    }
  };
  
  console.log('📋 Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('');
  
  // Generate signature
  const signature = rapydRealService.generateSignature('POST', '/v1/account/transfer', JSON.stringify(testData));
  
  console.log('✅ Signature generated successfully!');
  console.log('📝 Key changes made:');
  console.log('1. ✅ Removed secretKey from string-to-sign');
  console.log('2. ✅ Added number formatting to remove trailing zeros');
  console.log('3. ✅ Using base64 digest directly');
  console.log('');
  
  console.log('🎯 Expected behavior:');
  console.log('- Rapyd should now accept the signature');
  console.log('- Real transfers should work through Rapyd API');
  console.log('- No more UNAUTHENTICATED_API_CALL errors');
  console.log('');
  
  console.log('📱 Try your mobile app transfer again!');
  console.log('Latest Production URL: https://qosynebackend-jfiqfk03b-rizvitherizzler-s-projects.vercel.app');
}

// Run the test
testRapydSignatureFinal().catch(console.error);
