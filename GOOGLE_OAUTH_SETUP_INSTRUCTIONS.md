# Google OAuth Setup - Final Steps

## Current Status

✅ Backend (VisaGo):

- `GOOGLE_CLIENT_ID` is set
- `GOOGLE_CLIENT_SECRET` is set
- Logs show: "✓ Google OAuth configured"

✅ Web App (prolific-dedication):

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in Railway
- Code is implemented and pushed
- But button is not showing on the website

## Why Google Button Doesn't Show

The current deployed version of the web app was built **before** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` was added to Railway.

Next.js embeds `NEXT_PUBLIC_*` variables at **build time**, not runtime. The app needs to be **rebuilt** to pick up the new variable.

## Solution: Force Rebuild

### Option 1: Manual Redeploy (Fastest)

1. Go to Railway → **prolific-dedication** service
2. Click **"Deployments"** tab
3. Click **"Redeploy"** or **"New Deployment"** button
4. Wait for build to complete (2-5 minutes)
5. Hard refresh browser (Ctrl+Shift+R)

### Option 2: Trigger Auto-Deploy

1. Make a small change to any file in `apps/web/`
2. Push to GitHub
3. Railway will auto-deploy
4. Wait for build to complete
5. Hard refresh browser

## After Rebuild

Once the new deployment is live:

1. Go to https://ketdik.org/login
2. **Hard refresh** (Ctrl+Shift+R or Cmd+Shift+R)
3. You should see:
   - "OR" separator
   - "Continue with Google" button (Google's official button)
4. Click to test Google Sign-In

## Verify Environment Variable is in Bundle

Open browser console (F12) and look for:

```
[GoogleSignIn] Client ID check: { hasClientId: true, clientIdLength: 72, ... }
```

If it says `hasClientId: false`, the variable wasn't embedded in the build.

## Next Steps

1. **Click "Deployments" tab** in Railway (prolific-dedication service)
2. **Click "Redeploy"** to rebuild with the environment variable
3. Wait for deployment to complete
4. Hard refresh the login page
5. Google OAuth button should appear

The environment variable is correctly set. Just needs a rebuild!
