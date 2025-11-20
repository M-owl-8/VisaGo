# Firebase Setup Guide

## Overview
Firebase provides:
1. **Cloud Storage** - File/document uploads
2. **Cloud Messaging (FCM)** - Push notifications

Both are **optional** - the app works without them:
- Without Firebase Storage → Uses local storage (files saved to `uploads/` folder)
- Without FCM → Push notifications disabled

---

## When You Need Firebase

### Firebase Storage:
- ✅ **Use local storage for:** Development, testing, small deployments
- ✅ **Use Firebase Storage for:** Production with multiple servers, scaling

### Firebase Cloud Messaging (FCM):
- ✅ **Need for:** Mobile push notifications
- ❌ **Not needed for:** Email notifications, in-app notifications

---

## Setup Firebase Storage

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name: "VisaBuddy"
4. Disable Google Analytics (optional)
5. Create project

### 2. Enable Cloud Storage

1. In Firebase Console → Build → Storage
2. Click "Get started"
3. Start in production mode
4. Choose location (closest to your users)
5. Click "Done"

### 3. Create Service Account

1. Project Settings (gear icon) → Service accounts
2. Click "Generate new private key"
3. Save the JSON file securely
4. **NEVER commit this file to git!**

### 4. Get Storage Bucket Name

From Firebase Console → Storage:
- Bucket name looks like: `your-project.appspot.com`
- Copy this value

### 5. Configure Backend

#### For Local Development:

In `apps/backend/.env`:

```bash
# Firebase Configuration
FIREBASE_STORAGE_TYPE=firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

**Important:** 
- Replace `\n` with actual newlines if copying from JSON
- Or encode the entire JSON as base64:

```bash
# Base64 encode (easier for .env)
FIREBASE_CREDENTIALS_BASE64=<base64-encoded-service-account-json>
```

#### For Production (Railway):

Add environment variables in Railway dashboard:

```
FIREBASE_STORAGE_TYPE=firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_CREDENTIALS_BASE64=<base64-encoded-json>
```

### 6. Test It

```bash
npm run dev
```

Should see:
```
✓ Firebase Storage initialized
```

Instead of:
```
⚠️ Firebase Storage initialization failed, falling back to local storage
```

---

## Setup Firebase Cloud Messaging (FCM)

### 1. Enable FCM in Firebase Console

1. Project Settings → Cloud Messaging
2. Note your **Server Key** (legacy) or create new credentials

### 2. Configure Backend

In `apps/backend/.env`:

```bash
# Same FIREBASE_* variables as above, FCM uses the same credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

### 3. Configure Mobile App

In `frontend_new/android/app/google-services.json`:
- Download from Firebase Console
- Project Settings → Your apps → Android app
- Download `google-services.json`
- Place in `frontend_new/android/app/`

### 4. Test It

```bash
npm run dev
```

Should see:
```
✅ Firebase Cloud Messaging service initialized
```

---

## Using Local Storage Instead (Recommended for Development)

### Advantages:
- ✅ No setup required
- ✅ Files stored locally
- ✅ Faster for development
- ✅ No external dependencies

### Configuration:

In `apps/backend/.env`:

```bash
# Use local storage (default)
FIREBASE_STORAGE_TYPE=local
LOCAL_STORAGE_PATH=uploads
SERVER_URL=http://localhost:3000
```

Files will be saved to:
- `uploads/uploads/` - Main files
- `uploads/thumbnails/` - Thumbnails

Access via:
```
http://localhost:3000/uploads/filename
```

---

## Production Recommendations

### Option 1: Firebase Storage (Recommended)
**Best for:**
- Multiple server instances
- Scaling horizontally
- CDN delivery
- Large file storage

**Setup:**
- Follow "Setup Firebase Storage" above
- Use Railway environment variables
- Store credentials securely

### Option 2: Local Storage + Persistent Volume
**Best for:**
- Single server
- Small deployments
- Cost savings

**Setup on Railway:**
1. Mount persistent volume
2. Set `LOCAL_STORAGE_PATH=/data/uploads`
3. Configure `SERVER_URL` to Railway domain

---

## Troubleshooting

### "Firebase Storage initialization failed"

**Causes:**
1. Missing environment variables
2. Invalid credentials
3. Wrong private key format

**Fix:**
- Check all `FIREBASE_*` variables are set
- Verify credentials JSON is valid
- Try base64 encoding the entire JSON

### "Permission denied" (Firebase Storage)

**Cause:** Storage rules too restrictive

**Fix:**
Update Firebase Storage Rules:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Files Not Accessible (Local Storage)

**Cause:** Express not serving static files

**Fix:**
Make sure this is in `src/index.ts`:
```typescript
app.use('/uploads', express.static('uploads'));
```

---

## Quick Decision Guide

### Use Local Storage if:
- ✅ Development/testing
- ✅ Single server deployment
- ✅ Small file volumes
- ✅ Want simplicity

### Use Firebase Storage if:
- ✅ Production with scaling
- ✅ Multiple server instances
- ✅ Need CDN delivery
- ✅ Large file volumes
- ✅ Mobile app file uploads

---

## Current Status

Your backend is currently:
- ✅ **Working with local storage fallback**
- ⚠️ Firebase Storage not configured (non-critical)
- ✅ Files will be saved to `uploads/` folder
- ✅ Everything functions normally

**Action required:** None for development. Configure for production if needed.




