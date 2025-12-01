# iOS Build Guide

## ⚠️ Important: iOS builds require macOS

iOS apps can only be built on macOS with Xcode installed. Since you're on Windows, you have two options:

### Option 1: EAS Build (Cloud-based) - Recommended for Windows

EAS Build can build iOS apps in the cloud without needing a Mac.

#### Prerequisites:

1. **Expo account** (free tier available)
2. **Apple Developer account** ($99/year) - Required for device builds
3. **EAS CLI** installed

#### Setup Steps:

1. **Install EAS CLI:**

   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**

   ```bash
   eas login
   ```

3. **Configure EAS Build:**

   ```bash
   cd frontend_new
   eas build:configure
   ```

4. **Build for iOS (Simulator - No Apple Developer account needed):**

   ```bash
   eas build --platform ios --profile development
   ```

5. **Build for iOS (Device/TestFlight - Requires Apple Developer account):**

   ```bash
   eas build --platform ios --profile production
   ```

   - EAS will prompt for Apple credentials
   - Build takes 30-60 minutes
   - Download `.ipa` file when complete

6. **Submit to TestFlight:**
   ```bash
   eas submit --platform ios --latest
   ```

#### EAS Build Profiles (from `eas.json`):

- **development**: Simulator build (no Apple account needed)
- **preview**: Internal distribution
- **production**: App Store / TestFlight build

---

### Option 2: Local Build on macOS

If you have access to a Mac:

#### Prerequisites:

1. **macOS** (latest version recommended)
2. **Xcode** (from App Store)
3. **CocoaPods**: `sudo gem install cocoapods`
4. **Apple Developer account** (for device builds)

#### Setup Steps:

1. **Install CocoaPods dependencies:**

   ```bash
   cd frontend_new/ios
   pod install
   ```

2. **Open Xcode workspace:**

   ```bash
   open frontend_new.xcworkspace
   ```

3. **Configure signing:**
   - Select project in Xcode
   - Go to "Signing & Capabilities"
   - Select your team
   - Xcode will auto-generate provisioning profile

4. **Build for Simulator:**

   ```bash
   npm run build:ios
   # or in Xcode: Product → Build (⌘B)
   ```

5. **Build for Device:**
   - Connect iOS device
   - Select device in Xcode
   - Product → Run (⌘R)

6. **Archive for App Store:**
   - Product → Archive
   - Distribute App → App Store Connect
   - Follow prompts

---

## Current iOS Icon Status

✅ **Icons are already generated!**

- All iOS icon sizes created
- `AppIcon.appiconset/Contents.json` updated
- Icons located in: `ios/frontend_new/Images.xcassets/AppIcon.appiconset/`

To regenerate icons:

```bash
npm run icons:ios
```

---

## Quick Commands

### Using EAS Build (Windows/Mac):

```bash
# Development build (simulator)
eas build --platform ios --profile development

# Production build (device/TestFlight)
eas build --platform ios --profile production

# Check build status
eas build:list

# Download latest build
eas build:download --latest
```

### Using Xcode (macOS only):

```bash
# Install pods
cd ios && pod install

# Build
npm run build:ios

# Or open in Xcode
open ios/frontend_new.xcworkspace
```

---

## Troubleshooting

### EAS Build Issues:

- **"No Apple Developer account"**: Use `--profile development` for simulator builds
- **"Build failed"**: Check logs at https://expo.dev
- **"Signing error"**: Ensure Apple Developer account is linked

### Local Build Issues:

- **"Pod install failed"**: Run `pod repo update` then `pod install`
- **"Signing error"**: Check Xcode → Signing & Capabilities
- **"Build failed"**: Clean build folder: Product → Clean Build Folder (⇧⌘K)

---

## Next Steps

1. **Choose your build method** (EAS Build recommended for Windows)
2. **Set up Apple Developer account** (if building for devices)
3. **Run build command**
4. **Test on device/simulator**
5. **Submit to TestFlight/App Store**

---

**Note**: The iOS icons are already generated and ready. You just need to build the app!
