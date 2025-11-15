# 📋 Phase 2 - Step-by-Step Setup Guide

**Follow these steps in order. Each step builds on the previous one.**

---

## 🔑 Step 1: OpenAI API (30 min) ⏳ CURRENT STEP

### What you need:
- OpenAI account
- Payment method (credit card)
- API key

### Steps:
1. Go to: https://platform.openai.com
2. Sign up / Log in
3. Add payment method (Settings → Billing)
4. Go to: https://platform.openai.com/api-keys
5. Click "Create new secret key"
6. Name: "VisaBuddy Production"
7. **Copy the key** (starts with `sk-`)
8. Set usage limit: $50-100/month (Settings → Limits)

### ✅ Done? Tell me your API key and I'll add it to .env files!

---

## 🔥 Step 2: Firebase (1 hour)

### What you need:
- Google account
- Firebase project
- Service account JSON

### Steps:
1. Go to: https://console.firebase.google.com
2. Click "Add project"
3. Project name: "VisaBuddy"
4. Disable Google Analytics (optional)
5. Click "Create project"

**Enable Storage:**
6. Go to: Storage → Get started
7. Start in test mode (we'll secure it later)
8. Choose location (closest to your users)

**Enable Cloud Messaging:**
9. Go to: Project Settings → Cloud Messaging
10. Note the Server key (we'll use this later)

**Get Service Account:**
11. Go to: Project Settings → Service Accounts
12. Click "Generate new private key"
13. Download JSON file
14. **Save this file securely!**

### ✅ Done? Tell me and I'll help configure Firebase in .env!

---

## 🔐 Step 3: Google OAuth (1 hour)

### What you need:
- Google Cloud project
- OAuth credentials (Web + iOS + Android)

### Steps:
1. Go to: https://console.cloud.google.com
2. Create project: "VisaBuddy"
3. Enable APIs:
   - Go to: APIs & Services → Library
   - Search "Google+ API" → Enable
   - Search "People API" → Enable

**Configure OAuth Consent Screen:**
4. Go to: APIs & Services → OAuth consent screen
5. User Type: External
6. App name: "VisaBuddy"
7. Support email: your email
8. Developer contact: your email
9. Save and continue (skip scopes for now)
10. Add test users (your email)
11. Save

**Create OAuth Credentials:**
12. Go to: APIs & Services → Credentials
13. Click "Create Credentials" → "OAuth client ID"
14. Application type: Web application
15. Name: "VisaBuddy Web"
16. Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
17. Click "Create"
18. **Copy Client ID and Client Secret**

**Create iOS OAuth:**
19. Create another OAuth client ID
20. Type: iOS
21. Bundle ID: `com.visabuddy.app` (or your bundle ID)
22. **Copy Client ID**

**Create Android OAuth:**
23. Create another OAuth client ID
24. Type: Android
25. Package name: `com.visabuddy.app` (or your package name)
26. SHA-1: (we'll get this from EAS later)
27. **Copy Client ID**

### ✅ Done? Share the credentials and I'll add them!

---

## 🗄️ Step 4: Railway Database (1 hour)

### What you need:
- Railway account
- PostgreSQL database
- Redis (optional but recommended)

### Steps:
1. Go to: https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Click "New" → "Database" → "Add PostgreSQL"
5. Wait for database to provision
6. Click on database → "Connect" tab
7. **Copy the DATABASE_URL** (postgresql://...)

**Add Redis (Optional):**
8. Click "New" → "Database" → "Add Redis"
9. Wait for Redis to provision
10. Click on Redis → "Connect" tab
11. **Copy the REDIS_URL** (redis://...)

### ✅ Done? Share the connection strings!

---

## ⚙️ Step 5: Configure .env Files (30 min)

Once you have all credentials, I'll help you:
1. Create `apps/backend/.env`
2. Create `apps/ai-service/.env`
3. Create `frontend_new/.env`
4. Add all API keys and credentials
5. Generate JWT secret

### ✅ I'll do this for you once you have all credentials!

---

## 🧪 Step 6: Test Locally (1 hour)

### Backend:
```bash
cd apps/backend
npm install
npx prisma migrate dev
npm run dev
```

### AI Service:
```bash
cd apps/ai-service
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8001
```

### Test:
- Backend: http://localhost:3000/health
- AI Service: http://localhost:8001/health

### ✅ Working? Great! Next step is deployment!

---

## 🚀 Step 7: Deploy to Railway (2-3 hours)

### Backend Deployment:
1. Railway → New Project
2. Deploy from GitHub repo
3. Select `apps/backend` as root
4. Add all environment variables
5. Deploy

### AI Service Deployment:
1. Railway → New Service
2. Deploy from GitHub repo
3. Select `apps/ai-service` as root
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables
7. Deploy

### Run Migrations:
```bash
railway run npx prisma migrate deploy
```

### ✅ Deployed? Test production endpoints!

---

## 📱 Step 8: Build Mobile Apps (2-3 hours)

### iOS:
```bash
cd frontend_new
eas build --platform ios --profile production
```

### Android:
```bash
eas build --platform android --profile production
```

### ✅ Built? Test on real devices!

---

## 📝 Step 9: Create Assets (2-3 hours)

- App icon (1024x1024)
- Screenshots (6-10 images)
- Privacy policy
- Terms of service

### ✅ Done? Ready for submission!

---

## 🏪 Step 10: Submit to Stores (1-2 days)

### iOS App Store:
1. App Store Connect
2. Create app
3. Upload build
4. Fill metadata
5. Submit for review

### Google Play:
1. Play Console
2. Create app
3. Upload AAB
4. Fill store listing
5. Submit for review

### ✅ Submitted? Wait for approval (1-3 days)!

---

## 🎉 Step 11: LAUNCH!

Once approved:
- 🎊 Celebrate!
- 📢 Announce launch
- 📊 Monitor metrics
- 🐛 Fix any bugs

---

## 💡 Pro Tips

1. **One step at a time** - Don't rush
2. **Save all credentials** - You'll need them
3. **Test as you go** - Catch issues early
4. **Read error messages** - They're helpful
5. **Ask for help** - I'm here to assist!

---

**Ready to start? Begin with Step 1 (OpenAI)! 🚀**

