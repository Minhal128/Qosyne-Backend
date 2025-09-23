require('dotenv').config();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const walletService = require('./services/walletService');

const prisma = new PrismaClient();

async function testRealTimeConnections() {
  console.log('🧪 Testing Real-Time Payment Provider Connections\n');
  
  const results = {
    paypal: { status: '❌', details: '' },
    wise: { status: '❌', details: '' },
    square: { status: '❌', details: '' },
    braintree: { status: '❌', details: '' },
    database: { status: '❌', details: '' }
  };

  // Test 1: Database Connection
  try {
    await prisma.$connect();
    await prisma.users.findFirst();
    results.database.status = '✅';
    results.database.details = 'Database connection successful';
    console.log('✅ Database: Connected successfully');
  } catch (error) {
    results.database.details = `Database error: ${error.message}`;
    console.log('❌ Database: Connection failed -', error.message);
  }

  // Test 2: PayPal API Connection
  try {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      throw new Error('PayPal credentials not configured');
    }

    const response = await axios.post(process.env.PAYPAL_TOKEN_URL, 
      'grant_type=client_credentials', {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      auth: {
        username: process.env.PAYPAL_CLIENT_ID,
        password: process.env.PAYPAL_CLIENT_SECRET
      }
    });

    if (response.data.access_token) {
      results.paypal.status = '✅';
      results.paypal.details = `PayPal API accessible, token type: ${response.data.token_type}`;
      console.log('✅ PayPal: API connection successful');
    }
  } catch (error) {
    results.paypal.details = `PayPal error: ${error.response?.data?.error_description || error.message}`;
    console.log('❌ PayPal: API connection failed -', error.response?.data?.error_description || error.message);
  }

  // Test 3: Wise API Connection
  try {
    if (!process.env.WISE_API_TOKEN || !process.env.WISE_PROFILE_ID) {
      throw new Error('Wise credentials not configured');
    }

    const wiseBaseUrl = process.env.WISE_ENVIRONMENT === 'production' 
      ? 'https://api.transferwise.com' 
      : 'https://api.sandbox.transferwise.tech';

    const response = await axios.get(`${wiseBaseUrl}/v1/profiles/${process.env.WISE_PROFILE_ID}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.id) {
      results.wise.status = '✅';
      results.wise.details = `Wise API accessible, profile: ${response.data.details?.firstName || 'Business'} (${response.data.type})`;
      console.log('✅ Wise: API connection successful');
    }
  } catch (error) {
    results.wise.details = `Wise error: ${error.response?.data?.message || error.message}`;
    console.log('❌ Wise: API connection failed -', error.response?.data?.message || error.message);
  }

  // Test 4: Square API Connection
  try {
    if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_APPLICATION_ID) {
      throw new Error('Square credentials not configured');
    }

    const squareBaseUrl = process.env.SQUARE_ENVIRONMENT === 'production'
      ? 'https://connect.squareup.com/v2'
      : 'https://connect.squareupsandbox.com/v2';

    const response = await axios.get(`${squareBaseUrl}/merchants`, {
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-06-20'
      }
    });

    if (response.data.merchant && response.data.merchant.length > 0) {
      const merchant = response.data.merchant[0];
      results.square.status = '✅';
      results.square.details = `Square API accessible, merchant: ${merchant.business_name || merchant.id}`;
      console.log('✅ Square: API connection successful');
    }
  } catch (error) {
    results.square.details = `Square error: ${error.response?.data?.errors?.[0]?.detail || error.message}`;
    console.log('❌ Square: API connection failed -', error.response?.data?.errors?.[0]?.detail || error.message);
  }

  // Test 5: Braintree/Venmo Connection
  try {
    if (!process.env.BT_MERCHANT_ID || !process.env.BT_PUBLIC_KEY || !process.env.BT_PRIVATE_KEY) {
      throw new Error('Braintree credentials not configured');
    }

    const braintree = require('braintree');
    const gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox,
      merchantId: process.env.BT_MERCHANT_ID,
      publicKey: process.env.BT_PUBLIC_KEY,
      privateKey: process.env.BT_PRIVATE_KEY,
    });

    // Test with a simple merchant account lookup
    const merchantAccount = await gateway.merchantAccount.find(process.env.BT_MERCHANT_ID);
    
    if (merchantAccount) {
      results.braintree.status = '✅';
      results.braintree.details = `Braintree accessible, status: ${merchantAccount.status}`;
      console.log('✅ Braintree/Venmo: API connection successful');
    }
  } catch (error) {
    results.braintree.details = `Braintree error: ${error.message}`;
    console.log('❌ Braintree/Venmo: API connection failed -', error.message);
  }

  // Test 6: Webhook Endpoints Accessibility
  console.log('\n🔗 Testing Webhook Endpoints:');
  const webhookEndpoints = [
    'https://qosynebackend.vercel.app/api/webhooks/paypal',
    'https://qosynebackend.vercel.app/api/webhooks/wise',
    'https://qosynebackend.vercel.app/api/webhooks/square',
    'https://qosynebackend.vercel.app/api/webhooks/venmo'
  ];

  for (const endpoint of webhookEndpoints) {
    try {
      const response = await axios.post(endpoint, { test: true }, {
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept 4xx as valid (auth errors are expected)
      });
      console.log(`✅ ${endpoint.split('/').pop()}: Webhook endpoint accessible (${response.status})`);
    } catch (error) {
      if (error.response && error.response.status < 500) {
        console.log(`✅ ${endpoint.split('/').pop()}: Webhook endpoint accessible (${error.response.status})`);
      } else {
        console.log(`❌ ${endpoint.split('/').pop()}: Webhook endpoint not accessible`);
      }
    }
  }

  // Summary Report
  console.log('\n📊 REAL-TIME CONNECTION SUMMARY:');
  console.log('=====================================');
  Object.entries(results).forEach(([provider, result]) => {
    console.log(`${result.status} ${provider.toUpperCase()}: ${result.details}`);
  });

  const successCount = Object.values(results).filter(r => r.status === '✅').length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Status: ${successCount}/${totalCount} services connected`);
  
  if (successCount === totalCount) {
    console.log('🚀 ALL SYSTEMS GO! Real-time connections are fully operational.');
  } else if (successCount >= 3) {
    console.log('⚠️  Most systems operational. Some providers need configuration.');
  } else {
    console.log('❌ Multiple connection issues detected. Check credentials and configuration.');
  }

  console.log('\n📋 Next Steps:');
  if (results.paypal.status === '❌') {
    console.log('   • Configure PayPal webhook secrets in provider dashboard');
  }
  if (results.wise.status === '❌') {
    console.log('   • Verify Wise API token and profile ID');
  }
  if (results.square.status === '❌') {
    console.log('   • Check Square access token and application ID');
  }
  if (results.braintree.status === '❌') {
    console.log('   • Verify Braintree merchant credentials');
  }
  
  console.log('   • Set up webhook URLs in each payment provider dashboard');
  console.log('   • Add webhook secrets to environment variables');
  console.log('   • Test payment flows with real transactions');

  await prisma.$disconnect();
}

// Run the test
testRealTimeConnections().catch(console.error);
