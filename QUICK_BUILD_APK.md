# Quick Guide: Build Standalone APK

## 🚀 Fastest Way to Build

From the project root, run:

```powershell
.\scripts\build-standalone-apk.ps1
```

This will:

1. ✅ Install dependencies
2. ✅ Clean previous builds (optional with `-Clean` flag)
3. ✅ Build the release APK
4. ✅ Show you where the APK is located
5. ✅ Open the folder containing the APK

## 📱 APK Location

After building, find your APK at:

```
frontend_new/android/app/build/outputs/apk/release/app-release.apk
```

## 📲 Install on Your Device

### Easiest Method: Transfer & Install

1. **Copy the APK** to your phone (email, Google Drive, USB, etc.)
2. **On your phone**, open the file manager
3. **Tap the APK file** to install
4. **Allow installation** from unknown sources if prompted

### Using ADB (if you have it set up)

```powershell
adb install frontend_new/android/app/build/outputs/apk/release/app-release.apk
```

## ⚙️ Alternative Build Methods

### Using npm (from frontend_new directory):

```powershell
cd frontend_new
npm run build:apk
```

### Direct Gradle (from frontend_new/android directory):

```powershell
cd frontend_new/android
.\gradlew.bat assembleRelease
```

## 📝 Notes

- The APK is **standalone** - no laptop or Metro bundler needed after installation
- Uses **production API** by default: `https://visabuddy-backend-production.up.railway.app`
- Signed with **debug keystore** (fine for testing, not for Play Store)
- Build time: ~5-10 minutes depending on your machine

## 🔍 Troubleshooting

**Build fails?** Make sure you have:

- Node.js >= 16 installed
- Java JDK 17 installed
- Android SDK installed (via Android Studio)

**APK won't install?**

- Enable "Install from Unknown Sources" in Android settings
- Check that your device architecture is supported (ARM64, ARMv7, x86, x86_64)

For more details, see `frontend_new/BUILD_APK_GUIDE.md`




