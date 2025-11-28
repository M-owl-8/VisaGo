# Web App Backend Connectivity Fix

## Problem

The web app is not showing logs in the backend service, which means API requests from the web app are not reaching the backend.

## Root Cause

The `NEXT_PUBLIC_API_URL` environment variable is likely not set correctly in Railway, or the web app is using the wrong API URL.

## Solution

### Step 1: Verify Railway Environment Variables

1. Go to your Railway project dashboard
2. Select the **web app service** (prolific-dedication)
3. Go to **Variables** tab
4. Check if `NEXT_PUBLIC_API_URL` is set

### Step 2: Set the Correct API URL

**IMPORTANT:** `NEXT_PUBLIC_API_URL` must be set to your **backend service URL** (VisaGo service).

The value should be:

```
NEXT_PUBLIC_API_URL=https://visago-production.up.railway.app
```

**Note:** Do NOT include `/api` in the URL - the API client adds that automatically.

### Step 3: Rebuild the Web App

After setting the environment variable:

1. **Option A: Trigger a new deployment**
   - Make a small change and push to GitHub
   - Or manually trigger a redeploy in Railway

2. **Option B: Force rebuild**
   - In Railway, go to your web app service
   - Click "Redeploy" or "Deploy Latest"

**Why rebuild is needed:** `NEXT_PUBLIC_*` variables are embedded at **build time**, not runtime. The web app must be rebuilt after setting/changing this variable.

### Step 4: Verify the Fix

After deployment, check the browser console:

1. Open the web app in your browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Look for logs starting with `[API Config]`:

   ```
   [API Config] Using API base URL: https://visago-production.up.railway.app
   [API Config] Full API endpoint: https://visago-production.up.railway.app/api
   [API Config] NEXT_PUBLIC_API_URL env var: https://visago-production.up.railway.app
   ```

5. When you interact with the app (login, load applications, etc.), you should see:

   ```
   [API Request] GET /api/applications
   [API Response] GET /api/applications { status: 200, ... }
   ```

6. Check the backend logs in Railway - you should now see requests from the web app.

## Troubleshooting

### If API URL is still wrong:

1. **Check the console logs** - they will show what URL is being used
2. **Verify the backend service URL** - make sure it's the correct Railway URL
3. **Check for CORS errors** - if you see CORS errors in console, the backend CORS configuration might need updating

### If requests are still not reaching backend:

1. **Check network tab** in browser DevTools:
   - Are requests being made?
   - What's the request URL?
   - What's the response status?

2. **Check backend CORS configuration**:
   - Backend must allow requests from the web app domain
   - Check `apps/backend/src/middleware/cors.ts` or similar

3. **Check backend logs**:
   - Are there any errors?
   - Are requests being received but failing?

## Current Configuration

The web app uses this logic to determine the API URL:

1. **Priority 1:** `NEXT_PUBLIC_API_URL` environment variable (set in Railway)
2. **Priority 2:** If localhost → `http://localhost:3000`
3. **Priority 3:** Fallback → `https://visago-production.up.railway.app`

## Verification Checklist

- [ ] `NEXT_PUBLIC_API_URL` is set in Railway web app service variables
- [ ] Value is `https://visago-production.up.railway.app` (no trailing slash, no `/api`)
- [ ] Web app has been rebuilt after setting the variable
- [ ] Browser console shows correct API URL in `[API Config]` logs
- [ ] API requests appear in browser Network tab
- [ ] Backend logs show requests from web app
- [ ] No CORS errors in browser console

## Next Steps

After fixing, the web app should:

- ✅ Make API requests to the correct backend URL
- ✅ Show requests in backend logs
- ✅ Work authentically with the mobile app (same backend)
- ✅ Display proper translations (no raw keys)
- ✅ Avoid 429 rate limit errors
