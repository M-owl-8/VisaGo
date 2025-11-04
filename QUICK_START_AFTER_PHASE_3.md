# 🚀 Quick Start Guide - After Phase 3 Setup

**Status**: Ready to develop with all external services configured  
**Time to start**: < 5 minutes

---

## 📋 Pre-Start Checklist

Before starting the dev servers, verify these files exist and are configured:

```
✅ apps/backend/.env
   - DATABASE_URL: ✅
   - GOOGLE_CLIENT_ID: ✅
   - GOOGLE_CLIENT_SECRET: ✅
   - FIREBASE_PROJECT_ID: ✅
   - FIREBASE_PRIVATE_KEY: ✅
   - OPENAI_API_KEY: ✅
   - SMTP_PASSWORD: ✅
   - UPSTASH_REDIS_REST_TOKEN: ✅

✅ apps/frontend/.env
   - API_BASE_URL: ✅
   - GOOGLE_WEB_CLIENT_ID: ✅
   - FIREBASE_PROJECT_ID: ✅
```

---

## 🎯 Quick Start in 5 Steps

### Step 1: Start Backend Server
```powershell
cd c:\work\VisaBuddy\apps\backend
npm start
```

**Expected Output**:
```
> visabuddy-backend@1.0.0 start
> npx ts-node src/main.ts

✅ Database connected
✅ Firebase initialized
✅ OpenAI client ready
✅ Redis connected
✅ Server running on http://localhost:3000
```

**If it fails**: Check `.env` file for missing credentials

### Step 2: Open New Terminal - Start Frontend
```powershell
cd c:\work\VisaBuddy\apps\frontend
npm run dev
```

**Expected Output**:
```
> visabuddy-mobile@1.0.0 dev
> react-native start
Welcome to Metro v0.76.9
...
Ready to accept connections
```

### Step 3: Test Backend Health
```powershell
# In another terminal:
curl http://localhost:3000/api/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "firebase": "initialized",
    "redis": "connected",
    "openai": "ready"
  }
}
```

### Step 4: Test Email Service
```powershell
# Send test email:
curl -X POST http://localhost:3000/api/email/test ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"your-email@example.com\"}"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Test email sent to your-email@example.com",
  "messageId": "..."
}
```

### Step 5: Test AI Chat
```powershell
# Test AI endpoint:
curl -X POST http://localhost:3000/api/chat/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message\": \"Tell me about US visa\", \"userId\": \"test-user\"}"
```

**Expected Response**:
```json
{
  "success": true,
  "response": "US visa requires... (AI generated response)",
  "cached": false
}
```

---

## 🔧 Environment Variables Reference

### Backend Services Ready to Use

| Service | Status | Port | Notes |
|---------|--------|------|-------|
| PostgreSQL | ✅ | 5432 | Supabase pooler |
| Firebase | ✅ | - | REST API only |
| OpenAI | ✅ | - | API endpoint |
| SendGrid | ✅ | 587 | SMTP |
| Redis | ✅ | - | REST API (Upstash) |

### Frontend Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| API_BASE_URL | `http://localhost:3000` | Backend connection |
| GOOGLE_WEB_CLIENT_ID | 70376960035-... | Google OAuth |
| FIREBASE_PROJECT_ID | pcpt-203e6 | Firebase project |

---

## 📝 Key Endpoints for Testing

### Authentication
```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/google
GET  /api/auth/me
POST /api/auth/logout
```

### Email
```
POST /api/email/test
POST /api/email/send
POST /api/email/verify
```

### AI Chat
```
POST /api/chat/message
GET  /api/chat/history
DELETE /api/chat/history/:id
```

### Cache
```
POST /api/cache/test
GET  /api/cache/get/:key
POST /api/cache/set
DELETE /api/cache/clear
```

---

## 🧪 Manual Testing Checklist

### Database ✅
- [ ] Can connect to PostgreSQL
- [ ] Can query user table
- [ ] Migrations run successfully

```powershell
# From backend directory:
npm run migrate
```

### Google OAuth ✅
- [ ] Can click Google Sign-In button
- [ ] Gets redirected to Google login
- [ ] Returns to app with token
- [ ] Token stored in localStorage

**Test in Frontend**:
```
1. Open app in emulator/device
2. Click "Sign in with Google"
3. Authenticate with Google
4. Should see user profile
```

### Email Service ✅
- [ ] Test email sends successfully
- [ ] Email arrives in inbox
- [ ] Formatting looks correct

```bash
# Send test email:
npm run test:email
```

### AI Chat ✅
- [ ] Can ask question
- [ ] Gets AI response
- [ ] Response cached on second call

```bash
# Test AI:
npm run test:ai
```

### Redis Cache ✅
- [ ] Can store values
- [ ] Can retrieve values
- [ ] Expiration works

```bash
# Test cache:
npm run test:cache
```

---

## 🚨 Troubleshooting

### Backend Won't Start

**Issue**: `Cannot connect to database`
```
Solution:
1. Check DATABASE_URL in .env
2. Verify Supabase is running
3. Check password in connection string
```

**Issue**: `Firebase initialization failed`
```
Solution:
1. Verify FIREBASE_PROJECT_ID in .env
2. Check FIREBASE_PRIVATE_KEY is complete
3. Ensure Firebase credentials are valid
```

**Issue**: `OpenAI API key invalid`
```
Solution:
1. Regenerate API key from OpenAI dashboard
2. Update OPENAI_API_KEY in .env
3. Restart backend
```

### Frontend Won't Build

**Issue**: `Metro bundler error`
```
Solution:
1. Clear Metro cache: npx react-native start --reset-cache
2. Verify metro.config.cjs exists with Windows fix
3. Check node_modules are installed
```

**Issue**: `Cannot find Google credentials`
```
Solution:
1. Verify GOOGLE_WEB_CLIENT_ID in .env
2. Check it matches Google Cloud Console
3. Restart dev server
```

---

## 📊 System Status Commands

### Check All Services
```powershell
# Backend health check:
curl http://localhost:3000/api/health

# Backend logs:
npm run logs
```

### Database Status
```powershell
# From backend:
npm run db:status
```

### Cache Status
```powershell
# Check Redis:
curl "https://awake-tortoise-32750.upstash.io" \
  -H "Authorization: Bearer AX_uAAIncDIzZmE2NDM2YzIyY2U0N2MxYmYwNjkzZjY2ZDZlZTQ3ZHAyMzI3NTA"
```

---

## 🎯 Development Workflow

### Daily Start
```powershell
# Terminal 1 - Backend
cd apps/backend
npm start

# Terminal 2 - Frontend
cd apps/frontend
npm run dev

# Terminal 3 - Testing
# Use curl or Postman to test endpoints
```

### Making Changes

**Backend Change**:
```
1. Edit file in apps/backend/src/
2. Backend auto-reloads (ts-node watch)
3. Test endpoint
```

**Frontend Change**:
```
1. Edit file in apps/frontend/src/
2. Metro reloads (automatic)
3. See changes on device/emulator
```

**Database Change**:
```
1. Edit schema in apps/backend/src/models.ts
2. Create migration: npx prisma migrate dev
3. Run migration: npm run migrate
```

---

## 🔐 Important Reminders

### Never Do This
```
❌ Commit .env files
❌ Share API keys
❌ Expose Firebase credentials
❌ Log sensitive data
```

### Always Do This
```
✅ Keep .env files in .gitignore
✅ Use environment variables in CI/CD
✅ Rotate keys if compromised
✅ Monitor API usage
✅ Use HTTPS in production
```

---

## 📞 Quick Help

### Need to change...

**Email sender address**: Edit `.env` → `SMTP_FROM_EMAIL`  
**API base URL**: Edit `.env` → `API_BASE_URL`  
**OpenAI model**: Edit `.env` → `OPENAI_MODEL`  
**Cache URL**: Edit `.env` → `UPSTASH_REDIS_REST_URL`  
**Database**: Edit `.env` → `DATABASE_URL`

### Something broken?

1. Check `.env` file has all credentials
2. Restart backend: `npm start`
3. Check backend logs for errors
4. Verify Firebase/OpenAI/SendGrid credentials
5. Check internet connection
6. Clear node_modules: `rm -r node_modules && npm install`

---

## 🎉 You're Ready!

All systems are configured and ready for development.

**Next Steps**:
1. ✅ Start backend and frontend
2. ✅ Run through testing checklist
3. ✅ Begin development
4. ✅ When ready: Execute Phase 4 setup

**Questions?** Check:
- `PROJECT_PHASES_ROADMAP.md` - Overview of phases
- `PHASE_3_EXTERNAL_SERVICES_COMPLETE.md` - Service details
- `PHASE_4_FUTURE_SETUP.md` - Future steps

---

## 📋 Files You Just Got

```
✅ PHASE_3_STATUS.txt - Quick status
✅ PHASE_3_EXTERNAL_SERVICES_COMPLETE.md - Detailed info
✅ PHASE_4_FUTURE_SETUP.md - Future setup
✅ PROJECT_PHASES_ROADMAP.md - All phases
✅ QUICK_START_AFTER_PHASE_3.md - This file
```

**Happy Coding! 🚀**