# Environment Variable Consistency Audit

**Generated:** 2025-11-25  
**Scope:** All environment variables across backend, AI service, and mobile app

---

## BACKEND SERVER (VisaGo Railway Service)

### REQUIRED_AT_START

| Variable       | File + Line                         | Usage                                      | Expected Format                             |
| -------------- | ----------------------------------- | ------------------------------------------ | ------------------------------------------- |
| `DATABASE_URL` | `apps/backend/src/config/env.ts:18` | Zod validation (required)                  | `postgresql://user:pass@host:port/db`       |
| `JWT_SECRET`   | `apps/backend/src/config/env.ts:21` | Zod validation (min 32 chars)              | String, min 32 characters                   |
| `NODE_ENV`     | `apps/backend/src/config/env.ts:14` | Zod validation (defaults to 'development') | `'development' \| 'production' \| 'test'`   |
| `PORT`         | `apps/backend/src/config/env.ts:15` | Zod validation (defaults to '3000')        | Numeric string (Railway sets automatically) |

### OPTIONAL (Used at Startup)

| Variable                | File + Line                                         | Usage                        | When Required                             |
| ----------------------- | --------------------------------------------------- | ---------------------------- | ----------------------------------------- |
| `CORS_ORIGIN`           | `apps/backend/src/config/env.ts:24`                 | CORS configuration           | Optional, defaults to wildcard            |
| `STORAGE_TYPE`          | `apps/backend/src/config/env.ts:30`                 | Storage service selection    | Optional, defaults to 'local'             |
| `LOCAL_STORAGE_PATH`    | `apps/backend/src/config/env.ts:31`                 | Local storage directory      | Optional, defaults to 'uploads'           |
| `REDIS_URL`             | `apps/backend/src/config/env.ts:27`                 | Redis connection for caching | Optional, uses in-memory cache if missing |
| `OPENAI_API_KEY`        | `apps/backend/src/services/ai-openai.service.ts:68` | OpenAI service init          | Optional, but AI features won't work      |
| `FIREBASE_PROJECT_ID`   | `apps/backend/src/config/env.ts:34`                 | Firebase storage             | Required if `STORAGE_TYPE=firebase`       |
| `FIREBASE_PRIVATE_KEY`  | `apps/backend/src/config/env.ts:35`                 | Firebase storage             | Required if `STORAGE_TYPE=firebase`       |
| `FIREBASE_CLIENT_EMAIL` | `apps/backend/src/config/env.ts:36`                 | Firebase storage             | Required if `STORAGE_TYPE=firebase`       |
| `SENTRY_DSN`            | `apps/backend/src/index.ts:113`                     | Error tracking               | Optional                                  |
| `GOOGLE_CLIENT_ID`      | `apps/backend/src/config/env.ts:42`                 | Google OAuth                 | Optional                                  |
| `GOOGLE_CLIENT_SECRET`  | `apps/backend/src/config/env.ts:43`                 | Google OAuth                 | Optional                                  |

### USED_LATE (After Startup)

| Variable            | File + Line                                    | Usage                        | When Used                              |
| ------------------- | ---------------------------------------------- | ---------------------------- | -------------------------------------- |
| `AI_SERVICE_URL`    | `apps/backend/src/services/chat.service.ts:24` | AI service URL for chat      | When chat endpoint is called           |
| `AI_SERVICE_URL`    | `apps/backend/src/routes/applications.ts:265`  | AI service URL for checklist | When checklist generation is requested |
| `STRIPE_SECRET_KEY` | `apps/backend/src/config/env.ts:46`            | Payment processing           | When payment is processed              |
| `PAYME_API_KEY`     | `apps/backend/src/config/env.ts:49`            | Payment processing           | When Payme payment is processed        |
| `SENDGRID_API_KEY`  | `apps/backend/src/config/env.ts:56`            | Email sending                | When email is sent                     |

---

## AI SERVICE (zippy-perfection Railway Service)

### REQUIRED_AT_START

| Variable | File + Line                  | Usage       | Expected Format                      |
| -------- | ---------------------------- | ----------- | ------------------------------------ |
| `PORT`   | `apps/ai-service/start.sh:5` | Server port | Numeric (Railway sets automatically) |

### OPTIONAL (Used at Startup)

| Variable       | File + Line                   | Usage              | When Required                    |
| -------------- | ----------------------------- | ------------------ | -------------------------------- |
| `CORS_ORIGINS` | `apps/ai-service/main.py:31`  | CORS configuration | Optional, defaults to '\*'       |
| `NODE_ENV`     | `apps/ai-service/main.py:624` | Development mode   | Optional, defaults to production |

### USED_LATE (After Startup)

| Variable               | File + Line                                  | Usage                   | When Used                                                      |
| ---------------------- | -------------------------------------------- | ----------------------- | -------------------------------------------------------------- |
| `DEEPSEEK_API_KEY`     | `apps/ai-service/services/deepseek.py:43`    | DeepSeek chat responses | When `/api/chat` endpoint is called                            |
| `OPENAI_API_KEY`       | `apps/ai-service/services/openai.py:141`     | OpenAI fallback         | When OpenAI service is used                                    |
| `OPENAI_API_KEY`       | `apps/ai-service/services/embeddings.py:19`  | Embeddings generation   | When RAG service generates embeddings                          |
| `PINECONE_API_KEY`     | `apps/ai-service/services/rag.py:20`         | Pinecone vector DB      | When RAG service initializes                                   |
| `PINECONE_INDEX_NAME`  | `apps/ai-service/services/rag.py:21`         | Pinecone index name     | When RAG service initializes (defaults to 'visabuddy-visa-kb') |
| `PINECONE_ENVIRONMENT` | `apps/ai-service/services/rag.py:22`         | Pinecone environment    | When RAG service initializes (defaults to 'gcp-starter')       |
| `BACKEND_URL`          | `apps/ai-service/services/checklist.py:18`   | Backend API URL         | When checklist generation needs backend data                   |
| `BACKEND_URL`          | `apps/ai-service/services/probability.py:18` | Backend API URL         | When probability calculation needs backend data                |

---

## MOBILE APP (frontend_new - Build Time)

### REQUIRED_AT_START (Module-Level - CRASHES IF MISSING)

| Variable                     | File + Line                              | Usage           | Expected Format                                                       |
| ---------------------------- | ---------------------------------------- | --------------- | --------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`        | `frontend_new/src/services/api.ts:19,71` | Backend API URL | Full URL (e.g., `https://visago-production.up.railway.app`)           |
| `EXPO_PUBLIC_AI_SERVICE_URL` | `frontend_new/src/services/api.ts:46,72` | AI service URL  | Full URL (e.g., `https://zippy-perfection-production.up.railway.app`) |

**⚠️ CRITICAL:** These are called at module load time (lines 71-72), so missing values will crash the app before React renders. ErrorBoundary cannot catch these.

### OPTIONAL (Used at Startup)

| Variable                           | File + Line                                | Usage          | When Required                                |
| ---------------------------------- | ------------------------------------------ | -------------- | -------------------------------------------- |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `frontend_new/src/config/constants.ts:32`  | Google Sign-In | Optional, Google OAuth won't work without it |
| `EXPO_PUBLIC_SENTRY_DSN`           | `frontend_new/src/config/constants.ts:118` | Error tracking | Optional                                     |

### USED_LATE (After Startup)

| Variable            | File + Line                           | Usage                      | When Used                                |
| ------------------- | ------------------------------------- | -------------------------- | ---------------------------------------- |
| `REACT_APP_API_URL` | `frontend_new/src/services/api.ts:25` | Backend API URL (fallback) | Only if `EXPO_PUBLIC_API_URL` is not set |

---

## PROBABLE MISCONFIGURATIONS

### 1. Backend Uses `AI_SERVICE_URL` but Railway May Not Have It

**Issue:**

- Code: `apps/backend/src/services/chat.service.ts:24` uses `process.env.AI_SERVICE_URL`
- Code: `apps/backend/src/routes/applications.ts:265` uses `process.env.AI_SERVICE_URL`
- Default: Falls back to `'http://localhost:8001'` if not set

**Impact:**

- Chat and checklist generation will try to connect to localhost in production
- Should be: `https://zippy-perfection-production.up.railway.app`

**Check:** Verify `AI_SERVICE_URL` is set in VisaGo Railway service

### 2. Mobile App Throws on Missing API URLs (Module-Level)

**Issue:**

- `frontend_new/src/services/api.ts:35-37` throws if `EXPO_PUBLIC_API_URL` is missing
- `frontend_new/src/services/api.ts:66-68` throws if `EXPO_PUBLIC_AI_SERVICE_URL` is missing
- These are called at module import time, before React renders

**Impact:**

- App crashes immediately on startup
- ErrorBoundary cannot catch these errors

**Check:** Verify these are set at build time (not runtime) for React Native

### 3. Constants.ts Has Fallbacks But api.ts Doesn't

**Issue:**

- `frontend_new/src/config/constants.ts:75` has hardcoded fallback: `'https://visago-production.up.railway.app'`
- `frontend_new/src/config/constants.ts:112` has hardcoded fallback: `'https://zippy-perfection-production.up.railway.app'`
- But `frontend_new/src/services/api.ts` throws errors instead of using these

**Impact:**

- Inconsistency: constants.ts suggests fallbacks exist, but api.ts doesn't use them
- App will crash if env vars are missing, even though constants.ts has defaults

**Check:** Either remove fallbacks from constants.ts or use them in api.ts

### 4. AI Service Uses `BACKEND_URL` But Backend Doesn't Define It

**Issue:**

- AI service: `apps/ai-service/services/checklist.py:18` uses `BACKEND_URL`
- AI service: `apps/ai-service/services/probability.py:18` uses `BACKEND_URL`
- Default: Falls back to `'http://localhost:3000'` if not set

**Impact:**

- Checklist and probability services will try to connect to localhost in production
- Should be: `https://visago-production.up.railway.app`

**Check:** Verify `BACKEND_URL` is set in zippy-perfection Railway service

### 5. Missing PINECONE Variables (Non-Fatal)

**Issue:**

- RAG service will fall back to cache if Pinecone is not configured
- Service continues but RAG features won't work optimally

**Check:** Optional, but recommended for RAG functionality

---

## RAILWAY ENVIRONMENT VARIABLE CHECKLIST

### VisaGo Backend Service

**MUST HAVE:**

- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `JWT_SECRET` - At least 32 characters
- ✅ `NODE_ENV` - Set to "production"
- ✅ `PORT` - Railway sets automatically

**SHOULD HAVE:**

- `AI_SERVICE_URL` - Should be `https://zippy-perfection-production.up.railway.app`
- `OPENAI_API_KEY` - For AI features
- `REDIS_URL` - For distributed caching
- `STORAGE_TYPE` - "local" or "firebase"
- `CORS_ORIGIN` - CORS configuration (optional for mobile-only API)

**NICE TO HAVE:**

- `SENTRY_DSN` - Error tracking
- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` - If using Firebase storage
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - For Google OAuth

### zippy-perfection AI Service

**MUST HAVE:**

- ✅ `PORT` - Railway sets automatically

**SHOULD HAVE:**

- `BACKEND_URL` - Should be `https://visago-production.up.railway.app`
- `DEEPSEEK_API_KEY` - For chat responses
- `OPENAI_API_KEY` - For embeddings and fallback
- `CORS_ORIGINS` - CORS configuration

**NICE TO HAVE:**

- `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `PINECONE_ENVIRONMENT` - For RAG features

### Mobile App (Build-Time)

**MUST HAVE (at build time):**

- ✅ `EXPO_PUBLIC_API_URL` - Backend API URL
- ✅ `EXPO_PUBLIC_AI_SERVICE_URL` - AI service URL

**OPTIONAL:**

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` - For Google Sign-In
- `EXPO_PUBLIC_SENTRY_DSN` - Error tracking

---

## SUMMARY OF MISMATCHES

1. **Backend expects `AI_SERVICE_URL`** but Railway may not have it set
   - **Action:** Add `AI_SERVICE_URL=https://zippy-perfection-production.up.railway.app` to VisaGo service

2. **AI service expects `BACKEND_URL`** but Railway may not have it set
   - **Action:** Add `BACKEND_URL=https://visago-production.up.railway.app` to zippy-perfection service

3. **Mobile app throws on missing env vars** at module level (before React renders)
   - **Action:** Set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_AI_SERVICE_URL` before building APK
   - **Future fix:** Move URL resolution to lazy initialization instead of module-level

4. **Constants.ts has fallbacks but api.ts doesn't use them**
   - **Action:** Either remove hardcoded URLs from constants.ts or make api.ts use them as fallback







