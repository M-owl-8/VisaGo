# Google OAuth Complete Setup Guide

## ✅ Solution Implemented

The web app now uses a **runtime API endpoint** to fetch the Google Client ID, which means:

- ✅ **No rebuild required** - Works even if `NEXT_PUBLIC_GOOGLE_CLIENT_ID` wasn't set at build time
- ✅ **Works immediately** - Just set the environment variable in Railway and it will work
- ✅ **Fallback support** - Checks both `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID`

## 🔧 Web App Configuration

### Step 1: Set Environment Variable in Railway

1. Go to **Railway** → **prolific-dedication** service (web app)
2. Click **Variables** tab
3. Add or update:

   ```
   Name: NEXT_PUBLIC_GOOGLE_CLIENT_ID
   Value: 299649070049-arcethcha5i8ug8rc2cc3mfclcgjjit4.apps.googleusercontent.com
   ```

   **OR** (alternative, works the same):

   ```
   Name: GOOGLE_CLIENT_ID
   Value: 299649070049-arcethcha5i8ug8rc2cc3mfclcgjjit4.apps.googleusercontent.com
   ```

### Step 2: Verify It Works

1. **No rebuild needed!** The app will automatically fetch the client ID from the API endpoint
2. Go to `https://ketdik.org/login`
3. You should see the "Continue with Google" button
4. Open browser console (F12) to check for any errors

### How It Works

1. The `GoogleOAuthSection` component checks if Google OAuth is available
2. It fetches the client ID from `/api/config/google-client-id` endpoint
3. The API endpoint reads from server-side environment variables (available at runtime)
4. If client ID is found, the Google Sign-In button is rendered

## 📱 Mobile App Configuration

### Step 1: Set Environment Variable

Create or update `.env` file in `frontend_new/` directory:

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=299649070049-arcethcha5i8ug8rc2cc3mfclcgjjit4.apps.googleusercontent.com
```

### Step 2: Rebuild the App

**Important:** Mobile apps require rebuild because Expo embeds environment variables at build time.

```bash
cd frontend_new
npm run build:apk  # For Android
# or
npm run build:ios  # For iOS
```

### Step 3: Verify

After rebuilding, check app logs for:

- ✅ "Google Sign-In initialized successfully" → Working
- ❌ "Google Web Client ID not configured" → Check environment variable

## 🔍 Backend Configuration

The backend is already configured correctly:

- ✅ `GOOGLE_CLIENT_ID` is set
- ✅ `GOOGLE_CLIENT_SECRET` is set
- ✅ Logs show: "✓ Google OAuth configured"

## 🧪 Testing

### Web App Test

1. Go to `https://ketdik.org/login`
2. Click "Continue with Google"
3. Should redirect to Google Sign-In
4. After signing in, should redirect back and log you in

### Mobile App Test

1. Open the app
2. Go to Login screen
3. Tap "Sign in with Google"
4. Should show Google account picker
5. After selecting account, should log you in

## 🐛 Troubleshooting

### Web App: Button Not Showing

1. **Check Railway Variables:**
   - Go to Railway → prolific-dedication → Variables
   - Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_ID` is set

2. **Check Browser Console:**
   - Open DevTools (F12) → Console
   - Look for `[GoogleSignIn]` logs
   - Check for any errors

3. **Test API Endpoint:**
   - Visit: `https://ketdik.org/api/config/google-client-id`
   - Should return: `{"success": true, "clientId": "..."}`

### Mobile App: Google Sign-In Not Working

1. **Check Environment Variable:**

   ```bash
   cd frontend_new
   cat .env | grep GOOGLE
   ```

2. **Verify App Was Rebuilt:**
   - Environment variables are embedded at build time
   - Must rebuild after changing `.env` file

3. **Check App Logs:**
   - Look for "Google Sign-In initialized successfully"
   - Check for any initialization errors

### Backend: OAuth Verification Failing

1. **Check Backend Logs:**
   - Should show: "✓ Google OAuth configured"
   - If not, check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Railway

2. **Verify Client ID Matches:**
   - Web app client ID must match backend `GOOGLE_CLIENT_ID`
   - Both should be: `299649070049-arcethcha5i8ug8rc2cc3mfclcgjjit4.apps.googleusercontent.com`

## 📝 Environment Variables Summary

### Web App (Railway - prolific-dedication)

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=299649070049-arcethcha5i8ug8rc2cc3mfclcgjjit4.apps.googleusercontent.com
```

OR

```
GOOGLE_CLIENT_ID=299649070049-arcethcha5i8ug8rc2cc3mfclcgjjit4.apps.googleusercontent.com
```

### Backend (Railway - VisaGo)

```
GOOGLE_CLIENT_ID=299649070049-arcethcha5i8ug8rc2cc3mfclcgjjit4.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-secret>
```

### Mobile App (.env file)

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=299649070049-arcethcha5i8ug8rc2cc3mfclcgjjit4.apps.googleusercontent.com
```

## ✅ Verification Checklist

- [ ] Web app: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_ID` set in Railway
- [ ] Web app: Button appears on login/register pages
- [ ] Web app: Can click button and see Google Sign-In popup
- [ ] Backend: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set in Railway
- [ ] Backend: Logs show "✓ Google OAuth configured"
- [ ] Mobile app: `.env` file has `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- [ ] Mobile app: App rebuilt after setting environment variable
- [ ] Mobile app: Logs show "Google Sign-In initialized successfully"

## 🎉 Success!

Once all items are checked, Google OAuth should work on both web and mobile apps!
