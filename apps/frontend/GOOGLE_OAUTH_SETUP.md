# 🔐 Google OAuth Setup Guide for VisaBuddy

Complete step-by-step guide to configure Google OAuth authentication for Android and iOS.

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Google Cloud Console Setup](#google-cloud-console-setup)
3. [Android Configuration](#android-configuration)
4. [iOS Configuration](#ios-configuration)
5. [Environment Configuration](#environment-configuration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- [Google Account](https://accounts.google.com)
- [Google Cloud Console](https://console.cloud.google.com)
- Android emulator or device for testing Android
- iOS device/simulator for testing iOS (Mac required)
- Node.js and npm installed

---

## Google Cloud Console Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on **Select a Project** at the top
3. Click **New Project**
4. Enter project name: `VisaBuddy` (or your preferred name)
5. Click **Create**
6. Wait for project to be created (usually 1-2 minutes)

### Step 2: Enable Google+ API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for `Google+ API` (you may also need `Identity Toolkit API`)
3. Click on it and press **Enable**
4. Also enable:
   - **Google Identity Services API**
   - **Google+ API**

### Step 3: Create OAuth 2.0 Credentials

#### Create Web Client Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. If prompted, configure consent screen first:
   - Click **Configure Consent Screen**
   - Choose **External** user type
   - Fill in required fields:
     - **App name**: VisaBuddy
     - **User support email**: your-email@example.com
     - **Developer contact**: your-email@example.com
   - Click **Save and Continue**
   - On Scopes page, click **Save and Continue** (default scopes are fine)
   - Review and click **Save and Continue**

4. Now create OAuth credentials:
   - Click **+ Create Credentials** → **OAuth client ID**
   - Select **Web application**
   - Name: `VisaBuddy Web Client`
   - Under **Authorized JavaScript origins**, add:
     ```
     http://localhost:3000
     http://localhost:19006
     ```
   - Under **Authorized redirect URIs**, add:
     ```
     http://localhost:3000/auth/callback
     http://localhost:19006/auth/callback
     visabuddy://oauth/callback
     com.visabuddy.app://oauth/callback
     ```
   - Click **Create**

5. **Copy the Web Client ID** (looks like: `123456789-abcdefghij.apps.googleusercontent.com`)
   - You'll need this in the next step

#### Create Android Client Credentials

1. Click **+ Create Credentials** → **OAuth client ID**
2. Select **Android**
3. Name: `VisaBuddy Android`
4. **Package name**: `com.visabuddy.app`
5. You need the **SHA-1 fingerprint** of your signing key (see [Get SHA-1 Fingerprint](#get-sha-1-fingerprint-for-android))
6. After adding SHA-1, click **Create**

#### Create iOS Client Credentials

1. Click **+ Create Credentials** → **OAuth client ID**
2. Select **iOS**
3. Name: `VisaBuddy iOS`
4. **Bundle ID**: `com.visabuddy.app`
5. Add your iOS **Team ID** and **App ID Prefix** if you have them
6. Click **Create**

---

## Android Configuration

### Get SHA-1 Fingerprint for Android

#### Option A: Using Gradle (Recommended)

```bash
cd apps/frontend/android
./gradlew signingReport
# or on Windows
gradlew.bat signingReport
```

Look for the SHA-1 fingerprint in the output. It will look like:
```
SHA1: AB:CD:EF:12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0:12
```

#### Option B: Using Keytool

```bash
# For debug key
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For release key
keytool -list -v -keystore /path/to/your/release.keystore -alias key-alias
```

### Configure Android Manifest

No additional configuration needed - it's already added to `AndroidManifest.xml`.

### Add google-services.json (Optional but Recommended)

1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Download the Android OAuth credentials as JSON
3. Place the file at: `apps/frontend/android/app/google-services.json`

---

## iOS Configuration

### Step 1: Get iOS Bundle ID

The Bundle ID is: `com.visabuddy.app`

### Step 2: Add URL Scheme to Info.plist

This should be automatically configured by Expo, but verify:

In Xcode, go to **Signing & Capabilities** and verify URL Scheme is registered.

### Step 3: Link Google Sign-In SDK

```bash
cd apps/frontend
npm install
npx pod-install ios
```

---

## Environment Configuration

### Step 1: Create .env File

Create `apps/frontend/.env` file:

```bash
GOOGLE_WEB_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID_HERE
API_BASE_URL=http://localhost:3000
```

Replace `YOUR_GOOGLE_WEB_CLIENT_ID_HERE` with the Web Client ID you copied earlier.

### Step 2: Update config/constants.ts

The file `src/config/constants.ts` already imports from `.env`. Make sure your `.env` file has the correct ID.

### Step 3: Verify Configuration

Run TypeScript check to ensure no errors:

```bash
npm run lint
npm run typecheck
```

---

## Testing

### Prerequisites for Testing
- Backend running: `cd apps/backend && npm run start`
- Mobile app running: `cd apps/frontend && npm run android` or `npm run ios`

### Test Steps

#### 1. Test Email/Password Login First
- This ensures backend and basic auth flow work
- Email: `test@example.com`
- Password: `Test123456`

#### 2. Test Google OAuth on Android

```bash
cd apps/frontend
npm run android
```

Steps:
1. On login screen, tap the Google button (G icon)
2. Select your Google account
3. Approve permissions
4. Should be redirected to home screen
5. Check user profile shows Google account info

#### 3. Test Google OAuth on iOS

```bash
cd apps/frontend
npm run ios
```

Same steps as Android above.

#### 4. Verify Database

Check that user was created/linked in database:

```bash
# Backend directory
npm run db:studio
# Check User table for new entry with googleId
```

### Expected Flow

```
Google Button Tap
    ↓
Google Account Picker (system)
    ↓
Permission Request (email, profile)
    ↓
Backend: POST /api/auth/google
    ↓
User Created/Linked in Database
    ↓
JWT Token Returned
    ↓
Stored in AsyncStorage
    ↓
Redirected to Home Screen ✓
```

---

## Troubleshooting

### Issue: "Google Play Services is not available"

**Solution:**
- Ensure Google Play Services is installed on device/emulator
- Use a real device for testing (emulator support is limited)
- Or install Google Play Services on emulator:
  ```bash
  # Check Play Services status
  adb shell dumpsys package com.google.android.gms
  ```

### Issue: "Sign in failed with unknown error"

**Solutions:**
1. Verify Web Client ID in `.env` file is correct
2. Check that URL scheme is registered in Xcode (iOS)
3. Verify SHA-1 fingerprint matches what's in Google Cloud Console
4. Clear app data and try again:
   ```bash
   # Android
   adb shell pm clear com.visabuddy.app
   ```

### Issue: "Invalid package name"

**Solution:**
- Ensure package name matches exactly: `com.visabuddy.app`
- Check `app.json` and `AndroidManifest.xml`

### Issue: "The redirect_uri parameter does not match"

**Solution:**
- Verify redirect URIs in OAuth credentials match
- Should include:
  - `visabuddy://oauth/callback`
  - `com.visabuddy.app://oauth/callback`

### Issue: User Created But Not Logged In

**Solution:**
1. Check backend logs for errors in `/api/auth/google` endpoint
2. Verify JWT token is returned correctly
3. Check AsyncStorage is saving token:
   ```typescript
   // In LoginScreen or auth store
   const token = await AsyncStorage.getItem('@auth_token');
   console.log('Stored token:', token);
   ```

### Issue: Google Sign-In Button Not Responding

**Solution:**
1. Check `GOOGLE_WEB_CLIENT_ID` in constants.ts is not the placeholder value
2. Verify `initializeGoogleSignIn()` was called successfully (check console logs)
3. Ensure no TypeScript errors:
   ```bash
   npm run typecheck
   ```

### Debug Logging

Enable detailed logging:

```typescript
// In src/services/google-oauth.ts, add:
console.log('Google Sign-In config:', {
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
});

// In src/screens/auth/LoginScreen.tsx, add:
console.log('Google user info:', googleUserInfo);
```

---

## Production Deployment

### Step 1: Create Production OAuth Credentials

1. In Google Cloud Console, create separate OAuth credentials for production
2. Get production app's SHA-1 fingerprint (from signed APK/IPA)
3. Add to production Android/iOS OAuth credentials

### Step 2: Update Environment Variables

For EAS Build (Expo Application Services):

```bash
eas build --env-file .env.production
```

Create `.env.production`:
```
GOOGLE_WEB_CLIENT_ID=PRODUCTION_WEB_CLIENT_ID
API_BASE_URL=https://api.visabuddy.com
```

### Step 3: Build Production APK/IPA

```bash
# Android
eas build --platform android --auto-submit

# iOS
eas build --platform ios --auto-submit
```

---

## Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use different credentials** for development and production
3. **Restrict OAuth credentials** to specific app signatures
4. **Implement token refresh** - Already done in `auth.ts`
5. **Log out on 401 errors** - Already implemented
6. **Clear sensitive data** on logout - Already implemented

---

## Quick Reference

| Item | Value |
|------|-------|
| Package Name | `com.visabuddy.app` |
| iOS Bundle ID | `com.visabuddy.app` |
| Deep Link Scheme | `visabuddy://` |
| OAuth Endpoint | `POST /api/auth/google` |
| Web Client ID | See `.env` file |

---

## Support & Resources

- [Google OAuth Documentation](https://developers.google.com/identity/gsi/web)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)
- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/)
- [Google Cloud Console](https://console.cloud.google.com)

---

## Implementation Status

✅ **Backend**: Google OAuth endpoint implemented (`/api/auth/google`)
✅ **Frontend**: Google Sign-In service created
✅ **Frontend**: LoginScreen updated with Google button
✅ **Configuration**: App.json and AndroidManifest.xml ready
⏳ **Testing**: Follow steps above to verify

---

## Next Steps

1. ✅ Complete "Google Cloud Console Setup" section
2. ✅ Complete "Get SHA-1 Fingerprint for Android" section
3. ✅ Create `.env` file with `GOOGLE_WEB_CLIENT_ID`
4. ✅ Install dependencies: `npm install`
5. ✅ Test with email/password first
6. ✅ Test with Google OAuth
7. ✅ Verify user created in database
8. ✅ Deploy to production

---

Last Updated: 2024