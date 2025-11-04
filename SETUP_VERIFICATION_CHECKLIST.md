# ✅ Phase 3 Setup Verification Checklist

**Purpose**: Verify all Phase 3 setup is complete before starting development  
**Estimated Time**: 5 minutes  
**Status**: Use this to confirm everything is ready

---

## 📋 Part 1: Environment Files

### Backend `.env` (apps/backend/.env)

Check each line exists and has a value:

- [ ] `DATABASE_URL=postgresql://...` ✅
- [ ] `JWT_SECRET=...` ✅
- [ ] `GOOGLE_CLIENT_ID=70376960035-09cj8bj1lcenp6rm1pmqi6v1m498qu8q.apps.googleusercontent.com` ✅
- [ ] `GOOGLE_CLIENT_SECRET=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` ✅
- [ ] `GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback` ✅
- [ ] `FIREBASE_PROJECT_ID=pcpt-203e6` ✅
- [ ] `FIREBASE_PRIVATE_KEY_ID=ed27e86d8658dcc830452be6d1404c7359b704fd` ✅
- [ ] `FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...` ✅ (full key present)
- [ ] `FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@pcpt-203e6.iam.gserviceaccount.com` ✅
- [ ] `FIREBASE_CLIENT_ID=104197076833279512327` ✅
- [ ] `OPENAI_API_KEY=sk-proj-Ve-5LJ08k8v1fku7R7vR6...` ✅
- [ ] `SMTP_HOST=smtp.sendgrid.net` ✅
- [ ] `SMTP_PASSWORD=SG.UzxNI3y4Rl2OTqbAiT2oUA.ncvS81_Af5Zs4IcoEfnFV_...` ✅
- [ ] `SMTP_FROM_EMAIL=visago@bitway.com` ✅
- [ ] `UPSTASH_REDIS_REST_URL=https://awake-tortoise-32750.upstash.io` ✅
- [ ] `UPSTASH_REDIS_REST_TOKEN=AX_uAAIncDIzZmE2NDM2YzIyY2U0N2MxYmYwNjkzZjY2ZDZlZTQ3ZHAyMzI3NTA` ✅

**Quick Check**:
```powershell
cd c:\work\VisaBuddy\apps\backend
cat .env | findstr "FIREBASE_PROJECT_ID" | findstr "pcpt-203e6"
# Should show: FIREBASE_PROJECT_ID=pcpt-203e6
```

### Frontend `.env` (apps/frontend/.env)

Check each line exists and has a value:

- [ ] `API_BASE_URL=http://localhost:3000` ✅
- [ ] `GOOGLE_WEB_CLIENT_ID=70376960035-09cj8bj1lcenp6rm1pmqi6v1m498qu8q.apps.googleusercontent.com` ✅
- [ ] `FIREBASE_PROJECT_ID=pcpt-203e6` ✅
- [ ] `NODE_ENV=development` ✅
- [ ] `ENABLE_OFFLINE_MODE=true` ✅

**Quick Check**:
```powershell
cd c:\work\VisaBuddy\apps\frontend
cat .env | findstr "API_BASE_URL" | findstr "localhost:3000"
# Should show: API_BASE_URL=http://localhost:3000
```

---

## 🗂️ Part 2: File Integrity

### Backend Files Exist

- [ ] `apps/backend/.env` exists
- [ ] `apps/backend/src/main.ts` exists
- [ ] `apps/backend/src/db.ts` exists
- [ ] `apps/backend/src/routes/auth.ts` exists
- [ ] `apps/backend/src/services/firebase.ts` exists (or similar)
- [ ] `apps/backend/package.json` has all dependencies

### Frontend Files Exist

- [ ] `apps/frontend/.env` exists
- [ ] `apps/frontend/src/App.tsx` exists
- [ ] `apps/frontend/src/services/google-oauth.ts` exists
- [ ] `apps/frontend/metro.config.cjs` exists (with Windows fix)
- [ ] `apps/frontend/package.json` has all dependencies

**Quick Check**:
```powershell
# Check backend files
Test-Path "c:\work\VisaBuddy\apps\backend\.env"
Test-Path "c:\work\VisaBuddy\apps\backend\src\main.ts"

# Check frontend files
Test-Path "c:\work\VisaBuddy\apps\frontend\.env"
Test-Path "c:\work\VisaBuddy\apps\frontend\metro.config.cjs"
```

---

## 🔌 Part 3: Dependency Check

### Backend Dependencies Installed

```powershell
cd c:\work\VisaBuddy\apps\backend
# Check if node_modules exists
Test-Path "node_modules"
# Result: True = ✅, False = Run: npm install
```

- [ ] node_modules directory exists
- [ ] firebase-admin installed
- [ ] openai installed
- [ ] nodemailer (or similar) installed
- [ ] ioredis (or similar) installed

### Frontend Dependencies Installed

```powershell
cd c:\work\VisaBuddy\apps\frontend
# Check if node_modules exists
Test-Path "node_modules"
# Result: True = ✅, False = Run: npm install
```

- [ ] node_modules directory exists
- [ ] @react-native-async-storage/async-storage installed
- [ ] @react-native-google-signin/google-signin installed
- [ ] React Native installed

---

## 🔐 Part 4: Credential Validation

### Google OAuth Credentials

```powershell
$env:GOOGLE_CLIENT_ID
# Should show: 70376960035-09cj8bj1lcenp6rm1pmqi6v1m498qu8q.apps.googleusercontent.com

$env:GOOGLE_CLIENT_SECRET
# Should show: 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
```

- [ ] GOOGLE_CLIENT_ID starts with digits
- [ ] GOOGLE_CLIENT_SECRET starts with "GOCSPX-"
- [ ] Both are present in backend .env
- [ ] GOOGLE_WEB_CLIENT_ID is in frontend .env

### Firebase Credentials

```powershell
# Check Firebase project ID
$backendEnv = Get-Content "c:\work\VisaBuddy\apps\backend\.env"
$backendEnv -match "FIREBASE_PROJECT_ID=pcpt-203e6"
# Should be: True
```

- [ ] FIREBASE_PROJECT_ID = pcpt-203e6
- [ ] FIREBASE_PRIVATE_KEY contains "BEGIN PRIVATE KEY"
- [ ] FIREBASE_CLIENT_EMAIL contains firebase-adminsdk
- [ ] FIREBASE_CLIENT_ID is numeric (104197076833279512327)

### OpenAI Credentials

```powershell
# Check OpenAI key
$backendEnv = Get-Content "c:\work\VisaBuddy\apps\backend\.env"
$backendEnv -match "OPENAI_API_KEY=sk-proj-"
# Should be: True
```

- [ ] OPENAI_API_KEY starts with "sk-proj-"
- [ ] OPENAI_MODEL = gpt-4
- [ ] OPENAI_MAX_TOKENS is set (2000)

### SendGrid Credentials

```powershell
# Check SendGrid key
$backendEnv = Get-Content "c:\work\VisaBuddy\apps\backend\.env"
$backendEnv -match "SMTP_PASSWORD=SG\."
# Should be: True
```

- [ ] SMTP_PASSWORD starts with "SG."
- [ ] SMTP_FROM_EMAIL = visago@bitway.com
- [ ] SMTP_HOST = smtp.sendgrid.net
- [ ] SMTP_PORT = 587

### Redis/Upstash Credentials

```powershell
# Check Redis URL
$backendEnv = Get-Content "c:\work\VisaBuddy\apps\backend\.env"
$backendEnv -match "UPSTASH_REDIS_REST_URL=https://"
# Should be: True
```

- [ ] UPSTASH_REDIS_REST_URL starts with https://
- [ ] UPSTASH_REDIS_REST_TOKEN is present
- [ ] Both are in backend .env

---

## 🚀 Part 5: Pre-Start Verification

### Backend Ready to Start

```powershell
cd c:\work\VisaBuddy\apps\backend

# Check if backend can start:
npm start
# Should show:
# ✅ Database connected
# ✅ Firebase initialized
# ✅ Server running on http://localhost:3000

# If it fails, check .env file has all credentials
```

Verification:
- [ ] No missing credentials error
- [ ] No database connection error
- [ ] No Firebase initialization error
- [ ] Server listens on port 3000
- [ ] Can see "Server running" message

### Frontend Ready to Start

```powershell
cd c:\work\VisaBuddy\apps\frontend

# Check if frontend can start:
npm run dev
# Should show:
# Welcome to Metro v0.76.9
# Ready to accept connections
```

Verification:
- [ ] No bundler error
- [ ] Metro starts successfully
- [ ] No regex errors
- [ ] Listening for app connections

---

## 📡 Part 6: Service Connectivity Check

### Database Connection

```powershell
# Test backend health:
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET
# Should return JSON with status: "ok"
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "firebase": "initialized",
  "cache": "connected"
}
```

- [ ] Status code: 200
- [ ] Response includes services status
- [ ] All services show as "connected"

### Email Service Test

```powershell
# Test email sending:
$body = @{
  email = "test@example.com"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/email/test" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "Test email sent to test@example.com",
  "messageId": "..."
}
```

- [ ] Response shows success: true
- [ ] No errors in backend logs

### AI Chat Test

```powershell
# Test AI endpoint:
$body = @{
  message = "Tell me about US visa"
  userId = "test-user"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/chat/message" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

Expected response:
```json
{
  "success": true,
  "response": "...(AI generated response)...",
  "cached": false
}
```

- [ ] Response shows success: true
- [ ] AI response is generated
- [ ] No API errors

---

## ✅ Part 7: Final Checklist

Before starting development:

### Security ✅
- [ ] .env files NOT in git
- [ ] .gitignore includes .env
- [ ] No credentials logged to console
- [ ] API keys are only in .env

### Configuration ✅
- [ ] All backend credentials present
- [ ] All frontend credentials present
- [ ] Database connected
- [ ] All external services ready
- [ ] No placeholder credentials

### Services ✅
- [ ] PostgreSQL accessible
- [ ] Firebase Firestore ready
- [ ] OpenAI API working
- [ ] SendGrid configured
- [ ] Redis/Upstash ready
- [ ] Google OAuth verified

### Development Setup ✅
- [ ] Backend node_modules installed
- [ ] Frontend node_modules installed
- [ ] Backend can start (npm start)
- [ ] Frontend can start (npm run dev)
- [ ] Metro bundler working

---

## 🎯 Summary Checklist

Print this quick summary:

```
BACKEND CONFIGURATION:
  ☐ .env exists with all credentials
  ☐ node_modules installed
  ☐ Can start: npm start
  ☐ Listens on port 3000

FRONTEND CONFIGURATION:
  ☐ .env exists with all credentials
  ☐ node_modules installed
  ☐ Can start: npm run dev
  ☐ Metro bundler works

SERVICES VERIFIED:
  ☐ Database connection works
  ☐ Firebase initialized
  ☐ OpenAI API ready
  ☐ SendGrid email ready
  ☐ Redis cache ready
  ☐ Google OAuth configured

SECURITY:
  ☐ .env files not in git
  ☐ No credentials exposed
  ☐ API keys secured
```

---

## 🚨 If Something's Wrong

### Backend won't start?
1. Check .env has all credentials
2. Verify FIREBASE_PRIVATE_KEY is complete (includes \n)
3. Test database connection: `npm run db:check`
4. Check error logs for specific service

### Frontend won't build?
1. Check metro.config.cjs exists with Windows fix
2. Run: `npm install --force`
3. Clear Metro cache: `npx react-native start --reset-cache`
4. Check .env has GOOGLE_WEB_CLIENT_ID

### Services unreachable?
1. Verify .env credentials are correct
2. Check internet connection
3. Verify API keys haven't expired
4. Check if services are rate-limited

### Tests fail?
1. Backend must be running on port 3000
2. Check API endpoints exist
3. Verify .env credentials are in use
4. Check backend logs for errors

---

## ✅ When All Checks Pass

You're ready to:
1. ✅ Start backend: `npm start`
2. ✅ Start frontend: `npm run dev`
3. ✅ Begin development
4. ✅ Test with backend endpoints
5. ✅ Build features

**Phase 3 is complete and verified!** 🎉

---

## 📝 Last Verification

**Date**: ___________  
**Backend ✅**: Yes / No  
**Frontend ✅**: Yes / No  
**Services ✅**: Yes / No  
**Security ✅**: Yes / No  

**Notes**: _____________________________________________

---

**Status**: Ready for Phase 4 when company registration is complete.