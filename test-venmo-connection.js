// Test script to verify Venmo/Braintree connection
require('dotenv').config();
const VenmoGateway = require('./paymentGateways/gateways/VenmoGateway');

async function testVenmoConnection() {
  console.log('🧪 Testing Venmo/Braintree Connection...');
  console.log('=====================================');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('BT_MERCHANT_ID:', process.env.BT_MERCHANT_ID ? '✅ Present' : '❌ Missing');
  console.log('BT_PUBLIC_KEY:', process.env.BT_PUBLIC_KEY ? '✅ Present' : '❌ Missing');
  console.log('BT_PRIVATE_KEY:', process.env.BT_PRIVATE_KEY ? '✅ Present' : '❌ Missing');
  console.log('BT_ENVIRONMENT:', process.env.BT_ENVIRONMENT || 'sandbox (default)');
  console.log('');
  
  try {
    // Test 1: Initialize VenmoGateway
    console.log('🔧 Test 1: Initialize VenmoGateway');
    const venmoGateway = new VenmoGateway();
    console.log('✅ VenmoGateway initialized successfully');
    console.log('');
    
    // Test 2: Generate client token
    console.log('🔑 Test 2: Generate Client Token');
    const clientTokenResult = await venmoGateway.gateway.clientToken.generate({});
    
    if (clientTokenResult.success) {
      console.log('✅ Client token generated successfully');
      console.log('Token preview:', clientTokenResult.clientToken.substring(0, 50) + '...');
    } else {
      console.log('❌ Failed to generate client token:', clientTokenResult.message);
    }
    console.log('');
    
    // Test 3: Test customer creation
    console.log('👤 Test 3: Test Customer Creation');
    const customerResult = await venmoGateway.gateway.customer.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com'
    });
    
    if (customerResult.success) {
      console.log('✅ Test customer created successfully');
      console.log('Customer ID:', customerResult.customer.id);
      
      // Clean up - delete test customer
      await venmoGateway.gateway.customer.delete(customerResult.customer.id);
      console.log('🧹 Test customer cleaned up');
    } else {
      console.log('❌ Failed to create test customer:', customerResult.message);
    }
    console.log('');
    
    console.log('🎉 All tests passed! Venmo integration is ready for real-time connections.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('');
    console.log('🔍 Troubleshooting:');
    console.log('1. Verify your Braintree credentials in .env file');
    console.log('2. Check if you have sandbox access enabled');
    console.log('3. Ensure your Braintree account supports Venmo');
    console.log('4. Check your internet connection');
  }
}

// Run the test
testVenmoConnection().catch(console.error);
