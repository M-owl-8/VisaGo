# Infinite Loop and Request Spam Fixes

## Issues Fixed

### 1. Infinite GET Requests on Dashboard

**Problem:** Multiple repeated calls to `/api/users/:userId/applications` and `/:userId/applications`

**Root Causes:**

- `fetchUserApplications()` was called in `initializeApp()` AND in `applications/page.tsx` useEffect
- useEffect dependency array `[isSignedIn, isLoading]` caused re-renders
- No request deduplication

**Fixes:**

- ✅ Removed `fetchUserApplications()` call from `initializeApp()` - pages fetch their own data
- ✅ Changed dashboard useEffect to empty dependency array `[]` - only runs once on mount
- ✅ Added `hasFetchedRef` to prevent duplicate fetches
- ✅ Added request deduplication in `ApiClient.getUserApplications()` to prevent concurrent calls

### 2. Chat History 500 Error

**Problem:** `GET /api/chat/history → 500` with "Session not found or access denied"

**Root Causes:**

- Backend threw error when no chat session exists
- Frontend called history without checking if session exists
- No graceful handling of empty history

**Fixes:**

- ✅ Backend now returns empty array `[]` instead of throwing error when no session exists
- ✅ Frontend handles empty history gracefully (shows "No messages" instead of error)
- ✅ Added rate-limited error logging to prevent spam (only logs once per 5 seconds per error type)

### 3. Chat History Spam Fetching

**Problem:** `/api/chat/history` called repeatedly automatically

**Root Causes:**

- `loadChatHistory()` called in useEffect without proper guards
- `setCurrentApplication()` automatically triggered history load
- No deduplication of concurrent requests

**Fixes:**

- ✅ Added `hasLoadedRef` to prevent multiple loads on chat page
- ✅ Added check in `setCurrentApplication()` to prevent loading if already loading
- ✅ Added request deduplication in `ApiClient.getChatHistory()`
- ✅ Changed useEffect dependencies to only trigger on `applicationId` changes

### 4. /me Endpoint Loop

**Problem:** `/api/users/me` called multiple times unnecessarily

**Root Causes:**

- `fetchUserProfile()` called in multiple places
- No caching or deduplication
- Profile page useEffect had unstable dependencies

**Fixes:**

- ✅ Added request deduplication in `ApiClient.getUserProfile()`
- ✅ Added guard in `fetchUserProfile()` to prevent concurrent calls
- ✅ Fixed profile page useEffect to only run once on mount with empty deps

### 5. Broken Endpoint Mapping

**Problem:** Two endpoints being hit: `/api/users/:id/applications` and `/:id/applications`

**Root Cause:** The endpoint is correct (`/users/${userId}/applications` with baseURL `/api`), but logs may show both due to route matching. The actual issue was duplicate calls, not wrong endpoint.

**Fix:**

- ✅ Request deduplication prevents duplicate calls
- ✅ Single source of truth: `ApiClient.getUserApplications()` always uses `/users/${userId}/applications`

### 6. Logging Spam

**Problem:** Backend logs printing meaningless repeating logs every second

**Fixes:**

- ✅ Added rate-limited error logging (only logs once per 5 seconds per error type)
- ✅ Frontend console logs only in development mode
- ✅ Rate-limited frontend logging (once per second per endpoint)

## Files Modified

### Frontend

- `apps/web/lib/stores/auth.ts` - Removed duplicate fetches, added guards
- `apps/web/lib/stores/chat.ts` - Added loading guards, better error handling
- `apps/web/lib/api/client.ts` - Added request deduplication, rate-limited logging
- `apps/web/lib/api/config.ts` - Rate-limited config logging
- `apps/web/app/(dashboard)/applications/page.tsx` - Fixed useEffect to run once
- `apps/web/app/(dashboard)/chat/page.tsx` - Fixed useEffect dependencies
- `apps/web/app/(dashboard)/profile/page.tsx` - Fixed useEffect to run once

### Backend

- `apps/backend/src/routes/chat.ts` - Return empty array instead of 500 error
- `apps/backend/src/services/chat.service.ts` - Return empty array when no sessions

## Testing Checklist

After deployment, verify:

- [ ] Load dashboard → only 1 fetch to `/api/users/:id/applications`
- [ ] Navigate inside page → NO extra fetches
- [ ] Open chat → History loads ONCE, no 500 errors
- [ ] Send message → Correct sessionId used, no 429 unless actual spam
- [ ] Refresh page → No extra fetch storms
- [ ] Profile page → Only fetches once on mount
- [ ] Backend logs → No spam, only meaningful errors logged

## Request Deduplication

All API methods now use a `pendingRequests` Map to deduplicate concurrent requests:

- If a request with the same key is already pending, return the existing promise
- Prevents multiple identical requests from being sent simultaneously
- Automatically cleans up after 100ms

## Rate-Limited Logging

- Backend: Errors logged only once per 5 seconds per error type
- Frontend: Console logs only in development, rate-limited to once per second per endpoint
- Prevents log spam while maintaining debugging capability
