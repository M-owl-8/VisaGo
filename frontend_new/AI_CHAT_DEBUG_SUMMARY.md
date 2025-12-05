# AI Chat Debug Summary

## Flow Trace: Mobile Screen → Backend → AI Service

### 1. AI Chat Screen Location

**File:** `frontend_new/src/screens/chat/ChatScreen.tsx`

**Key Function:** `handleSendMessage` (lines 55-70)

- Called when user presses send button
- Validates user is signed in
- Calls `sendMessage` from Zustand store

### 2. Send Message Function

**File:** `frontend_new/src/store/chat.ts`

**Function:** `sendMessage` (lines 148-264)

- Verifies authentication
- Calls `apiClient.sendMessage(content, applicationId, conversationHistory)`
- Handles response and updates UI state

### 3. API Client / Base URL

**File:** `frontend_new/src/services/api.ts`

**Base URL Logic:** `getApiBaseUrl()` (lines 14-35)

- **Development (**DEV** = true):**
  - Android: `http://10.0.2.2:3000`
  - iOS: `http://localhost:3000`
- **Production (**DEV** = false):**
  - Checks `EXPO_PUBLIC_API_URL` env var
  - Checks `REACT_APP_API_URL` env var
  - **Default:** `https://visago-production.up.railway.app`

**API Client Method:** `sendMessage` (lines 1204-1215)

- **Endpoint:** `/chat/send`
- **Full URL:** `${API_BASE_URL}/api/chat/send`
- **Method:** POST
- **Payload:**
  ```json
  {
    "content": "user message text",
    "applicationId": "optional-application-id",
    "conversationHistory": []
  }
  ```

### 4. Backend Route

**File:** `apps/backend/src/routes/chat.ts`

**Route:** `POST /api/chat/send` (line 136)

- Requires authentication (`authenticateToken` middleware)
- Calls `ChatService.sendMessage()`
- Returns AI response

### 5. Potential Problems Detected

#### ⚠️ CRITICAL: URL May Point to Localhost in Production

- **Issue:** If `__DEV__` is `true` on a physical device (which can happen), the app will try to connect to:
  - Android: `http://10.0.2.2:3000` (emulator-only address)
  - iOS: `http://localhost:3000` (not reachable from physical device)
- **Solution:** Ensure `__DEV__` is `false` in production builds, OR set `EXPO_PUBLIC_API_URL` environment variable before building

#### ⚠️ HTTP vs HTTPS

- **Development:** Uses HTTP (`http://10.0.2.2:3000` or `http://localhost:3000`)
- **Production:** Uses HTTPS (`https://visago-production.up.railway.app`) ✅
- **Note:** Android may require network security config for HTTP in production

#### ⚠️ Environment Variable Check

- The code checks for `EXPO_PUBLIC_API_URL` and `REACT_APP_API_URL`
- These must be set at **build time** (not runtime) for React Native
- If not set, defaults to Railway URL in production

### 6. Logging Added

Comprehensive logging has been added at each step:

1. **ChatScreen.tsx:**
   - Logs when `handleSendMessage` is called
   - Logs message details, applicationId, history length
   - Logs errors in catch block

2. **store/chat.ts:**
   - Logs when `sendMessage` is called
   - Logs authentication check
   - Logs API client call
   - Logs response details
   - Logs full error details including axios error structure

3. **services/api.ts:**
   - Logs API base URL determination
   - Logs environment variables
   - Logs full URL being called
   - Logs request payload
   - Logs response status, headers, body
   - Logs detailed error information

### 7. Expected Log Output

When you run the app and send a message, you should see logs like:

```
[AI CHAT] [ApiClient] API_BASE_URL determined: https://visago-production.up.railway.app
[AI CHAT] [ApiClient] __DEV__: false
[AI CHAT] [ApiClient] Platform.OS: android
[AI CHAT] [ApiClient] Final chat endpoint will be: https://visago-production.up.railway.app/api/chat/send
[AI CHAT] Starting send message: { messageLength: 20, ... }
[AI CHAT] [ChatStore] sendMessage called: { contentLength: 20, ... }
[AI CHAT] [ApiClient] sendMessage called
[AI CHAT] [ApiClient] URL: https://visago-production.up.railway.app/api/chat/send
[AI CHAT] [ApiClient] PAYLOAD: { "content": "...", ... }
[AI CHAT] [ApiClient] Response received: { status: 201, ... }
```

### 8. What to Check on Physical Device

1. **Check the logs for:**
   - What URL is being called (should be Railway URL, NOT localhost)
   - What the response status is (should be 201 or 200)
   - What the error message is (if any)

2. **Common Issues:**
   - If URL is `http://localhost:3000` or `http://10.0.2.2:3000` → **BUG**: App is in dev mode or env var not set
   - If response status is 404 → Backend route not found
   - If response status is 401 → Authentication token missing/invalid
   - If response status is 500 → Backend error (check Railway logs)
   - If network error → Device can't reach Railway URL (check internet connection)

### 9. Summary

**Mobile chat sends requests to:** `${API_BASE_URL}/api/chat/send`

- Production: `https://visago-production.up.railway.app/api/chat/send`
- Development: `http://10.0.2.2:3000/api/chat/send` (Android) or `http://localhost:3000/api/chat/send` (iOS)

**Payload shape:**

```json
{
  "content": "user message text",
  "applicationId": "optional-application-id-or-undefined",
  "conversationHistory": []
}
```

**Potential problems detected:**

1. ⚠️ **CRITICAL**: If `__DEV__` is true on physical device, URL will point to localhost/emulator (not reachable)
2. ⚠️ Environment variables must be set at build time (not runtime)
3. ⚠️ Android may block HTTP requests in production (needs network security config)

**Next Steps:**

1. Build and install APK on physical device
2. Open chat screen and send a message
3. Check console logs (via `adb logcat` or React Native debugger)
4. Look for `[AI CHAT]` prefixed logs
5. Share the logs to identify the exact issue







