# PHASE 4: Troubleshooting Guide

**Purpose**: Solve common issues during Phase 4 testing  
**Usage**: Find your error → Read solution → Apply fix → Re-test

---

## 🔍 Quick Error Finder

**Don't see your error below?**

Try searching for key words from your error message, or check:
1. Backend logs (Terminal 1)
2. Frontend console (DevTools F12)
3. AI service logs (Terminal 4)

---

## 🔴 CRITICAL ERRORS

### Error: "Cannot connect to database"

**Common Messages:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: Database connection failed
Error: DATABASE_URL not set
```

**Causes & Solutions:**

```powershell
# Solution 1: Check DATABASE_URL exists
Get-Content "c:\work\VisaBuddy\apps\backend\.env" | Select-String "DATABASE_URL"
# Should return: DATABASE_URL=postgresql://...

# If not found, add it from Phase 1

# Solution 2: Verify database is running
# For Supabase: Check project is active in Supabase dashboard

# Solution 3: Test connection manually
cd c:\work\VisaBuddy\apps\backend
npx prisma db push
# If this works, database is fine

# Solution 4: Check connection string format
# Should be: postgresql://user:password@host:port/database?ssl=require
```

**Verification:**
```powershell
# In Prisma Studio:
npx prisma studio
# If it opens without errors, database connection is good
```

---

### Error: "Cannot initialize Firebase"

**Common Messages:**
```
Error: FIREBASE_PROJECT_ID not found
Error: Firebase: Error (auth/invalid-api-key)
Error: Cannot read property 'cert' of undefined
```

**Causes & Solutions:**

```powershell
# Solution 1: Verify Firebase credentials in .env
Get-Content "c:\work\VisaBuddy\apps\backend\.env" | Select-String "FIREBASE"
# Should show:
# FIREBASE_PROJECT_ID=pcpt-203e6
# FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@pcpt-203e6.iam.gserviceaccount.com

# Solution 2: Check .env formatting
# Private key must be on one line, escaped properly
# Use: \n for newlines in the key

# Solution 3: Verify Firebase project exists
# Go to: https://console.firebase.google.com/
# Should see project: pcpt-203e6

# Solution 4: Regenerate service account
# 1. Go to Firebase Console > Settings > Service Accounts
# 2. Click "Generate New Private Key"
# 3. Update credentials in .env
```

**Verification:**
```
Check backend startup logs:
✅ Firebase initialized
```

---

### Error: "Cannot connect to Redis"

**Common Messages:**
```
Error: UPSTASH_REDIS_REST_URL not configured
Error: Redis connection timeout
Error: 401 Unauthorized
```

**Causes & Solutions:**

```powershell
# Solution 1: Verify Redis URL and token
Get-Content "c:\work\VisaBuddy\apps\backend\.env" | Select-String "UPSTASH"
# Should show:
# UPSTASH_REDIS_REST_URL=https://awake-tortoise-32750.upstash.io
# UPSTASH_REDIS_REST_TOKEN=AX_uAAI...

# Solution 2: Check credentials are correct
# Visit: https://console.upstash.com/
# Find database: awake-tortoise-32750
# Copy REST URL and token exactly

# Solution 3: Test connection
curl -H "Authorization: Bearer YOUR_TOKEN" "https://YOUR_URL/ping"
# Should return: {"status":"pong"}

# Solution 4: Check firewall
# Windows Firewall might block outbound HTTPS
# Allow your app through firewall
```

**Verification:**
```
Check backend startup logs:
✅ Redis connected to ...upstash.io
```

---

### Error: "Port 3000 already in use"

**Common Messages:**
```
Error: listen EADDRINUSE: address already in use :::3000
Error: Port 3000 is busy
```

**Causes & Solutions:**

```powershell
# Solution 1: Kill existing process
Get-Process -Name node | Stop-Process -Force
# This kills all Node.js processes

# Solution 2: Find and kill specific process
# Find what's using port 3000:
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

# Get process ID and kill it:
$process = Get-Process -Name node
Stop-Process -Id $process.Id -Force

# Solution 3: Use different port
cd c:\work\VisaBuddy\apps\backend
npm start -- --port 3001
# Then update API_BASE_URL in frontend to http://localhost:3001

# Solution 4: Wait a minute
# Sometimes port release takes time after process kill
Start-Sleep -Seconds 30
npm start
```

**Verification:**
```powershell
curl http://localhost:3000/api/health
# Should respond
```

---

## 🟠 HIGH PRIORITY ERRORS

### Error: "Google login not working"

**Common Messages:**
```
Error: OAuth callback failed
Error: Invalid client ID
Error: Redirect URI mismatch
```

**Causes & Solutions:**

```powershell
# Solution 1: Verify GOOGLE_CLIENT_ID matches
# Backend:
Get-Content "c:\work\VisaBuddy\apps\backend\.env" | Select-String "GOOGLE_CLIENT_ID"

# Frontend:
Get-Content "c:\work\VisaBuddy\apps\frontend\.env" | Select-String "GOOGLE_WEB_CLIENT_ID"

# They must be: 70376960035-09cj8bj1lcenp6rm1pmqi6v1m498qu8q.apps.googleusercontent.com

# Solution 2: Check redirect URI
# In Google Cloud Console:
# 1. Go to https://console.cloud.google.com/
# 2. Select project
# 3. Go to Credentials > OAuth 2.0 Client IDs
# 4. Check Authorized redirect URIs includes:
#    - http://localhost:3000/api/auth/google/callback (local)
#    - https://yourdomain.com/api/auth/google/callback (production)

# Solution 3: Clear OAuth cache
# Backend:
npm restart
# Frontend:
npm start

# Solution 4: Check frontend is using correct constants
# File: c:\work\VisaBuddy\apps\frontend\src\config\constants.ts
# Should have: GOOGLE_WEB_CLIENT_ID from .env
```

**Verification:**
```
1. Open frontend on emulator/web
2. See login screen
3. Click "Login with Google"
4. Should open Google OAuth dialog
```

---

### Error: "AI service not responding"

**Common Messages:**
```
Error: Cannot connect to AI service
Error: Failed to fetch from localhost:8001
Error: OPENAI_API_KEY not set
```

**Causes & Solutions:**

```powershell
# Solution 1: Verify AI service is running
# Terminal should show:
# Uvicorn running on http://127.0.0.1:8001

# If not running:
Set-Location "c:\work\VisaBuddy\apps\ai-service"
python main.py

# Solution 2: Check Python dependencies
cd c:\work\VisaBuddy\apps\ai-service
pip list | Select-String "fastapi"
# Should show: fastapi, uvicorn, openai, etc.

# If missing:
pip install -r requirements.txt

# Solution 3: Verify OpenAI key
Get-Content "c:\work\VisaBuddy\apps\ai-service\.env" | Select-String "OPENAI_API_KEY"
# Should be: sk-proj-...

# Solution 4: Test AI service directly
curl http://localhost:8001/health
# Should respond with: {"status": "ok", "model": "gpt-4"}

# Solution 5: Check backend can reach AI service
# In backend terminal, check logs for:
# "Successfully called AI service" or errors
```

**Verification:**
```powershell
# Test AI endpoint:
curl -X POST http://localhost:8001/chat `
  -H "Content-Type: application/json" `
  -d '{"message":"Hello"}'
# Should return: {"response": "..."}
```

---

### Error: "Frontend won't connect to backend"

**Common Messages:**
```
Error: Network error connecting to API
Error: fetch failed
Error: Cannot POST /api/login
```

**Causes & Solutions:**

```powershell
# Solution 1: Check API_BASE_URL in frontend .env
Get-Content "c:\work\VisaBuddy\apps\frontend\.env" | Select-String "API_BASE_URL"
# Should be: http://localhost:3000

# Solution 2: Verify backend is running
curl http://localhost:3000/api/health
# Should respond with status

# If backend not running:
Set-Location "c:\work\VisaBuddy\apps\backend"
npm start

# Solution 3: Check firewall
# Frontend running on localhost:19000 (Expo)
# Should be able to reach backend on localhost:3000
# Check Windows Firewall isn't blocking

# Solution 4: Check CORS
# Backend should allow requests from frontend origin
# Check backend logs for CORS errors

# Solution 5: Clear frontend cache
Set-Location "c:\work\VisaBuddy\apps\frontend"
Remove-Item "node_modules" -Recurse
npm install
npm start
```

**Verification:**
```
1. Open frontend
2. Check browser console (F12 > Console)
3. Look for network errors
4. Should see: "Connected to API: http://localhost:3000"
```

---

## 🟡 MEDIUM PRIORITY ERRORS

### Error: "Database migrations failed"

**Common Messages:**
```
Error: Migration pending
Error: Prisma migration not applied
Error: Prisma schema out of sync
```

**Causes & Solutions:**

```powershell
# Solution 1: Check migration status
cd c:\work\VisaBuddy\apps\backend
npx prisma migrate status

# Solution 2: Apply pending migrations
npx prisma migrate deploy

# Solution 3: If migration is corrupted
# Reset database (WARNING: LOSES ALL DATA)
npx prisma db push --force-reset

# Solution 4: Create new migration
npx prisma migrate dev --name fix_schema

# Solution 5: Regenerate Prisma client
npx prisma generate
```

**Verification:**
```powershell
npx prisma migrate status
# Should show: "Database schema is up to date!"

npx prisma studio
# Should open without errors
```

---

### Error: "Can't upload files"

**Common Messages:**
```
Error: Upload failed
Error: Firebase Storage not configured
Error: 403 Forbidden
```

**Causes & Solutions:**

```powershell
# Note: File uploads deferred to Phase 4+
# This is expected behavior

# If you want to enable uploads:

# Solution 1: Check Firebase Storage is enabled
# Go to: https://console.firebase.google.com/
# Project: pcpt-203e6
# Storage tab should show bucket

# Solution 2: Update .env with storage bucket
Get-Content "c:\work\VisaBuddy\apps\backend\.env" | Select-String "FIREBASE_STORAGE"
# Should be: FIREBASE_STORAGE_BUCKET=pcpt-203e6.appspot.com

# Solution 3: Check storage rules
# Firebase Console > Storage > Rules
# Should allow authenticated users to upload

# Solution 4: Test upload manually
# See backend route: POST /api/documents/upload
```

**Verification:**
```
File uploads are Phase 4+ feature
If blocked, this is expected and will be enabled later
```

---

### Error: "Email not sending"

**Common Messages:**
```
Error: SendGrid API error
Error: SMTP authentication failed
Error: Failed to send email
```

**Causes & Solutions:**

```powershell
# Solution 1: Verify SendGrid credentials
Get-Content "c:\work\VisaBuddy\apps\backend\.env" | Select-String "SMTP"
# Should show:
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASSWORD=SG.UzxNI3y4Rl2O...
# SMTP_FROM_EMAIL=visago@bitway.com

# Solution 2: Test SendGrid key
# In backend, check logs for SendGrid connection

# Solution 3: Verify sender email is verified
# Go to: https://app.sendgrid.com/
# Sender Authentication > Domain Authentication
# Should show: visago@bitway.com verified

# Solution 4: Check email templates
# Backend sends emails using templates
# See: services/email-templates.service.ts

# Solution 5: Increase timeout
# Some email sends take longer
# Check backend logs for actual error
```

**Verification:**
```powershell
# Trigger password reset flow:
1. Frontend: Click "Forgot Password"
2. Enter email: your-email@gmail.com
3. Check email inbox after 1-2 minutes
4. Should receive reset link
```

---

### Error: "Admin user not created"

**Common Messages:**
```
Error: Duplicate key value violates unique constraint
Error: admin@visabuddy.com already exists
```

**Causes & Solutions:**

```powershell
# Solution 1: Check if admin exists
cd c:\work\VisaBuddy\apps\backend
npx prisma studio
# Go to Users table
# Search for: admin@visabuddy.com

# Solution 2: If admin exists, no need to create again
# Use this email to log in (with password if set)

# Solution 3: Create with different email
# Edit create-admin.ts
# Change email to: admin@yourdomain.com
npx ts-node create-admin.ts

# Solution 4: Delete and recreate
# In Prisma Studio:
# 1. Find admin@visabuddy.com user
# 2. Click delete button
# 3. Run: npx ts-node create-admin.ts
```

**Verification:**
```powershell
# Check admin was created:
npx prisma studio
# Go to Users table
# Should see: admin@visabuddy.com with role=ADMIN
```

---

## 🟢 LOW PRIORITY ERRORS

### Error: "Metro bundler issues" (Frontend)

**Common Messages:**
```
Error: Metro Bundler crashed
Error: Syntax error in code
Error: Cannot find module
```

**Causes & Solutions:**

```powershell
# Solution 1: Clear Metro cache
cd c:\work\VisaBuddy\apps\frontend
npm start -- --reset-cache

# Solution 2: Reinstall dependencies
Remove-Item "node_modules" -Recurse
Remove-Item "package-lock.json"
npm install
npm start

# Solution 3: Check for syntax errors
# Look at error message for file location
# Fix syntax error and save
# Metro should auto-reload

# Solution 4: Kill Metro and restart
# Press Ctrl+C to stop
# npm start

# Solution 5: Check Node version
node --version
# Should be v18 or higher
```

**Verification:**
```
Frontend should start without red errors
```

---

### Error: "Slow API responses"

**Common Symptoms:**
```
API calls take > 5 seconds
AI chat takes > 15 seconds to respond
Database queries are slow
```

**Causes & Solutions:**

```powershell
# Solution 1: Check Redis is connected
# Backend logs should show:
# ✅ Redis connected

# Solution 2: Monitor API performance
# Backend has performance monitor
# Check logs for slow endpoints

# Solution 3: Check database indexes
# Database should have indexes on common queries
# See: prisma/schema.prisma

# Solution 4: Check AI service response time
# OpenAI API can be slow sometimes
# First response: 5-10 seconds typical
# Subsequent: 2-5 seconds with caching

# Solution 5: Increase timeouts
# Backend: Check timeout settings
# Frontend: Check request timeouts

# This is normal during development
```

**Verification:**
```
This is often temporary
Usually resolves after:
1. Restarting services
2. Clearing caches
3. Waiting a few minutes
```

---

### Error: "App crashes on startup"

**Common Messages:**
```
Error: Cannot read property 'x' of undefined
Error: ReferenceError: variable not defined
```

**Causes & Solutions:**

```powershell
# Solution 1: Check error in console
# Look at full error stack trace
# Note the file and line number

# Solution 2: Check environment variables
# Make sure all required .env variables are set

# Solution 3: Clear app cache
Set-Location "c:\work\VisaBuddy\apps\frontend"
npm start -- --reset-cache

# Solution 4: Check dependencies are installed
Remove-Item "node_modules" -Recurse
npm install

# Solution 5: Review recent code changes
# If you modified code, revert changes
# See git status for what changed
```

**Verification:**
```
App should start and show login screen
No red errors in console
```

---

## 🆘 STILL STUCK?

### Step-by-step debugging:

1. **Read the error message carefully**
   - What exactly does it say?
   - What file/line is it on?

2. **Check the logs**
   - Backend: Terminal 1
   - Frontend: DevTools Console (F12)
   - AI Service: Terminal 4

3. **Isolate the problem**
   - Is it backend? Stop backend and check error
   - Is it frontend? Restart frontend
   - Is it AI service? Check AI service logs

4. **Google the error**
   - Search for the exact error message
   - Often someone else had it and solved it

5. **Check credentials**
   - Verify all .env variables
   - Copy-paste credentials carefully
   - Check for extra spaces

6. **Restart everything**
   ```powershell
   # Kill all services
   Get-Process -Name node | Stop-Process -Force
   Get-Process -Name python | Stop-Process -Force
   
   # Wait 10 seconds
   Start-Sleep -Seconds 10
   
   # Start again
   npm start  # in backend
   npm start  # in frontend
   python main.py  # in ai-service
   ```

7. **Ask for help**
   - Document the error
   - Steps to reproduce
   - All error messages
   - Screenshot of console

---

## 📋 Error Report Template

If you need to report an issue:

```
═══════════════════════════════════════════════
ERROR REPORT
═══════════════════════════════════════════════

Date: ___________________
Error: ___________________

Service:
[ ] Backend
[ ] Frontend  
[ ] AI Service
[ ] Database

Error Message:
───────────────────────────────────────────────
(paste exact error)


Console/Log Output:
───────────────────────────────────────────────
(paste full error log)


Steps to Reproduce:
───────────────────────────────────────────────
1. _________________________
2. _________________________
3. _________________________


Expected Behavior:
───────────────────────────────────────────────
_________________________________


Actual Behavior:
───────────────────────────────────────────────
_________________________________


What I Tried:
───────────────────────────────────────────────
[ ] Restarted service
[ ] Cleared cache
[ ] Reinstalled dependencies
[ ] Checked .env variables
[ ] Checked documentation
[ ] Other: _____________________

Environment:
───────────────────────────────────────────────
Node.js Version: ___________
Python Version: ___________
npm Version: ___________
OS: Windows 11
```

---

## ✅ Common Solutions Checklist

Before asking for help, try these:

- [ ] Restarted backend service
- [ ] Restarted frontend app
- [ ] Restarted AI service
- [ ] Cleared npm cache: `npm cache clean --force`
- [ ] Cleared Metro cache: `npm start -- --reset-cache`
- [ ] Reinstalled node_modules
- [ ] Verified all .env variables exist
- [ ] Checked backend is on port 3000
- [ ] Checked frontend can reach backend
- [ ] Checked database connection
- [ ] Reviewed recent code changes
- [ ] Searched error on Google

---

**Most errors are solved by:**
1. Restarting services
2. Checking environment variables  
3. Clearing caches
4. Reinstalling dependencies

**In that order, 95% of issues resolve! 🎯**

---

**Still need help?**  
→ Check `PHASE_4_DETAILED_STEPS.md`  
→ Check service-specific docs  
→ Document the issue and reach out