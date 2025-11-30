# Deployment Risk Summary

**Generated:** 2025-11-25  
**Quick Reference for Railway & Mobile App Deployment Issues**

---

## 🚨 TOP 3 REASONS RAILWAY DEPLOYMENTS CRASH

### 1. Missing or Invalid DATABASE_URL (VisaGo backend)

**Check:** `DATABASE_URL` in VisaGo Railway service  
**Format:** `postgresql://user:password@host:port/database`  
**Crash Point:** `apps/backend/src/config/env.ts:134` (Zod validation fails)  
**Fix:** Ensure valid PostgreSQL connection string is set

### 2. JWT_SECRET Too Short in Production (VisaGo backend)

**Check:** `JWT_SECRET` in VisaGo Railway service  
**Must Be:** At least 32 characters  
**Crash Point:** `apps/backend/src/index.ts:77` (`process.exit(1)`)  
**Fix:** Generate a secure 32+ character secret

### 3. Prisma Migration Failure (VisaGo backend)

**Check:** Database connectivity and migration state  
**Crash Point:** `apps/backend/prisma/startup.js:143` (`process.exit(1)`)  
**Note:** P3005 errors are now handled automatically with baseline  
**Fix:** Ensure database is accessible and migrations are valid

---

## 📱 TOP 3 REASONS MOBILE APP CANNOT OPEN

### 1. Missing EXPO_PUBLIC_API_URL (CRITICAL - Module-level crash)

**Check:** Environment variable set at build time  
**Crash Point:** `frontend_new/src/services/api.ts:35-37` (throws on import)  
**Error Boundary:** ❌ NOT CAUGHT - crashes before React renders  
**Fix:** Set `EXPO_PUBLIC_API_URL` before building APK  
**Value:** `https://visago-production.up.railway.app`

### 2. Missing EXPO_PUBLIC_AI_SERVICE_URL (CRITICAL - Module-level crash)

**Check:** Environment variable set at build time  
**Crash Point:** `frontend_new/src/services/api.ts:66-68` (throws on import)  
**Error Boundary:** ❌ NOT CAUGHT - crashes before React renders  
**Fix:** Set `EXPO_PUBLIC_AI_SERVICE_URL` before building APK  
**Value:** `https://zippy-perfection-production.up.railway.app`

### 3. Backend API Unreachable (Blank screen, not crash)

**Check:** Backend API accessibility from mobile device  
**Condition:** `initializeApp()` hangs if API is down  
**Safety:** 2-second timeout prevents infinite hang  
**Fix:** Ensure backend is running and accessible from mobile network

---

## 🔍 RAILWAY ENVIRONMENT VARIABLE CHECKLIST

### VisaGo Backend Service

**MUST HAVE:**

- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `JWT_SECRET` - At least 32 characters
- ✅ `NODE_ENV` - Set to "production"
- ✅ `PORT` - Railway sets automatically

**SHOULD HAVE:**

- `AI_SERVICE_URL` - Set to `https://zippy-perfection-production.up.railway.app`
- `OPENAI_API_KEY` - For AI features
- `REDIS_URL` - For distributed caching

### zippy-perfection AI Service

**MUST HAVE:**

- ✅ `PORT` - Railway sets automatically

**SHOULD HAVE:**

- `BACKEND_URL` - Set to `https://visago-production.up.railway.app`
- `DEEPSEEK_API_KEY` - For chat responses
- `OPENAI_API_KEY` - For embeddings

### Mobile App (Build-Time)

**MUST HAVE:**

- ✅ `EXPO_PUBLIC_API_URL` - Backend API URL
- ✅ `EXPO_PUBLIC_AI_SERVICE_URL` - AI service URL

---

## ⚠️ CRITICAL CODE ISSUES TO FIX

### 1. Module-Level API URL Resolution (frontend_new)

**File:** `frontend_new/src/services/api.ts` (lines 71-72)  
**Problem:** API URLs are resolved at module import time, throwing errors if env vars are missing  
**Impact:** App crashes before React renders  
**Fix:** Move to lazy initialization or use fallback URLs

### 2. Inconsistent URL Fallbacks

**Files:**

- `frontend_new/src/config/constants.ts` has hardcoded fallback URLs (lines 75, 112)
- `frontend_new/src/services/api.ts` throws errors instead of using fallbacks

**Fix:** Either remove fallbacks from constants.ts or use them in api.ts

### 3. Missing AI_SERVICE_URL in Backend

**File:** `apps/backend/src/services/chat.service.ts:24`  
**Problem:** Uses `process.env.AI_SERVICE_URL` which may not be set in Railway  
**Default:** Falls back to `http://localhost:8001` (wrong for production)  
**Fix:** Set `AI_SERVICE_URL` in VisaGo Railway service

### 4. Missing BACKEND_URL in AI Service

**File:** `apps/ai-service/services/checklist.py:18`  
**Problem:** Uses `os.getenv("BACKEND_URL")` which may not be set in Railway  
**Default:** Falls back to `http://localhost:3000` (wrong for production)  
**Fix:** Set `BACKEND_URL` in zippy-perfection Railway service

---

## 📋 QUICK VERIFICATION STEPS

### Before Deploying to Railway:

1. **VisaGo Backend:**
   - [ ] `DATABASE_URL` is set and valid
   - [ ] `JWT_SECRET` is at least 32 characters
   - [ ] `NODE_ENV=production`
   - [ ] `AI_SERVICE_URL=https://zippy-perfection-production.up.railway.app`

2. **zippy-perfection AI Service:**
   - [ ] `PORT` is set (Railway auto-sets)
   - [ ] `BACKEND_URL=https://visago-production.up.railway.app`
   - [ ] `DEEPSEEK_API_KEY` is set (optional but recommended)

3. **Mobile App Build:**
   - [ ] `EXPO_PUBLIC_API_URL` is set before building
   - [ ] `EXPO_PUBLIC_AI_SERVICE_URL` is set before building
   - [ ] Rebuild APK after setting env vars

---

## 🔧 RECOMMENDED FIXES (Priority Order)

### Priority 1: Fix Module-Level API URL Crash

**File:** `frontend_new/src/services/api.ts`  
**Change:** Use fallback URLs from `constants.ts` instead of throwing  
**Impact:** Prevents app from crashing on startup

### Priority 2: Set Missing Railway Env Vars

**Services:** VisaGo and zippy-perfection  
**Add:** `AI_SERVICE_URL` and `BACKEND_URL` respectively  
**Impact:** Ensures services can communicate

### Priority 3: Add Runtime Configuration

**File:** `frontend_new/src/services/api.ts`  
**Change:** Allow API URLs to be set at runtime (AsyncStorage or user input)  
**Impact:** More flexible deployment

---

**See detailed reports:**

- `DEPLOYMENT_HEALTH_CHECK_REPORT.md` - Full analysis
- `ENVIRONMENT_VARIABLE_AUDIT.md` - Complete env var mapping
- `MOBILE_APP_BOOT_FAILURE_ANALYSIS.md` - App startup issues




