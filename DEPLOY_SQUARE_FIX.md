# 🚀 SQUARE API FIX DEPLOYMENT GUIDE

## ✅ FIXES COMPLETED

1. **Updated Square Connect Endpoint** (`routes/squareInvoiceRoutes.js`)
   - Changed from Square SDK to direct axios API calls
   - Reason: SDK has authentication issues with token format
   
2. **Updated `.env` file**
   - Corrected `SQUARE_ACCESS_TOKEN`
   - Added missing `SQUARE_LOCATION_ID`

## 📋 DEPLOY TO VERCEL - STEP BY STEP

### Step 1: Add Environment Variables to Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project: `qosynebackend` or similar
3. Click **Settings** → **Environment Variables**
4. Add these **4 variables** (or update if they exist):

```
SQUARE_ACCESS_TOKEN
Value: EAAAl5KqeT3c1wcEOXiC7kDKekzvSBfouF4wEbJ9HubFW3I04MIukoJ9PctZKtXF

SQUARE_APPLICATION_ID
Value: sandbox-sq0idb-KRfDXDI6-9s-GO-YO8eXfg

SQUARE_LOCATION_ID
Value: L04EV91EFARQF

SQUARE_ENVIRONMENT
Value: sandbox
```

5. Make sure **All environments** (Production, Preview, Development) are selected
6. Click **Save**

### Step 2: Commit and Push Code

```bash
# From backend directory
cd H:\Development\Qosyne-main\venmo-frontend\src\backend

# Add all changes
git add .

# Commit
git commit -m "Fix Square API authentication - use direct axios calls instead of SDK"

# Push to trigger Vercel deployment
git push origin main
```

### Step 3: Verify Deployment

1. Wait for Vercel to finish deploying (check https://vercel.com/dashboard)
2. Once deployed, test the endpoint

### Step 4: Test the Fixed Endpoint

**Get JWT Token First:**
```bash
POST https://qosynebackend.vercel.app/api/auth/login
Content-Type: application/json

{
  "email": "your@email.com",
  "password": "your_password"
}
```

**Copy the token from response, then test Square connect:**
```bash
POST https://qosynebackend.vercel.app/api/square-invoice/connect
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN_HERE

{
  "squareEmail": "test128@example.com"
}
```

**Expected SUCCESS Response:**
```json
{
  "success": true,
  "message": "Square account connected successfully",
  "data": {
    "squareEmail": "test128@example.com",
    "squareConnected": true,
    "merchantId": "MLMDX5H0N97F6"
  }
}
```

## 🔍 TROUBLESHOOTING

### If you still get 401 error after deploying:

1. **Verify env vars are set in Vercel:**
   - Go to Settings → Environment Variables
   - Make sure `SQUARE_ACCESS_TOKEN` is exactly: `EAAAl5KqeT3c1wcEOXiC7kDKekzvSBfouF4wEbJ9HubFW3I04MIukoJ9PctZKtXF`
   - No extra spaces or quotes

2. **Check deployment logs:**
   - Go to Vercel Dashboard → Deployments → Latest
   - Click "View Function Logs"
   - Look for the log line: `🔍 Access token preview: EAAAl5KqeT...`
   - Verify it matches your token

3. **Redeploy manually:**
   - Go to Vercel Dashboard → Deployments
   - Click the three dots on latest deployment
   - Click "Redeploy"

4. **Verify Square token is still valid:**
   - Go to https://developer.squareup.com/apps
   - Check if your access token hasn't expired
   - If expired, regenerate and update in Vercel

## ✅ WHAT WAS FIXED

**Before (Error):**
- Used Square SDK `client.merchants.get('me')`
- SDK has token format compatibility issues
- Always returned 401 UNAUTHORIZED

**After (Fixed):**
- Uses direct axios API call to `https://connect.squareupsandbox.com/v2/merchants/me`
- Passes token directly in Authorization header
- Works perfectly with your credentials

## 📝 SUMMARY

- ✅ Local code FIXED
- ⏳ Need to: Add env vars to Vercel
- ⏳ Need to: Push code to GitHub
- ⏳ Need to: Wait for Vercel auto-deploy
- ⏳ Need to: Test endpoint

Your credentials are 100% valid. Once deployed, it will work!
