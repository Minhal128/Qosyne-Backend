# 💰 Money Transfer Testing Guide

## 🎯 Current Setup

You now have **4 test wallets** set up for user ID 78:

### 1. PayPal Wallet ✅
- **Provider**: PAYPAL
- **Wallet ID**: `paypal_78_1758495249733`
- **Email**: `test78@paypal.com`
- **Capabilities**: `send`, `receive`, `balance_check`
- **Best for**: General testing, reliable transfers

### 2. Wise Wallet ✅
- **Provider**: WISE
- **Wallet ID**: `wise_78_28660194`
- **Email**: `test@wise.com`
- **Capabilities**: `send`, `receive`, `balance_check`, `multi_currency`
- **Best for**: International transfers, multi-currency testing

### 3. Venmo Wallet ✅
- **Provider**: VENMO
- **Wallet ID**: `venmo_78_1758494905756`
- **Email**: `rminhal783@gmail.com`
- **Capabilities**: `send`, `receive`
- **Best for**: P2P transfers

### 4. Qosyne Wallet ✅
- **Provider**: QOSYNE
- **Wallet ID**: `qosyne_78`
- **Email**: `test128@example.com`
- **Capabilities**: Internal wallet
- **Best for**: Internal balance management

## 🚀 Testing Money Transfers

### Method 1: Using API Endpoints

#### 1. Get Your Wallets
```bash
curl -X GET "https://qosynebackend-bxzv4x1h1-rizvitherizzler-s-projects.vercel.app/api/wallet/wallets" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### 2. Create a Transfer (Example)
```bash
curl -X POST "https://qosynebackend-bxzv4x1h1-rizvitherizzler-s-projects.vercel.app/api/wallet-integration/transactions/transfer" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceWalletId": "paypal_78_1758495249733",
    "recipientEmail": "recipient@example.com",
    "amount": 25.00,
    "currency": "USD",
    "description": "Test transfer"
  }'
```

### Method 2: Using Test Scripts

#### Run Transfer Test
```bash
node test-money-transfer.js
```

#### List Current Wallets
```bash
node setup-test-provider.js list
```

#### Add More Providers
```bash
# Add Square wallet
node setup-test-provider.js square

# Add all providers
node setup-test-provider.js
```

## 🧪 Test Scenarios

### Scenario 1: PayPal to External Recipient
- **Source**: PayPal wallet
- **Amount**: $10.00
- **Recipient**: External email
- **Expected**: Transaction created, status updates

### Scenario 2: Wise International Transfer
- **Source**: Wise wallet
- **Amount**: €15.00 or £12.00
- **Recipient**: International email
- **Expected**: Multi-currency support

### Scenario 3: Venmo P2P Transfer
- **Source**: Venmo wallet
- **Amount**: $5.00
- **Recipient**: Another Venmo user
- **Expected**: Instant transfer

### Scenario 4: Internal Transfer
- **Source**: Any external wallet
- **Target**: Qosyne wallet
- **Amount**: Any amount
- **Expected**: Balance update

## 📊 Monitoring Transfers

### Check Transaction History
```sql
SELECT * FROM transactions 
WHERE userId = 78 
ORDER BY createdAt DESC;
```

### Check Wallet Balances
```sql
SELECT provider, walletId, balance, currency 
FROM connectedWallets 
WHERE userId = 78 AND isActive = true;
```

### Monitor Transfer Status
```sql
SELECT id, amount, currency, provider, status, createdAt, completedAt
FROM transactions 
WHERE userId = 78 AND type = 'EXTERNAL_TRANSFER'
ORDER BY createdAt DESC;
```

## 🔧 Environment Setup

### Required Environment Variables

For **PayPal** (Recommended for testing):
```env
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_BASE_URL=https://api.sandbox.paypal.com
```

For **Wise** (International transfers):
```env
WISE_API_TOKEN=your_wise_api_token
WISE_PROFILE_ID=your_wise_profile_id
WISE_ENVIRONMENT=sandbox
```

For **Square** (Business payments):
```env
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_APPLICATION_ID=your_square_app_id
SQUARE_ENVIRONMENT=sandbox
```

## 🎯 Recommended Testing Flow

1. **Start with PayPal** - Most reliable for initial testing
2. **Test basic transfers** - Small amounts ($1-10)
3. **Test error scenarios** - Invalid recipients, insufficient funds
4. **Test Wise** - Multi-currency transfers
5. **Test status updates** - Pending → Processing → Completed
6. **Test webhooks** - If implemented
7. **Test UI integration** - Frontend wallet selection

## 🚨 Important Notes

- **Sandbox Mode**: All providers are in sandbox/test mode
- **No Real Money**: These are test transactions only
- **Rate Limits**: Be aware of API rate limits
- **Error Handling**: Test both success and failure scenarios
- **Security**: Never use production credentials in testing

## 🔍 Debugging

### Common Issues
1. **Missing updatedAt**: Fixed ✅
2. **Invalid wallet ID**: Check wallet exists and is active
3. **Insufficient permissions**: Verify wallet capabilities
4. **API errors**: Check provider-specific error codes

### Debug Commands
```bash
# Check wallet data
node debug-wallet.js

# Test specific provider
node setup-test-provider.js [provider_name]

# Clean up test data
node delete-wallet-record.js
```

## 📈 Next Steps

1. **Implement real provider APIs** - Replace mock connections
2. **Add webhook handling** - For real-time status updates
3. **Implement retry logic** - For failed transfers
4. **Add transaction fees** - Calculate and apply fees
5. **Multi-currency support** - Handle exchange rates
6. **Compliance features** - KYC, AML checks

---

**Happy Testing!** 🚀

Your app now has multiple wallet providers ready for money transfer testing. Start with PayPal for reliability, then move to Wise for international features.
