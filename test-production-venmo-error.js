// Test script to verify VenmoGateway fixes are deployed in production
const axios = require('axios');

async function testProductionVenmoError() {
  console.log('🧪 Testing Production VenmoGateway Error Messages...\n');
  
  try {
    // Test with the same wallet that was failing
    const testPayload = {
      amount: 5,
      currency: 'USD',
      paymentMethodId: 'venmo_78_1758494905756', // The wallet that was failing
      recipient: {
        name: '',
        bankName: 'N/A',
        accountNumber: 'N/A',
        accountType: 'EXTERNAL'
      },
      walletDeposit: false,
      connectedWalletId: 70
    };
    
    console.log('📋 Testing Venmo payment with production API...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
    // You'll need to replace this with a valid JWT token for user 78
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc4LCJyb2xlIjoiVVNFUiIsImlhdCI6MTc1ODYxNzM0NiwiZXhwIjoxNzU5MjIyMTQ2fQ.1myDGrBoL2ULrdIVbgA8V0yVDVmrZ4I3ZUEG4l86Z-I';
    
    const response = await axios.post(
      'https://qosynebackend-bx5ua20qh-rizvitherizzler-s-projects.vercel.app/api/payment/authorize/venmo',
      testPayload,
      {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Unexpected success:', response.data);
    
  } catch (error) {
    console.log('📋 Error Response Analysis:');
    console.log('-'.repeat(50));
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
      
      const errorMessage = error.response.data?.error || error.response.data?.message || 'Unknown error';
      
      // Check if we get the new helpful error message
      if (errorMessage.includes('missing Braintree payment method token')) {
        console.log('✅ SUCCESS: New VenmoGateway fixes are deployed!');
        console.log('✅ Getting helpful error message about missing token');
        console.log('✅ This means the database lookup code is working');
      } else if (errorMessage.includes('Payment method token is invalid')) {
        console.log('❌ ISSUE: Still getting old generic error message');
        console.log('❌ VenmoGateway fixes may not be deployed yet');
      } else if (errorMessage.includes('Venmo wallet not found')) {
        console.log('✅ SUCCESS: New VenmoGateway fixes are deployed!');
        console.log('✅ Database lookup is working (wallet not found)');
      } else {
        console.log('⚠️ Different error:', errorMessage);
      }
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
  
  console.log('\n💡 Expected Behavior:');
  console.log('- If fixes are deployed: "missing Braintree payment method token" or "Venmo wallet not found"');
  console.log('- If fixes NOT deployed: "Payment method token is invalid"');
}

// Run the test
testProductionVenmoError().catch(console.error);
