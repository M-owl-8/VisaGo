# Phase 2 Quick Start Guide

**Goal:** Get VisaBuddy live on App Store and Play Store in 3-4 weeks

---

## Week 3: Setup & Testing

### Day 11: External Services (4-5 hours)

**Morning:**
```bash
# 1. OpenAI (30 min)
→ https://platform.openai.com
→ Create account → Add payment → Generate API key
→ Copy to apps/backend/.env: OPENAI_API_KEY=sk-...
→ Copy to apps/ai-service/.env: OPENAI_API_KEY=sk-...

# 2. Firebase (1 hour)
→ https://console.firebase.google.com
→ Create project "VisaBuddy"
→ Enable Storage + Cloud Messaging
→ Download service account JSON
→ Copy credentials to .env

# 3. Google OAuth (1 hour)
→ https://console.cloud.google.com
→ Create project → Enable APIs
→ Create OAuth credentials (Web + iOS + Android)
→ Copy to .env
```

**Afternoon:**
```bash
# 4. Railway Database (1 hour)
→ https://railway.app
→ Create project → Add PostgreSQL + Redis
→ Copy connection strings to .env

# 5. Test Locally (1 hour)
cd apps/backend
npm install
npx prisma migrate dev
npm run dev

cd apps/ai-service
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8001

# Test: curl http://localhost:3000/health
# Test: curl http://localhost:8001/health
```

### Day 12: Deploy Backend (4-6 hours)

```bash
# 1. Deploy to Railway
→ Railway dashboard → New Project
→ Add backend service (auto-detect from GitHub)
→ Add AI service (Python, root: apps/ai-service)
→ Set all environment variables
→ Deploy

# 2. Run Migrations
railway run npx prisma migrate deploy
railway run npx prisma db seed

# 3. Test Production
curl https://api.visabuddy.uz/health
curl https://api.visabuddy.uz/api/countries

# 4. Update Frontend
→ Edit frontend_new/eas.json
→ Set EXPO_PUBLIC_API_URL=https://api.visabuddy.uz
```

### Day 13-15: Device Testing (3 days)

**iOS (Day 13):**
```bash
cd frontend_new
eas build --platform ios --profile production
# Wait 30-60 min for build
# Upload to TestFlight
# Install on iPhone
# Test all flows
# Document bugs
```

**Android (Day 14):**
```bash
eas build --platform android --profile production
# Wait 30-60 min for build
# Download APK
# Install on Android phone
# Test all flows
# Document bugs
```

**Bug Fixes (Day 15):**
- Fix critical bugs
- Rebuild if needed
- Retest

### Day 16-17: Assets & Content (2 days)

**Create:**
- App icon (1024x1024)
- Splash screen
- Screenshots (6-10 images)
- Feature graphic (Android)
- Privacy policy
- Terms of service

---

## Week 4: Launch

### Day 20: Final Deployment (4-6 hours)

```bash
# Verify production backend
curl https://api.visabuddy.uz/health

# Create production .env
# Deploy final version
# Run final tests
```

### Day 21: Production Builds (6-8 hours)

```bash
# iOS
eas build --platform ios --profile production
eas submit --platform ios --latest

# Android
eas build --platform android --profile production-aab
# Download AAB for manual upload
```

### Day 22-24: App Store Submission (8-12 hours + review time)

**iOS App Store:**
1. App Store Connect → Upload build
2. Fill app information
3. Add screenshots
4. Add privacy policy URL
5. Submit for review
6. Wait 1-3 days
7. Release!

**Google Play Store:**
1. Play Console → Upload AAB
2. Fill store listing
3. Add screenshots
4. Complete content rating
5. Submit for review
6. Wait 1-3 days
7. Release!

---

## 📋 Checklist Format

Print this and check off as you go:

```
□ OpenAI API configured
□ Firebase configured
□ Google OAuth configured
□ Railway database setup
□ Backend deployed
□ AI service deployed
□ iOS build created
□ Android build created
□ iOS tested on real device
□ Android tested on real device
□ App icon created
□ Screenshots created
□ Privacy policy published
□ Terms published
□ Support email setup
□ iOS submitted
□ Android submitted
□ iOS approved
□ Android approved
□ APP IS LIVE! 🎉
```

---

## ⚡ Critical Path (Must Do in Order)

1. **OpenAI + Firebase** → Without these, app won't work
2. **Database** → Without this, app won't start
3. **Backend Deployment** → Must be live before mobile builds
4. **Real Device Testing** → Must test before submission
5. **Privacy Policy** → Required by app stores
6. **App Store Submission** → Final step

---

## 🆘 Emergency Contacts

**If stuck:**
1. Check `PRODUCTION_SETUP_GUIDE.md`
2. Check Railway logs
3. Check EAS build logs
4. Google the specific error
5. Check service status pages

---

## 💡 Pro Tips

1. **Start early in the day** - Some steps take hours
2. **Don't rush device testing** - Bugs found now save headaches later
3. **Read rejection reasons carefully** - App stores are specific
4. **Keep credentials safe** - Never commit .env files
5. **Test on real devices** - Emulators hide issues
6. **Monitor after launch** - First week is critical

---

## 🎯 Success Metrics

**Week 1:**
- 100+ downloads
- 50+ active users
- 20+ applications created
- < 5% crash rate

**Month 1:**
- 1,000+ downloads
- 500+ active users
- 200+ applications created
- 4+ star rating

---

## 📞 Support

**Need help with Phase 2?**
- Review the guides carefully
- Test each step independently
- Check logs for errors
- Most issues are configuration-related

---

**You've got this! Phase 1 is done, Phase 2 is straightforward. See you at launch! 🚀**


