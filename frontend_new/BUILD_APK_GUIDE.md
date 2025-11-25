# Building Standalone APK for VisaBuddy

This guide explains how to build a standalone APK file that can be installed on physical Android devices without needing a laptop connection or Metro bundler.

## Quick Start

### Option 1: Using the Build Script (Recommended)

From the project root, run:

```powershell
.\scripts\build-standalone-apk.ps1
```

To clean previous builds first:

```powershell
.\scripts\build-standalone-apk.ps1 -Clean
```

### Option 2: Using npm Script

From the `frontend_new` directory:

```powershell
npm run build:apk
```

Or with clean:

```powershell
npm run build:android:clean
```

### Option 3: Direct Gradle Command

From the `frontend_new/android` directory:

```powershell
.\gradlew.bat assembleRelease
```

## APK Location

After building, the APK will be located at:

```
frontend_new/android/app/build/outputs/apk/release/app-release.apk
```

## Installing on Your Device

### Method 1: USB Connection (ADB)

1. Enable **Developer Options** on your Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Go to Settings → Developer Options
   - Enable "USB Debugging"

3. Connect your device via USB and run:
   ```powershell
   adb install frontend_new/android/app/build/outputs/apk/release/app-release.apk
   ```

### Method 2: Transfer via Email/Cloud

1. Copy the APK file to your device (via email, Google Drive, Dropbox, etc.)
2. On your device, open the file manager and locate the APK
3. Tap the APK file to install
4. If prompted, enable "Install from Unknown Sources" in Settings

### Method 3: ADB over WiFi

1. Connect your device and laptop to the same WiFi network
2. Connect device via USB first, then run:
   ```powershell
   adb tcpip 5555
   adb connect <your-device-ip>:5555
   ```
3. Disconnect USB and install:
   ```powershell
   adb install frontend_new/android/app/build/outputs/apk/release/app-release.apk
   ```

## Important Notes

### API Configuration

The standalone APK uses the production API URL by default:

- **Production**: `https://visabuddy-backend-production.up.railway.app`

To change the API URL, you can:

1. Set environment variable before building:

   ```powershell
   $env:EXPO_PUBLIC_API_URL="https://your-api-url.com"
   npm run build:apk
   ```

2. Or modify `frontend_new/src/services/api.ts` directly

### Signing

The current build uses a debug keystore for testing. For production releases:

1. Generate a release keystore:

   ```powershell
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Update `frontend_new/android/app/build.gradle` with your keystore configuration

3. Create `frontend_new/android/keystore.properties`:
   ```properties
   storePassword=your-store-password
   keyPassword=your-key-password
   keyAlias=my-key-alias
   storeFile=my-release-key.keystore
   ```

### Build Requirements

- **Node.js**: >= 16
- **Java**: JDK 17
- **Android SDK**: API Level 33
- **Gradle**: Included in the project

## Troubleshooting

### Build Fails with "SDK not found"

Make sure you have:

1. Android Studio installed
2. Android SDK installed (API Level 33)
3. `ANDROID_HOME` environment variable set

### APK is too large

The APK includes all architectures by default. To build for specific architecture only, edit `frontend_new/android/gradle.properties`:

```properties
reactNativeArchitectures=arm64-v8a
```

### App crashes on launch

1. Check device logs:

   ```powershell
   adb logcat | Select-String "ReactNativeJS"
   ```

2. Verify API URL is accessible from your device
3. Check Firebase configuration if using push notifications

## Next Steps

After testing the standalone APK:

- Test all features work without Metro bundler
- Verify API connectivity
- Test push notifications (if applicable)
- Consider building an AAB (Android App Bundle) for Play Store distribution
