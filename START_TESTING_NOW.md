# 🚀 VisaBuddy Android Testing - START HERE

## ⏳ WAIT: Frontend Dependencies Installing

**Frontend npm install is running in the background...**  
Expected completion: **2-5 minutes**

To check progress:
```powershell
Test-Path "c:\work\VisaBuddy\apps\frontend\node_modules"
# Returns: True when done
```

---

## 🎯 Once Dependencies Are Done: 3 Quick Steps

### Step 1: Start Backend Server (Terminal 1)
```powershell
Set-Location "c:\work\VisaBuddy\apps\backend"
npm run dev
```

**Expected output after 10-15 seconds:**
```
✓ Server running on port 3000
✓ Database connected
✓ Ready for requests
```

---

### Step 2: Start AI Service (Terminal 2)
```powershell
Set-Location "c:\work\VisaBuddy\apps\ai-service"
python -m uvicorn main:app --reload --port 8001
```

**Expected output after 10 seconds:**
```
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Application startup complete
```

---

### Step 3: Launch on Android (Terminal 3)
```powershell
Set-Location "c:\work\VisaBuddy\apps\frontend"
npm run android
```

**Expected behavior:**
- Compiles React Native app (1-2 min first time)
- Deploys to Android emulator
- App opens automatically
- Shows login screen

---

## 🚀 Use the One-Click Launcher (Optional)

Instead of doing the above manually, run:
```powershell
cd c:\work\VisaBuddy
powershell -ExecutionPolicy Bypass -File .\LAUNCH_ALL.ps1
```

This opens all 3 terminals automatically!

---

## ⚠️ CRITICAL: Prerequisites

Before starting Terminal 3, ensure:

✅ **Android Emulator is Running**
- Open Android Studio
- Go to: **Device Manager**
- Click: **Launch** (on any emulator)
- Wait for it to fully boot (2-3 min)
- You should see Android home screen

✅ **PostgreSQL is Running**
- Default config: `localhost:5432`
- Database: `visabuddy_dev`
- User: `user` / Password: `password`
- Check Terminal 1 output for connection status

✅ **Ports are Available**
- Port 3000: Backend
- Port 8001: AI Service
- Port 8081: React Native Metro bundler

---

## 🧪 First Test After Launch

### Register a Test Account
1. **Wait for app to load** (1-2 min on emulator)
2. **See login screen** with:
   - Email field
   - Password field
   - "Don't have account?" link
3. **Click "Don't have account?"** → Register
4. **Enter details:**
   - Email: `test@example.com`
   - Password: `password123`
   - First name: `Test` (optional)
5. **Click Register**
6. **Should see Home screen** with:
   - Welcome message
   - Quick stats
   - "New Application" button
   - Bottom tabs (Home, Visas, Chat, Profile)

---

## 🧳 Test All Main Features

### 1️⃣ Create Visa Application
```
Home → "New Application" 
  → Search "Japan"
  → Select "Tourist Visa"
  → See fee breakdown
  → See processing time
```

### 2️⃣ Upload Document
```
My Visas → Select Application
  → "Upload Document"
  → Select PDF/JPG
  → Watch it get verified
  → See status change
```

### 3️⃣ Test AI Chat
```
Chat tab → Type message
  → Example: "How much is Japan visa?"
  → Get instant AI response
  → See context-aware answers
```

### 4️⃣ Switch Language
```
Profile → Language selector
  → Change to Uzbek
  → All UI updates instantly
  → Change to Russian
  → Works perfectly
```

### 5️⃣ Payment Flow
```
My Visas → Select Application
  → Click "Pay Now"
  → See fee breakdown ($X + $50)
  → Click "Proceed to Payment"
  → See payment gateway
```

---

## 📊 What Should Be Visible

✅ **After Login:**
- Home screen with stats
- Navigation tabs at bottom
- Smooth transitions

✅ **After Creating Visa:**
- Application appears in "My Visas"
- Shows country flag & visa type
- Shows processing timeline

✅ **After Uploading Document:**
- Document appears in checklist
- Status changes: pending → verified
- Shows verification score

✅ **After Chat Message:**
- Instant response (1-2 sec)
- Context-aware information
- Professional tone

---

## 🐛 Troubleshooting

### App Won't Start
**Solution:**
```
# In Terminal 3, try:
npm start
# Then select 'a' for Android
```

### Backend Connection Error
**Terminal 1 should show:**
```
✓ Database connected
```
**If not:**
- Check PostgreSQL is running
- Check DATABASE_URL in `.env`

### Emulator Crashes
**Try:**
```
# In Terminal 3, clear cache:
npm run android --reset-cache
```

### Slow Build
- First build is always slow (2-3 min)
- Subsequent builds: 30-60 sec
- Watch for "Bundling..." progress

### App Keeps Reloading
- This is **normal** if you made file changes
- React Native has hot reload enabled
- Let it settle for 5-10 seconds

---

## ✨ Success Checklist

After everything is running, you should see:

- [ ] Terminal 1: Backend online
- [ ] Terminal 2: AI service online
- [ ] Terminal 3: App deploying to emulator
- [ ] Emulator shows app loading
- [ ] Login screen visible
- [ ] Can register account
- [ ] Can see home screen
- [ ] Can navigate all tabs
- [ ] Can create visa application
- [ ] Chat responds instantly
- [ ] Language switching works
- [ ] No crash errors

---

## 📖 Additional Resources

| Document | Purpose |
|----------|---------|
| `QUICK_START_ANDROID.md` | Detailed testing guide |
| `SPECIFICATION_COMPLIANCE.md` | Feature checklist |
| `SPEC_TO_CODE_MAPPING.md` | Code structure reference |
| `LAUNCH_ALL.ps1` | One-click launcher |
| `RUN_ANDROID.ps1` | Setup checker |

---

## ⏱️ Expected Timeline

| Step | Duration | What to expect |
|------|----------|-----------------|
| Start Backend | 15 sec | Connection logs |
| Start AI | 10 sec | Service ready |
| Build Android | 2-3 min | Compilation progress |
| Deploy to emulator | 30-60 sec | App pushing... |
| App loads | 30-60 sec | Loading screen |
| **Total** | **~5 min** | Login screen ready |

---

## 🎉 Ready?

When you see this in each terminal, you're good to go:

**Terminal 1:**
```
✓ Server running on port 3000
```

**Terminal 2:**
```
INFO: Application startup complete
```

**Terminal 3:**
```
App is now running
```

---

**Let's test this app! 🚀**

Questions? Check the documentation or run:
```powershell
Get-ChildItem c:\work\VisaBuddy | Where-Object {$_.Name -like "*START*"}
```