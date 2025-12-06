# iOS Build Instructions

## 🍎 iOS Build Setup Complete

The iOS icons are already generated and configured. Now you need to build the iOS app.

---

## ⚠️ Important: iOS Requires macOS

iOS apps can **only** be built on macOS with Xcode. Since you're on **Windows**, you have these options:

### ✅ Option 1: EAS Build (Cloud) - **Recommended for Windows**

EAS Build builds iOS apps in the cloud - no Mac needed!

#### Quick Start:

1. **Install EAS CLI:**

   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**

   ```bash
   eas login
   ```

   (Create free account at https://expo.dev if needed)

3. **Configure EAS:**

   ```bash
   cd frontend_new
   eas build:configure
   ```

4. **Build for iOS Simulator** (No Apple Developer account needed):

   ```bash
   npm run build:ios:eas:dev
   # or
   eas build --platform ios --profile development
   ```

5. **Build for Device/TestFlight** (Requires Apple Developer account - $99/year):
   ```bash
   npm run build:ios:eas
   # or
   eas build --platform ios --profile production
   ```

#### Using PowerShell Script:

```powershell
.\scripts\build-ios-eas.ps1
```

This script will:

- Check if EAS CLI is installed
- Prompt for login if needed
- Let you choose build type
- Start the cloud build
- Show download instructions

---

### ✅ Option 2: Local Build on macOS

If you have access to a Mac:

1. **Install CocoaPods:**

   ```bash
   sudo gem install cocoapods
   ```

2. **Install iOS dependencies:**

   ```bash
   cd frontend_new/ios
   pod install
   ```

3. **Open in Xcode:**

   ```bash
   open frontend_new.xcworkspace
   ```

4. **Configure signing:**
   - Select project → Signing & Capabilities
   - Select your Apple Developer team
   - Xcode will auto-generate provisioning profile

5. **Build:**
   - Product → Build (⌘B) for simulator
   - Product → Run (⌘R) for device
   - Product → Archive for App Store

---

## 📱 Build Profiles

From `eas.json`:

### Development (Simulator)

- **No Apple Developer account needed**
- For testing on iOS Simulator
- Command: `eas build --platform ios --profile development`

### Preview (Internal)

- **Requires Apple Developer account**
- For internal testing
- Command: `eas build --platform ios --profile preview`

### Production (App Store/TestFlight)

- **Requires Apple Developer account**
- For App Store submission
- Command: `eas build --platform ios --profile production`

---

## 📥 Download Build

After build completes:

```bash
eas build:download --latest
```

Or check status:

```bash
eas build:list
```

---

## 📤 Submit to TestFlight

After production build:

```bash
eas submit --platform ios --latest
```

This will:

1. Upload `.ipa` to App Store Connect
2. Process for TestFlight
3. Make available for testing

---

## ✅ Current Status

- ✅ iOS icons generated (all sizes)
- ✅ `AppIcon.appiconset/Contents.json` updated
- ✅ Icons in: `ios/frontend_new/Images.xcassets/AppIcon.appiconset/`
- ✅ EAS configuration ready (`eas.json`)
- ✅ Build scripts added to `package.json`

---

## 🚀 Next Steps

1. **Choose build method:**
   - Windows → Use EAS Build (Option 1)
   - macOS → Use local build (Option 2)

2. **Set up Apple Developer account** (if building for devices):
   - Sign up at https://developer.apple.com
   - $99/year subscription

3. **Run build:**

   ```bash
   # EAS Build (Windows/Mac/Linux)
   npm run build:ios:eas

   # Or use PowerShell script
   .\scripts\build-ios-eas.ps1
   ```

4. **Wait for build** (30-60 minutes)

5. **Download and test**

---

## 📝 NPM Scripts Added

```json
"build:ios:eas": "eas build --platform ios --profile production",
"build:ios:eas:dev": "eas build --platform ios --profile development"
```

---

## 🔧 Troubleshooting

### EAS Build Issues:

- **"Not logged in"**: Run `eas login`
- **"No Apple Developer account"**: Use `--profile development` for simulator
- **"Build failed"**: Check logs at https://expo.dev
- **"Signing error"**: Link Apple Developer account in EAS

### Local Build Issues:

- **"Pod install failed"**: Run `pod repo update && pod install`
- **"Signing error"**: Check Xcode → Signing & Capabilities
- **"Build failed"**: Clean build: Product → Clean Build Folder (⇧⌘K)

---

## 📚 Resources

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- Apple Developer: https://developer.apple.com
- TestFlight Guide: https://developer.apple.com/testflight/

---

**Ready to build!** Choose your method and run the build command. 🚀
