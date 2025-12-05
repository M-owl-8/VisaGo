# Deployment Health Check Report

**Generated:** 2025-11-25  
**Scope:** Railway deployment crashes & mobile app startup failures

---

## STEP 1: BUILD & TYPECHECK COMMANDS

### Backend (apps/backend)

**Location:** `apps/backend/package.json`

**TypeScript Check:**

```bash
cd apps/backend
npx tsc --noEmit
```

**Production Build:**

```bash
cd apps/backend
npm run build
# This runs: prisma generate && tsc && tsc prisma/seed.ts
```

**Production Start (Railway):**

```bash
npm start
# Runs: node prisma/schema-selector.js && prisma generate && node prisma/startup.js && NODE_PATH=... node dist/index.js
```

### AI Service (apps/ai-service)

**Location:** `apps/ai-service/` (Python/FastAPI)

**Type Check:**

```bash
cd apps/ai-service
python -m py_compile main.py services/*.py
# Or use mypy if configured
```

**Production Start (Railway):**

```bash
# Uses start.sh script
PORT=${PORT:-8001} uvicorn main:app --host 0.0.0.0 --port "$PORT"
```

### Mobile App (frontend_new)

**Location:** `frontend_new/package.json`

**TypeScript Check:**

```bash
cd frontend_new
npx tsc --noEmit
```

**Production Build (Android APK):**

```bash
cd frontend_new
cd android
.\gradlew.bat assembleRelease
# APK output: android/app/build/outputs/apk/release/app-release.apk
```

**Note:** This is React Native CLI (not Expo managed), so no `expo prebuild` needed.

---

## STEP 2: CRASH-ON-START SUSPECTS (Backend + AI Service)

### Backend (VisaGo Railway Service)

#### 1. Environment Variable Validation Failure

**File:** `apps/backend/src/config/env.ts` (lines 119-145)  
**Condition:** Zod schema validation fails for required env vars  
**Crash:** `process.exit(1)` in `apps/backend/src/index.ts` (line 105)  
**Required Env Vars:**

- `DATABASE_URL` (required, min length 1)
- `JWT_SECRET` (required, min 32 characters)
- `NODE_ENV` (optional, defaults to 'development')
- `PORT` (optional, defaults to '3000')

**Service:** VisaGo backend

#### 2. JWT_SECRET Too Short in Production

**File:** `apps/backend/src/index.ts` (lines 74-78)  
**Condition:** `JWT_SECRET.length < 32` in production  
**Crash:** `process.exit(1)`  
**Required:** `JWT_SECRET` must be at least 32 characters

**Service:** VisaGo backend

#### 3. CORS Configuration Error

**File:** `apps/backend/src/index.ts` (lines 147-152)  
**Condition:** `validateCorsOrigin()` throws  
**Crash:** `process.exit(1)`  
**Required:** `CORS_ORIGIN` (optional, but validation must pass)

**Service:** VisaGo backend

#### 4. OpenAI Service Initialization Failure

**File:** `apps/backend/src/services/ai-openai.service.ts` (lines 66-78)  
**Condition:** `OPENAI_API_KEY` missing when `AIOpenAIService.initialize()` is called  
**Crash:** `throw new Error('OPENAI_API_KEY not configured')`  
**Note:** This is wrapped in try-catch in `index.ts` (line 517), so it won't crash startup, but will log warning

**Service:** VisaGo backend  
**Required:** `OPENAI_API_KEY` (optional, but if present must be valid)

#### 5. Database Connection Failure (Non-Fatal)

**File:** `apps/backend/src/index.ts` (lines 417-456)  
**Condition:** Database connection fails after 3 retry attempts  
**Behavior:** Logs error but continues startup (non-fatal)  
**Required:** `DATABASE_URL` must be valid PostgreSQL connection string

**Service:** VisaGo backend

#### 6. Prisma Migration Failure

**File:** `apps/backend/prisma/startup.js` (lines 65-143)  
**Condition:** `prisma migrate deploy` fails with non-P3005 error  
**Crash:** `process.exit(1)` in production mode  
**Required:** Database must be accessible and migrations must be valid

**Service:** VisaGo backend

#### 7. Local Storage Initialization Failure

**File:** `apps/backend/src/index.ts` (lines 479-488)  
**Condition:** `LocalStorageService.initialize()` throws when `STORAGE_TYPE=local`  
**Crash:** `throw error` (uncaught, will crash)  
**Required:** `LOCAL_STORAGE_PATH` (defaults to 'uploads', must be writable)

**Service:** VisaGo backend

### AI Service (zippy-perfection Railway Service)

#### 8. Missing DEEPSEEK_API_KEY (Non-Fatal)

**File:** `apps/ai-service/services/deepseek.py` (lines 43-50)  
**Condition:** `DEEPSEEK_API_KEY` not set  
**Behavior:** Returns fallback error message, doesn't crash  
**Required:** `DEEPSEEK_API_KEY` (optional, but chat won't work without it)

**Service:** zippy-perfection

#### 9. Missing OPENAI_API_KEY (Non-Fatal)

**File:** `apps/ai-service/services/openai.py`  
**Condition:** `OPENAI_API_KEY` not set  
**Behavior:** Service returns fallback responses, doesn't crash  
**Required:** `OPENAI_API_KEY` (optional)

**Service:** zippy-perfection

#### 10. Port Configuration

**File:** `apps/ai-service/start.sh` (line 5)  
**Condition:** Railway provides `PORT` env var (standard)  
**Behavior:** Uses `PORT` or defaults to 8001  
**Required:** `PORT` (automatically set by Railway)

**Service:** zippy-perfection

---

## STEP 3: APP-NOT-OPENING SUSPECTS (frontend_new)

### Critical: API URL Configuration

#### 1. Missing EXPO_PUBLIC_API_URL (CRASHES ON IMPORT)

**File:** `frontend_new/src/services/api.ts` (lines 16-38)  
**Condition:** `getApiBaseUrl()` called at module load time (line 71)  
**Crash:** `throw new Error('API URL not configured...')`  
**When:** Module is imported (happens immediately on app start)  
**Error Boundary:** ❌ NOT CAUGHT - This happens at module level, before React renders  
**Required:** `EXPO_PUBLIC_API_URL` or `REACT_APP_API_URL` must be set at build time

**Impact:** App will crash immediately on startup with "API URL not configured" error

#### 2. Missing EXPO_PUBLIC_AI_SERVICE_URL (CRASHES ON IMPORT)

**File:** `frontend_new/src/services/api.ts` (lines 42-69)  
**Condition:** `getAiServiceBaseUrl()` called at module load time (line 72)  
**Crash:** `throw new Error('AI Service URL not configured...')`  
**When:** Module is imported (happens immediately on app start)  
**Error Boundary:** ❌ NOT CAUGHT - Module-level error  
**Required:** `EXPO_PUBLIC_AI_SERVICE_URL` must be set at build time

**Impact:** App will crash immediately on startup with "AI Service URL not configured" error

#### 3. ErrorBoundary Exists But Won't Catch Module-Level Errors

**File:** `frontend_new/src/App.tsx` (lines 300-363)  
**Condition:** ErrorBoundary only catches React component errors  
**Limitation:** Cannot catch errors thrown during module import/initialization  
**Impact:** Errors in `api.ts` (lines 71-72) will crash before ErrorBoundary can catch them

### App Initialization Issues

#### 4. initializeApp() Failure (Non-Fatal)

**File:** `frontend_new/src/App.tsx` (lines 419-435)  
**Condition:** `initializeApp()` throws (from auth store)  
**Behavior:** Caught, sets `isLoading: false`, app continues  
**Error Boundary:** ✅ Caught by try-catch  
**Impact:** App may show blank screen if `isLoading` stays true

#### 5. Firebase Initialization (Non-Fatal)

**File:** `frontend_new/src/App.tsx` (lines 463-506)  
**Condition:** Firebase initialization fails  
**Behavior:** Caught, app continues (Firebase is optional)  
**Error Boundary:** ✅ Caught by try-catch  
**Impact:** Push notifications won't work, but app functions

#### 6. Google Sign-In Initialization (Non-Fatal)

**File:** `frontend_new/src/App.tsx` (lines 508-530)  
**Condition:** Google Sign-In initialization fails  
**Behavior:** Caught, app continues (optional feature)  
**Error Boundary:** ✅ Caught by try-catch  
**Impact:** Google OAuth won't work, but app functions

---

## STEP 4: DEPLOYMENT RISK SUMMARY

### Top 3 Reasons Railway Deployments Crash

1. **Missing or Invalid DATABASE_URL** (VisaGo backend)
   - Check: `DATABASE_URL` in VisaGo Railway service
   - Format: `postgresql://user:password@host:port/database`
   - Crash point: `apps/backend/src/config/env.ts:134` (Zod validation)

2. **JWT_SECRET Too Short in Production** (VisaGo backend)
   - Check: `JWT_SECRET` in VisaGo Railway service
   - Must be: At least 32 characters
   - Crash point: `apps/backend/src/index.ts:77` (`process.exit(1)`)

3. **Prisma Migration Failure** (VisaGo backend)
   - Check: Database connectivity and migration state
   - Crash point: `apps/backend/prisma/startup.js:143` (`process.exit(1)`)
   - Note: P3005 errors are now handled automatically with baseline

### Top 3 Reasons Mobile App Cannot Open

1. **Missing EXPO_PUBLIC_API_URL** (CRITICAL - Module-level crash)
   - Check: Environment variable set at build time
   - Crash point: `frontend_new/src/services/api.ts:35-37` (throws on import)
   - Error Boundary: ❌ NOT CAUGHT - crashes before React renders
   - Fix: Must set `EXPO_PUBLIC_API_URL` before building APK

2. **Missing EXPO_PUBLIC_AI_SERVICE_URL** (CRITICAL - Module-level crash)
   - Check: Environment variable set at build time
   - Crash point: `frontend_new/src/services/api.ts:66-68` (throws on import)
   - Error Boundary: ❌ NOT CAUGHT - crashes before React renders
   - Fix: Must set `EXPO_PUBLIC_AI_SERVICE_URL` before building APK

3. **initializeApp() Hangs Indefinitely** (Blank screen, not crash)
   - Check: Backend API accessibility from mobile device
   - Condition: `initializeApp()` never resolves (network timeout, API down)
   - Safety timeout: 3 seconds (line 439), but may show blank screen briefly
   - Impact: App appears frozen on splash screen

---

## ENVIRONMENT VARIABLE CHECKLIST

### VisaGo Backend (Railway)

**REQUIRED:**

- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `JWT_SECRET` - At least 32 characters
- ✅ `NODE_ENV` - Set to "production"
- ✅ `PORT` - Railway sets automatically

**OPTIONAL (but recommended):**

- `OPENAI_API_KEY` - For AI features
- `REDIS_URL` - For distributed caching
- `CORS_ORIGIN` - CORS configuration
- `STORAGE_TYPE` - "local" or "firebase"
- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` - If using Firebase storage
- `SENTRY_DSN` - Error tracking

### zippy-perfection AI Service (Railway)

**REQUIRED:**

- ✅ `PORT` - Railway sets automatically

**OPTIONAL (but needed for functionality):**

- `DEEPSEEK_API_KEY` - For chat responses
- `OPENAI_API_KEY` - For fallback/alternative AI
- `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `PINECONE_INDEX` - For RAG
- `CORS_ORIGINS` - CORS configuration

### Mobile App (Build-time)

**REQUIRED:**

- ✅ `EXPO_PUBLIC_API_URL` - Backend API URL (e.g., `https://visago-production.up.railway.app`)
- ✅ `EXPO_PUBLIC_AI_SERVICE_URL` - AI service URL (e.g., `https://zippy-perfection-production.up.railway.app`)

**OPTIONAL:**

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` - For Google Sign-In

---

## RECOMMENDATIONS

### Immediate Actions

1. **Verify Railway Environment Variables:**
   - VisaGo: Check `DATABASE_URL`, `JWT_SECRET` are set and valid
   - zippy-perfection: Check `PORT` is set (Railway auto-sets this)

2. **Fix Mobile App Build:**
   - Set `EXPO_PUBLIC_API_URL` before building APK
   - Set `EXPO_PUBLIC_AI_SERVICE_URL` before building APK
   - These must be set at build time (not runtime) for React Native

3. **Make API URL Errors Non-Fatal:**
   - Move `getApiBaseUrl()` and `getAiServiceBaseUrl()` calls inside functions, not at module level
   - Add fallback URLs or show configuration screen instead of crashing

### Code Changes Needed (Future)

1. **frontend_new/src/services/api.ts:**
   - Don't call `getApiBaseUrl()` at module level (line 71)
   - Don't call `getAiServiceBaseUrl()` at module level (line 72)
   - Instead, call these functions lazily when API client is first used
   - Or show a configuration screen if URLs are missing

2. **Add Runtime Configuration:**
   - Allow API URLs to be set via AsyncStorage or user input
   - Show error screen instead of crashing on missing URLs

---

**Next Steps:** Run Prompt 2 (Environment Variable Audit) to get detailed env var mapping.







