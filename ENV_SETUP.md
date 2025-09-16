# Environment Variables Setup Guide

## Required Environment Variables for Payment Gateways

Create a `.env` file in your backend root directory with the following variables:

```env
# Database Configuration
DATABASE_URL="mysql://root:Rafay123@localhost:3306/qosyne_db"

# Server Configuration
ENVIRONMENT=development
NODE_ENV=production
JWT_SECRET=ourjwtSecret
CLIENT=http://localhost:3000
BACKEND_URL=https://qosynebackend.vercel.app/
FRONTEND_URL=https://qosyne-frontend.vercel.app/

# Email Configuration
EMAIL_PASSWORD=sfzq zdfv xyfa cayl
EMAIL_TESTING=rafayfarrukh941@gmail.com

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51QzlZqK8FytffeVC4h3JIKNQDLVYDtNhFEq1Jp9lVgPzS3ehpenL84OtTeJaMkoHdxgc6iJxq064rWSqOrgKl8hA00KiiREnsm

# Google Configuration
GOOGLE_CLIENT_ID=733594634127-gt4rce6skt3n282masgk0tbglushvg5s.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# PayPal Configuration
PAYPAL_CLIENT_ID=AdoCx8gljHcJclu2hMqonDiCAwksJV6rCSrER9q9AA_XhOuOtGilSLGe24-0SsDf-UR4JYZUm5gTvC6q
PAYPAL_CLIENT_SECRET=EIzpn3yyZphIwnDkJDpoHY5uf73kxyVkKNHUdV8twVebJMPGfE-b83vZSLDSBnKAyUUZvoISkqHGboHT
PAYPAL_REDIRECT_URI=https://qosynebackend.vercel.app/api/payment/paypal/callback
PAYPAL_AUTH_URL=https://www.sandbox.paypal.com/signin/authorize
PAYPAL_TOKEN_URL=https://api-m.sandbox.paypal.com/v1/oauth2/token

# Braintree Configuration
BT_MERCHANT_ID=ktkvh7xgwcm4b4jk
BT_PUBLIC_KEY=ftnts9ndhv5gtwmc
BT_PRIVATE_KEY=7362e7952e7525332a07105e4688db2c

# Wise Configuration
WISE_API_TOKEN=3bf00c8d-e209-4231-b904-4d564cd70b3f
WISE_PROFILE_ID=28660194
WISE_WALLET_ACCOUNT_ID=GB33BUKB20201555555555
WISE_ENVIRONMENT=sandbox

# Square Configuration
SQUARE_ACCESS_TOKEN=EAAAl5Dj1aLTyBjmamYciNS4s2E0_KHAtwwf3bTFyPACrYp1x90mm3t56m6sJ5KB
SQUARE_APPLICATION_ID=sq0idp-gDkVuRIlFuoJd-UQy-imBg
SQUARE_LOCATION_ID=LCVHQ91BGV5VR

# Additional Google Client ID (if needed)
GOOGLE_CLIENT_ID_ALT=858206651959-qnuql1fkhpjng9q3chgf67hiocdqrqi0.apps.googleusercontent.com
```

## Payment Gateway Features

### Supported Gateways:

1. **Stripe**
   - Credit/Debit card processing
   - Digital wallet support (Apple Pay, Google Pay)
   - Customer management
   - Payment intents and charges

2. **Google Pay**
   - Integrated with PayPal for processing
   - Token-based payments
   - OAuth integration

3. **PayPal**
   - OAuth authentication
   - Order creation and capture
   - Payouts to recipients
   - Sandbox/Production environment support

4. **Braintree**
   - Payment method tokenization
   - Customer vault
   - Transaction processing
   - Client token generation

5. **Wise**
   - International transfers
   - Multi-currency support
   - Recipient account management
   - Quote generation

6. **Square**
   - Payment processing
   - Customer management
   - Card storage
   - Location-based transactions

## Usage Examples

### Initialize a Gateway:
```javascript
const { paymentFactory } = require('./paymentGateways/paymentFactory');

// Create gateway instance
const stripeGateway = paymentFactory('stripe');
const paypalGateway = paymentFactory('paypal');
const braintreeGateway = paymentFactory('braintree');
```

### Process Payment:
```javascript
// Example payment data
const paymentData = {
  amount: 100.00,
  currency: 'USD',
  paymentToken: 'pm_1234567890',
  connectedWalletId: 'cus_1234567890',
  recipient: {
    email: 'recipient@example.com',
    name: 'John Doe'
  },
  walletDeposit: false,
  useQosyneBalance: false
};

// Process payment
const result = await stripeGateway.authorizePayment(paymentData);
```

### Attach Payment Method:
```javascript
const attachData = {
  userId: 123,
  paymentMethodId: 'pm_1234567890',
  bankAccount: {
    email: 'user@example.com',
    name: 'John Doe',
    currency: 'USD'
  }
};

const result = await stripeGateway.attachBankAccount(attachData);
```

## Security Notes

1. **Environment Variables**: Never commit `.env` files to version control
2. **API Keys**: Keep all API keys secure and rotate them regularly
3. **Webhooks**: Set up webhook endpoints for real-time payment status updates
4. **Error Handling**: Implement proper error handling for all payment operations
5. **Logging**: Log payment operations for audit trails (without sensitive data)

## Testing

For testing, use the sandbox/test credentials provided. Switch to production credentials only when going live.

## Next Steps

1. Create the `.env` file with the provided variables
2. Test each gateway with sandbox credentials
3. Set up webhook endpoints for payment status updates
4. Implement proper error handling and logging
5. Add frontend integration for payment method selection
