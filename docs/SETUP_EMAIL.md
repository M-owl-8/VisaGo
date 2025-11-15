# 📧 Email Service Setup Guide

**Service**: Email Delivery (SendGrid or SMTP)  
**Required For**: Email notifications, password resets  
**Difficulty**: Easy  
**Time**: 15-20 minutes

---

## 📋 Overview

VisaBuddy supports two email service options:
- **SendGrid** (Recommended): Cloud email service
- **SMTP**: Direct SMTP connection (Gmail, Outlook, etc.)

---

## 🚀 Option 1: SendGrid Setup (Recommended)

### Step 1: Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Click **"Start for free"**
3. Complete account creation:
   - Email verification
   - Phone verification

### Step 2: Verify Sender Identity

1. Go to **"Settings"** > **"Sender Authentication"**
2. Choose verification method:
   - **Single Sender Verification** (easier, for testing)
   - **Domain Authentication** (recommended for production)

#### Single Sender Verification:
1. Click **"Verify a Single Sender"**
2. Fill in sender information:
   - From email: `noreply@yourdomain.com`
   - From name: `VisaBuddy`
   - Reply to: Your support email
3. Click **"Create"**
4. Check your email and click verification link

#### Domain Authentication (Production):
1. Click **"Authenticate Your Domain"**
2. Enter your domain
3. Add DNS records provided by SendGrid
4. Wait for verification (can take up to 48 hours)

### Step 3: Create API Key

1. Go to **"Settings"** > **"API Keys"**
2. Click **"Create API Key"**
3. Enter name: `VisaBuddy Production`
4. Select permissions: **"Full Access"** (or **"Mail Send"** only)
5. Click **"Create & View"**
6. **IMPORTANT**: Copy the API key immediately!
   - You won't be able to see it again
   - Format: `SG.xxxxx...`

### Step 4: Configure Environment Variables

Add to `apps/backend/.env`:

```env
SENDGRID_API_KEY=SG.your-api-key-here
```

**⚠️ IMPORTANT**:
- Never commit API keys to git
- Use different keys for development and production
- Rotate keys if exposed

---

## 🚀 Option 2: SMTP Setup (Gmail/Outlook/Other)

### Gmail Setup

1. Go to [Google Account](https://myaccount.google.com/)
2. Go to **"Security"** > **"2-Step Verification"** (enable if not enabled)
3. Go to **"App passwords"**
4. Click **"Select app"** > **"Mail"**
5. Click **"Select device"** > **"Other"** > Enter "VisaBuddy"
6. Click **"Generate"**
7. Copy the 16-character app password

### Outlook/Office 365 Setup

1. Go to [Microsoft Account](https://account.microsoft.com/)
2. Go to **"Security"** > **"Advanced security options"**
3. Enable **"App passwords"**
4. Generate app password for "Mail"
5. Copy the password

### Generic SMTP Setup

For other providers, get:
- SMTP host (e.g., `smtp.gmail.com`)
- SMTP port (usually `587` for TLS or `465` for SSL)
- Username (your email)
- Password (app password or account password)

### Configure Environment Variables

Add to `apps/backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**For Gmail**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

**For Outlook**:
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-app-password
```

---

## ✅ Verification

### Test Email Sending:

1. **Start Backend**:
   ```bash
   cd apps/backend
   npm run dev
   ```

2. **Test Email** (using API or test endpoint):
   ```bash
   curl -X POST http://localhost:3000/api/test/email \
     -H "Content-Type: application/json" \
     -d '{"to": "your-email@example.com", "subject": "Test", "text": "Test email"}'
   ```

3. **Check**:
   - Email received in inbox
   - Check spam folder if not received
   - Verify sender address is correct

---

## 🔧 Troubleshooting

### Error: "Invalid API key" (SendGrid)

**Problem**: API key is incorrect or expired.

**Solution**:
- Verify key starts with `SG.`
- Check for extra spaces
- Regenerate key if needed
- Ensure key has "Mail Send" permission

### Error: "Authentication failed" (SMTP)

**Problem**: Username or password is incorrect.

**Solution**:
- Verify username is correct email
- For Gmail, use app password (not account password)
- Check if 2FA is enabled (required for app passwords)
- Verify SMTP host and port are correct

### Error: "Connection timeout"

**Problem**: SMTP server is unreachable or firewall blocking.

**Solution**:
- Check SMTP host and port
- Verify firewall allows outbound connections
- Try different port (587 vs 465)
- Check if provider requires VPN

### Emails going to spam

**Problem**: Email reputation or SPF/DKIM not configured.

**Solution**:
- Set up SPF record for your domain
- Configure DKIM (SendGrid does this automatically)
- Use verified sender address
- Avoid spam trigger words
- Warm up new email addresses gradually

---

## 🚀 Production Setup

### Additional Steps for Production:

1. **Domain Authentication** (SendGrid):
   - Authenticate your domain
   - Set up SPF and DKIM records
   - Verify domain ownership

2. **Email Templates**:
   - Create professional email templates
   - Use consistent branding
   - Include unsubscribe links (if required)

3. **Monitoring**:
   - Set up email delivery monitoring
   - Track bounce rates
   - Monitor spam complaints
   - Set up alerts for failures

4. **Rate Limits**:
   - SendGrid: 100 emails/day (free), unlimited (paid)
   - Gmail: 500 emails/day
   - Outlook: 300 emails/day
   - Consider upgrading if needed

---

## 💰 Pricing

**SendGrid**:
- **Free**: 100 emails/day
- **Essentials**: $19.95/month, 50K emails
- **Pro**: $89.95/month, 100K emails

**SMTP** (Gmail/Outlook):
- **Free**: Limited (500/day for Gmail, 300/day for Outlook)
- **Paid**: Varies by provider

**Recommendation**: Use SendGrid for production (better deliverability, higher limits).

---

## 📚 Additional Resources

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [Outlook SMTP Settings](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353)

---

## ✅ Checklist

### SendGrid:
- [ ] SendGrid account created
- [ ] Sender verified (single sender or domain)
- [ ] API key created
- [ ] API key added to .env
- [ ] Test email sent successfully
- [ ] Domain authenticated (for production)

### SMTP:
- [ ] SMTP credentials obtained
- [ ] App password created (for Gmail/Outlook)
- [ ] SMTP settings added to .env
- [ ] Test email sent successfully
- [ ] Spam folder checked

---

## 🎯 Email Types in VisaBuddy

The app sends these types of emails:
- **Welcome emails**: New user registration
- **Password reset**: Forgot password flow
- **Application updates**: Visa application status changes
- **Payment confirmations**: Payment receipts
- **Notifications**: Important updates

All emails are sent through the configured email service.

---

**Last Updated**: January 2025  
**Status**: ✅ Ready for use








