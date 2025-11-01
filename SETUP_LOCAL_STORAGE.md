# Local Storage Setup Guide

**Status**: ✅ READY TO USE
**Type**: Development/Testing Solution
**Time to Complete**: 2 minutes

---

## 📋 Overview

Your backend now supports **local file storage** for development! This lets you:
- ✅ Test file uploads immediately
- ✅ No Firebase credentials needed
- ✅ Easy to switch to Firebase later
- ✅ Files stored in `uploads/` folder

---

## 🚀 Quick Start

### 1. Install Dependencies (if not already done)

```bash
cd c:\work\VisaBuddy\apps\backend
npm install
```

### 2. Update `.env` (Already Done!)

Your `.env` is configured for local storage:

```bash
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=uploads
SERVER_URL=http://localhost:3000
```

### 3. Start the Backend

```bash
cd c:\work\VisaBuddy\apps\backend
npm start
```

You should see:
```
💾 Initializing Local Storage...
✓ Local Storage initialized (uploads folder: uploads)
```

### 4. Test File Upload

```bash
# In PowerShell, create a test file
$testContent = "Test document content"
$testFile = "test-document.txt"

# Upload using curl
curl -X POST http://localhost:3000/api/documents/upload `
  -H "Authorization: Bearer YOUR_JWT_TOKEN" `
  -F "file=@$testFile" `
  -F "applicationId=app-123" `
  -F "documentType=passport"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "doc-123",
    "fileUrl": "http://localhost:3000/uploads/files/user-123/application/mimetype/uuid-test-document.txt",
    "fileSize": 17,
    "status": "pending"
  },
  "storage": {
    "type": "local",
    "fileUrl": "http://localhost:3000/uploads/files/user-123/application/mimetype/uuid-test-document.txt"
  }
}
```

---

## 📁 Folder Structure

```
c:\work\VisaBuddy\apps\backend\
├── uploads/
│   ├── files/
│   │   └── {userId}/
│   │       └── {documentType}/
│   │           └── {uuid}-filename.pdf
│   └── thumbnails/
│       └── {userId}/
│           └── {documentType}/
│               └── thumb-{uuid}-filename.jpg
```

---

## 🎯 Features

### Image Compression
- Images are automatically compressed to max 2000x2000 pixels
- Reduces storage space
- Maintains quality

### Thumbnails
- Automatically generated for JPG/PNG files
- 200x200 thumbnails for previews
- Stored separately

### File Validation
- Max file size: 50MB (configurable)
- Supported formats: pdf, jpg, jpeg, png, doc, docx
- MIME type validation

---

## 🔄 Later: Migrate to Firebase

When you have budget for Firebase:

### Step 1: Get Firebase Credentials
1. Go to https://console.firebase.google.com
2. Create project → Enable Storage
3. Download service account JSON
4. Add to `.env`:

```bash
STORAGE_TYPE=firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_PRIVATE_KEY='{"type":"service_account",...}'
```

### Step 2: Restart Backend
```bash
npm start
```

**That's it!** No code changes needed. The storage adapter handles the switch automatically.

---

## 📊 Monitor Local Storage

### View Uploaded Files
```bash
cd c:\work\VisaBuddy\apps\backend
ls uploads/files  # Or use Windows File Explorer
```

### Clear Storage (Development Only)
```bash
# Delete all uploads (be careful!)
rmdir uploads /s /q
```

---

## 🐛 Troubleshooting

### Error: "uploads folder not found"
```bash
# Create it manually
mkdir c:\work\VisaBuddy\apps\backend\uploads
```

### Error: "File URL not accessible"
Make sure `SERVER_URL` in `.env` matches your actual server URL:
```bash
# For local development
SERVER_URL=http://localhost:3000

# For production
SERVER_URL=https://your-domain.com
```

### Images not compressing
- Check if `sharp` package is installed: `npm install sharp`
- Ensure image has valid MIME type

---

## ✅ Checklist

- [x] Local storage configured in `.env`
- [x] Backend starts without Firebase errors
- [x] `uploads/` folder created automatically
- [x] File upload endpoint works
- [x] Files accessible via HTTP
- [ ] Test upload in your app
- [ ] Ready to deploy (or upgrade to Firebase later)

---

## 🎉 You're Ready!

Your backend now has file upload working locally! 

**Next steps:**
1. Test file uploads from your mobile app
2. Verify files are saved in `uploads/` folder
3. Check file URLs work in browser
4. When budget allows, upgrade to Firebase (just update `.env`)

---

## 📚 Key Files Changed

- `src/services/local-storage.service.ts` - Local storage implementation
- `src/services/storage-adapter.ts` - Abstraction layer for switching storage
- `src/routes/documents.ts` - Updated to use storage adapter
- `src/index.ts` - Added static file serving
- `.env` - Configured for local storage

---

## 🔗 Related Docs

- [SETUP_FIREBASE_STORAGE.md](./SETUP_FIREBASE_STORAGE.md) - For Firebase setup later
- [SETUP_CACHING_AND_AI.md](./SETUP_CACHING_AND_AI.md) - Next step after storage