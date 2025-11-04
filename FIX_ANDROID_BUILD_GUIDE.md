# VisaBuddy Android Build - Complete Fix Guide

## 🎯 The Problem

You're getting this error:
```
error Failed to install the app.
npm error Lifecycle script `android` failed with error:
```

This happens because of **conflicting processes and misconfigurations** in the React Native/Expo setup.

---

## 🔍 Root Causes

| Cause | Impact | Fix |
|-------|--------|-----|
| Metro Bundler running on port 8081 | Conflicts with build | Kill processes, use `--no-packager` flag |
| Gradle daemon caching issues | Build failures | Clean Gradle cache completely |
| Corrupted node_modules | Missing dependencies | Reinstall with `--legacy-peer-deps` |
| ADB daemon stuck | Device not detected | Reset ADB connection |
| Java/Android SDK mismatch | Compilation errors | Update gradle.properties |

---

## 🛠️ Quick Fix (5 Minutes)

### Step 1: Run the Permanent Fix Script
```powershell
c:\work\VisaBuddy\FIX_ANDROID_BUILD_PERMANENTLY.ps1
```

**What it does:**
- ✅ Kills all Node, Java, and ADB processes
- ✅ Removes corrupted node_modules
- ✅ Cleans Gradle cache completely
- ✅ Reinstalls dependencies with correct flags
- ✅ Updates gradle.properties with best practices
- ✅ Updates package.json scripts

**Time:** ~3 minutes (mostly npm install)

### Step 2: Build Using the Orchestrator
```powershell
c:\work\VisaBuddy\BUILD_FOR_DEVICE_FIXED.ps1
```

**What it does:**
- ✅ Opens Terminal 1: Backend server
- ✅ Opens Terminal 2: Metro Bundler
- ✅ Opens Terminal 3: Build & Deploy to device

**Time:** ~5-10 minutes (first build)

---

## 📊 Three-Terminal Workflow

### Terminal 1: Backend Server
```powershell
c:\work\VisaBuddy\START_BACKEND.ps1
```
```
✓ Backend running on http://localhost:3000
  Keep this running during development
  Shows API errors in real-time
```

### Terminal 2: Metro Bundler
```powershell
cd c:\work\VisaBuddy\apps\frontend
npm run metro
```
```
✓ Metro Bundler listening on port 8081
  DO NOT close this terminal
  Shows bundling errors in real-time
  Enables hot reload
```

### Terminal 3: Build & Deploy
```powershell
cd c:\work\VisaBuddy\apps\frontend
npx react-native run-android --no-packager
```
```
✓ Builds APK and installs on device
  Uses existing Metro from Terminal 2
  Takes 3-5 minutes first time
  Subsequent builds are faster (hot reload)
```

---

## ⚠️ Critical Flags Explained

### `--no-packager`
```
npx react-native run-android --no-packager
```
- ✅ Uses Metro from Terminal 2 instead of starting its own
- ✅ Prevents port 8081 conflicts
- ✅ Enables hot reload without rebuilding
- 🚫 **MUST** have Terminal 2 (Metro) running

### `--legacy-peer-deps` (npm install)
```
npm install --legacy-peer-deps
```
- ✅ Allows version mismatches in dependency tree
- ✅ Required for Expo + React Native compatibility
- ✅ Safe for development environment

### `--no-daemon` (Gradle)
```
./gradlew clean --no-daemon
```
- ✅ Disables Gradle daemon that caches state
- ✅ Forces fresh build without stale cache
- ✅ Slower but more reliable

---

## 🧹 Troubleshooting Scripts

### 1. Interactive Troubleshooter
```powershell
c:\work\VisaBuddy\ANDROID_BUILD_TROUBLESHOOT.ps1
```

**Features:**
- Runs all diagnostic checks
- Shows what's wrong
- Provides targeted fixes
- Interactive menu system

**Use when:** Build fails or you're unsure what's broken

### 2. Device Pre-Check
```powershell
c:\work\VisaBuddy\PRECHECK_DEVICE_BUILD.ps1
```

**Checks:**
- ✓ Android SDK configured
- ✓ Device connected
- ✓ ADB responding
- ✓ Dependencies installed

**Use when:** Before running build script

---

## 📱 Device Setup (One-Time)

See: `c:\work\VisaBuddy\SETUP_DEVICE.txt`

**Quick version:**
1. Go to Settings > About Phone > Build Number
2. Tap Build Number 7 times (Developer Mode unlocked)
3. Go to Developer Options > USB Debugging (Enable)
4. Connect device via USB
5. Accept authorization prompt on phone
6. Run: `adb devices` to verify

---

## 🎯 Complete Workflow Example

### First Time Setup
```powershell
# 1. Run permanent fix
c:\work\VisaBuddy\FIX_ANDROID_BUILD_PERMANENTLY.ps1

# 2. Verify everything works
c:\work\VisaBuddy\PRECHECK_DEVICE_BUILD.ps1

# 3. Build and deploy
c:\work\VisaBuddy\BUILD_FOR_DEVICE_FIXED.ps1
```

### Subsequent Development
```powershell
# Terminal 1 (keep running from previous session)
# Backend at http://localhost:3000

# Terminal 2 (keep running from previous session)
# Metro Bundler at port 8081

# Terminal 3 (new build)
cd c:\work\VisaBuddy\apps\frontend
npx react-native run-android --no-packager
```

### With Hot Reload
```
# Just save files in your editor
# Metro detects changes
# Device auto-refreshes within 2 seconds
# No rebuild needed
```

---

## ✅ Success Indicators

| Indicator | What It Means |
|-----------|--------------|
| Terminal 1 shows "Uvicorn running on" | Backend is ready ✓ |
| Terminal 2 shows "Metro Bundler" listening | Bundler ready ✓ |
| Terminal 3 shows "Installed and running" or no errors | Build succeeded ✓ |
| App appears on device in 15 seconds | Deployment worked ✓ |
| Login screen visible | Frontend running ✓ |

**Test Login:**
- Email: `test@visabuddy.com`
- Password: `Test123!`

---

## ❌ Common Errors & Fixes

### Error: "Port 8081 already in use"
```powershell
# Fix: Kill Metro/Node processes
taskkill /F /IM node.exe
# Then restart Metro
npm run metro
```

### Error: "Failed to push to /data/local/tmp"
```powershell
# Fix: Uninstall old app first
adb uninstall com.visabuddy.app
# Then retry build
npx react-native run-android --no-packager
```

### Error: "Gradle build failed"
```powershell
# Fix: Run troubleshooter and choose option 3
c:\work\VisaBuddy\ANDROID_BUILD_TROUBLESHOOT.ps1
# Then: npm run gradle:clean && npm run gradle:build
```

### Error: "Device offline" or "Unauthorized"
```powershell
# Fix: Reset ADB connection
adb kill-server
adb start-server
adb devices  # Authorize on phone
```

### Error: "Cannot resolve symbol 'Config'" or other build errors
```powershell
# Fix: Full clean rebuild
c:\work\VisaBuddy\ANDROID_BUILD_TROUBLESHOOT.ps1
# Choose option 1 (Full clean & rebuild)
```

---

## 🔧 Advanced: Manual Steps

If scripts don't work, do this manually:

### Step 1: Kill all processes
```powershell
# Kill Node
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Kill Java
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force

# Reset ADB
adb kill-server
```

### Step 2: Clean everything
```powershell
cd c:\work\VisaBuddy\apps\frontend

# Remove node_modules
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force

# Clean Gradle
cd android
.\gradlew.bat clean --no-daemon
Remove-Item .gradle -Recurse -Force
Remove-Item build -Recurse -Force
Remove-Item app\build -Recurse -Force
```

### Step 3: Reinstall
```powershell
cd c:\work\VisaBuddy\apps\frontend
npm install --legacy-peer-deps
```

### Step 4: Three-terminal build
```powershell
# Terminal 1
c:\work\VisaBuddy\START_BACKEND.ps1

# Terminal 2
cd c:\work\VisaBuddy\apps\frontend
npm run metro

# Terminal 3
cd c:\work\VisaBuddy\apps\frontend
npx react-native run-android --no-packager
```

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| `SETUP_DEVICE.txt` | Enable USB Debugging on phone |
| `QUICK_DEVICE_BUILD.txt` | Quick reference card |
| `DEVICE_BUILD_START_HERE.md` | Detailed step-by-step guide |
| `PRECHECK_DEVICE_BUILD.ps1` | Verify prerequisites |
| `START_BACKEND.ps1` | Start backend server |
| `BUILD_FOR_DEVICE_FIXED.ps1` | Orchestrate 3-terminal build |
| `FIX_ANDROID_BUILD_PERMANENTLY.ps1` | Apply permanent fixes |
| `ANDROID_BUILD_TROUBLESHOOT.ps1` | Interactive troubleshooting |

---

## 🆘 When All Else Fails

1. **Check logs:**
   ```powershell
   # Last build error details
   cat c:\work\VisaBuddy\apps\frontend\npm-install.log
   cat c:\work\VisaBuddy\apps\frontend\gradle-clean.log
   ```

2. **Run full diagnostics:**
   ```powershell
   c:\work\VisaBuddy\ANDROID_BUILD_TROUBLESHOOT.ps1
   # Choose option 7
   ```

3. **Nuclear option - Complete reset:**
   ```powershell
   # Delete all build artifacts
   Remove-Item c:\work\VisaBuddy\apps\frontend\node_modules -Recurse -Force
   Remove-Item c:\work\VisaBuddy\apps\frontend\android\.gradle -Recurse -Force
   Remove-Item c:\work\VisaBuddy\apps\frontend\android\build -Recurse -Force
   Remove-Item c:\work\VisaBuddy\apps\frontend\android\app\build -Recurse -Force
   
   # Then run the fix script again
   c:\work\VisaBuddy\FIX_ANDROID_BUILD_PERMANENTLY.ps1
   ```

4. **Check Android Studio:**
   - Open Android Studio
   - SDK Manager > Check SDK versions
   - Device Manager > Check emulator/device status

---

## 🚀 Performance Tips

### Faster Builds
```powershell
# Skip unused architectures (faster on phone)
# In android/gradle.properties, add:
# android.enableSeparateNDKBuild=false
```

### Hot Reload
- Save file → Metro detects → Device updates (2-3 sec)
- No need to rebuild APK
- Keeps app state

### Incremental Builds
- Second/third builds are 10x faster
- Only rebuilds changed files
- Use `--no-packager` flag

---

## 📊 Typical Build Times

| Step | Time | Notes |
|------|------|-------|
| Full clean | 1 min | First time only |
| npm install | 2-3 min | First time only |
| Gradle build | 3-5 min | First build |
| APK install | 30 sec | Via ADB |
| **Total first build** | **8-10 min** | One time |
| **Incremental rebuild** | **1-2 min** | With Metro |
| **Hot reload** | **2-3 sec** | Just save file |

---

## ✨ Success! What's Next?

1. ✅ App running on Samsung A56
2. ✅ Can test features
3. ✅ Backend responding to requests
4. ✅ Hot reload working for development

### Testing Checklist
- [ ] Login screen appears
- [ ] Can enter credentials
- [ ] Backend logs show API requests
- [ ] Save changes → auto-reload works
- [ ] Test all main features

### Development Workflow
1. Make code changes
2. Save file
3. Watch device auto-refresh (2-3 sec)
4. Test feature
5. Repeat from step 1 (no rebuild needed!)

---

## 💡 Pro Tips

1. **Keep terminals organized:**
   - Arrange Terminal 1 & 2 side-by-side
   - Monitor them while using Terminal 3 for building

2. **Use verbose logging:**
   ```powershell
   npx react-native run-android --verbose
   ```

3. **Monitor backend requests:**
   Keep Terminal 1 visible to see all API calls

4. **Clear Metro cache if stuck:**
   ```powershell
   npm run metro -- --reset-cache
   ```

5. **Use ADB directly for deployment:**
   ```powershell
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## 📞 Quick Reference

```powershell
# Permanent fix
c:\work\VisaBuddy\FIX_ANDROID_BUILD_PERMANENTLY.ps1

# Full build (3 terminals)
c:\work\VisaBuddy\BUILD_FOR_DEVICE_FIXED.ps1

# Troubleshoot
c:\work\VisaBuddy\ANDROID_BUILD_TROUBLESHOOT.ps1

# Just backend
c:\work\VisaBuddy\START_BACKEND.ps1

# Manual Metro
cd c:\work\VisaBuddy\apps\frontend && npm run metro

# Manual build
cd c:\work\VisaBuddy\apps\frontend && npx react-native run-android --no-packager

# Check device
adb devices

# View logs
adb logcat

# Uninstall app
adb uninstall com.visabuddy.app
```

---

## ✅ You're Ready!

This guide covers every scenario. Your builds should now work reliably. 🎉

**Start with:**
```powershell
c:\work\VisaBuddy\FIX_ANDROID_BUILD_PERMANENTLY.ps1
```

**Then build with:**
```powershell
c:\work\VisaBuddy\BUILD_FOR_DEVICE_FIXED.ps1
```

**Questions? Use:**
```powershell
c:\work\VisaBuddy\ANDROID_BUILD_TROUBLESHOOT.ps1
```