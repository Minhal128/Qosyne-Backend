# Square Location ID Authorization Fix

## Problem
When calling the Square invoice send endpoint, you were getting:
```json
{
  "success": false,
  "message": "Not authorized to access orders with location_id=LCVHQ91BGV5VR",
  "details": {
    "status": 403,
    "code": "FORBIDDEN",
    "category": "AUTHENTICATION_ERROR"
  }
}
```

## Root Cause
The location ID being used (`LCVHQ91BGV5VR`) was not authorized for the access token being used. This happens because:

1. **Hardcoded Location ID**: The system was using `process.env.SQUARE_LOCATION_ID` which might not match the merchant's actual locations
2. **Token-Location Mismatch**: Each Square access token is tied to a specific merchant account, and each merchant has their own location IDs
3. **No Location Storage**: The wallet connection wasn't storing the merchant's correct location ID

## Solution Implemented

### 1. Updated `/api/square-invoice/connect` Endpoint
**File**: `routes/squareInvoiceRoutes.js`

Now when you connect a Square account:
- ✅ Fetches all locations for the merchant
- ✅ Selects the first active location
- ✅ Stores the location ID in wallet metadata
- ✅ Returns the location info in the response

```javascript
// Stores in wallet metadata
{
  locationId: "LXXX...",
  locationName: "Main Location",
  merchantId: "MXXX...",
  connectedAt: "2025-11-12T..."
}
```

### 2. Updated `/api/square-invoice/send` Endpoint
**File**: `routes/squareInvoiceRoutes.js`

Now when you send an invoice:
- ✅ Retrieves location ID from wallet metadata
- ✅ If not in metadata, fetches from Square API
- ✅ Always uses an authorized location for the access token
- ✅ Logs the location being used for debugging

```javascript
// Gets location from wallet metadata
if (squareWallet.metadata?.locationId) {
  locationId = squareWallet.metadata.locationId;
}

// Or fetches from API
const locationsResponse = await axios.get(`${baseURL}/locations`, { headers });
const activeLocation = locationsResponse.data.locations.find(loc => loc.status === 'ACTIVE');
locationId = activeLocation.id;
```

## How to Fix Your Current Issue

### Step 1: Reconnect Your Square Account
First, you need to reconnect your Square account so it stores the correct location ID:

```bash
POST https://qosynebackend.vercel.app/api/square-invoice/connect
Authorization: Bearer YOUR_AUTH_TOKEN
Content-Type: application/json

{
  "squareEmail": "your-square-email@example.com",
  "accessToken": "YOUR_SQUARE_ACCESS_TOKEN"
}
```

**Response will include:**
```json
{
  "success": true,
  "message": "Square account connected successfully",
  "data": {
    "squareEmail": "your-square-email@example.com",
    "squareConnected": true,
    "merchantId": "MXXX...",
    "locationId": "LXXX...",  // ← Your correct location ID
    "locationName": "Main Location"
  }
}
```

### Step 2: Send Invoice (Will Work Now!)
Now when you send an invoice, it will use the correct location ID:

```bash
POST https://qosynebackend.vercel.app/api/square-invoice/send
Authorization: Bearer YOUR_AUTH_TOKEN
Content-Type: application/json

{
  "recipientEmail": "rminhal783@gmail.com",
  "amount": 50.00,
  "currency": "USD",
  "note": "Payment request for services"
}
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Invoice sent successfully via Square",
  "data": {
    "transactionId": 123,
    "squareInvoiceId": "inv_xxx",
    "invoiceNumber": "INV-xxx",
    "status": "PENDING",
    "recipientEmail": "rminhal783@gmail.com",
    "amount": 50.00,
    "currency": "USD",
    "publicUrl": "https://squareupsandbox.com/pay-invoice/...",
    "note": "Invoice sent to recipient email..."
  }
}
```

## Testing the Fix

### Option 1: Use the Test Script
```bash
# Update the test script with your credentials
node test-square-location-fix.js
```

### Option 2: Manual Testing
1. **Get your Square locations** (to verify):
   ```bash
   curl -X GET https://connect.squareupsandbox.com/v2/locations \
     -H "Authorization: Bearer YOUR_SQUARE_ACCESS_TOKEN" \
     -H "Square-Version: 2024-11-20"
   ```

2. **Reconnect Square wallet** (this stores the location):
   ```bash
   curl -X POST https://qosynebackend.vercel.app/api/square-invoice/connect \
     -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"squareEmail": "test@example.com", "accessToken": "YOUR_SQUARE_TOKEN"}'
   ```

3. **Send test invoice**:
   ```bash
   curl -X POST https://qosynebackend.vercel.app/api/square-invoice/send \
     -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "recipientEmail": "rminhal783@gmail.com",
       "amount": 50.00,
       "currency": "USD",
       "note": "Test payment"
     }'
   ```

## Environment Variables (Optional)
You can still set these in `.env`, but they're now only used as fallbacks:

```env
# Square Configuration (Sandbox)
SQUARE_ACCESS_TOKEN=your_square_access_token_here
SQUARE_LOCATION_ID=your_location_id_here  # Not required anymore!
```

## Key Changes Summary

| What Changed | Before | After |
|--------------|--------|-------|
| Location ID Source | `process.env.SQUARE_LOCATION_ID` (static) | Wallet metadata or API fetch (dynamic) |
| Connect Endpoint | Only stored access token | Stores access token + location ID + metadata |
| Send Endpoint | Used hardcoded location ID | Fetches from wallet or API |
| Error Handling | Generic errors | Detailed location-specific errors |
| Debugging | Minimal logging | Comprehensive location logging |

## Troubleshooting

### Still getting "Not authorized" error?
1. **Clear your Square wallet connection** and reconnect
2. **Check your Square sandbox account** has at least one active location
3. **Verify your access token** is valid and has the correct permissions

### How to check if location is stored correctly?
Query your database:
```sql
SELECT metadata FROM connectedWallets 
WHERE provider = 'SQUARE' AND isActive = 1;
```

Should see:
```json
{
  "locationId": "LXXX...",
  "locationName": "Main Location",
  "merchantId": "MXXX...",
  "connectedAt": "2025-11-12T..."
}
```

### Access token expired?
Reconnect your Square account with a fresh access token.

## Next Steps
1. ✅ Deploy these changes to Vercel
2. ✅ Reconnect your Square account in production
3. ✅ Test invoice sending
4. ✅ Monitor logs for any location-related issues

## Files Modified
- `routes/squareInvoiceRoutes.js` - Updated both `/send` and `/connect` endpoints

## Support
If you still encounter issues:
1. Check the server logs for "📍" location-related messages
2. Verify your Square sandbox account is properly configured
3. Ensure the access token has `ORDERS_WRITE` and `INVOICES_WRITE` permissions
