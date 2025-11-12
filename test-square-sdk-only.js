console.log('🧪 Testing Square SDK...');

try {
  // Test 1: Require the square package
  console.log('1️⃣ Requiring square package...');
  const square = require('square');
  console.log('✅ Square package loaded');
  console.log('Square object keys:', Object.keys(square));

  // Test 2: Extract Client and Environment
  console.log('\n2️⃣ Extracting Client and Environment...');
  const Client = square.SquareClient;
  const Environment = square.SquareEnvironment;
  console.log('✅ Client type:', typeof Client);
  console.log('✅ Environment type:', typeof Environment);
  console.log('✅ Environment keys:', Object.keys(Environment));

  // Test 3: Create client instance
  console.log('\n3️⃣ Creating Square client...');
  const client = new Client({
    accessToken: 'test_token',
    environment: Environment.sandbox,
  });
  console.log('✅ Square client created successfully');
  console.log('✅ Client has merchantsApi:', typeof client.merchantsApi);

  console.log('\n🎉 Square SDK test passed!');

} catch (error) {
  console.error('❌ Square SDK test failed:', error.message);
  console.error('Stack trace:', error.stack);
}
