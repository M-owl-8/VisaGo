# PHASE 4: Detailed Testing & Verification Steps

**Estimated Time**: 2-3 hours  
**Difficulty**: Intermediate

This guide provides step-by-step instructions for Phase 4 testing.

---

## 📋 Table of Contents

1. [Step 1: Prepare Environment](#step-1-prepare-environment)
2. [Step 2: Start Backend](#step-2-start-backend)
3. [Step 3: Verify Database](#step-3-verify-database)
4. [Step 4: Test Backend API](#step-4-test-backend-api)
5. [Step 5: Start AI Service](#step-5-start-ai-service)
6. [Step 6: Start Frontend](#step-6-start-frontend)
7. [Step 7: Test Core Flows](#step-7-test-core-flows)
8. [Step 8: Create Admin User](#step-8-create-admin-user)

---

## Step 1: Prepare Environment

### 1.1 Verify .env Files Exist

```powershell
# Check backend .env
Test-Path "c:\work\VisaBuddy\apps\backend\.env"
# Should return: True

# Check frontend .env
Test-Path "c:\work\VisaBuddy\apps\frontend\.env"
# Should return: True
```

**If either returns False:**
- See Phase 3 documentation
- Environment variables need to be configured

### 1.2 Verify Node.js Installation

```powershell
node --version
# Should show: v18.x.x or higher

npm --version
# Should show: 9.x.x or higher
```

**If not installed:** Download from https://nodejs.org/

### 1.3 Verify Python Installation (for AI Service)

```powershell
python --version
# Should show: Python 3.10 or higher
```

**If not installed:** Download from https://www.python.org/

### 1.4 Clean Install (Optional)

If you've had issues before, clean everything:

```powershell
# Backend
Set-Location "c:\work\VisaBuddy\apps\backend"
Remove-Item "node_modules" -Recurse -Force
Remove-Item "package-lock.json"
npm install

# Frontend
Set-Location "c:\work\VisaBuddy\apps\frontend"
Remove-Item "node_modules" -Recurse -Force
Remove-Item "package-lock.json"
npm install

# AI Service
Set-Location "c:\work\VisaBuddy\apps\ai-service"
pip install --upgrade -r requirements.txt
```

---

## Step 2: Start Backend

### 2.1 Open Terminal 1

```powershell
Set-Location "c:\work\VisaBuddy\apps\backend"
```

### 2.2 Build TypeScript (Optional)

```powershell
npm run build
# Compiles TypeScript to JavaScript
# Output: dist/ folder with compiled files
```

### 2.3 Start the Server

```powershell
npm start
# OR for development with auto-reload:
npm run dev
```

### 2.4 Expected Output

You should see:

```
[Backend Server Starting...]
✅ Firebase initialized
✅ Redis connected to awake-tortoise-32750.upstash.io
✅ Database connected
✅ Email service ready
✅ OpenAI service initialized

Server running on http://localhost:3000
📊 Environment: development
🔐 JWT configured
✨ Ready to accept requests
```

### 2.5 If Backend Fails to Start

**Most common issues:**

```
Error: DATABASE_URL not set in .env
→ Fix: Add DATABASE_URL to backend/.env (from Phase 1)

Error: Cannot connect to Redis
→ Fix: Check UPSTASH_REDIS_REST_URL in .env (from Phase 3)

Error: Cannot initialize Firebase
→ Fix: Check FIREBASE_PROJECT_ID and credentials in .env (from Phase 3)

Error: Port 3000 already in use
→ Fix: Kill process on port 3000:
   Get-Process -Name node | Stop-Process -Force
   OR change port: npm start -- --port 3001
```

**For more issues, see:** `PHASE_4_TROUBLESHOOTING.md`

---

## Step 3: Verify Database

### 3.1 Open Terminal 2 (Keep Terminal 1 Running)

```powershell
Set-Location "c:\work\VisaBuddy\apps\backend"
```

### 3.2 Check Migration Status

```powershell
npx prisma migrate status
```

Expected output:
```
Database schema is up to date!
Applied migrations:
  20251103003154_init
```

**If you see "Following migrations have not yet been applied":**

```powershell
npx prisma migrate deploy
# This applies the migrations to your database
```

### 3.3 Open Prisma Studio (Visual Database Browser)

```powershell
npx prisma studio
```

This opens a browser window to `http://localhost:5555`

**What you should see:**
- Left sidebar with all database tables:
  - Users
  - VisaApplications
  - Documents
  - Conversations
  - ChatMessages
  - Payments
  - Notifications
  - etc.

**If you see errors:**
- Check DATABASE_URL in .env
- Make sure database is accessible
- Run migrations again

### 3.4 Verify Database Tables

In Prisma Studio:

1. Click on "Users" table
2. Should be empty (no users yet)
3. Click on "VisaApplications" table
4. Should be empty

This confirms the database is working correctly.

---

## Step 4: Test Backend API

### 4.1 Open Terminal 3 (Keep Terminals 1 & 2 Running)

```powershell
# Any directory
```

### 4.2 Test Health Endpoint

```powershell
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "redis": "connected",
    "firebase": "initialized",
    "email": "ready",
    "openai": "configured"
  },
  "timestamp": "2025-11-03T12:00:00Z"
}
```

### 4.3 Test Authentication Endpoint

```powershell
curl http://localhost:3000/api/auth/verify
```

Expected response:
```json
{
  "message": "Token verification endpoint",
  "requiresAuth": true
}
```

### 4.4 Test Countries Endpoint (Public)

```powershell
curl http://localhost:3000/api/countries
```

Expected response:
```json
[
  {
    "id": "US",
    "name": "United States",
    "visaTypes": ["B1/B2", "H1B", "EB5", ...],
    ...
  },
  ...
]
```

### 4.5 All Test Endpoints

```powershell
# Health check
curl http://localhost:3000/health
curl http://localhost:3000/api/health

# Public endpoints (no auth needed)
curl http://localhost:3000/api/countries
curl http://localhost:3000/api/legal/terms
curl http://localhost:3000/api/legal/privacy

# Protected endpoints (require token - will fail without login)
curl -H "Authorization: Bearer dummy_token" http://localhost:3000/api/users/me
```

---

## Step 5: Start AI Service

### 5.1 Open Terminal 4 (Keep Terminals 1-3 Running)

```powershell
Set-Location "c:\work\VisaBuddy\apps\ai-service"
```

### 5.2 Create Python Environment (First Time Only)

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 5.3 Install Python Dependencies

```powershell
pip install -r requirements.txt
```

Expected output:
```
Installing collected packages: fastapi, uvicorn, openai, ...
Successfully installed all packages
```

### 5.4 Create .env File

```powershell
# Copy example if it exists
if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
}

# Otherwise create new .env
New-Item ".env" -Type File
```

### 5.5 Update AI Service .env

Edit `c:\work\VisaBuddy\apps\ai-service\.env`:

```env
OPENAI_API_KEY=sk-proj-your-key-here  # Same key from backend
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
LOG_LEVEL=INFO
```

### 5.6 Start AI Service

```powershell
python main.py
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Application startup complete
```

### 5.7 Test AI Service (Terminal 3)

```powershell
# Test AI service health
curl http://localhost:8001/health

# Expected response:
# {"status": "ok", "model": "gpt-4"}

# Test chat endpoint (optional)
curl -X POST http://localhost:8001/chat `
  -H "Content-Type: application/json" `
  -d '{"message":"What documents do I need for a US visa?"}'
```

---

## Step 6: Start Frontend

### 6.1 Open Terminal 5 (Keep Terminals 1-4 Running)

```powershell
Set-Location "c:\work\VisaBuddy\apps\frontend"
```

### 6.2 Install Dependencies

```powershell
npm install
# Should complete without errors
```

### 6.3 Start Expo

```powershell
npm start
```

### 6.4 Choose Platform

When you see the menu:

```
i - open iOS simulator
a - open Android emulator  
w - open web
j - open Expo dev tools in browser
o - open project in Xcode
r - reload app
m - toggle module names
o - toggle slow animations
p - toggle performance monitor
shift+m - toggle network inspector
? - show all commands
```

**Choose one:**

```powershell
# Press 'a' for Android Emulator (requires Android Studio)
a

# OR Press 'w' for Web
w

# OR scan QR code with Expo Go app on your phone
# Install from: https://expo.dev/client
```

### 6.5 Expected Output

```
█ ▁ ▂ ▃ ▄ ▅ ▆ ▇ ▉ Expo
Packager started...
✓ Compiled successfully
Opened http://localhost:19000
```

### 6.6 Expected Screen

You should see:
- Login screen with "Login with Google" button
- Or if already logged in, dashboard with navigation

### 6.7 Test Frontend Connection

1. Open the app
2. You should see login screen
3. Check network logs (see if app connects to `http://localhost:3000`)
4. If you see errors, check:
   - `API_BASE_URL` in frontend `.env`
   - Backend is running on port 3000
   - Firewall isn't blocking local connections

---

## Step 7: Test Core Flows

### Test Flow 1: Google Login

**Steps:**
1. App shows login screen
2. Click "Login with Google"
3. Select your Google account
4. App should redirect to dashboard
5. Should display "Welcome, [Your Name]"

**Expected success:**
- ✅ User profile shows in dashboard
- ✅ Can see user info (email, name, avatar)
- ✅ JWT token created and stored

### Test Flow 2: Navigate Screens

**Steps:**
1. From dashboard, tap on navigation items:
   - "Chat" → AI chat screen
   - "Documents" → Document list
   - "Applications" → Visa applications
   - "Settings" → Settings screen
2. Each screen should load without errors

**Expected success:**
- ✅ No error messages
- ✅ Each screen displays correctly
- ✅ Navigation works smoothly

### Test Flow 3: AI Chat

**Steps:**
1. Go to Chat screen
2. Type message: "What documents do I need for US visa?"
3. Click send
4. Wait for response from AI

**Expected success:**
- ✅ Message shows in chat
- ✅ AI responds within 5 seconds
- ✅ Response is relevant to the question

### Test Flow 4: Document Handling

**Steps:**
1. Go to Documents screen
2. Click "Upload Document"
3. Select a PDF/image file
4. Document should appear in list

**Expected success:**
- ✅ File uploads without errors
- ✅ Shows in document list
- ✅ Can download/view the file

### Test Flow 5: Logout

**Steps:**
1. Go to Settings
2. Click "Logout"
3. App should return to login screen

**Expected success:**
- ✅ JWT token removed
- ✅ Back to login screen
- ✅ Can log in again

---

## Step 8: Create Admin User

### Option A: Using Prisma Studio

1. Open Prisma Studio (Terminal 2):
   ```powershell
   npx prisma studio
   ```

2. Navigate to Users table

3. Click "Add record" (+ button)

4. Fill in:
   - email: `admin@visabuddy.com`
   - name: `Admin User`
   - role: `ADMIN`
   - isEmailVerified: `true`
   - createdAt: auto-filled

5. Click "Save"

6. Admin user is now created

### Option B: Using Script (Recommended)

1. Create file: `c:\work\VisaBuddy\apps\backend\create-admin.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@visabuddy.com';
  const password = 'AdminPassword123!';
  
  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email }
  });
  
  if (existing) {
    console.log('Admin user already exists:', email);
    process.exit(0);
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create admin
  const admin = await prisma.user.create({
    data: {
      email,
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });
  
  console.log('✅ Admin created successfully');
  console.log('Email:', admin.email);
  console.log('Password: AdminPassword123!');
  console.log('\nUse these credentials to log in as admin');
  process.exit(0);
}

createAdmin().catch(err => {
  console.error('❌ Error creating admin:', err);
  process.exit(1);
});
```

2. Run the script:
   ```powershell
   Set-Location "c:\work\VisaBuddy\apps\backend"
   npx ts-node create-admin.ts
   ```

3. Expected output:
   ```
   ✅ Admin created successfully
   Email: admin@visabuddy.com
   Password: AdminPassword123!
   ```

### Option C: Using Manual Database Query

If you have direct database access:

```sql
INSERT INTO "User" (id, email, name, password, role, "isEmailVerified", "createdAt", "updatedAt")
VALUES (
  'admin-uuid-here',
  'admin@visabuddy.com',
  'Admin User',
  '$2a$10$...hashed-password-here...',
  'ADMIN',
  true,
  NOW(),
  NOW()
);
```

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Backend starts without errors
- [ ] Database migrations applied
- [ ] Prisma Studio shows all tables
- [ ] Health endpoint responds
- [ ] AI service starts on port 8001
- [ ] Frontend starts without errors
- [ ] Can log in with Google
- [ ] Can navigate between screens
- [ ] AI chat responds to messages
- [ ] Admin user created
- [ ] All error messages resolved

---

## 🎉 Success Criteria

You've completed Phase 4 when:

✅ All 3 services running (backend, AI, frontend)  
✅ All health checks pass  
✅ Database is accessible and populated  
✅ Can log in and navigate app  
✅ AI service responds to queries  
✅ Admin user created  

---

## ⏭️ Next Steps

1. **Document any issues** found during testing
2. **Fix issues** using troubleshooting guide
3. **Verify** everything again
4. **Move to Phase 5** when ready

See: `PHASE_4_TROUBLESHOOTING.md` for solutions

---

**Total Time: 2-3 hours**  
**Difficulty: Intermediate**  
**Next: Phase 5 - Deployment & Monitoring**