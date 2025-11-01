# Storage Comparison & Migration Guide

---

## 📊 Local Storage vs Firebase Storage

| Feature | Local Storage | Firebase Storage |
|---------|---------------|------------------|
| **Setup Time** | 2 minutes | 30 minutes |
| **Cost** | Free (uses disk) | Free tier + $0.18/GB |
| **Reliability** | Depends on server | 99.95% uptime SLA |
| **Scalability** | Limited by disk | Unlimited (cloud) |
| **Backups** | Manual | Automatic |
| **CDN** | No | Yes |
| **Geographic Distribution** | Single location | Global |
| **Best For** | Development/Testing | Production |

---

## 🚀 Current Setup: Local Storage

### How It Works
1. Files uploaded to `/api/documents/upload`
2. Stored in `uploads/files/{userId}/{docType}/` folder
3. Served via `http://localhost:3000/uploads/files/...`
4. Metadata saved in Prisma database

### File Organization
```
uploads/
├── files/
│   └── user-123/
│       └── passport/
│           └── uuid-passport.pdf
│       └── birth_cert/
│           └── uuid-birth.jpg
└── thumbnails/
    └── user-123/
        └── passport/
            └── thumb-uuid-passport.jpg
```

### Code Architecture
```typescript
// Request Flow:
1. POST /api/documents/upload
   ↓
2. documents.ts (route handler)
   ↓
3. StorageAdapter.uploadFile()
   ↓
4. LocalStorageService.uploadFile()
   ↓
5. fs.writeFile() → saves to uploads/
   ↓
6. Prisma.userDocument.create() → saves metadata
```

---

## 🔄 Migrate to Firebase: Step-by-Step

### Why Migrate?
- ✅ More reliable for production
- ✅ Automatic backups
- ✅ Global CDN speeds up downloads
- ✅ Handles millions of files easily
- ✅ Professional grade reliability

### Step 1: Get Firebase Credentials

```bash
# 1. Go to Firebase Console
# https://console.firebase.google.com

# 2. Create new project (or use existing)
# Name: visabuddy
# Accept terms → Create

# 3. Enable Storage
# Left sidebar → Build → Storage → Create bucket
# Location: Pick closest to users
# Accept rules → Create

# 4. Create Service Account
# Project Settings (gear icon) → Service Accounts
# Generate New Private Key → Download JSON file

# 5. Keep JSON file secret (never commit to git!)
```

### Step 2: Update .env

**Before:**
```bash
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=uploads
SERVER_URL=http://localhost:3000
```

**After:**
```bash
STORAGE_TYPE=firebase
FIREBASE_PROJECT_ID=visabuddy-xxxxx
FIREBASE_STORAGE_BUCKET=visabuddy-xxxxx.appspot.com
FIREBASE_PRIVATE_KEY='{"type":"service_account","project_id":"..."...}'
```

### Step 3: Restart Backend

```bash
npm start
```

**That's it!** No code changes needed.

The backend will automatically:
1. Detect `STORAGE_TYPE=firebase`
2. Initialize Firebase SDK
3. Switch to Firebase storage for new uploads
4. Old local files still accessible in database

---

## 🗂️ Managing Migration

### Approach 1: Gradual Migration (Recommended)

```
Week 1: Run both local + keep Firebase as backup
├─ STORAGE_TYPE=firebase
├─ New uploads → Firebase
└─ Old local files in database

Week 2: Archive old files
├─ Download local files
├─ Upload to Firebase manually
├─ Update file URLs in database

Week 3: Deprecate local storage
├─ Remove uploads/ folder
├─ Confirm all files in Firebase
└─ Clean up old code (optional)
```

### Approach 2: Immediate Switch

```
1. Switch .env to firebase
2. Upload a test file
3. If it works, all new uploads go to Firebase
4. Keep old database records (they'll have old URLs)
5. Update app to use new URLs from database
```

---

## 🛠️ Code Architecture is Already Abstracted

**Good News**: The code is already designed for this!

### Storage Adapter Pattern
```typescript
// Same interface for both:
StorageAdapter.uploadFile()
StorageAdapter.deleteFile()
StorageAdapter.getSignedUrl()

// Automatically switches based on STORAGE_TYPE env var
```

### What Gets Swapped
```typescript
// Local Storage
src/services/local-storage.service.ts
↓ (switched by adapter)
Firebase Storage
src/services/firebase-storage.service.ts

// Routes don't change!
// Database schema doesn't change!
// API doesn't change!
```

---

## 🔍 File Paths & URLs

### Local Storage URLs
```
Storage: /uploads/files/user-123/passport/uuid-file.pdf
URL: http://localhost:3000/uploads/files/user-123/passport/uuid-file.pdf
Accessible: ✓ Browser, app, API
Expires: ✓ Never
```

### Firebase Storage URLs
```
Storage: gs://bucket/user-123/passport/uuid-file.pdf
URL: https://storage.googleapis.com/.../uuid-file.pdf
Accessible: ✓ Browser, app, API
Expires: ✓ 1 year (signed URLs)
```

### Database Record
```prisma
model UserDocument {
  id: String
  userId: String
  fileUrl: String    // Can be local or Firebase URL
  fileName: String   // Storage path
  fileSize: Int
  status: String
}
```

The database doesn't care where files are stored! Same schema works for both.

---

## 📋 Pre-Migration Checklist

Before switching to Firebase:

- [ ] Firebase project created
- [ ] Storage bucket enabled
- [ ] Service account JSON downloaded
- [ ] Kept JSON file secure (not in git)
- [ ] .env credentials verified
- [ ] Tested upload with Firebase locally
- [ ] Old local files documented
- [ ] Database backup created
- [ ] Team informed of migration plan
- [ ] Rollback plan ready (keep .env local backup)

---

## ⚠️ Important Security Notes

### Local Storage
- Files accessible on server disk
- Backup to secure location for production
- No automatic security

### Firebase Storage
- Files encrypted at rest
- SSL/TLS in transit
- Access controlled via service account
- Audit logs available
- But still need to secure Firebase credentials!

### Protecting Credentials
```bash
# ✗ Don't do this
FIREBASE_PRIVATE_KEY='{"type":"service_account",...}'  # In git!

# ✓ Do this
# Use .env file (git ignored)
# Use environment variables on server
# Use secret manager in production
```

---

## 🚨 Troubleshooting Migration

### Problem: Firebase upload fails
```
Solution:
1. Check FIREBASE_PROJECT_ID matches
2. Check FIREBASE_STORAGE_BUCKET matches
3. Check service account has permissions
4. Check Firebase Storage rules aren't blocking
5. Fallback to local (code auto-switches)
```

### Problem: Old files not accessible
```
Solution:
1. Old files are still in database
2. Check fileUrl in database
3. If it was local: may not work after deleting folder
4. Keep uploads/ folder or migrate files
5. Update URLs in database if needed
```

### Problem: Mixed storage types
```
Solution:
1. Some files in local, some in Firebase
2. Code supports this transparently
3. Database knows where each file is
4. Consistency: pick one type and stick to it
```

---

## 📊 Monitoring Storage

### Local Storage
```bash
# Check disk usage
dir uploads\ | Measure-Object -Sum Length

# List all files
dir uploads\files -Recurse

# Clear (careful!)
rmdir uploads\files /s
```

### Firebase Storage
```bash
# Via Firebase Console
1. Go to Storage → Files
2. See all uploaded files
3. Check storage usage
4. Monitor bandwidth

# Via code
metadata = await FirebaseStorageService.getFileMetadata(fileName)
console.log(`Size: ${metadata.size} bytes`)
```

---

## 💡 Best Practices

### For Development
```
✓ Use local storage
✓ Files in .gitignore
✓ Backup regularly
✓ Test upload functionality
```

### For Production
```
✓ Use Firebase (or S3, GCS)
✓ Enable CDN
✓ Set security rules
✓ Backup policy: 1/week
✓ Monitor disk usage
✓ Set retention policy
```

---

## 🎯 Next Steps

### Now (Using Local Storage)
1. ✅ Test file uploads locally
2. ✅ Verify files save correctly
3. ✅ Check file URLs work in app
4. ✅ Review file structure

### Next (Ready for Firebase)
1. Create Firebase account
2. Enable Storage bucket
3. Generate service account
4. Add credentials to .env
5. Restart backend (automatic switch!)
6. Test Firebase uploads
7. Archive old local files

### Later (Production)
1. Set Firebase security rules
2. Configure CDN
3. Set up backups
4. Monitor usage
5. Scale as needed

---

## 📚 Related Files

- `src/services/local-storage.service.ts` - Local implementation
- `src/services/firebase-storage.service.ts` - Firebase implementation
- `src/services/storage-adapter.ts` - Adapter (does the switching)
- `.env` - Configuration file
- `SETUP_LOCAL_STORAGE.md` - Local setup instructions
- `SETUP_FIREBASE_STORAGE.md` - Firebase setup instructions