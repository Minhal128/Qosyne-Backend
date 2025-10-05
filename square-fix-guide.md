# 🚨 URGENT: Square Authentication Fix

## The Problem
Your Square access token `EAAAl5Dj1aLTyBjmamYciNS4s2E0_KHAtwwf3bTFyPACrYp1x90mm3t56m6sJ5KB` is **EXPIRED or INVALID**.

## IMMEDIATE FIX (2 minutes)

### Option 1: Get New Sandbox Token (FASTEST)
1. Go to: https://developer.squareup.com/apps
2. Log into your Square Developer account
3. Select your app (or create one if needed)
4. Go to "Sandbox" tab
5. Click "Show" next to "Sandbox Access Token"
6. Copy the NEW token
7. Update your `.env` file:
   ```
   SQUARE_ACCESS_TOKEN=YOUR_NEW_TOKEN_HERE
   ```

### Option 2: Verify Environment Settings
Check your `.env` file has these exact variables:
```env
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=EAAAyour-new-token-here
SQUARE_LOCATION_ID=LS83F8685XZ8K
SQUARE_APPLICATION_ID=sandbox-sq0idb-imVKGn-I4rVRGXIvWqL7yg
```

## Test the Fix
After updating the token, test with:
```bash
curl -X GET "http://localhost:5000/api/health/square"
```

## Production Checklist
- [ ] Sandbox tokens expire frequently - use production tokens for live app
- [ ] Production tokens are longer-lived
- [ ] Make sure SQUARE_ENVIRONMENT matches your token type

## Token Formats
- **Sandbox**: Starts with `EAAA...`
- **Production**: Starts with `sq0atp-...`

---
**The client demo will work once you update the access token!** 🚀
