# 🔐 Google OAuth - Quick Commands Reference

Quick copy-paste commands for Google OAuth setup.

---

## 1️⃣ Install Dependencies

```bash
cd c:\work\VisaBuddy\apps\frontend
npm install
```

**What this does**: Installs `@react-native-google-signin/google-signin` and other dependencies.

---

## 2️⃣ Get Android SHA-1 Fingerprint

```bash
cd c:\work\VisaBuddy\apps\frontend\android
gradlew.bat signingReport
```

**What to copy**: Look for line starting with `SHA1:` 
```
SHA1: AB:CD:EF:12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0:12
```

Add this to Android OAuth credentials in Google Cloud Console.

---

## 3️⃣ Create .env File

```bash
cd c:\work\VisaBuddy\apps\frontend
copy .env.example .env
```

Then open `.env` and replace:
```
GOOGLE_WEB_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID_HERE
```

With your actual Web Client ID from Google Cloud Console.

---

## 4️⃣ Verify TypeScript

```bash
cd c:\work\VisaBuddy\apps\frontend
npm run typecheck
```

Should say: **"No errors!"** or similar

---

## 5️⃣ Start Backend

```bash
cd c:\work\VisaBuddy\apps\backend
npm start
```

Should show: `Server running on http://localhost:3000`

Keep this terminal open in another window.

---

## 6️⃣ Start Mobile (Android)

```bash
cd c:\work\VisaBuddy\apps\frontend
npm run android
```

Waits for emulator/device to connect then builds and runs app.

---

## 7️⃣ Start Mobile (iOS) [Mac Only]

```bash
cd c:\work\VisaBuddy\apps\frontend
npm run ios
```

---

## 8️⃣ Test Email/Password Login First

In the running app:
1. Go to Login screen
2. Enter email: `test@example.com`
3. Enter password: `Test123456`
4. Tap "Sign In"
5. Should see "Success" alert

If this works → Backend is working ✓

---

## 9️⃣ Test Google OAuth

In the running app:
1. Go to Login screen
2. Tap Google button (G icon)
3. Select your Google account
4. Approve permissions
5. Should see "Success" alert and be logged in

---

## 🔟 Verify Database

```bash
cd c:\work\VisaBuddy\apps\backend
npm run db:studio
```

Opens Prisma Studio in browser:
1. Click on "User" table
2. Should see your new user
3. Check `googleId` field is populated

---

## Database Debug Commands

```bash
# View all users
npm run db:studio

# Run migrations
cd apps/backend
npx prisma migrate dev

# Reset database (clears all data!)
npx prisma migrate reset

# Generate Prisma types
npx prisma generate
```

---

## Device Commands

```bash
# Android: Clear app data
adb shell pm clear com.visabuddy.app

# Android: View logs
adb logcat | grep VisaBuddy

# Android: List connected devices
adb devices

# Android: Restart app
adb shell am force-stop com.visabuddy.app
npm run android
```

---

## Troubleshooting Commands

```bash
# Check if emulator is running
adb devices

# Kill all adb connections
adb kill-server

# Restart adb
adb start-server

# View React Native console logs
adb logcat | grep ReactNativeJS

# Clear npm cache
npm cache clean --force

# Reinstall node_modules
rm -r node_modules
npm install

# Restart Metro bundler (if it gets stuck)
# Stop the currently running process and run:
npm run android
```

---

## Environment Setup

```bash
# Windows PowerShell
$env:GOOGLE_WEB_CLIENT_ID="YOUR_CLIENT_ID"

# Windows Command Prompt
set GOOGLE_WEB_CLIENT_ID=YOUR_CLIENT_ID

# Mac/Linux
export GOOGLE_WEB_CLIENT_ID=YOUR_CLIENT_ID
```

---

## View Logs in Real-Time

```bash
# Android - All logs
adb logcat

# Android - Only VisaBuddy logs
adb logcat | grep VisaBuddy

# Android - Only errors
adb logcat | grep ERROR

# iOS - In Xcode Console (while app running)
# Window → Devices and Simulators → Console tab
```

---

## Common Cleanup Commands

```bash
# Clean Android build
cd apps/frontend/android
gradlew.bat clean

# Remove watchman cache
watchman watch-del-all

# Clear Metro bundler cache
npm start -- --reset-cache

# Reset entire local dev environment
npm cache clean --force
rm -r node_modules package-lock.json
npm install
```

---

## Quick Status Check

```bash
# Check Node version (should be >= 14)
node --version

# Check npm version (should be >= 6)
npm --version

# Check if Android SDK is installed
echo %ANDROID_SDK_ROOT%

# Check if Java is installed
java -version

# Check all dependencies installed
npm ls
```

---

## File Locations

```
Frontend Code
├── src/services/google-oauth.ts      ← Google Sign-In logic
├── src/screens/auth/LoginScreen.tsx  ← Login UI with Google button
├── src/config/constants.ts           ← Configuration
├── .env                              ← Your Web Client ID (create this)
└── app.json                          ← App configuration

Backend Code
├── src/routes/auth.ts                ← /api/auth/google endpoint
├── src/services/auth.service.ts      ← User creation logic
└── src/middleware/auth.ts            ← JWT verification

Database
├── prisma/schema.prisma              ← Database schema
├── prisma/migrations/                ← Migration history
└── *.db                              ← SQLite database file
```

---

## Testing Sequence

```
1. npm install                    → Install dependencies
2. npm run typecheck              → Verify no errors
3. npm start (backend)            → Start backend
4. npm run android                → Start app
5. Test email/password            → Verify backend works
6. Test Google OAuth              → Verify OAuth works
7. npm run db:studio              → Verify database
8. Test logout                     → Verify cleanup
9. Test login again                → Verify persistence
```

---

## Emergency Fixes

```bash
# If app won't start
npm cache clean --force
rm -r node_modules package-lock.json
npm install
npm run android

# If you see red error screen
# Press 'R' in terminal to reload
# Or restart app: adb shell am force-stop com.visabuddy.app

# If Gradle fails
cd apps/frontend/android
gradlew.bat clean
gradlew.bat build

# If TypeScript errors appear
npm run typecheck

# If dependencies are missing
npm audit fix
npm install

# If port 3000 is in use (backend)
# Find and kill process using port 3000
# Or change API_BASE_URL in .env
```

---

## Success Indicators ✓

✅ **TypeScript Check Passed**:
```
No errors found
```

✅ **Backend Starting**:
```
Server running on http://localhost:3000
```

✅ **App Builds**:
```
Completing APK
```

✅ **Email Login Works**:
```
Alert: "Success" → redirects to home screen
```

✅ **Google OAuth Works**:
```
Alert: "Success" → redirects to home screen
```

✅ **Database Entry Created**:
```
User table shows new entry with googleId populated
```

---

## Next Steps

1. Run all commands in Testing Sequence
2. If all succeed → Move to Phase 1.2
3. If any fail → Check troubleshooting section

---

**Pro Tip**: Keep one terminal for backend, another for mobile, and one for utilities.

Example setup:
- Terminal 1: `cd apps/backend && npm start`
- Terminal 2: `cd apps/frontend && npm run android`
- Terminal 3: Use for one-off commands like `npm run db:studio`