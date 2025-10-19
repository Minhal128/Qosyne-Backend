// Private Key Validator and Fixer
require('dotenv').config();

console.log('🔍 BRAINTREE PRIVATE KEY ANALYSIS\n');
console.log('=' .repeat(60));

const privateKey = process.env.BT_PRIVATE_KEY;

console.log('\n📋 Current Private Key Information:');
console.log('  Length:', privateKey?.length || 0);
console.log('  Expected:', 32);
console.log('  Status:', privateKey?.length === 32 ? '✅ Correct length' : '❌ Incorrect length');
console.log('  Key:', privateKey);

console.log('\n🔬 Character Analysis:');
console.log('  First 8 chars:', privateKey?.substring(0, 8));
console.log('  Last 4 chars:', privateKey?.slice(-4));
console.log('  Contains only hex?', /^[0-9a-f]+$/i.test(privateKey || ''));

console.log('\n💡 FROM YOUR SCREENSHOT:');
console.log('  Merchant ID: j54z5ccv9gndbfh9');
console.log('  Public Key: ttkchmphjhdc6nc5');
console.log('  Private Key (visible): 044a1637e658209cef343f02deb9f118');

console.log('\n⚠️  IMPORTANT INSTRUCTIONS:');
console.log('1. Go back to your Braintree dashboard');
console.log('2. Click the COPY button next to the Private Key (don\'t type it)');
console.log('3. The key might be longer than what\'s visible in the screenshot');
console.log('4. Paste the FULL copied key into your .env file');
console.log('5. Make sure there are NO spaces before or after the key');

console.log('\n📝 Correct .env format:');
console.log('BT_PRIVATE_KEY=<paste_full_key_here_no_spaces>');

console.log('\n🔧 Alternative: Click the "Show" button in dashboard to see full key');
console.log('=' .repeat(60));