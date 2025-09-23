const fs = require('fs');
const path = require('path');

// Script to add missing environment variables for real-time functionality
console.log('🚀 Setting up real-time environment configuration...\n');

const envPath = path.join(__dirname, '.env');
const additionalEnvVars = `

# Webhook Secrets for Real-Time Updates
PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret_here
WISE_WEBHOOK_SECRET=your_wise_webhook_secret_here  
SQUARE_WEBHOOK_SECRET=your_square_webhook_secret_here
VENMO_WEBHOOK_SECRET=your_venmo_webhook_secret_here
GOOGLEPAY_WEBHOOK_SECRET=your_googlepay_webhook_secret_here
RAPYD_WEBHOOK_SECRET=your_rapyd_webhook_secret_here

# Additional PayPal Configuration for Real-Time
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

# Square Environment Configuration
SQUARE_ENVIRONMENT=sandbox
SQUARE_VERSION=2024-06-20

# Braintree Environment Configuration  
BT_MERCHANT_ACCOUNT_ID=your_merchant_account_id_here
BRAINTREE_BUSINESS_PAYMENT_METHOD_ID=your_business_payment_method_id
BRAINTREE_BUSINESS_CUSTOMER_ID=your_business_customer_id

# Apple Pay Configuration (for future use)
APPLE_PAY_MERCHANT_ID=your_apple_merchant_id
APPLE_PAY_MERCHANT_DOMAIN=your_domain.com
APPLE_PAY_ENVIRONMENT=sandbox

# Google Pay Configuration
GOOGLEPAY_API_KEY=your_google_pay_api_key_here
`;

try {
  if (fs.existsSync(envPath)) {
    // Read current .env content
    const currentEnv = fs.readFileSync(envPath, 'utf8');
    
    // Check if webhook secrets are already present
    if (!currentEnv.includes('PAYPAL_WEBHOOK_SECRET')) {
      // Append new environment variables
      fs.appendFileSync(envPath, additionalEnvVars);
      console.log('✅ Added missing environment variables to .env file');
      console.log('\n📝 Please update the following placeholder values:');
      console.log('   - PAYPAL_WEBHOOK_SECRET');
      console.log('   - WISE_WEBHOOK_SECRET');
      console.log('   - SQUARE_WEBHOOK_SECRET');
      console.log('   - BT_MERCHANT_ACCOUNT_ID');
      console.log('   - BRAINTREE_BUSINESS_PAYMENT_METHOD_ID');
      console.log('   - BRAINTREE_BUSINESS_CUSTOMER_ID');
    } else {
      console.log('ℹ️  Webhook secrets already configured in .env file');
    }
  } else {
    console.log('❌ .env file not found');
  }
} catch (error) {
  console.error('❌ Error updating .env file:', error.message);
}

console.log('\n🔧 Next steps:');
console.log('1. Update webhook secret placeholders with real values from your payment providers');
console.log('2. Run the real-time connection test script');
console.log('3. Configure webhook endpoints in your payment provider dashboards');
console.log('\n📍 Webhook URLs to configure:');
console.log('   PayPal: https://qosynebackend.vercel.app/api/webhooks/paypal');
console.log('   Wise: https://qosynebackend.vercel.app/api/webhooks/wise');
console.log('   Square: https://qosynebackend.vercel.app/api/webhooks/square');
console.log('   Venmo: https://qosynebackend.vercel.app/api/webhooks/venmo');
