# 🚀 Phase 2 - Next Steps Guide

**Current Status:** ✅ OpenAI configured, dependencies installed  
**Next:** Setup Firebase, Google OAuth, and Railway Database

---

## ✅ Completed Steps

1. ✅ OpenAI API key configured
2. ✅ .env files created
3. ✅ Backend dependencies installed
4. ✅ AI service dependencies installed
5. ✅ Database migrations ready

---

## 🎯 Next: Setup Firebase (1 hour)

### Why Firebase?
- **File Storage:** Store user-uploaded documents
- **Push Notifications:** Notify users about application updates

### Step-by-Step:

#### 1. Create Firebase Project (10 min)
1. Go to: https://console.firebase.google.com
2. Click **"Add project"**
3. Project name: **"VisaBuddy"**
4. Disable Google Analytics (optional, can enable later)
5. Click **"Create project"**
6. Wait for project creation (30 seconds)

#### 2. Enable Firebase Storage (15 min)
1. In Firebase Console, click **"Storage"** in left menu
2. Click **"Get started"**
3. Choose **"Start in test mode"** (we'll secure it later)
4. Select location: **Choose closest to your users** (e.g., `us-central1` or `europe-west1`)
5. Click **"Done"**

#### 3. Enable Cloud Messaging (10 min)
1. In Firebase Console, click **"Cloud Messaging"** in left menu
2. If prompted, click **"Enable"**
3. Note the **Server key** (we'll use this later for notifications)

#### 4. Get Service Account (15 min)
1. Click the **gear icon** ⚙️ next to "Project Overview"
2. Click **"Project settings"**
3. Go to **"Service accounts"** tab
4. Click **"Generate new private key"**
5. Click **"Generate key"** in the popup
6. **Download the JSON file** - Save it securely!
7. **IMPORTANT:** Keep this file safe - it contains admin credentials

#### 5. Extract Credentials from JSON
Open the downloaded JSON file. You'll need:
- `project_id` → `FIREBASE_PROJECT_ID`
- `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and newlines)
- `client_email` → `FIREBASE_CLIENT_EMAIL`

### ✅ Once you have Firebase credentials, tell me and I'll add them to .env!

---

## 🔐 After Firebase: Setup Google OAuth (1 hour)

### Why Google OAuth?
- **Google Sign-In:** Let users sign in with their Google account
- **Better UX:** Faster registration/login

### Step-by-Step:

#### 1. Create Google Cloud Project (10 min)
1. Go to: https://console.cloud.google.com
2. Click **"Select a project"** → **"New Project"**
3. Project name: **"VisaBuddy"**
4. Click **"Create"**
5. Wait for project creation

#### 2. Enable APIs (10 min)
1. Go to: **APIs & Services** → **Library**
2. Search **"Google+ API"** → Click → **Enable**
3. Search **"People API"** → Click → **Enable**

#### 3. Configure OAuth Consent Screen (20 min)
1. Go to: **APIs & Services** → **OAuth consent screen**
2. User Type: **External** → Click **"Create"**
3. Fill in:
   - App name: **"VisaBuddy"**
   - User support email: **Your email**
   - Developer contact: **Your email**
4. Click **"Save and Continue"**
5. **Scopes:** Skip for now → Click **"Save and Continue"**
6. **Test users:** Add your email → Click **"Save and Continue"**
7. Click **"Back to Dashboard"**

#### 4. Create OAuth Credentials (20 min)

**Web Client:**
1. Go to: **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **Web application**
4. Name: **"VisaBuddy Web"**
5. Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
6. Click **"Create"**
7. **Copy Client ID and Client Secret**

**iOS Client:**
1. Create another OAuth client ID
2. Type: **iOS**
3. Bundle ID: `com.visabuddy.app` (or your bundle ID)
4. Click **"Create"**
5. **Copy Client ID**

**Android Client:**
1. Create another OAuth client ID
2. Type: **Android**
3. Package name: `com.visabuddy.app` (or your package name)
4. SHA-1: (We'll get this from EAS later - can skip for now)
5. Click **"Create"**
6. **Copy Client ID**

### ✅ Once you have OAuth credentials, tell me and I'll add them!

---

## 🗄️ After OAuth: Setup Railway Database (1 hour)

### Why Railway?
- **PostgreSQL Database:** Production-ready database
- **Redis Cache:** For better performance
- **Easy Deployment:** Simple backend deployment

### Step-by-Step:

#### 1. Create Railway Account (5 min)
1. Go to: https://railway.app
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (recommended)

#### 2. Create PostgreSQL Database (15 min)
1. In Railway dashboard, click **"New"**
2. Click **"Database"**
3. Select **"Add PostgreSQL"**
4. Wait for database to provision (1-2 minutes)
5. Click on the database
6. Go to **"Connect"** tab
7. **Copy the DATABASE_URL** (postgresql://...)

#### 3. Add Redis (Optional but Recommended) (10 min)
1. Click **"New"** → **"Database"**
2. Select **"Add Redis"**
3. Wait for Redis to provision
4. Click on Redis → **"Connect"** tab
5. **Copy the REDIS_URL** (redis://...)

### ✅ Once you have Railway connection strings, tell me and I'll add them!

---

## 📋 Quick Checklist

**Firebase:**
- [ ] Project created
- [ ] Storage enabled
- [ ] Cloud Messaging enabled
- [ ] Service account JSON downloaded
- [ ] Credentials extracted

**Google OAuth:**
- [ ] Google Cloud project created
- [ ] APIs enabled
- [ ] OAuth consent screen configured
- [ ] Web client created
- [ ] iOS client created
- [ ] Android client created

**Railway:**
- [ ] Account created
- [ ] PostgreSQL database created
- [ ] Redis added (optional)
- [ ] Connection strings copied

---

## 🎯 Recommended Order

1. **Firebase** (1 hour) - Start here
2. **Google OAuth** (1 hour) - After Firebase
3. **Railway** (1 hour) - After OAuth

**Total time: ~3 hours**

---

## 💡 Tips

- **One service at a time** - Don't rush
- **Save all credentials** - You'll need them
- **Take screenshots** - Helpful for reference
- **Ask for help** - I'm here to assist!

---

## 🚀 Ready to Start?

**Begin with Firebase setup above!** Once you have the credentials, share them and I'll configure everything automatically.

**Let's continue Phase 2! 🎉**

