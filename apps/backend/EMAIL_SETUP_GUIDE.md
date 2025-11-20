# Email Service Setup Guide

## Overview
VisaBuddy supports two email providers:
1. **SendGrid** (recommended for production)
2. **SMTP** (Gmail, Outlook, or any SMTP server)

## Option 1: SendGrid (Recommended)

### Why SendGrid?
- Reliable delivery
- 100 emails/day free tier
- Easy setup
- Better for production

### Setup Steps:

1. **Create SendGrid Account**
   - Go to https://sendgrid.com/
   - Sign up for free account

2. **Create API Key**
   - Dashboard → Settings → API Keys
   - Click "Create API Key"
   - Name: "VisaBuddy Backend"
   - Permissions: "Full Access" or "Mail Send"
   - Copy the API key (you won't see it again!)

3. **Add to Environment**
   
   In `apps/backend/.env`:
   ```bash
   # Email Configuration (SendGrid)
   SENDGRID_API_KEY=SG.your-api-key-here
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=VisaBuddy
   ```

4. **Verify Sender Email**
   - SendGrid → Settings → Sender Authentication
   - Verify your sender email address
   - Click verification link in email

### Test It:
```bash
npm run dev
# Should see: ✓ Email Service ready (SendGrid + Nodemailer fallback)
```

---

## Option 2: SMTP (Gmail Example)

### Setup Gmail SMTP:

1. **Enable 2-Factor Authentication**
   - Google Account → Security → 2-Step Verification

2. **Create App Password**
   - Google Account → Security → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name: "VisaBuddy Backend"
   - Copy the 16-character password

3. **Add to Environment**
   
   In `apps/backend/.env`:
   ```bash
   # Email Configuration (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   SMTP_FROM_NAME=VisaBuddy
   ```

### Test It:
```bash
npm run dev
# Should see: ✓ Email Service ready (SendGrid + Nodemailer fallback)
```

---

## For Production (Railway):

Add environment variables in Railway dashboard:

### SendGrid:
```
SENDGRID_API_KEY=SG.your-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=VisaBuddy
```

### OR SMTP:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=VisaBuddy
```

---

## Without Email Service

If you don't configure email:
- ✅ App still works
- ⚠️ Emails are logged to console instead
- ⚠️ Users won't receive:
  - Password reset emails
  - Verification emails
  - Notification emails

**For testing:** It's fine to leave unconfigured
**For production:** You should configure one

---

## Troubleshooting

### "Invalid API Key" (SendGrid)
- Regenerate API key in SendGrid dashboard
- Make sure no extra spaces in .env file

### "Authentication failed" (SMTP)
- Make sure you're using App Password, not regular password
- Enable "Less secure app access" (not recommended)
- Try port 465 with SMTP_SECURE=true

### "Sender address not verified"
- Verify your sender email in SendGrid
- For Gmail, use the Gmail account that created the App Password

---

**Quick Start (Development):**
Leave it unconfigured - emails will be logged to console. ✅




