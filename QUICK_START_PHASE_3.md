# ⚡ VisaBuddy Phase 3: Quick Start Checklist

**Goal:** Get a fully operational app running TODAY  
**Time:** ~1 hour  
**Complexity:** Easy (automated setup)

---

## ✅ Prerequisites (5 min)

- [ ] Node.js v20+ installed
- [ ] npm v10+ installed
- [ ] Python 3.11+ installed
- [ ] PostgreSQL running locally (or Docker)
- [ ] Text editor (VS Code)
- [ ] Terminal/PowerShell open

**Check versions:**
```powershell
node --version  # Should be v20+
npm --version   # Should be v10+
python --version  # Should be 3.11+
```

---

## 📦 Step 1: Auto-Setup (5 minutes)

Run the automated setup script:

```powershell
cd c:\work\VisaBuddy
.\BUILD_APP_TODAY.ps1 -Action setup
```

This will automatically:
- ✅ Install backend dependencies
- ✅ Install frontend dependencies  
- ✅ Install AI service dependencies
- ✅ Generate Prisma client
- ✅ Run database migrations

**Wait for:** "Setup complete!" message

---

## ⚙️ Step 2: Configure Environment (3 minutes)

### Create Backend .env file

**File:** `c:\work\VisaBuddy\apps\backend\.env`

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/visabuddy"

# Server
PORT=3000
NODE_ENV=development
JWT_SECRET="your-super-secret-key-12345"

# CORS
CORS_ORIGIN="*"

# Payme (use test credentials)
PAYME_MERCHANT_ID="TEST_MERCHANT"
PAYME_API_KEY="TEST_KEY"
PAYME_API_URL="https://checkout.payme.uz"

# AI Service
AI_SERVICE_URL="http://localhost:8001"

# OpenAI (Optional - app works without it)
# OPENAI_API_KEY="sk-..."
```

### Create AI Service .env file

**File:** `c:\work\VisaBuddy\apps\ai-service\.env`

```env
PORT=8001
NODE_ENV=development
CORS_ORIGINS="*"
# OPENAI_API_KEY="sk-..."  # Optional
```

### Frontend already configured

No .env needed for frontend (uses localhost URLs by default).

---

## 🚀 Step 3: Start All Servers (2 minutes)

**Open 3 separate terminal/PowerShell windows**

### Terminal 1: Backend
```powershell
cd c:\work\VisaBuddy\apps\backend
npm run dev
```

**Wait for:** "VisaBuddy Backend Server Started" message

### Terminal 2: AI Service  
```powershell
cd c:\work\VisaBuddy\apps\ai-service
python -m uvicorn main:app --reload --port 8001
```

**Wait for:** "Uvicorn running on http://0.0.0.0:8001" message

### Terminal 3: Frontend
```powershell
cd c:\work\VisaBuddy\apps\frontend
npm start
```

**Wait for:** QR code to appear + "Metro has started"

---

## 📱 Step 4: Test the App (10 minutes)

### Option A: Android Emulator (Easiest)

1. In Terminal 3 (where `npm start` is running), press `a`
2. Android emulator will launch
3. App will load on the emulator

### Option B: iOS Simulator (Mac only)

1. In Terminal 3, press `i`
2. iOS simulator will launch
3. App will load on the simulator

### Option C: Web Browser

1. In Terminal 3, press `w`
2. App opens in browser at http://localhost:19000

### Option D: Expo Go App

1. Scan QR code with Expo Go app on phone
2. App loads on your device

---

## 🧪 Step 5: Test Full Flow (15 minutes)

Follow these steps in the app:

### 1️⃣ Register
- [ ] Tap "Sign Up"
- [ ] Enter email: `test@example.com`
- [ ] Enter password: `Password123!`
- [ ] Tap "Create Account"
- [ ] **Expected:** Dashboard loads

### 2️⃣ Create Application
- [ ] Tap "New Application"
- [ ] Select Country: "United States"
- [ ] Select Visa Type: "Tourist Visa"
- [ ] Tap "Create"
- [ ] **Expected:** Application appears in list

### 3️⃣ Upload Document ✨ NEW
- [ ] Tap application to expand
- [ ] Tap "Documents" tab
- [ ] Select document type: "Passport"
- [ ] Tap "Choose File & Upload"
- [ ] Select any file (PDF, JPG, PNG)
- [ ] **Expected:** Document appears in list

### 4️⃣ Make Payment
- [ ] Go back to application
- [ ] Tap "Pay Now"
- [ ] Review amount
- [ ] Enter test card: `9860123456789012`
- [ ] Expiry: Any future date
- [ ] CVV: Any 3 digits
- [ ] **Expected:** Payment successful message

### 5️⃣ Chat with AI ✨ NEW
- [ ] Tap "Chat" tab (or AI icon)
- [ ] Type: "What documents do I need for a US tourist visa?"
- [ ] Tap send (→)
- [ ] **Expected:** AI responds with helpful information

### 6️⃣ Check Chat History
- [ ] Scroll up to see previous messages
- [ ] **Expected:** Message history persists
- [ ] Close app and reopen
- [ ] **Expected:** Chat history still there (persisted)

### 7️⃣ Manage Documents
- [ ] Go back to Documents
- [ ] View uploaded documents
- [ ] Tap delete (×) to remove a document
- [ ] **Expected:** Document removed

---

## ✅ Verification Checklist

After completing all steps above, verify:

### Backend
- [ ] Running on http://localhost:3000
- [ ] Health check: `curl http://localhost:3000/health`
- [ ] Response: `{ "status": "ok", ... }`

### AI Service
- [ ] Running on http://localhost:8001
- [ ] Health check: `curl http://localhost:8001/health`
- [ ] Response: `{ "status": "healthy", ... }`

### Frontend
- [ ] App displays without errors
- [ ] All 3 servers connected
- [ ] Can register and login
- [ ] Navigation works smoothly
- [ ] Black and white design visible

### Features
- [ ] Documents upload works
- [ ] Chat messages appear
- [ ] Chat history persists
- [ ] Payment processing works
- [ ] No console errors
- [ ] Responsive design (mobile)

---

## 🎯 Success = All Checked ✅

If all boxes are checked:

```
✅ PHASE 3 COMPLETE & WORKING
✅ APP IS PRODUCTION-READY
✅ READY FOR NEXT STEPS
```

---

## 🐛 Troubleshooting

### Backend won't start
```powershell
# Check if port 3000 is free
netstat -ano | findstr :3000

# If already in use, change PORT in .env
# Then restart: npm run dev

# Check database:
npx prisma studio
```

### AI Service error
```powershell
# Make sure Python 3.11+
python --version

# Try:
pip install -r requirements.txt --force-reinstall
python -m uvicorn main:app --reload --port 8001
```

### Frontend won't connect to backend
```
• Check backend running on port 3000
• Check CORS_ORIGIN in backend .env
• Clear browser cache (Ctrl+Shift+Del)
• Restart npm start
```

### Database errors
```powershell
# Reset database:
cd apps/backend
npx prisma migrate reset --force

# Then:
npm run dev
```

### File upload fails
```
• Check multer installed: npm ls multer
• Verify file size < 20MB
• Try different file type (PDF, JPG)
• Check browser permissions
```

---

## 📊 What You're Testing

| Component | Status |
|-----------|--------|
| User Auth | ✅ Phase 1 |
| Visa Apps | ✅ Phase 1 |
| Payments | ✅ Phase 2 |
| Documents | ✨ Phase 3 |
| AI Chat | ✨ Phase 3 |
| Design | ✅ Black & White |
| Persistence | ✅ AsyncStorage |
| Security | ✅ JWT + Validation |

---

## 🚀 Next Steps (After Testing)

### Build Mobile Apps
```powershell
cd apps/frontend

# Android APK
npm run build:android

# iOS IPA (Mac only)
npm run build:ios

# Web
npm run build:web
```

### Deploy to Production
```powershell
# Backend to Railway
cd apps/backend
railway login
railway init
railway variables set DATABASE_URL="..."
railway up

# AI Service to Railway
cd ../ai-service
railway init
railway up
```

See [PHASE_3_BUILD_GUIDE.md](PHASE_3_BUILD_GUIDE.md) for detailed deployment instructions.

---

## 📚 Full Documentation

- **[PHASE_3_BUILD_GUIDE.md](PHASE_3_BUILD_GUIDE.md)** - Complete setup & production guide
- **[PHASE_3_COMPLETE_SUMMARY.md](PHASE_3_COMPLETE_SUMMARY.md)** - Feature summary
- **[PAYMENT_QUICK_START.md](PAYMENT_QUICK_START.md)** - Payment integration
- **[BUILD_APP_TODAY.ps1](BUILD_APP_TODAY.ps1)** - Automated setup script

---

## ⏱️ Time Breakdown

| Step | Time | What |
|------|------|------|
| Prerequisites | 5 min | Check versions |
| Setup | 5 min | Run script |
| Configure | 3 min | Create .env files |
| Start Servers | 2 min | Launch terminals |
| Test App | 15 min | Go through flow |
| Verification | 5 min | Confirm working |
| **TOTAL** | **~35 min** | **Full app running!** |

---

## 🎊 Summary

After completing this checklist, you will have:

✅ **Fully operational VisaBuddy app**  
✅ **All Phase 1, 2, and 3 features working**  
✅ **Document upload functionality**  
✅ **AI chat assistant operational**  
✅ **Production-ready code**  
✅ **Ready to deploy to app stores**  

---

## 🆘 Need Help?

1. **Check logs** - Look at terminal output for errors
2. **Read error message** - Usually very descriptive
3. **Check prerequisites** - Make sure all software installed
4. **Restart servers** - Sometimes fixes random issues
5. **Clear cache** - Browser/npm cache can cause issues
6. **Check .env** - Verify all variables are set correctly

---

**Status:** Ready to build!  
**Time to working app:** ~35 minutes  
**Complexity:** Easy  
**Result:** Production-grade application  

**Let's build! 🚀**