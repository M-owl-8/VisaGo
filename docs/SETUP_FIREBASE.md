# 🔥 Firebase Storage Setup Guide

**Service**: Firebase Cloud Storage  
**Required For**: Document upload and storage  
**Difficulty**: Medium  
**Time**: 20-30 minutes

---

## 📋 Overview

Firebase Storage provides secure cloud storage for user documents. This guide will help you set up Firebase Storage for VisaBuddy.

---

## 🚀 Step-by-Step Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** (or select existing project)
3. Enter project name: `VisaBuddy` (or your preferred name)
4. Click **"Continue"**
5. (Optional) Enable Google Analytics
6. Click **"Create project"**
7. Wait for project creation, then click **"Continue"**

---

### Step 2: Enable Storage

1. In Firebase Console, go to **"Storage"** in the left menu
2. Click **"Get started"**
3. Choose **"Production mode"** (recommended) or **"Test mode"** (for development)
4. Select a location for your storage bucket (choose closest to your users)
5. Click **"Done"**

**Storage Rules** (for Production mode):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

### Step 3: Create Service Account

1. Go to **"Project Settings"** (gear icon) > **"Service Accounts"**
2. Click **"Generate new private key"**
3. Click **"Generate key"** in the dialog
4. **IMPORTANT**: The JSON file will download automatically
   - Save this file securely
   - You won't be able to download it again!

5. Open the downloaded JSON file and note:
   - `project_id`
   - `private_key`
   - `client_email`

---

### Step 4: Configure Environment Variables

Add to `apps/backend/.env`:

```env
STORAGE_TYPE=firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**⚠️ IMPORTANT**:
- `FIREBASE_PRIVATE_KEY` must include the full key with `\n` for newlines
- Or use actual newlines in the .env file:
  ```
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
  Your
  Private
  Key
  Here
  -----END PRIVATE KEY-----"
  ```
- Never commit the service account JSON file to git
- Store it securely

---

### Step 5: Configure Storage Rules (Optional but Recommended)

1. Go to **"Storage"** > **"Rules"** tab
2. Update rules for your use case:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User documents: users/{userId}/documents/{documentId}
    match /users/{userId}/documents/{documentId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public uploads (if needed)
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

3. Click **"Publish"**

---

## ✅ Verification

### Test the Setup:

1. **Start Backend**:
   ```bash
   cd apps/backend
   npm run dev
   ```
   Check console for: `✅ Firebase Storage initialized`

2. **Test Upload**:
   - Use the document upload endpoint
   - Check Firebase Console > Storage to see uploaded files

3. **Check Logs**:
   - If you see Firebase errors, verify:
     - Service account credentials are correct
     - Private key format is correct (with newlines)
     - Project ID matches

---

## 🔧 Troubleshooting

### Error: "Firebase Storage initialization failed"

**Problem**: Service account credentials are incorrect.

**Solution**:
1. Verify `FIREBASE_PROJECT_ID` matches your project
2. Check `FIREBASE_PRIVATE_KEY` format (must include BEGIN/END markers)
3. Ensure `FIREBASE_CLIENT_EMAIL` is correct
4. Regenerate service account key if needed

### Error: "Permission denied"

**Problem**: Storage rules are too restrictive or service account lacks permissions.

**Solution**:
1. Check Storage rules in Firebase Console
2. Verify service account has "Storage Admin" role
3. For development, temporarily use test mode rules

### Error: "Bucket not found"

**Problem**: Storage bucket doesn't exist or project ID is wrong.

**Solution**:
1. Verify Storage is enabled in Firebase Console
2. Check project ID matches
3. Create storage bucket if it doesn't exist

---

## 🚀 Production Setup

### Additional Steps for Production:

1. **Update Storage Rules**:
   - Use production rules (see Step 5)
   - Test rules thoroughly
   - Enable versioning if needed

2. **Set Up CORS** (if accessing from web):
   - Configure CORS in Firebase Console
   - Add your domain to allowed origins

3. **Enable Lifecycle Rules**:
   - Set up automatic deletion of old files
   - Configure retention policies

4. **Monitoring**:
   - Enable Firebase Storage monitoring
   - Set up alerts for storage usage

5. **Backup Strategy**:
   - Consider backing up critical documents
   - Set up versioning for important files

---

## 💰 Pricing Considerations

Firebase Storage pricing:
- **Free tier**: 5 GB storage, 1 GB/day downloads
- **Paid**: $0.026/GB storage, $0.12/GB downloads

**Tips**:
- Monitor storage usage
- Set up alerts for approaching limits
- Consider lifecycle rules to delete old files
- Compress images before upload

---

## 📚 Additional Resources

- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Service Accounts](https://firebase.google.com/docs/admin/setup)

---

## ✅ Checklist

- [ ] Firebase project created
- [ ] Storage enabled
- [ ] Service account created
- [ ] Private key downloaded and saved securely
- [ ] Environment variables configured
- [ ] Storage rules configured
- [ ] Test upload successful
- [ ] Production rules updated (if deploying)
- [ ] Monitoring enabled

---

## 🔄 Fallback to Local Storage

If Firebase is not configured, the app will automatically fall back to local storage (`uploads/` directory). This is fine for development but not recommended for production.

To use local storage:
```env
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=uploads
```

---

**Last Updated**: January 2025  
**Status**: ✅ Ready for use








