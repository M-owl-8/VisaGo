# 🔐 Google OAuth Setup Guide

**Service**: Google Sign-In Authentication  
**Required For**: User authentication  
**Difficulty**: Easy  
**Time**: 15-30 minutes

---

## 📋 Overview

Google OAuth allows users to sign in to VisaBuddy using their Google account. This guide will walk you through setting up Google OAuth 2.0 credentials.

---

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `VisaBuddy` (or your preferred name)
5. Click **"Create"**

### Wait for the project to be created, then select it from the dropdown.

---

### Step 2: Enable Google+ API

1. In the Google Cloud Console, go to **"APIs & Services"** > **"Library"**
2. Search for **"Google+ API"** or **"People API"**
3. Click on it and click **"Enable"**

**Note**: Google+ API is being deprecated. You can also use:
- **People API** (recommended)
- **Identity Toolkit API**

---

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** > **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace account)
3. Click **"Create"**

#### Fill in the required information:

- **App name**: `VisaBuddy`
- **User support email**: Your email address
- **Developer contact information**: Your email address
- **App logo**: (Optional) Upload your app logo
- **App domain**: (Optional) Your domain
- **Authorized domains**: (Optional) Add your production domain

4. Click **"Save and Continue"**

#### Scopes (Step 2):
- Click **"Add or Remove Scopes"**
- Add these scopes:
  - `email`
  - `profile`
  - `openid`
5. Click **"Update"** then **"Save and Continue"**

#### Test users (Step 3):
- For development, add test users (your email)
- Click **"Save and Continue"**

#### Summary (Step 4):
- Review and click **"Back to Dashboard"**

---

### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** > **"OAuth client ID"**

#### Application type: Web application

3. Fill in:
   - **Name**: `VisaBuddy Web Client`
   - **Authorized JavaScript origins**:
     ```
     http://localhost:19006
     http://localhost:3000
     https://your-production-domain.com
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:19006
     https://your-production-domain.com
     ```

4. Click **"Create"**

5. **IMPORTANT**: Copy the **Client ID** and **Client Secret** immediately
   - You won't be able to see the secret again!

---

### Step 5: Configure Environment Variables

#### Backend (`apps/backend/.env`):

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

#### Frontend (`apps/frontend/.env`):

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

**⚠️ IMPORTANT**: 
- The Client ID must match in both frontend and backend
- Never commit these values to git
- Use different credentials for development and production

---

## ✅ Verification

### Test the Setup:

1. **Backend**:
   ```bash
   cd apps/backend
   npm run dev
   ```
   Check console for: `✅ Google OAuth configured`

2. **Frontend**:
   ```bash
   cd apps/frontend
   npm run dev
   ```
   Try signing in with Google

3. **Check Logs**:
   - If you see OAuth errors, verify:
     - Client ID matches in both .env files
     - Redirect URIs are correct
     - OAuth consent screen is published (for production)

---

## 🔧 Troubleshooting

### Error: "redirect_uri_mismatch"

**Problem**: The redirect URI in your request doesn't match authorized URIs.

**Solution**:
1. Go to Google Cloud Console > Credentials
2. Edit your OAuth client
3. Add the exact redirect URI to "Authorized redirect URIs"
4. Make sure there are no trailing slashes or typos

### Error: "access_denied"

**Problem**: User denied permission or app not verified.

**Solution**:
- For development: Add user as test user in OAuth consent screen
- For production: Complete app verification process

### Error: "invalid_client"

**Problem**: Client ID or secret is incorrect.

**Solution**:
- Verify Client ID matches in frontend and backend .env files
- Regenerate credentials if needed
- Make sure you're using the correct credentials (dev vs production)

---

## 🚀 Production Setup

### Additional Steps for Production:

1. **Publish OAuth Consent Screen**:
   - Go to OAuth consent screen
   - Click **"Publish App"**
   - Complete verification if required (for sensitive scopes)

2. **Update Authorized Domains**:
   - Add your production domain
   - Update redirect URIs with production URLs

3. **Use Separate Credentials**:
   - Create separate OAuth client for production
   - Use different Client IDs for dev and production

4. **Security**:
   - Never expose Client Secret in frontend
   - Use environment variables in deployment platform
   - Rotate credentials if compromised

---

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth Consent Screen Guide](https://support.google.com/cloud/answer/10311615)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)

---

## ✅ Checklist

- [ ] Google Cloud project created
- [ ] Google+ API or People API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 credentials created
- [ ] Client ID added to frontend .env
- [ ] Client ID and Secret added to backend .env
- [ ] Authorized redirect URIs configured
- [ ] Test sign-in works
- [ ] Production credentials created (if deploying)

---

**Last Updated**: January 2025  
**Status**: ✅ Ready for use








