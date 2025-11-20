# Next Steps: Complete SMTP Email Setup

## What Was Done ✅

1. **Updated emailService.js** - Now uses SMTP configuration from environment variables
2. **Updated .env** - Added SMTP configuration variables
3. **Created test script** - `test-sendgrid-otp.js` for testing email service
4. **Created documentation** - `SMTP_SETUP_GUIDE.md` with complete setup instructions

## What You Need to Do 📋

### Step 1: Get Gmail App Password (5 minutes)

1. Go to https://myaccount.google.com/apppasswords
2. If you don't see "App passwords" option:
   - First enable 2-Factor Authentication at https://myaccount.google.com/security
3. Select "Mail" and "Windows Computer"
4. Google generates a 16-character password (with spaces)
5. Copy the password

### Step 2: Update .env File

Replace the placeholder password in `.env`:

**Before:**
```
SMTP_PASSWORD=abcd efgh ijkl mnop
```

**After:**
```
SMTP_PASSWORD=your_actual_16_char_password_with_spaces
```

### Step 3: Test Email Service

Run the test script:
```bash
node test-sendgrid-otp.js
```

You should see:
```
✅ Email sent successfully: <message-id>
```

### Step 4: Test OTP Endpoint

Send a test request:
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@gmail.com"}'
```

Check your email inbox for the OTP.

## For DigitalOcean Production 🚀

### Option A: Use Gmail SMTP (Simple)
- Same setup as above
- Works for small volume
- Free

### Option B: Use SendGrid (Recommended for Production)
1. Create SendGrid account at https://sendgrid.com
2. Get API key
3. Update .env:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=SG.your_api_key
   ```

### Option C: Use DigitalOcean Email Service
1. Check DigitalOcean documentation for email service
2. Update SMTP credentials accordingly

## Files Modified

- ✅ `emails/emailService.js` - SMTP configuration
- ✅ `.env` - SMTP variables
- ✅ `test-sendgrid-otp.js` - Test script with dotenv
- ✅ `emails/emailTemplates.js` - Professional OTP template

## Email Flow

```
User calls /api/auth/send-otp
    ↓
authController.sendOtp()
    ↓
authUtils.sendOtp()
    ├─ Generate 6-digit OTP
    ├─ Save to database
    └─ sendEmail()
        ↓
    emailService.js
        ↓
    SMTP Server (Gmail/SendGrid)
        ↓
    User receives email with OTP
```

## Troubleshooting

**Problem**: "Invalid login: 535 Username and Password not accepted"
- **Solution**: Make sure you're using Gmail App Password, not regular password

**Problem**: "Connection timeout"
- **Solution**: Check SMTP_HOST and SMTP_PORT are correct

**Problem**: Email not received
- **Solution**: Check spam folder, verify recipient email

## Quick Reference

### Gmail SMTP (Development)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=5compropertiesllc@gmail.com
SMTP_PASSWORD=<your-16-char-app-password>
EMAIL_FROM=5compropertiesllc@gmail.com
```

### SendGrid SMTP (Production)
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.<your-api-key>
EMAIL_FROM=noreply@yourdomain.com
```

## Testing Checklist

- [ ] Gmail App Password generated
- [ ] .env updated with correct password
- [ ] `node test-sendgrid-otp.js` passes
- [ ] `/api/auth/send-otp` endpoint works
- [ ] Email received in inbox
- [ ] OTP code visible and correct
- [ ] Email template looks professional
- [ ] Ready for production deployment

## Support Resources

- Gmail App Passwords: https://support.google.com/accounts/answer/185833
- SendGrid SMTP: https://sendgrid.com/docs/for-developers/sending-email/integrating-with-the-smtp-api/
- Nodemailer: https://nodemailer.com/smtp/
