# SMTP Email Service Setup Guide

## Overview
The application now uses SMTP for reliable email delivery. It's configured to work with Gmail SMTP by default, but can be configured for any SMTP provider.

## Current Configuration

### Environment Variables (.env)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=5compropertiesllc@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=5compropertiesllc@gmail.com
EMAIL_TESTING=rminhal783@gmail.com
```

## Setup Instructions

### For Gmail SMTP (Recommended for Development)

#### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/
2. Click "Security" in the left sidebar
3. Enable "2-Step Verification" if not already enabled

#### Step 2: Generate Gmail App Password
1. Visit https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer" (or your device)
3. Google will generate a 16-character password like: `abcd efgh ijkl mnop`
4. Copy this password

#### Step 3: Update .env File
Replace the placeholder password with your actual Gmail App Password:

```
SMTP_PASSWORD=abcd efgh ijkl mnop
```

**Important**: The password includes spaces and is exactly 16 characters.

### For SendGrid SMTP (Production)

If you want to use SendGrid instead:

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

### For Other SMTP Providers

Update the SMTP configuration with your provider's details:

```
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@yourdomain.com
```

## Testing Email Service

### Test Script
Run the test script to verify SMTP configuration:

```bash
node test-sendgrid-otp.js
```

**Expected Output:**
```
🧪 Testing SendGrid OTP Email Service...

📧 Test Configuration:
   - Email: rminhal783@gmail.com
   - OTP: 123456
   - API Key: ✅ Configured

📤 Sending test OTP email...
📧 Sending email to: rminhal783@gmail.com
✅ Email sent successfully: <message-id>
```

### Manual Testing
Send a test OTP via API:

```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"booali654@gmail.com"}'
```

Expected response:
```json
{
  "message": "OTP sent successfully",
  "status_code": 201
}
```

## OTP Email Features

- **Professional Design**: Modern HTML template with Qosyne branding
- **6-Digit Code**: Large, easy-to-read OTP display
- **10-Minute Expiration**: Clear expiration notice
- **Security Tips**: Reminds users not to share the code
- **Responsive Layout**: Works on all email clients

## Email Service Flow

```
User Request (Register/Login)
    ↓
authController.sendOtp()
    ↓
authUtils.sendOtp()
    ├─ Generate 6-digit OTP
    ├─ Save to database
    └─ Send email
        ↓
    emailService.sendEmail()
        ↓
    SMTP Server (Gmail/SendGrid/Other)
        ↓
    User receives email
```

## Troubleshooting

### Error: "Invalid login: 535 Username and Password not accepted"
- **Cause**: Wrong password or Gmail 2FA not enabled
- **Fix**: 
  1. Enable 2-Factor Authentication on Gmail
  2. Generate a new App Password
  3. Update SMTP_PASSWORD in .env

### Error: "Maximum credits exceeded"
- **Cause**: SendGrid account out of credits
- **Fix**: Use Gmail SMTP instead or upgrade SendGrid account

### Error: "Connection timeout"
- **Cause**: SMTP server unreachable
- **Fix**: Check SMTP_HOST and SMTP_PORT are correct

### Email not received
- **Cause**: Email marked as spam or wrong recipient
- **Fix**: 
  1. Check spam/junk folder
  2. Verify recipient email address
  3. Check server logs for errors

## Production Deployment (DigitalOcean)

For production on DigitalOcean:

1. **Update .env on Vercel**:
   - Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
   - Use production email service (SendGrid recommended)

2. **Use SendGrid for Production**:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=SG.your_production_key
   ```

3. **Test in Production**:
   - Deploy to Vercel
   - Test OTP endpoint
   - Verify emails are received

## Email Templates

OTP emails include:
- Qosyne branding and logo
- 6-digit verification code (large, monospace font)
- 10-minute expiration warning
- Security tips
- Footer with copyright and website link

Template location: `emails/emailTemplates.js`

## Rate Limiting

- **Max 3 OTPs per 10 minutes** per user
- Expired OTPs automatically cleaned up
- Prevents spam and brute force attacks

## Security Considerations

1. **Never commit .env file** - Already in .gitignore
2. **Use App Passwords** - Not your main Gmail password
3. **Rotate credentials** - Periodically update passwords
4. **Monitor logs** - Check for failed email attempts
5. **HTTPS only** - Always use HTTPS in production

## Support

For issues with:
- **Gmail**: https://support.google.com/mail
- **SendGrid**: https://sendgrid.com/docs
- **Nodemailer**: https://nodemailer.com/
