# VisaBuddy Production Setup Guide

Complete guide to deploy VisaBuddy to production and submit to app stores.

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] Node.js 20+ installed
- [ ] PostgreSQL 14+ database
- [ ] Python 3.10+ (for AI service)
- [ ] Apple Developer Account ($99/year) - for iOS
- [ ] Google Play Console Account ($25 one-time) - for Android
- [ ] Domain name (recommended): `visabuddy.uz`

---

## 🔑 Required External Services

### 1. OpenAI API (CRITICAL)

**Purpose:** AI chat functionality

**Setup:**

1. Go to https://platform.openai.com
2. Create account and add payment method
3. Generate API key
4. Set monthly budget limit ($50-100 recommended)
5. Copy API key to `.env`:
   ```
   OPENAI_API_KEY=sk-your-actual-key
   ```

### 2. Firebase (CRITICAL)

**Purpose:** File storage and push notifications

**Setup:**

1. Go to https://console.firebase.google.com
2. Create project: "VisaBuddy"
3. Enable Firebase Storage
4. Enable Firebase Cloud Messaging (FCM)
5. Download service account JSON
6. Add to `.env`:
   ```
   FIREBASE_PROJECT_ID=visabuddy-prod
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@visabuddy-prod.iam.gserviceaccount.com
   STORAGE_TYPE=firebase
   ```

### 3. Google OAuth (CRITICAL)

**Purpose:** Google Sign-In

**Setup:**

1. Go to https://console.cloud.google.com
2. Create project: "VisaBuddy"
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web + iOS + Android)
5. Configure OAuth consent screen
6. Add to `.env`:
   ```
   GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-secret
   ```

### 4. Database (CRITICAL)

**Purpose:** PostgreSQL database

**Recommended:** Railway (https://railway.app)

**Setup:**

1. Create Railway account
2. Create new project
3. Add PostgreSQL database
4. Copy connection string to `.env`:
   ```
   DATABASE_URL=postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
   ```

### 5. Redis (RECOMMENDED)

**Purpose:** Caching for better performance

**Setup:**

1. In Railway, add Redis database
2. Copy connection string to `.env`:
   ```
   REDIS_URL=redis://default:password@containers-us-west-xxx.railway.app:6379
   ```

### 6. Email Service (OPTIONAL)

**Purpose:** Email notifications

**Option A: SendGrid**

1. Create account at https://sendgrid.com
2. Verify sender email
3. Generate API key
4. Add to `.env`:
   ```
   SENDGRID_API_KEY=SG.your-key
   ```

**Option B: Gmail SMTP**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 🚀 Backend Deployment

### Option A: Railway (Recommended)

1. **Create Railway Project:**

   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Link project
   cd apps/backend
   railway link
   ```

2. **Add Services:**
   - PostgreSQL database
   - Redis cache
   - Backend service (auto-detected from repo)

3. **Set Environment Variables:**
   - Go to Railway dashboard → Variables
   - Add all variables from `ENV_EXAMPLE.md`
   - Set `NODE_ENV=production`

4. **Deploy:**

   ```bash
   railway up
   ```

5. **Run Migrations:**

   ```bash
   railway run npx prisma migrate deploy
   railway run npx prisma db seed
   ```

6. **Get URL:**
   - Railway provides: `https://visabuddy-backend-production.up.railway.app`
   - Or configure custom domain: `https://api.visabuddy.uz`

### Deploy AI Service

1. **Create Separate Service in Railway:**
   - Add Python service
   - Set root directory: `apps/ai-service`

2. **Set Environment Variables:**

   ```
   OPENAI_API_KEY=sk-your-key
   PORT=8001
   ```

3. **Update Backend:**
   - Set `AI_SERVICE_URL=https://visabuddy-ai.railway.app`

---

## 📱 Mobile App Build

### iOS Build

1. **Install EAS CLI:**

   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**

   ```bash
   eas login
   ```

3. **Configure Project:**

   ```bash
   cd frontend_new
   eas build:configure
   ```

4. **Update Production API URL:**
   - Edit `eas.json`
   - Set `EXPO_PUBLIC_API_URL=https://api.visabuddy.uz`

5. **Build for iOS:**

   ```bash
   eas build --platform ios --profile production
   ```

   - EAS will prompt for Apple credentials
   - Build takes 30-60 minutes
   - Download `.ipa` file

6. **Submit to TestFlight:**
   ```bash
   eas submit --platform ios --latest
   ```

### Android Build

1. **Build APK (for testing):**

   ```bash
   eas build --platform android --profile production
   ```

2. **Build AAB (for Play Store):**

   ```bash
   eas build --platform android --profile production-aab
   ```

3. **Download Files:**
   - APK for testing
   - AAB for Play Store submission

---

## 🏪 App Store Submission

### iOS App Store

1. **Prepare Assets:**
   - App icon: 1024x1024 PNG
   - Screenshots: 6.7", 6.5", 5.5" iPhone
   - Privacy policy URL: https://visabuddy.uz/privacy
   - Support URL: https://visabuddy.uz/support

2. **App Store Connect:**
   - Upload build from TestFlight
   - Fill in app information
   - Add screenshots
   - Set pricing: Free
   - Submit for review

3. **Review Time:** 1-3 days

### Google Play Store

1. **Prepare Assets:**
   - App icon: 512x512 PNG
   - Feature graphic: 1024x500 PNG
   - Screenshots: 1080x1920 (phone), 1536x2048 (tablet)
   - Privacy policy URL: https://visabuddy.uz/privacy

2. **Google Play Console:**
   - Upload AAB file
   - Fill in store listing
   - Complete content rating
   - Set pricing: Free
   - Submit for review

3. **Review Time:** 1-3 days

---

## ✅ Pre-Launch Checklist

### Backend

- [ ] Database migrations run successfully
- [ ] All environment variables set
- [ ] OpenAI API key configured and working
- [ ] Firebase Storage configured
- [ ] Google OAuth configured
- [ ] Health endpoint returns 200: `curl https://api.visabuddy.uz/health`
- [ ] API endpoints tested
- [ ] Error monitoring setup (Sentry recommended)

### Mobile App

- [ ] Production API URL configured
- [ ] Tested on real iOS device
- [ ] Tested on real Android device
- [ ] All flows work end-to-end
- [ ] No crashes or critical bugs
- [ ] Translations complete (UZ, RU, EN)
- [ ] App icon and splash screen added
- [ ] Screenshots prepared

### Legal & Content

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support email setup: support@visabuddy.uz
- [ ] App store descriptions written
- [ ] Keywords researched

### Testing

- [ ] Registration and login work
- [ ] Questionnaire flow works
- [ ] Application creation works
- [ ] Document upload works
- [ ] AI chat works
- [ ] Language switching works
- [ ] Offline handling works

---

## 📊 Post-Launch Monitoring

### Day 1-7

- [ ] Monitor crash reports (Firebase Crashlytics)
- [ ] Monitor error logs (Railway/Sentry)
- [ ] Respond to user reviews
- [ ] Check support emails
- [ ] Monitor API performance

### Week 2-4

- [ ] Analyze user behavior (Firebase Analytics)
- [ ] Identify drop-off points
- [ ] Collect user feedback
- [ ] Plan bug fixes and improvements
- [ ] Prepare version 1.1

---

## 🆘 Troubleshooting

### Backend won't start

- Check `DATABASE_URL` is correct
- Check `JWT_SECRET` is at least 32 characters
- Check PostgreSQL is accessible
- Check logs: `railway logs`

### AI chat not working

- Check `OPENAI_API_KEY` is set
- Check AI service is running
- Check `AI_SERVICE_URL` is correct
- Test AI service: `curl https://visabuddy-ai.railway.app/health`

### Document upload fails

- Check Firebase Storage is configured
- Check storage rules allow uploads
- Check file size limits (20MB max)
- Check file types are allowed

### Google Sign-In not working

- Check `GOOGLE_CLIENT_ID` is set
- Check OAuth consent screen is configured
- Check redirect URIs are correct
- Test on real device (emulators can have issues)

---

## 📞 Support

For deployment help:

- Email: support@visabuddy.uz
- Check logs in Railway dashboard
- Review error messages carefully
- Test each service independently

---

**Last Updated:** November 2024  
**Version:** 1.0.0
