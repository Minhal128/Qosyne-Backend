# Wise Transfer - Correct Request Body

## For: https://qosynebackend.vercel.app/api/wise/send

### ✅ CORRECT REQUEST BODY:

```json
{
  "recipientName": "Ahmed Khan",
  "recipientEmail": "ahmed@example.com",
  "recipientIban": "GB33BUKB20201555555555",
  "recipientBankName": "Barclays Bank UK",
  "amount": 100.00,
  "currency": "USD",
  "note": "Payment for services",
  "address": {
    "country": "US",
    "city": "New York",
    "postCode": "10001",
    "firstLine": "123 Main Street"
  }
}
```

### 📝 Field Descriptions:

- **recipientName**: Full name of the recipient
- **recipientEmail**: Email of the recipient (optional but recommended)
- **recipientIban**: International Bank Account Number (must start with country code like GB, DE, FR, etc.)
- **recipientBankName**: Name of the recipient's bank (optional)
- **amount**: Amount to send in source currency
- **currency**: Source currency code (USD, EUR, GBP, etc.)
- **note**: Transfer reference/note
- **address**: Sender's address (required by Wise for compliance)
  - **country**: 2-letter country code (US, GB, etc.)
  - **city**: City name
  - **postCode**: Postal/ZIP code
  - **firstLine**: Street address

### 🔧 Alternative (if you want to use default address):

```json
{
  "recipientName": "Ahmed Khan",
  "recipientEmail": "ahmed@example.com",
  "recipientIban": "GB33BUKB20201555555555",
  "recipientBankName": "Barclays Bank UK",
  "amount": 100.00,
  "currency": "USD",
  "note": "Payment for services"
}
```

The backend will use default address: US, New York, 10001, 123 Main Street

### 📋 CURL Example:

```bash
curl -X POST https://qosynebackend.vercel.app/api/wise/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "recipientName": "Ahmed Khan",
    "recipientEmail": "ahmed@example.com",
    "recipientIban": "GB33BUKB20201555555555",
    "recipientBankName": "Barclays Bank UK",
    "amount": 100.00,
    "currency": "USD",
    "note": "Payment for services",
    "address": {
      "country": "US",
      "city": "New York",
      "postCode": "10001",
      "firstLine": "123 Main Street"
    }
  }'
```

### ⚠️ Important Notes:

1. **Profile Address**: The Wise profile must have a verified address. The current implementation uses default values if not provided.
2. **IBAN Country**: The system automatically detects recipient currency from IBAN (GB→GBP, DE/FR/IT/ES→EUR)
3. **Authentication**: Make sure to include your JWT token in the Authorization header
4. **Sandbox Mode**: Currently configured for Wise sandbox environment

### 🚨 Current Limitation:

The address validation error means Wise requires the **profile's primary address** to be properly set up in their system. This is a compliance requirement. 

**Workaround**: You need to either:
1. Set up the profile address properly in Wise (through their API or dashboard)
2. Or wait for profile verification

The code has been updated to accept and use address information, but Wise may still require the profile-level address to be verified.
