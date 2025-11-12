# Qosyne API Testing Scenarios

## Complete Testing Flow

### 1. **Authentication Flow**
```
1. Login User → Get JWT Token
2. (Optional) Register new user if needed
```

### 2. **Wallet Connection Flow**
```
1. Connect Square Account
2. Connect PayPal Account  
3. Connect Venmo Account
4. Connect Wise Account
5. Connect Google Pay Account
6. Connect Apple Pay Account
7. Get All Connected Wallets (verify connections)
```

### 3. **Payment Testing Flow**
```
1. Send Square Invoice ($50)
2. Send PayPal Payment ($25)
3. Send Venmo Payment ($30)
4. Send Wise Payment ($100)
5. Send Google Pay Payment ($75)
6. Send Apple Pay Payment ($60)
```

### 4. **Cross-Platform Transfer Testing**
```
1. Venmo → Wise Transfer ($150)
2. PayPal → Square Transfer ($200)
```

### 5. **Status & Management Flow**
```
1. Check Square Invoice Status
2. Get All User Transactions
3. Get Specific Transaction by ID
4. Disconnect a Wallet
5. Refresh Wallet Connection
```

## Important Notes

### **Before Testing:**
1. **Update Square Access Token** in .env file (current one is expired)
2. **Get valid JWT token** from login endpoint first
3. **Replace placeholder values** with actual credentials

### **Test Credentials Needed:**
- **Square**: New sandbox access token from Square Developer Dashboard
- **PayPal**: Sandbox client credentials
- **Venmo**: Braintree sandbox credentials
- **Wise**: Sandbox API token
- **Google Pay**: OAuth credentials
- **Apple Pay**: Certificate and private key

### **Expected Response Codes:**
- **200/201**: Success
- **400**: Bad request (missing parameters)
- **401**: Unauthorized (invalid/expired JWT)
- **500**: Server error

### **Testing Order:**
1. Start with **Authentication**
2. Then **Wallet Connections** 
3. Then **Send Payments**
4. Finally **Status Checks**

## Quick Test Commands

### Login & Get Token:
```bash
curl -X POST https://qosynebackend.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test128@example.com","password":"password123"}'
```

### Connect Square (after login):
```bash
curl -X POST https://qosynebackend.vercel.app/api/square-invoice/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"squareEmail":"test128@example.com"}'
```

### Send Square Invoice:
```bash
curl -X POST https://qosynebackend.vercel.app/api/square-invoice/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail":"receiver@example.com","amount":50.00,"currency":"USD","note":"Test payment"}'
```
