# 🚀 VisaBuddy - Quick Start Guide

## What Was Fixed
✅ Frontend now connects to emulator via `10.0.2.2:3000` (correct emulator network)  
✅ Backend switched to development mode (vs production)  
✅ New startup script that handles proper initialization order  

## How to Run VisaBuddy

### Option 1: Automated (Recommended)
Simply run the startup script:

```powershell
c:\work\VisaBuddy\START_VISABUDDY_PROPERLY.ps1
```

This script will:
1. ✅ Kill old processes
2. ✅ Start Android Emulator (waits for it to be fully ready)
3. ✅ Start backend server on http://localhost:3000
4. ✅ Start frontend and deploy to emulator
5. ✅ Guide you through what to expect

**The script handles everything - just let it run!**

---

### Option 2: Manual (if you prefer control)

#### Step 1: Open 3 Terminal Windows

**Terminal 1 - Android Emulator:**
```powershell
cd c:\work\VisaBuddy
# Start the emulator
$ANDROID_HOME\emulator\emulator.exe -avd Pixel_6 -no-snapshot-load
```

Wait 2-3 minutes for it to fully boot until you see the Android home screen.

**Terminal 2 - Backend Server:**
```powershell
cd c:\work\VisaBuddy\apps\backend
npm install        # if needed
npm run db:generate
npm run db:migrate
npm run dev        # Backend starts on http://localhost:3000
```

Wait for: `✓ Server running on http://localhost:3000`

**Terminal 3 - Frontend:**
```powershell
cd c:\work\VisaBuddy\apps\frontend
npm install        # if needed
npx react-native run-android
```

Wait 5-10 minutes for build and app to appear on emulator.

---

## ✅ What You Should See

### 1. Emulator
- Android home screen with app icon
- App should load and show **Login Screen**
- Screen has language selection

### 2. Backend Terminal
- Shows database migrations running
- `✓ Server running on http://localhost:3000`
- Logs for API calls as you interact with app

### 3. Frontend Terminal
- Metro Bundler output
- `Loaded dev server at...`
- Compilation messages

---

## 🧪 Test the App

### Login with Test Account
```
Email:    test@visabuddy.com
Password: Test123!
```

### If App Doesn't Load
1. **Check Backend** - Errors in Terminal 2?
2. **Check Network** - Frontend should use `10.0.2.2:3000` (check `.env`)
3. **Reload App** - Press `R R` (twice) in Frontend terminal to reload
4. **Check Emulator** - Is it fully booted? (home screen visible)

---

## 🔍 Verify Setup

### Check Backend Health
```powershell
Invoke-WebRequest http://localhost:3000/health
```
Should return `OK` or similar status.

### Check Database
```powershell
# In backend terminal, Prisma Studio should be available at:
http://localhost:3000/studio
```

---

## 📝 Configuration Files (Already Set)

### Frontend: `apps/frontend/.env`
```
API_BASE_URL=http://10.0.2.2:3000  ✅ (for emulator)
GOOGLE_WEB_CLIENT_ID=...
FIREBASE_PROJECT_ID=...
ENABLE_OFFLINE_MODE=true
ENABLE_DEBUG_LOGS=true
```

### Backend: `apps/backend/.env`
```
NODE_ENV=development  ✅ (vs production)
PORT=3000
DATABASE_URL=file:./dev.db
```

---

## 🆘 Troubleshooting

### ❌ "Cannot connect to TCP port 5554"
**Cause:** Emulator not running  
**Fix:** Make sure emulator is fully booted (home screen visible)

### ❌ "Backend connection refused"
**Cause:** Backend not started or crashed  
**Fix:** Check Terminal 2 for errors, restart backend with `npm run dev`

### ❌ "App keeps reloading"
**Cause:** Metro bundler issue  
**Fix:** 
- Press `C` to stop Metro bundler
- Run `npm install` again
- Run `npx react-native run-android` again

### ❌ "Build failed - Gradle error"
**Cause:** Android build cache corrupted  
**Fix:**
```powershell
cd c:\work\VisaBuddy\apps\frontend\android
./gradlew clean
cd ..
npx react-native run-android
```

### ❌ "Port 3000 already in use"
**Cause:** Another process using port 3000  
**Fix:**
```powershell
# Kill all Node processes
Get-Process node | Stop-Process -Force
# Then restart backend
```

---

## 📱 App Features to Test

1. **Login/Register** - Use email/password
2. **Language Selection** - At login (EN, RU, UZ)
3. **Dashboard** - Should show visa info
4. **Documents** - Upload/view documents
5. **Chat** - AI assistant (if configured)
6. **Offline Mode** - Works when airplane mode enabled

---

## 🎯 Next Steps

Once the app is running:
1. Explore the UI
2. Test login/logout
3. Check offline mode (toggle airplane mode)
4. Test document upload
5. Review backend logs for any errors

---

## 💡 Tips

- **Fast Reload:** Press `R R` in frontend terminal (don't restart entire build)
- **Clear App Data:** In emulator: Settings > Apps > VisaBuddy > Clear Cache
- **Check Logs:** Frontend terminal shows Metro bundler logs, Backend terminal shows API errors
- **Phone Rotation:** Emulator can rotate - test responsive design

---

## 🆗 If Everything Works

Congratulations! VisaBuddy is now running and ready for testing/development.

For production deployment, see: `PHASE_4_DETAILED_STEPS.md`