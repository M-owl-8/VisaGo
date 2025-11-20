# How to Find Your Railway Backend URL

## 🔍 Step 1: Get Your Railway URL

1. **Go to Railway Dashboard:**
   - Visit: https://railway.app
   - Login to your account

2. **Navigate to Your Project:**
   - Click on your project (e.g., "VisaBuddy" or "impartial-eagerness")
   - Find your backend service

3. **Get the Service URL:**
   - Click on your backend service
   - Go to the **"Settings"** tab
   - Look for **"Domains"** or **"Public URL"** section
   - You'll see a URL like: `https://your-service-name.up.railway.app`
   - **Copy this URL** (it's unique to your deployment)

## ✅ Step 2: Verify the URL Works

Test the URL in your browser:
```
https://your-railway-url.up.railway.app/api/health
```

You should see a JSON response like:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": 123.45,
  ...
}
```

If you get 404, the URL is wrong. If you get a response, the URL is correct!

## 🔧 Step 3: Update the Code

### Option A: Use the Update Script (Recommended)

```powershell
cd scripts
.\update-railway-url.ps1 -RailwayUrl "https://your-actual-railway-url.up.railway.app"
```

### Option B: Manual Update

Update these files with your actual Railway URL:

1. **`frontend_new/src/services/api.ts`** (line 35)
2. **`frontend_new/src/config/constants.ts`** (lines 63, 68, 86)
3. **`frontend_new/src/services/streaming-api.ts`** (line 15, 18, 28)

Replace:
```
https://visabuddy-backend-production.up.railway.app
```

With your actual URL:
```
https://your-actual-railway-url.up.railway.app
```

## 🏗️ Step 4: Rebuild the APK

After updating the URL:

```powershell
cd scripts
.\build-standalone-apk.ps1
```

## 📱 Step 5: Install and Test

1. Install the new APK on your device
2. Try logging in again
3. The 404 error should be fixed!

---

## 🆘 Still Getting 404?

If you still get 404 after updating:

1. **Double-check the Railway URL:**
   - Make sure there's no typo
   - Make sure it includes `https://`
   - Make sure there's no trailing slash

2. **Check Railway Service Status:**
   - Go to Railway dashboard
   - Check if service shows "Active"
   - Check the logs for any errors

3. **Test the URL directly:**
   - Open `https://your-url.up.railway.app/api/health` in browser
   - If it works in browser but not in app, the URL in code is wrong
   - If it doesn't work in browser, Railway service might be down

4. **Check Railway Logs:**
   - Look for incoming requests
   - See if requests are reaching the server
   - Check for any routing errors

