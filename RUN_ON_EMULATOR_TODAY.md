# 🚀 RUN VISABUDDY ON ANDROID EMULATOR - TODAY

**Status**: ✅ Prerequisites met (Node, npm, Android SDK, Pixel_6 emulator)

---

## 📋 QUICK START (15 minutes)

### **STEP 1: Start Backend** (Terminal 1)

```powershell
# Terminal 1 - Backend API
Set-Location "c:\work\VisaBuddy\apps\backend"

# Install dependencies (if not done)
npm install

# Run database migrations (if not done)
npm run db:generate
npm run db:migrate

# Start backend
npm run dev
# Expected: "Backend running on http://localhost:3000"
```

### **STEP 2: Start Emulator** (Terminal 2)

```powershell
# Terminal 2 - Android Emulator
$emulatorPath = "$env:ANDROID_HOME\emulator\emulator.exe"
& $emulatorPath -avd Pixel_6 -no-snapshot-load
# Wait for emulator to fully boot (2-3 minutes)
```

### **STEP 3: Start Frontend** (Terminal 3)

```powershell
# Terminal 3 - React Native
Set-Location "c:\work\VisaBuddy\apps\frontend"

# Install dependencies (if not done)
npm install

# Build and run on emulator
npx react-native run-android

# This will:
# 1. Build APK
# 2. Install on Pixel_6 emulator
# 3. Launch app
# 4. Start Metro bundler
```

---

## ✅ VERIFICATION

Once the app is running on emulator, you should see:

1. ✅ **Login Screen** (English/Russian/Chinese language toggle visible)
2. ✅ **Google Sign-In Button** (working)
3. ✅ **Email/Password fields**
4. ✅ **No red errors** at bottom of screen

### Test Network Connection:

```powershell
# From Terminal 2 (while emulator running)
adb shell ping 10.0.2.2
# Should see response (backend reachable from emulator)
```

---

## 🔧 TROUBLESHOOTING

### Problem 1: "Metro bundler already in use"
```powershell
# Kill all node processes
Get-Process node | Stop-Process -Force
# Wait 5 seconds, then retry
```

### Problem 2: "Emulator won't start"
```powershell
# Cold boot
$emulatorPath = "$env:ANDROID_HOME\emulator\emulator.exe"
& $emulatorPath -avd Pixel_6 -no-snapshot-load -wipe-data
```

### Problem 3: "Could not find AVD named 'Pixel_6'"
```powershell
# List available AVDs
$emulatorPath = "$env:ANDROID_HOME\emulator\emulator.exe"
& $emulatorPath -list-avds
```

### Problem 4: "GRADLE_HOME not found"
```powershell
# Set GRADLE_HOME
$env:GRADLE_HOME = "$env:ANDROID_HOME\gradle\7.6.1"
# Or create it permanently in System Environment Variables
```

### Problem 5: "Backend connection error" (red banner in app)
```powershell
# Check backend is running on :3000
curl http://localhost:3000/health

# Check emulator can reach backend
adb shell ping 10.0.2.2
```

---

## 📱 WHAT YOU'LL SEE

### **Login Flow** (Current Implementation):
1. App loads with language selector (English, Русский, 中文)
2. Two login options:
   - Google OAuth (might show consent screen)
   - Email/Password (test account: test@visabuddy.com / Test123!)
3. After login:
   - ✅ Profile screen
   - ✅ Country selection
   - ✅ Visa type selection
   - ⏳ Document upload (partially working)
   - ⏳ Payment processing (UI ready, needs payment gateway)
   - ⏳ AI Chat (needs OpenAI integration)

### **Known Limitations** (Not Yet Fixed):
- ❌ Google OAuth: Might not work without Android credentials configured
- ❌ Document upload: Firebase storage might not work without proper credentials
- ❌ Payment: Test mode not configured
- ❌ AI Chat: OpenAI API key might not be working
- ❌ Push Notifications: Firebase Cloud Messaging not fully set up

---

## 🎯 NEXT STEPS AFTER RUNNING

Once you confirm the app runs on emulator:

1. **Test Login Flow**: Try to login with test account
2. **Check Backend Logs**: Look for any errors in Terminal 1
3. **Monitor Network**: Use Chrome DevTools or Firebase Console to see API calls
4. **File a Report**: Document what works/doesn't work for fixing plan

---

## 💡 ADVANCED OPTIONS

### Run without Metro bundler (pre-built APK):
```powershell
Set-Location "c:\work\VisaBuddy\apps\frontend"
npm run build:android

# Then manually install:
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

### Debug with console logs:
```powershell
# Watch logs from emulator
adb logcat -s "ReactNativeJS"
```

### Remote debugging:
```powershell
# In React Native app, shake device (or press M on emulator)
# Select "Debug JS Remotely"
# Chrome DevTools will open
```

---

## 📞 SUPPORT

If you get stuck:
1. Check Terminal 1 (backend) for errors
2. Check Terminal 2 (emulator) for boot issues
3. Check Terminal 3 (Metro) for build errors
4. Post error message in project slack/chat

---

**Estimated time to first app load: 10-15 minutes** ⏱️

🚀 **Ready to start? Run Terminal 1 first!**