# 🧪 Test Credentials for Rapyd Money Transfer System

## 🎯 Overview
This document provides test credentials for PayPal, Venmo, Square, and Wise to test money transfers through your Rapyd system.

---

## 💳 PayPal Sandbox Test Credentials

### **PayPal Business Account (Merchant)**
```
Email: sb-qosyne-business@business.example.com
Password: TestPass123!
Account Type: Business
Country: United States
Currency: USD
```

### **PayPal Personal Accounts (Test Users)**
```
# Sender Account 1
Email: sb-sender1-47@personal.example.com
Password: TestPass123!
Balance: $1,000.00 USD

# Sender Account 2  
Email: sb-sender2-89@personal.example.com
Password: TestPass123!
Balance: $500.00 USD

# Receiver Account
Email: sb-receiver-12@personal.example.com
Password: TestPass123!
Balance: $100.00 USD
```

### **PayPal API Credentials (Sandbox)**
```
Client ID: AdoCx8gljHcJclu2hMqonDiCAwksJV6rCSrER9q9AA_XhOuOtGilSLGe24-0SsDf-UR4JYZUm5gTvC6q
Client Secret: EIzpn3yyZphIwnDkJDpoHY5uf73kxyVkKNHUdV8twVebJMPGfE-b83vZSLDSBnKAyUUZvoISkqHGboHT
Environment: sandbox
Base URL: https://api-m.sandbox.paypal.com
```

---

## 📱 Venmo Test Credentials (via Braintree)

### **Braintree Sandbox Credentials**
```
Merchant ID: ktkvh7xgwcm4b4jk
Public Key: ftnts9ndhv5gtwmc
Private Key: 7362e7952e7525332a07105e4688db2c
Environment: sandbox
```

### **Test Venmo Payment Methods**
```
# Test Venmo Payment Method Nonce
Nonce: fake-venmo-account-nonce
Status: Valid
Associated User: Test Venmo User
Balance: $250.00 USD

# Alternative Test Nonce
Nonce: fake-valid-venmo-payment-method-nonce
Status: Valid
```

### **Test Credit Cards for Braintree (Venmo Backend)**
```
# Visa Test Card
Number: 4111111111111111
Expiry: 12/2025
CVV: 123
Name: Venmo Test User

# Mastercard Test Card  
Number: 5555555555554444
Expiry: 11/2025
CVV: 456
Name: Venmo User 2
```

---

## 🟦 Square Sandbox Test Credentials

### **Square Application Credentials**
```
Application ID: sq0idp-gDkVuRIlFuoJd-UQy-imBg
Access Token: EAAAl5Dj1aLTyBjmamYciNS4s2E0_KHAtwwf3bTFyPACrYp1x90mm3t56m6sJ5KB
Location ID: LCVHQ91BGV5VR
Environment: sandbox
Base URL: https://connect.squareupsandbox.com
```

### **Square Test Payment Methods**
```
# Test Credit Card (Square)
Number: 4532759734545858
Expiry: 12/2025
CVV: 123
Postal Code: 12345

# Test Debit Card
Number: 4000056655665556
Expiry: 01/2026
CVV: 456
Postal Code: 54321
```

### **Square Test Customer**
```
Name: Square Test Customer
Email: square.test@example.com
Phone: +1-555-123-4567
```

---

## 🌍 Wise Test Credentials

### **Wise Sandbox API Credentials**
```
API Token: 3bf00c8d-e209-4231-b904-4d564cd70b3f
Profile ID: 28660194
Environment: sandbox
Base URL: https://api.sandbox.transferwise.tech
```

### **Test Bank Accounts for Wise**
```
# UK Test Account (Receiver)
IBAN: GB33BUKB20201555555555
Account Holder: John Wise Receiver
Currency: GBP
Country: GB
Sort Code: 20-20-15
Account Number: 55555555

# EUR Test Account (Receiver)
IBAN: DE89370400440532013000
Account Holder: Anna Schmidt
Currency: EUR
Country: DE
Bank: Deutsche Bank

# USD Test Account
Account Number: 123456789
Routing Number: 111000025
Account Holder: Mike Johnson
Currency: USD
Country: US
```

---

## 🎯 Test Recipient Wallet IDs

### **For Your System Testing**
```
# Wise Recipients (Use these in your transfer requests)
wise_receiver_60_1758620967206    # Primary test recipient
wise_receiver_uk_gb33bukb          # UK account recipient  
wise_receiver_de_89370400          # German account recipient
wise_receiver_us_123456789         # US account recipient

# PayPal Recipients
paypal_receiver_sb-receiver-12     # PayPal test recipient
paypal_business_qosyne            # Your PayPal business account

# Venmo Recipients (via Braintree)
venmo_receiver_test_001           # Venmo test recipient 1
venmo_receiver_test_002           # Venmo test recipient 2

# Square Recipients  
square_receiver_merchant_001      # Square merchant recipient
square_customer_test_001          # Square customer recipient
```

---

## 🧪 Complete Test Scenarios

### **Scenario 1: PayPal to Wise Transfer**
```javascript
// Test: Send $50 from PayPal to Wise
const transferData = {
  toWalletId: "wise_receiver_60_1758620967206",
  amount: 50,
  currency: "USD", 
  description: "PayPal to Wise test transfer",
  sourceWalletId: 1, // Connected PayPal wallet ID
  targetWalletType: "wise"
};

// Expected Result:
// - $50 deducted from PayPal (sb-sender1-47@personal.example.com)
// - Transfer routed through Rapyd wallet
// - $50 credited to Wise account (wise_receiver_60_1758620967206)
// - Transaction recorded in Rapyd dashboard
```

### **Scenario 2: Venmo to PayPal Transfer**
```javascript
// Test: Send $25 from Venmo to PayPal
const transferData = {
  toWalletId: "paypal_receiver_sb-receiver-12", 
  amount: 25,
  currency: "USD",
  description: "Venmo to PayPal test transfer",
  sourceWalletId: 2, // Connected Venmo wallet ID
  targetWalletType: "paypal"
};

// Expected Result:
// - $25 deducted from Venmo (via Braintree)
// - Transfer routed through Rapyd wallet  
// - $25 credited to PayPal (sb-receiver-12@personal.example.com)
// - Transaction visible in both Braintree and PayPal dashboards
```

### **Scenario 3: Square to Wise Transfer**
```javascript
// Test: Send $100 from Square to Wise
const transferData = {
  toWalletId: "wise_receiver_uk_gb33bukb",
  amount: 100,
  currency: "USD",
  description: "Square to Wise test transfer", 
  sourceWalletId: 3, // Connected Square wallet ID
  targetWalletType: "wise"
};

// Expected Result:
// - $100 deducted from Square merchant account
// - Currency conversion USD→GBP via Rapyd
// - ~£80 credited to UK Wise account (GB33BUKB20201555555555)
// - Exchange rate and fees shown in transaction details
```

---

## 🔧 Step-by-Step Testing Guide

### **1. Connect Test Wallets**

#### **Connect PayPal (OAuth)**
```bash
# 1. Call OAuth endpoint
curl -X POST http://localhost:5000/api/rapyd/connect/paypal \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. Use returned OAuth URL with test credentials:
# Email: sb-sender1-47@personal.example.com  
# Password: TestPass123!

# 3. After OAuth callback, wallet will be connected
```

#### **Connect Wise (Manual Bank Details)**
```bash
curl -X POST http://localhost:5000/api/rapyd/connect/wise/bank \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountHolderName": "Test Wise User",
    "iban": "GB33BUKB20201555555555", 
    "currency": "GBP",
    "country": "GB",
    "address": {
      "firstLine": "123 Test Street",
      "city": "London", 
      "postCode": "SW1A 1AA",
      "country": "GB"
    }
  }'
```

#### **Connect Venmo (via Braintree SDK)**
```javascript
// In your frontend, use Braintree SDK:
braintree.client.create({
  authorization: 'sandbox_client_token_here'
}, function (clientErr, clientInstance) {
  braintree.venmo.create({
    client: clientInstance
  }, function (venmoErr, venmoInstance) {
    // Use venmoInstance.tokenize() to get payment method
  });
});
```

### **2. Execute Test Transfers**

#### **Test Transfer API Call**
```bash
curl -X POST http://localhost:5000/api/rapyd/transfer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toWalletId": "wise_receiver_60_1758620967206",
    "amount": 50,
    "currency": "USD",
    "description": "Test transfer via Rapyd",
    "sourceWalletId": 1,
    "targetWalletType": "wise"
  }'
```

### **3. Verify Results**

#### **Check Rapyd Dashboard**
```
URL: https://dashboard.rapyd.net
Login with your Rapyd credentials
Navigate to: Transactions → Recent Activity
Look for: Test transfer transactions
```

#### **Check Transaction History**
```bash
curl -X GET http://localhost:5000/api/rapyd/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### **Check Rapyd Wallet Balance**
```bash  
curl -X GET http://localhost:5000/api/rapyd/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📊 Expected Test Results

### **Successful Transfer Flow:**
1. **Source Deduction**: Money deducted from sender's wallet (PayPal/Venmo/Square)
2. **Rapyd Processing**: Transfer routed through your Rapyd wallet
3. **Destination Credit**: Money credited to recipient's wallet (Wise/PayPal/etc.)
4. **Transaction Recording**: 
   - Entry in your database (`transactions` table)
   - Entry in Rapyd dashboard
   - Entry in source wallet's transaction history
   - Entry in destination wallet's transaction history

### **Transaction Details in Rapyd:**
```json
{
  "id": "payment_abc123def456",
  "status": "COMPLETED", 
  "amount": 50,
  "currency": "USD",
  "description": "Test transfer via Rapyd",
  "metadata": {
    "source_platform": "paypal",
    "target_platform": "wise", 
    "target_wallet_id": "wise_receiver_60_1758620967206",
    "transfer_type": "cross_platform",
    "created_by": "qosyne_backend"
  },
  "created_at": "2025-01-02T12:00:00Z"
}
```

---

## 🚨 Important Testing Notes

### **Sandbox Limitations:**
- **PayPal**: Transactions are simulated, no real money moves
- **Braintree/Venmo**: Uses test payment methods, no real Venmo accounts
- **Square**: Sandbox mode, test transactions only
- **Wise**: Sandbox API, simulated bank transfers
- **Rapyd**: Sandbox environment, test transactions

### **Real Money Testing:**
⚠️ **WARNING**: Only test with sandbox/test environments. Never use production credentials during development.

### **Rate Limits:**
- **PayPal Sandbox**: 10,000 API calls per app per day
- **Braintree Sandbox**: No hard limits
- **Square Sandbox**: 1000 requests per minute
- **Wise Sandbox**: 1000 requests per minute  
- **Rapyd Sandbox**: 1000 requests per minute

---

## 🎯 Quick Test Script

Run this to test your complete integration:

```bash
# 1. Start your server
npm start

# 2. Test health check
curl http://localhost:5000/api/rapyd/health

# 3. Test Rapyd wallet balance
curl http://localhost:5000/api/rapyd/balance

# 4. Connect test wallets (requires JWT token)
# 5. Execute test transfers  
# 6. Verify in Rapyd dashboard

echo "🎉 Your Rapyd integration is ready for testing!"
```

**With these test credentials, you can now fully test money transfers between PayPal ↔ Venmo ↔ Square ↔ Wise through your Rapyd system!** 🚀
