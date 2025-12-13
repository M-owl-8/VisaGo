# Firebase Storage Bucket Fix Guide

## ✅ Code Fix Applied

The code now automatically tries multiple bucket name formats:
- `visago-a86de.appspot.com`
- `visago-a86de.firebasestorage.app`
- And other variations

**The system will automatically use the correct bucket format if it exists.**

## 🔧 Manual Steps Required

Since I cannot access Railway or Firebase Console directly, please complete these steps:

### Step 1: Update Railway Environment Variable (Recommended)

1. Go to **Railway Dashboard** → Your Backend Service → **Variables**
2. Find `FIREBASE_STORAGE_BUCKET`
3. Update it to: `visago-a86de.firebasestorage.app`
4. Save (Railway will auto-redeploy)

**Note:** The code will auto-detect the correct format, but setting it correctly prevents warnings.

### Step 2: Update Firebase Storage Security Rules

1. Go to **Firebase Console** → **Storage** → **Rules** tab
2. Replace the current rules with:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Allow all access (Firebase Admin SDK with service account bypasses rules)
    // For production, you may want to add more restrictions
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"** to save

**Why:** The current rules (`allow read, write: if false;`) block all access. The service account needs access to upload files.

### Step 3: Verify Service Account Permissions

1. Go to **Google Cloud Console** → **IAM & Admin** → **Service Accounts**
2. Find: `firebase-adminsdk-fbsvc@visago-a86de.iam.gserviceaccount.com`
3. Click on it → **Permissions** tab
4. Ensure it has **"Storage Admin"** role
5. If missing, click **"Grant Access"** and add the role

## 🧪 Testing

After completing the steps above:

1. **Wait for Railway redeploy** (check Deployments tab)
2. **Check server logs** for:
   - `✅ Firebase Storage configured (bucket: visago-a86de.firebasestorage.app)`
3. **Test document upload** in your app
4. **Verify in Firebase Console** → Storage → Files (should see uploaded files)

## 📝 Expected Behavior

- **If bucket exists and is accessible:** Uses Firebase Storage ✅
- **If bucket doesn't exist:** Automatically falls back to local storage ⚠️
- **If credentials are wrong:** Falls back to local storage ⚠️

## 🚨 Troubleshooting

### Issue: Still getting 404 errors

**Check:**
1. Bucket exists in Firebase Console → Storage
2. Service account has "Storage Admin" role
3. Storage Rules allow access (use `if true` for testing)

### Issue: Upload works but files don't appear

**Check:**
1. Firebase Console → Storage → Files
2. Look in the correct folder path: `{userId}/{fileType}/`
3. Check if files are in a different bucket

### Issue: Want to use local storage instead

**Set in Railway:**
```
STORAGE_TYPE=local
SERVER_URL=https://your-railway-app.railway.app
```

## ✅ Success Indicators

- Server logs show: `✅ Firebase Storage configured`
- Document upload succeeds
- Files appear in Firebase Console → Storage → Files
- No 404 errors in logs

---

**Note:** The code fix is already deployed. You only need to complete the manual steps above (Railway variable + Firebase Rules).

