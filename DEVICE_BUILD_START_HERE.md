# 📱 VisaBuddy - Physical Device Build Guide (Samsung A56)

## 🚀 Quick Start (5 minutes)

### Step 1: Prepare Your Device (2 min)
Open the file: **`SETUP_DEVICE.txt`** and follow the instructions to:
- Enable Developer Mode
- Enable USB Debugging  
- Connect device via USB
- Authorize ADB access

### Step 2: Run Pre-Check (1 min)
```powershell
c:\work\VisaBuddy\PRECHECK_DEVICE_BUILD.ps1
```
This verifies:
- ✓ Node.js installed
- ✓ Android SDK configured
- ✓ ADB working
- ✓ Device connected
- ✓ Project structure valid

### Step 3: Build & Deploy (3-5 min)
```powershell
c:\work\VisaBuddy\BUILD_FOR_DEVICE.ps1
```
This will:
1. Detect your computer's IP address
2. Update environment configuration
3. Install dependencies (if needed)
4. Build Android app
5. Deploy to your device
6. Launch app automatically

---

## 📋 What Each Script Does

| Script | Purpose | Duration |
|--------|---------|----------|
| **SETUP_DEVICE.txt** | Enable USB Debugging on phone | 2 min |
| **PRECHECK_DEVICE_BUILD.ps1** | Verify all prerequisites | 1 min |
| **BUILD_FOR_DEVICE.ps1** | Full build & deploy | 3-5 min |
| **START_BACKEND.ps1** | Start backend server (run in Terminal 1) | - |

---

## 🔄 Full Development Workflow

### Terminal 1: Start Backend
```powershell
c:\work\VisaBuddy\START_BACKEND.ps1
```
Output should show:
```
[OK] Starting backend server...
[URL] http://localhost:3000
```

### Terminal 2: Build & Deploy to Device
```powershell
c:\work\VisaBuddy\BUILD_FOR_DEVICE.ps1
```

### Expected Result
- ✅ App launches on your Samsung A56
- ✅ Login screen appears (~10-15 seconds)
- ✅ You can test with: `test@visabuddy.com` / `Test123!`

---

## 🔍 Step-by-Step Breakdown

### Step 1️⃣ Connect Device

**On Your Phone:**
1. Settings > About Phone > Build Number (tap 7 times)
2. Settings > Developer Options > Enable USB Debugging
3. Connect to computer via USB cable
4. Tap "Allow" when asked for ADB authorization

**On Your Computer:**
```powershell
adb devices
```
Expected output:
```
List of devices attached
xxxxxxxxxxxxxxxx    device
```

### Step 2️⃣ Verify Setup

```powershell
c:\work\VisaBuddy\PRECHECK_DEVICE_BUILD.ps1
```

If all checks pass ✅ → Continue to Step 3

If any fail ❌ → Fix the issues shown before proceeding

### Step 3️⃣ Start Backend (Terminal 1)

```powershell
c:\work\VisaBuddy\START_BACKEND.ps1
```

Wait for message:
```
[OK] Starting backend server...
[URL] http://localhost:3000
```

**Keep this terminal running!**

### Step 4️⃣ Build for Device (Terminal 2)

```powershell
c:\work\VisaBuddy\BUILD_FOR_DEVICE.ps1
```

The script will:
1. Detect your computer's IP (e.g., `192.168.1.100`)
2. Update `.env` with correct IP
3. Install dependencies (first time only)
4. Build and deploy app

**This takes 3-5 minutes.** Go grab a coffee! ☕

### Step 5️⃣ Test on Device

Watch your phone screen:
- App should load in ~10-15 seconds
- Login screen appears
- Try: `test@visabuddy.com` / `Test123!`

If login works ✅ → **You're done! Physical testing is live!**

---

## 🆘 Troubleshooting

### Issue: "No device connected"

**Fix:**
```powershell
# Restart ADB
adb kill-server
adb start-server

# Check connection
adb devices
```

Then:
1. Unplug USB cable
2. Replug USB cable
3. Tap "Allow" on phone
4. Run `adb devices` again

### Issue: "Device offline" or "Device unauthorized"

**On Phone:**
- Look for USB authorization prompt
- Tap "Allow" and check "Always allow"

**On Computer:**
```powershell
adb kill-server
adb start-server
adb devices
```

### Issue: App crashes on startup

**Check Backend is Running:**
```powershell
curl http://localhost:3000/health
```

Should return: `OK`

If not:
1. Terminal 1 showing errors? Fix them
2. Try: `npm run dev` in `c:\work\VisaBuddy\apps\backend`

**Check Device Can Reach Backend:**
```powershell
# On device, run:
adb shell ping 192.168.1.100  # Replace with your IP
```

**View App Logs:**
```powershell
adb logcat | findstr visabuddy
```

### Issue: Build fails with Gradle error

**Fix:**
```powershell
# Go to frontend folder
cd c:\work\VisaBuddy\apps\frontend

# Clean old build
cd android
.\gradlew.bat clean
cd ..

# Rebuild
npm run android
```

### Issue: Build takes forever (>10 minutes)

**Solution:**
```powershell
# Kill all gradle/adb processes
taskkill /F /IM java.exe
taskkill /F /IM adb.exe

# Restart
c:\work\VisaBuddy\BUILD_FOR_DEVICE.ps1
```

---

## 📊 Network Setup Explained

### How It Works

Your computer and phone need to communicate over WiFi:

```
[Your Computer]  <--WiFi--> [Your Phone]
    IP: 192.168.1.100           Connected to same WiFi
    Backend: :3000              Running VisaBuddy app
    
App connects to: http://192.168.1.100:3000
```

### Important Points

- **Same WiFi Network Required** ✓
- **Firewall Port 3000** - May need to unblock
- **IP Address Must Be Accurate** - Script auto-detects, but verify in `.env`

### Finding Your Computer's IP

```powershell
ipconfig
```

Look for your WiFi adapter's IPv4 Address (e.g., `192.168.1.100`)

---

## ✅ Verification Checklist

Before building, verify:

- [ ] USB Debugging enabled on phone
- [ ] Device connected and authorized (`adb devices` shows "device")
- [ ] Node.js installed (`node --version`)
- [ ] Android SDK configured (`echo $env:ANDROID_HOME`)
- [ ] Backend prerequisites checked (`PRECHECK_DEVICE_BUILD.ps1` all green)
- [ ] WiFi connected on both computer and phone

---

## 🎯 Success Criteria

Build is successful when:

✅ App installs on device  
✅ App launches in ~15 seconds  
✅ Login screen appears  
✅ Can tap buttons and navigate  
✅ Backend logs show API requests  

---

## 📞 Common Commands

```powershell
# List devices
adb devices

# View live logs
adb logcat

# View app-specific logs
adb logcat | findstr visabuddy

# Uninstall app
adb uninstall com.visabuddy.app

# Reinstall app
npm run android

# Restart ADB daemon
adb kill-server
adb start-server

# Rebuild from scratch
cd android && .\gradlew.bat clean && cd .. && npm run android
```

---

## 📞 Need Help?

1. Check the troubleshooting section above
2. Run `adb logcat` to see device logs
3. Check backend logs in Terminal 1
4. Verify `.env` file has correct IP
5. Try restarting both device and computer

---

## 🎉 You're Ready!

Run this command to get started:

```powershell
c:\work\VisaBuddy\PRECHECK_DEVICE_BUILD.ps1
```

Then:

```powershell
c:\work\VisaBuddy\BUILD_FOR_DEVICE.ps1
```

**Your Samsung A56 testing journey starts now!** 🚀