# Firebase Storage Setup Guide

**Status**: CRITICAL - Do after PostgreSQL  
**Time to Complete**: 30 minutes  
**Complexity**: Medium  

---

## 📋 Overview

This guide walks you through setting up Firebase Storage for document uploads (visa photos, PDFs, etc.).

### Why Firebase Storage?
- ✅ Secure file uploads
- ✅ Automatic backups
- ✅ CDN for fast downloads
- ✅ Free tier available (5GB/month)
- ✅ Easy integration with Node.js

---

## 🚀 Step 1: Create Firebase Project

1. **Go to**: https://console.firebase.google.com
2. **Create new project**:
   - Project name: `visabuddy`
   - Accept terms, click **Continue**
   - Analytics: Optional, click **Create project**
   - Wait ~30 seconds for project creation

3. **Enable Storage**:
   - In left sidebar: **Build > Storage**
   - Click **Create bucket**
   - Location: Select closest to users
   - Accept default rules for now
   - Click **Create**

---

## 🔑 Step 2: Create Service Account

This gives your backend permission to upload files.

1. **Go to**: **Project Settings** (gear icon, top right)
2. **Click**: **Service Accounts** tab
3. **Click**: **Generate New Private Key** button
4. **Download** the JSON file (keep it secret!)
5. **Copy contents** of the JSON file

---

## 📝 Step 3: Add to Environment Variables

Update `.env` in `c:\work\VisaBuddy\apps\backend`:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_bucket_name.appspot.com
FIREBASE_PRIVATE_KEY='{"type": "service_account", ...}'  # Entire JSON as one line
```

### How to get these values:

1. **FIREBASE_PROJECT_ID**:
   - From downloaded JSON file: `"project_id"` field
   - Example: `visabuddy-abc123`

2. **FIREBASE_STORAGE_BUCKET**:
   - Firebase Console → Storage → Bucket name
   - Example: `visabuddy-abc123.appspot.com`

3. **FIREBASE_PRIVATE_KEY**:
   - From downloaded JSON file, **entire content**
   - Make it one line: `'{"type":"service_account","project_id":"...",...}'`
   - Put single quotes around it!

### Example .env:
```bash
FIREBASE_PROJECT_ID=visabuddy-abc123
FIREBASE_STORAGE_BUCKET=visabuddy-abc123.appspot.com
FIREBASE_PRIVATE_KEY='{"type":"service_account","project_id":"visabuddy-abc123","private_key_id":"key123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQ...more content...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@...","client_id":"123456","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs"}'
```

---

## 🔒 Step 4: Security Rules

Set proper access rules in Firebase Console.

1. **Go to**: **Storage > Rules**
2. **Replace** the default rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload to their own folder
    match /users/{userId}/{allPaths=**} {
      allow write: if request.auth.uid == userId && 
                     request.resource.size < 50 * 1024 * 1024 && // Max 50MB
                     request.resource.contentType.matches('image/.*|application/pdf');
      allow read: if request.auth.uid != null;
    }
    
    // Admin operations
    match /admin/{allPaths=**} {
      allow read, write: if false; // Admin only via backend
    }
  }
}
```

3. **Click**: **Publish**

---

## 📦 Step 5: Test Upload

Create a test endpoint in `src/routes/test.ts`:

```typescript
import express from "express";
import FirebaseStorageService from "../services/firebase-storage.service";

const router = express.Router();

router.post("/upload-test", async (req, res) => {
  try {
    const testBuffer = Buffer.from("Test file content");
    
    const result = await FirebaseStorageService.uploadFile(
      testBuffer,
      "test.txt",
      "text/plain",
      "test-user-id",
      {
        compress: false,
        generateThumbnail: false,
      }
    );

    res.json({
      success: true,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
      fileSize: result.fileSize,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    });
  }
});

export default router;
```

Add to `index.ts`:
```typescript
import testRoutes from "./routes/test";
app.use("/api/test", testRoutes);
```

Then test:
```bash
curl -X POST http://localhost:3000/api/test/upload-test
```

**Expected response**:
```json
{
  "success": true,
  "fileUrl": "https://storage.googleapis.com/visabuddy.../...",
  "fileName": "test-user-id/text/plain/...",
  "fileSize": 17
}
```

---

## 🖼️ Integration with Documents Route

The documents service now uses Firebase Storage automatically:

```typescript
// In src/routes/documents.ts
router.post("/:applicationId/upload", upload.single("file"), async (req, res) => {
  const result = await FirebaseStorageService.uploadFile(
    req.file!.buffer,
    req.file!.originalname,
    req.file!.mimetype,
    req.userId,
    {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedFormats: ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
      compress: true,
      generateThumbnail: true,
    }
  );

  // Save to database
  await prisma.userDocument.create({
    data: {
      userId: req.userId,
      applicationId,
      documentName: req.body.documentName,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
      fileSize: result.fileSize,
      documentType: req.body.documentType,
    },
  });

  res.json({ success: true, ...result });
});
```

---

## 📊 Monitoring Storage

In Firebase Console:

1. **Storage > Files**: See all uploaded files
2. **Usage**: Monitor bandwidth and storage usage
3. **Download**: Download files for backup

### Track in code:
```typescript
const metadata = await FirebaseStorageService.getFileMetadata(fileName);
console.log(`File size: ${metadata.size} bytes`);
console.log(`Content type: ${metadata.contentType}`);
console.log(`Created: ${metadata.created}`);
```

---

## 🚀 Production Configuration

### Increase quotas (if needed):

1. **Firebase Console > Settings > Quotas**
2. Request increase for:
   - Max upload size: 500MB
   - Max concurrent uploads: 1000

### Enable CDN:

1. **Enable Cloud CDN** on your bucket
2. Set cache time to 1 day for user documents
3. Set cache time to 30 days for static content

### Backup strategy:

1. Set up automated backups to Google Cloud Storage
2. Or use Cloud Storage Transfer Service
3. Recommended: 1 backup per week to separate bucket

---

## 💾 Data Migration (if existing files)

If you have existing local files:

```bash
# From c:\work\VisaBuddy\apps\backend

# 1. Create local backup folder structure
mkdir local-files-backup

# 2. Copy your existing files
xcopy /Y uploads\* local-files-backup\

# 3. Upload to Firebase (use helper script)
node scripts/upload-existing-files.js
```

Create `scripts/upload-existing-files.js`:
```javascript
const fs = require('fs');
const path = require('path');
const FirebaseStorageService = require('../dist/services/firebase-storage.service');

async function uploadFiles() {
  const backupDir = './local-files-backup';
  const files = fs.readdirSync(backupDir);
  
  for (const file of files) {
    const filePath = path.join(backupDir, file);
    const buffer = fs.readFileSync(filePath);
    
    try {
      const result = await FirebaseStorageService.uploadFile(
        buffer,
        file,
        'application/octet-stream',
        'migration-user'
      );
      console.log(`✓ Uploaded: ${file}`);
    } catch (error) {
      console.error(`✗ Failed: ${file}`, error);
    }
  }
}

uploadFiles();
```

---

## ✅ Checklist

- [ ] Created Firebase project
- [ ] Created Storage bucket
- [ ] Generated service account JSON
- [ ] Added Firebase credentials to .env
- [ ] Updated security rules
- [ ] Tested upload with `POST /api/test/upload-test`
- [ ] Verified files appear in Firebase Console
- [ ] Documents route uses Firebase Storage
- [ ] Set up backup strategy

---

## 🎉 Success!

Your storage is now production-ready:
- ✅ Secure file uploads
- ✅ Automatic backups
- ✅ CDN distribution
- ✅ Image compression & thumbnails
- ✅ Can handle millions of files

**Next step**: Setup Caching and AI (see `SETUP_CACHING_AND_AI.md`)
