# Mobile App Boot Failure Analysis

**Generated:** 2025-11-25  
**Scope:** Why the Expo/React Native app builds but doesn't open (crashes or stuck on splash)

---

## CODE PATHS THAT RUN DURING APP STARTUP

### 1. Module-Level Initialization (BEFORE React Renders)

#### ❌ CRITICAL: API URL Resolution at Module Level

**File:** `frontend_new/src/services/api.ts` (lines 16-72)  
**When:** Module is imported (happens immediately when app starts)  
**Code:**

```typescript
const API_BASE_URL = getApiBaseUrl(); // Line 71 - called at module load
const AI_SERVICE_BASE_URL = getAiServiceBaseUrl(); // Line 72 - called at module load
```

**Crash Condition:**

- If `EXPO_PUBLIC_API_URL` and `REACT_APP_API_URL` are both missing → `getApiBaseUrl()` throws (line 35-37)
- If `EXPO_PUBLIC_AI_SERVICE_URL` is missing → `getAiServiceBaseUrl()` throws (line 66-68)

**Error Boundary:** ❌ NOT CAUGHT - This happens at module import time, before React component tree exists

**Impact:** App crashes immediately with "API URL not configured" error before any UI renders

---

### 2. App.tsx Root Component Initialization

#### AppContent Component (Main Entry Point)

**File:** `frontend_new/src/App.tsx` (lines 368-657)  
**When:** React component mounts

**Initialization Flow:**

1. `useEffect` with empty deps (line 413) calls `initializeApp()` from auth store
2. Safety timeout of 3 seconds (line 439) forces `isLoading: false` if init hangs
3. Firebase initialization (line 463) - non-blocking, errors caught
4. Google Sign-In initialization (line 508) - non-blocking, errors caught

**Potential Issues:**

- `initializeApp()` may hang if backend API is unreachable
- Safety timeout helps, but app may show blank screen for 3 seconds

---

### 3. Auth Store Initialization

#### initializeApp() Function

**File:** `frontend_new/src/store/auth.ts` (lines 130-261)  
**When:** Called from App.tsx useEffect (line 421)

**What It Does:**

1. Reads `@auth_token` and `@user` from AsyncStorage
2. If token exists, calls `fetchUserProfile()` and `fetchUserApplications()`
3. Has 2-second timeout (line 240) to prevent hanging

**Crash Conditions:**

- ❌ None - all errors are caught and logged (line 254)
- ✅ Always sets `isLoading: false` in finally block (line 259)

**Potential Hang:**

- If `fetchUserProfile()` or `fetchUserApplications()` never resolve (network timeout, API down)
- Safety timeout of 2 seconds prevents infinite hang
- But app may show loading state briefly

---

### 4. API Client Initialization

#### getApiClient() Function

**File:** `frontend_new/src/services/api.ts` (lines 149-1781)  
**When:** Called when API requests are made

**Crash Condition:**

- ❌ None - API client is created lazily, not at module level
- But `API_BASE_URL` and `AI_SERVICE_BASE_URL` are resolved at module level (lines 71-72)

**Issue:**

- If `API_BASE_URL` or `AI_SERVICE_BASE_URL` are undefined (due to missing env vars), axios requests will fail
- But this won't crash the app, just cause API calls to fail

---

### 5. ErrorBoundary

#### ErrorBoundary Component

**File:** `frontend_new/src/App.tsx` (lines 300-363)  
**When:** Wraps entire app (line 649)

**Limitations:**

- ✅ Catches React component errors
- ❌ Cannot catch errors thrown during module import/initialization
- ❌ Cannot catch errors in useEffect before component renders

**Impact:**

- Module-level errors in `api.ts` (lines 71-72) will crash before ErrorBoundary can catch them

---

## CONCRETE CRASH/LOCKUP CANDIDATES

### 1. Module-Level API URL Error (CRITICAL - IMMEDIATE CRASH)

**File:** `frontend_new/src/services/api.ts` (lines 35-37, 66-68)  
**Condition:**

- `EXPO_PUBLIC_API_URL` and `REACT_APP_API_URL` both missing → throws at line 35
- `EXPO_PUBLIC_AI_SERVICE_URL` missing → throws at line 66

**When:** Module is imported (before React renders)  
**Error Boundary:** ❌ NOT CAUGHT  
**Error Message:** "API URL not configured. Please set EXPO_PUBLIC_API_URL or REACT_APP_API_URL environment variable."

**Fix Required:**

- Move `getApiBaseUrl()` and `getAiServiceBaseUrl()` calls inside functions (lazy initialization)
- Or use fallback URLs from `constants.ts` instead of throwing
- Or show configuration screen if URLs are missing

---

### 2. initializeApp() Hangs (BLANK SCREEN, NOT CRASH)

**File:** `frontend_new/src/store/auth.ts` (lines 130-261)  
**Condition:**

- Backend API is unreachable or very slow
- `fetchUserProfile()` or `fetchUserApplications()` never resolve

**When:** App startup, after React renders  
**Error Boundary:** ✅ Protected by 2-second timeout  
**Behavior:** App shows loading state, then continues after timeout

**Fix Required:**

- Current timeout (2 seconds) is good, but may need to show error message if API is down
- Consider showing "Cannot connect to server" message instead of blank screen

---

### 3. Network Request Fails During Startup (BLANK SCREEN)

**File:** `frontend_new/src/store/auth.ts` (lines 190-216)  
**Condition:**

- `fetchUserProfile()` fails (network error, 401, 500, etc.)
- Error is caught and logged, but app continues

**When:** During `initializeApp()`  
**Error Boundary:** ✅ Errors are caught  
**Behavior:** App continues, shows login screen if no valid token

**Fix Required:**

- Current error handling is good
- May want to show toast/alert if network is completely down

---

### 4. AsyncStorage Read Fails (NON-FATAL)

**File:** `frontend_new/src/store/auth.ts` (lines 231-234)  
**Condition:**

- AsyncStorage is unavailable or corrupted
- Error is caught, app continues

**When:** During `initializeApp()`  
**Error Boundary:** ✅ Errors are caught  
**Behavior:** App continues, treats as "no stored credentials"

**Fix Required:**

- Current error handling is adequate

---

### 5. Firebase Initialization Fails (NON-FATAL)

**File:** `frontend_new/src/App.tsx` (lines 463-506)  
**Condition:**

- Firebase not configured or initialization fails
- Error is caught, app continues

**When:** During App.tsx useEffect  
**Error Boundary:** ✅ Errors are caught  
**Behavior:** App continues, push notifications won't work

**Fix Required:**

- Current error handling is good (Firebase is optional)

---

### 6. Google Sign-In Initialization Fails (NON-FATAL)

**File:** `frontend_new/src/App.tsx` (lines 508-530)  
**Condition:**

- Google Sign-In not configured or initialization fails
- Error is caught, app continues

**When:** During App.tsx useEffect  
**Error Boundary:** ✅ Errors are caught  
**Behavior:** App continues, Google OAuth won't work

**Fix Required:**

- Current error handling is good (Google OAuth is optional)

---

### 7. i18n Initialization (NON-FATAL)

**File:** `frontend_new/src/App.tsx` (line 33)  
**Condition:**

- i18n import/initialization fails
- This would crash if it throws, but likely doesn't

**When:** Module import  
**Error Boundary:** ❌ May not be caught if it throws at module level  
**Behavior:** Unknown - depends on i18n implementation

**Fix Required:**

- Check if i18n initialization can throw
- Wrap in try-catch if needed

---

## INFINITE LOADING STATE CANDIDATES

### 1. isLoading Stays True Forever

**File:** `frontend_new/src/store/auth.ts` (line 259)  
**Condition:**

- `initializeApp()` throws before reaching `finally` block
- Unlikely, as all code paths have try-catch

**Current Protection:**

- ✅ `finally` block always sets `isLoading: false` (line 259)
- ✅ Safety timeout in App.tsx (line 439) also sets `isLoading: false`

**Risk:** LOW - multiple safeguards in place

---

### 2. Splash Screen Never Dismisses

**File:** `frontend_new/src/App.tsx` (line 369)  
**Condition:**

- `isLoading` from auth store stays `true`
- But safety timeout (3 seconds) and `finally` block prevent this

**Current Protection:**

- ✅ Safety timeout of 3 seconds (line 439)
- ✅ Auth store `finally` block (line 259)

**Risk:** LOW - multiple safeguards in place

---

## NATIVE MODULE IMPORT ISSUES

### 1. React Native Firebase

**File:** `frontend_new/src/services/firebase.ts`  
**Condition:**

- Firebase native module not linked or not available
- `initializeFirebase()` is called but errors are caught

**When:** During App.tsx useEffect (line 463)  
**Error Boundary:** ✅ Errors are caught  
**Behavior:** App continues, Firebase features won't work

**Risk:** LOW - errors are handled gracefully

---

### 2. Google Sign-In Native Module

**File:** `frontend_new/src/services/google-oauth.ts`  
**Condition:**

- Google Sign-In native module not linked
- `initializeGoogleSignIn()` is called but errors are caught

**When:** During App.tsx useEffect (line 513)  
**Error Boundary:** ✅ Errors are caught  
**Behavior:** App continues, Google OAuth won't work

**Risk:** LOW - errors are handled gracefully

---

## RECOMMENDATIONS

### Immediate Fixes (Critical)

1. **Move API URL Resolution to Lazy Initialization**
   - Don't call `getApiBaseUrl()` and `getAiServiceBaseUrl()` at module level
   - Instead, call them inside `getApiClient()` or when first API request is made
   - Or use fallback URLs from `constants.ts` instead of throwing

2. **Add Fallback URLs**
   - Use hardcoded Railway URLs as fallback (like `constants.ts` has)
   - Only throw error if both env var and fallback are invalid
   - Or show configuration screen instead of crashing

3. **Wrap Module-Level Code in Try-Catch**
   - Wrap `const API_BASE_URL = getApiBaseUrl()` in try-catch
   - On error, use fallback URL and log warning
   - Don't crash the app

### Future Improvements

1. **Show Configuration Screen Instead of Crashing**
   - If API URLs are missing, show a screen asking user to configure
   - Allow manual entry of API URLs
   - Store in AsyncStorage for future use

2. **Better Network Error Handling**
   - Show "Cannot connect to server" message if API is unreachable
   - Allow retry button
   - Don't show blank screen

3. **Add Startup Health Check**
   - Call `/health` endpoint on startup
   - If it fails, show error message
   - Don't proceed to main app if backend is down

---

## SUMMARY: WHY APP DOESN'T OPEN

### Most Likely Cause: Module-Level API URL Error

**File:** `frontend_new/src/services/api.ts` (lines 71-72)  
**Problem:**

- `getApiBaseUrl()` and `getAiServiceBaseUrl()` are called at module import time
- If env vars are missing, they throw errors
- These errors happen before React renders, so ErrorBoundary cannot catch them
- App crashes immediately with "API URL not configured" error

**Solution:**

- Set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_AI_SERVICE_URL` before building APK
- Or modify code to use fallback URLs instead of throwing
- Or move URL resolution to lazy initialization

### Secondary Cause: Backend API Unreachable

**File:** `frontend_new/src/store/auth.ts` (lines 190-216)  
**Problem:**

- `initializeApp()` calls `fetchUserProfile()` which requires backend API
- If backend is down, request hangs or fails
- Safety timeout (2 seconds) prevents infinite hang, but app may show blank screen briefly

**Solution:**

- Current timeout is good
- Consider showing error message if API is unreachable
- Allow user to retry or proceed without backend connection

---

**Next Steps:** Apply fixes to make API URL resolution non-fatal, then rebuild APK with proper env vars set.







