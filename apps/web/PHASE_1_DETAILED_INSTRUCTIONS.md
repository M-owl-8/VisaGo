# Phase 1: Detailed Deployment Instructions for Railway

**Platform:** Railway.app  
**Estimated Time:** 30-60 minutes  
**Difficulty:** Easy (step-by-step guide)

---

## 📋 Prerequisites

Before starting, make sure you have:

- [ ] Railway account (create at [railway.app](https://railway.app) if needed)
- [ ] GitHub account with access to your VisaBuddy repository
- [ ] Backend is already deployed on Railway (at `https://visago-production.up.railway.app`)
- [ ] 30-60 minutes of uninterrupted time

---

## Step 1: Create Railway Service for Web App

### 1.1 Log in to Railway

1. **Open your browser** and go to: [https://railway.app](https://railway.app)
2. **Click "Login"** (top right)
3. **Sign in** with your GitHub account (or email/password if you have an account)
4. You'll see your Railway dashboard

### 1.2 Navigate to Your Project

1. **Find your existing project** (the one where your backend is deployed)
   - Look for a project named something like "VisaBuddy" or "Ketdik"
   - If you don't see it, it might be in a different organization/team
2. **Click on the project** to open it
   - You should see your backend service listed

### 1.3 Create New Service

1. **Click the "+ New" button** (usually at the top right or in the project view)
2. **Select "GitHub Repo"** from the dropdown menu
3. **If prompted, authorize Railway** to access your GitHub repositories
4. **Select your repository:**
   - Look for "VisaBuddy" or your repository name
   - Click on it
5. **Railway will start detecting services**

**What happens next:**

- Railway will scan your repository
- It may auto-detect multiple services (backend, web, ai-service)
- Don't worry if it creates multiple services - we'll configure the web one

### 1.4 Identify the Web Service

1. **Look for a service** that says something like:
   - "visabuddy-web"
   - "web"
   - Or just a service with a different name than your backend
2. **If Railway created multiple services:**
   - Find the one that should be the web app
   - You can rename it later if needed
3. **Click on the web service** to open its settings

**If Railway didn't auto-detect:**

- Don't worry, we'll configure it manually in the next step

---

## Step 2: Configure Service Settings

### 2.1 Open Service Settings

1. **Click on your web service** (the one you identified in Step 1.4)
2. **Click the "Settings" tab** (gear icon or "Settings" link)
3. You'll see various configuration options

### 2.2 Set Root Directory

**This is CRITICAL - Railway needs to know where your web app code is located.**

1. **Find "Root Directory"** field
2. **Enter:** `apps/web`
   - This tells Railway to look in the `apps/web` folder
3. **Click "Save"** or "Update" (if there's a save button)

**Why this matters:**

- Your repository is a monorepo (multiple apps in one repo)
- Railway needs to know which folder contains the web app
- Without this, Railway won't find `package.json` and will fail

### 2.3 Configure Build Settings

1. **Find "Build Command"** field
   - **Leave it EMPTY** (Railway will use `nixpacks.toml` automatically)
   - OR if you see a value, delete it and leave empty
2. **Find "Start Command"** field
   - **Leave it EMPTY** (Railway will use `nixpacks.toml` automatically)
   - OR if you see a value, delete it and leave empty

3. **Find "Port"** field
   - Railway should auto-detect `3000`
   - If not, set it to: `3000`
   - This is the port Next.js uses

**Why leave build/start commands empty:**

- We created `nixpacks.toml` in Phase 2
- Railway will automatically use it
- It has the correct commands already configured

### 2.4 Configure Healthcheck (Optional but Recommended)

1. **Find "Healthcheck"** section
2. **Set Healthcheck Path:** `/`
3. **Set Healthcheck Timeout:** `100` (seconds)

**What this does:**

- Railway will check if your app is running by visiting `/`
- If it fails, Railway will restart the service
- This helps ensure your app stays online

### 2.5 Save Settings

1. **Click "Save"** or "Update" button
2. **Wait for confirmation** that settings are saved

---

## Step 3: Set Environment Variables

**⚠️ CRITICAL:** These must be set BEFORE the first build!

### 3.1 Open Variables Tab

1. **In your web service**, click the **"Variables"** tab
   - Usually next to "Settings", "Deployments", etc.
2. You'll see a list of environment variables (might be empty)

### 3.2 Add Required Variable

1. **Click "New Variable"** or **"+ Add Variable"** button
2. **Variable Name:** Enter exactly: `NEXT_PUBLIC_API_URL`
   - Case-sensitive!
   - Must be exactly as shown
3. **Variable Value:** Enter: `https://visago-production.up.railway.app`
   - This is your backend API URL (same as mobile app uses)
4. **Click "Add"** or "Save"

**Why this is required:**

- Next.js embeds `NEXT_PUBLIC_*` variables at BUILD time
- If you set it after building, it won't work
- The web app needs to know where the backend is

### 3.3 Add Optional Variable (Recommended)

1. **Click "New Variable"** again
2. **Variable Name:** `NEXT_PUBLIC_AI_SERVICE_URL`
3. **Variable Value:** `https://zippy-perfection-production.up.railway.app`
4. **Click "Add"**

**Note:** This is optional, but recommended if you use AI features

### 3.4 Add Production Environment Variable (Optional)

1. **Click "New Variable"** again
2. **Variable Name:** `NODE_ENV`
3. **Variable Value:** `production`
4. **Click "Add"**

**Note:** Railway might set this automatically, but it's good to set it explicitly

### 3.5 Verify Variables

Your variables list should now show:

- ✅ `NEXT_PUBLIC_API_URL` = `https://visago-production.up.railway.app`
- ✅ `NEXT_PUBLIC_AI_SERVICE_URL` = `https://zippy-perfection-production.up.railway.app` (optional)
- ✅ `NODE_ENV` = `production` (optional)

**Important:**

- Railway will automatically trigger a rebuild when you add/modify variables
- You'll see a new deployment start automatically

---

## Step 4: Monitor First Deployment

### 4.1 Go to Deployments Tab

1. **Click "Deployments"** tab in your web service
2. You'll see a list of deployments
3. **The latest one** should be building (or queued)

### 4.2 Watch Build Logs

1. **Click on the latest deployment** to open it
2. **You'll see build logs** in real-time
3. **Watch for:**
   - ✅ "Installing dependencies..."
   - ✅ "Building Next.js app..."
   - ✅ "Build successful"
   - ❌ Any errors (red text)

### 4.3 What to Expect

**Successful build logs will show:**

```
✓ Installing dependencies
✓ Building Next.js app
✓ Generating static pages
✓ Build completed successfully
✓ Starting server on port 3000
```

**If you see errors:**

- Don't panic - see Troubleshooting section below
- Common issues are fixable

### 4.4 Wait for Deployment

- **Build time:** Usually 2-5 minutes
- **Status will change:** "Building" → "Deploying" → "Active"
- **When it says "Active"**, your app is live!

---

## Step 5: Get Your Web App URL

### 5.1 Find Your URL

1. **Go back to your service** (click service name or "Overview")
2. **Look for "Domains"** section or **"Networking"** tab
3. **You'll see a URL** like: `https://your-service-name.up.railway.app`

**This is your web app URL!** 🎉

### 5.2 Test Your App

1. **Click the URL** or copy it to your browser
2. **You should see:**
   - Your web app loading
   - Login page (if not logged in)
   - Or redirect to login

**If you see an error:**

- See Troubleshooting section
- Most common: CORS error (we'll fix in Step 6)

### 5.3 Note Your URL

**Write down your web app URL** - you'll need it for Step 6:

```
My Web App URL: https://____________________.railway.app
```

---

## Step 6: Update Backend CORS (CRITICAL)

**⚠️ This step is REQUIRED for web app to work!**

### 6.1 Go to Backend Service

1. **In Railway dashboard**, go back to your **project view**
2. **Click on your BACKEND service** (not the web service)
3. **Click "Variables"** tab

### 6.2 Find CORS Variable

1. **Look for:** `CORS_ORIGIN` or `CORS_ORIGINS`
   - It might be named slightly differently
   - Check all variables if you don't see it immediately

2. **If you find it:**
   - Click "Edit" or the variable name
   - See Step 6.3 below

3. **If you DON'T find it:**
   - See Step 6.4 below (create new variable)

### 6.3 Update Existing CORS Variable

1. **Click "Edit"** on the `CORS_ORIGIN` variable
2. **Current value might be:** `*` or empty or a list
3. **Add your web app URL** to the value:
   - If current value is `*`: Change to: `https://your-web-app.railway.app,*`
   - If current value is a list: Add `,https://your-web-app.railway.app` at the end
   - If current value is empty: Set to: `https://your-web-app.railway.app`
4. **Example:**

   ```
   Before: *
   After: https://my-web-app.up.railway.app,*
   ```

   OR

   ```
   Before: https://some-other-domain.com
   After: https://some-other-domain.com,https://my-web-app.up.railway.app
   ```

5. **Click "Save"** or "Update"

### 6.4 Create New CORS Variable (If Not Found)

1. **Click "New Variable"** button
2. **Variable Name:** `CORS_ORIGIN`
3. **Variable Value:** `https://your-web-app.railway.app,*`
   - Replace `your-web-app.railway.app` with your actual web app URL from Step 5
   - The `,*` at the end allows mobile apps (which don't send origin headers)
4. **Click "Add"**

### 6.5 Redeploy Backend

1. **After updating CORS**, Railway will automatically redeploy backend
2. **Go to "Deployments"** tab in backend service
3. **Wait for deployment to complete** (usually 1-2 minutes)
4. **Status should be "Active"**

**Why this is needed:**

- Browsers enforce CORS (Cross-Origin Resource Sharing)
- Backend must explicitly allow your web app domain
- Without this, browser will block API requests

---

## Step 7: Verify Everything Works

### 7.1 Test Web App Access

1. **Open your web app URL** in browser: `https://your-web-app.railway.app`
2. **You should see:**
   - ✅ Web app loads (not an error page)
   - ✅ Login page displays correctly
   - ✅ No console errors (F12 → Console tab should be clean)

### 7.2 Test Registration

1. **Click "Register"** or go to registration page
2. **Fill in the form:**
   - Email: `test-web@example.com` (use a test email)
   - Password: `test123456`
   - First Name: `Test`
   - Last Name: `User`
3. **Click "Register"**
4. **Expected result:**
   - ✅ Registration succeeds
   - ✅ You're logged in
   - ✅ You see the applications page

**If registration fails:**

- Check browser console (F12) for errors
- Check if backend CORS is configured correctly (Step 6)
- Verify `NEXT_PUBLIC_API_URL` is set correctly (Step 3)

### 7.3 Test Cross-Platform Compatibility

**Test 1: Web → Mobile**

1. **On web app:** Create a new application (complete questionnaire)
2. **On mobile app:** Log in with same credentials
3. **Expected:** ✅ Application appears on mobile app

**Test 2: Mobile → Web**

1. **On mobile app:** Create a new application
2. **On web app:** Refresh the applications page
3. **Expected:** ✅ Application appears on web app

**Test 3: Chat Sync**

1. **On web app:** Send a chat message
2. **On mobile app:** Open chat
3. **Expected:** ✅ Message appears on mobile
4. **On mobile app:** Send a reply
5. **On web app:** Refresh chat
6. **Expected:** ✅ Reply appears on web

---

## Step 8: Set Custom Domain (Optional)

### 8.1 Generate Railway Domain

1. **In your web service**, go to **"Settings"** → **"Networking"**
2. **Click "Generate Domain"**
3. **Railway will create a domain** like: `your-service-production.up.railway.app`
4. **Copy this domain** - you can use it or set a custom one

### 8.2 Add Custom Domain (If You Have One)

1. **In "Networking"** section, click **"Add Custom Domain"**
2. **Enter your domain:** e.g., `app.ketdik.uz`
3. **Railway will show DNS instructions:**
   - Add a CNAME record
   - Point to Railway's provided domain
4. **Update your domain's DNS** (in your domain registrar)
5. **Wait for DNS propagation** (usually < 1 hour)
6. **Railway will automatically provision SSL** (HTTPS)

---

## 📋 Deployment Checklist

Use this checklist to ensure everything is done:

### Before Deployment

- [ ] Railway account created/logged in
- [ ] GitHub repository connected to Railway
- [ ] Backend service is running on Railway

### Service Configuration

- [ ] Web service created in Railway
- [ ] Root Directory set to: `apps/web`
- [ ] Build Command: (empty)
- [ ] Start Command: (empty)
- [ ] Port: `3000` (or auto-detected)

### Environment Variables

- [ ] `NEXT_PUBLIC_API_URL` = `https://visago-production.up.railway.app`
- [ ] `NEXT_PUBLIC_AI_SERVICE_URL` = `https://zippy-perfection-production.up.railway.app` (optional)
- [ ] `NODE_ENV` = `production` (optional)

### Backend CORS

- [ ] Backend `CORS_ORIGIN` variable updated with web app URL
- [ ] Backend redeployed after CORS update

### Verification

- [ ] Web app loads at Railway URL
- [ ] Can register new user
- [ ] Can login with existing user
- [ ] Can create application
- [ ] Application appears on mobile app
- [ ] Chat messages sync between web and mobile
- [ ] No console errors

---

## 🔧 Troubleshooting

### Problem: Build Fails

**Error: "Cannot find module" or "package.json not found"**

- **Solution:** Verify Root Directory is set to `apps/web`
- Go to Settings → Root Directory → Set to: `apps/web`
- Save and redeploy

**Error: "TypeScript errors"**

- **Solution:** Fix TypeScript errors locally first
- Run: `cd apps/web && npm run typecheck`
- Fix any errors shown
- Commit and push changes
- Railway will redeploy automatically

**Error: "Build timeout"**

- **Solution:** Build might be taking too long
- Check build logs for specific errors
- Try redeploying (click "Redeploy" button)

### Problem: App Doesn't Start

**Error: "Port already in use"**

- **Solution:** Railway sets PORT automatically
- Don't hardcode port in start command
- Leave Start Command empty

**Error: "Application crashed"**

- **Solution:** Check deployment logs
- Look for error messages
- Common causes: Missing environment variables, build errors

### Problem: CORS Errors

**Error in browser console: "CORS policy blocked"**

- **Solution:** Backend CORS not configured correctly
- Go to backend service → Variables
- Update `CORS_ORIGIN` to include your web app URL
- Format: `https://your-web-app.railway.app,*`
- Redeploy backend

**Error: "Origin not allowed"**

- **Solution:** Your web app URL is not in CORS_ORIGIN
- Add it to backend CORS_ORIGIN variable
- Make sure URL matches exactly (including https://)

### Problem: API Calls Fail

**Error: "Network error" or "Cannot connect"**

- **Solution 1:** Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check in web service → Variables
- Should be: `https://visago-production.up.railway.app`

- **Solution 2:** Check backend is online
- Visit: `https://visago-production.up.railway.app/api/health`
- Should return a response (not an error)

- **Solution 3:** Check browser console
- Open F12 → Network tab
- Try to register/login
- Look for failed requests
- Check the error message

### Problem: Applications Don't Sync

**Issue: Application created on web doesn't appear on mobile**

- **Solution 1:** Verify both apps use same backend
- Web: Check `NEXT_PUBLIC_API_URL` variable
- Mobile: Check it's using production backend (not localhost)

- **Solution 2:** Verify user is logged in with same account
- Use same email/password on both apps
- Check user ID matches (if visible in app)

- **Solution 3:** Check backend logs
- Go to backend service → Logs
- Look for errors when fetching applications

### Problem: Can't Find Service in Railway

**Issue: Railway didn't create web service automatically**

- **Solution:** Create service manually
- Click "+ New" → "Empty Service"
- Go to Settings → Connect to GitHub
- Select your repository
- Set Root Directory to: `apps/web`
- Railway will detect Next.js and configure automatically

---

## 📞 Getting Help

### Railway Support

- **Documentation:** [docs.railway.app](https://docs.railway.app)
- **Discord:** [discord.gg/railway](https://discord.gg/railway)
- **Status Page:** [status.railway.app](https://status.railway.app)

### Check Logs

- **Web Service Logs:** Service → Deployments → Click deployment → View logs
- **Backend Service Logs:** Backend service → Logs tab

### Common Issues

- Most issues are related to:
  1. Root Directory not set correctly
  2. Environment variables not set
  3. Backend CORS not configured
  4. Backend not online

---

## ✅ Success Criteria

Your deployment is successful when:

- ✅ Web app loads at Railway URL
- ✅ Can register new users
- ✅ Can login with existing users
- ✅ Can create applications
- ✅ Applications sync with mobile app
- ✅ Chat messages sync with mobile app
- ✅ No CORS errors in browser console
- ✅ No other errors in browser console

---

## 🎉 Next Steps After Deployment

1. **Test all features:**
   - Registration, login, applications, chat, documents

2. **Set up custom domain** (if desired):
   - Follow Step 8 above

3. **Monitor usage:**
   - Check Railway dashboard for resource usage
   - Set up alerts if needed

4. **Update documentation:**
   - Add web app URL to project README
   - Update support page with web app link

---

**Estimated Total Time:** 30-60 minutes  
**Difficulty:** Easy (just follow the steps)

**Ready to start?** Begin with Step 1! 🚀

---

**Last Updated:** 2025-11-27
