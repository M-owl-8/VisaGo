# Phase 1: Railway Deployment - Your Tasks

**Platform:** Railway.app  
**Goal:** Deploy web app that works seamlessly with mobile app

---

## ✅ Pre-Deployment Verification

Before starting, verify compatibility:

1. **Read:** `WEB_MOBILE_COMPATIBILITY.md`
   - Confirms web and mobile apps are compatible
   - Both use same backend: `https://visago-production.up.railway.app`

2. **Verify Backend CORS:**
   - Backend must allow requests from your web app domain
   - See "Backend CORS Configuration" section below

---

## Step 1: Create Railway Service

### 1.1 Go to Railway Dashboard

1. Visit: [https://railway.app](https://railway.app)
2. Log in to your account
3. Select your existing project (or create new one)

### 1.2 Create New Service

1. Click **"New Service"** button
2. Select **"GitHub Repo"**
3. Choose your repository (VisaBuddy monorepo)
4. Railway will auto-detect services

### 1.3 Configure Service Settings

**In Railway Dashboard → Your Web Service → Settings:**

1. **Root Directory:**
   - Set to: `apps/web`

2. **Build Command:**
   - Leave empty (Railway will use `nixpacks.toml`)

3. **Start Command:**
   - Leave empty (Railway will use `nixpacks.toml`)

4. **Port:**
   - Railway will auto-detect (Next.js uses 3000)
   - Or set manually: `3000`

5. **Healthcheck:**
   - Path: `/`
   - Timeout: `100`

---

## Step 2: Set Environment Variables

**CRITICAL:** Set these BEFORE the first build (they're embedded at build time)

**In Railway Dashboard → Your Web Service → Variables:**

### Required Variables

```env
NEXT_PUBLIC_API_URL=https://visago-production.up.railway.app
```

**This is the SAME backend that mobile app uses!**

### Optional Variables

```env
NEXT_PUBLIC_AI_SERVICE_URL=https://zippy-perfection-production.up.railway.app
NODE_ENV=production
```

**Note:** Railway will automatically rebuild when you add/modify environment variables.

---

## Step 3: Configure Backend CORS

**⚠️ CRITICAL:** Backend must allow requests from your web app domain

### 3.1 Get Your Web App URL

After Railway deploys, you'll get a URL like:

- `https://your-service-name.up.railway.app`

Or if you set a custom domain:

- `https://your-custom-domain.com`

### 3.2 Update Backend CORS

**In Backend Railway Service → Variables:**

Find `CORS_ORIGINS` or `CORS_ORIGIN` variable and add your web app domain:

```env
CORS_ORIGINS=https://your-web-app.railway.app,https://your-custom-domain.com,*
```

**Or if backend uses a different CORS config:**

- Check backend code for CORS configuration
- Add your web app domain to allowed origins
- Redeploy backend

### 3.3 Verify CORS

After updating CORS:

1. Redeploy backend
2. Test web app can make API calls
3. Check browser console for CORS errors

---

## Step 4: Deploy

### 4.1 Automatic Deployment

Railway will automatically deploy when you:

- Push to connected branch (usually `main`)
- Add/modify environment variables
- Click "Redeploy" in dashboard

### 4.2 Monitor Deployment

1. Go to **Deployments** tab
2. Watch build logs in real-time
3. Wait for "Deployed successfully" message
4. Note the deployment URL

---

## Step 5: Get Your URL

### 5.1 Railway-Generated URL

After deployment, Railway provides:

- `https://your-service-name.up.railway.app`

### 5.2 Custom Domain (Optional)

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"** or **"Add Custom Domain"**
3. Follow Railway's instructions for DNS setup
4. Wait for DNS propagation (usually < 1 hour)

---

## Step 6: Verify Deployment

### 6.1 Basic Checks

- [ ] Web app loads at Railway URL
- [ ] No console errors (F12 → Console)
- [ ] Login page displays correctly
- [ ] Can register new user
- [ ] Can login with existing user

### 6.2 Cross-Platform Compatibility Tests

**Test 1: Sign up on web → Login on mobile**

- [ ] Register on web app
- [ ] Login on mobile app with same credentials
- [ ] ✅ Should successfully log in

**Test 2: Create application on web → See on mobile**

- [ ] Create application on web app
- [ ] Open mobile app
- [ ] Go to Applications screen
- [ ] ✅ Should see the application

**Test 3: Create application on mobile → See on web**

- [ ] Create application on mobile app
- [ ] Open web app
- [ ] Go to Applications page
- [ ] ✅ Should see the application

**Test 4: Chat messages sync**

- [ ] Send message on web
- [ ] Open mobile app chat
- [ ] ✅ Should see the message
- [ ] Send message on mobile
- [ ] Open web app chat
- [ ] ✅ Should see the message

---

## Step 7: Update Documentation

After successful deployment:

1. **Note your web app URL:**
   - Railway URL: `https://...`
   - Custom domain: `https://...` (if set)

2. **Update any documentation:**
   - Add web app URL to project README
   - Update support page with web app link
   - Share URL with team

---

## Troubleshooting

### Build Fails

**Error: "Cannot find module"**

- Solution: Verify Root Directory is set to `apps/web`
- Check that `package.json` exists in `apps/web/`

**Error: "TypeScript errors"**

- Solution: Fix TypeScript errors locally first
- Run: `npm run typecheck` in `apps/web/`

### App Doesn't Start

**Error: "Port already in use"**

- Solution: Railway sets PORT automatically
- Don't hardcode port in start command

### CORS Errors

**Error: "CORS policy blocked"**

- Solution: Add web app domain to backend CORS
- See Step 3 above
- Redeploy backend after updating CORS

### API Calls Fail

**Error: "Network error" or "Cannot connect"**

- Solution: Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend is online: `https://visago-production.up.railway.app/api/health`
- Check backend CORS allows your web domain

### Applications Don't Sync

**Issue: Application created on web doesn't appear on mobile**

- Solution: Verify both apps use same backend URL
- Check user is logged in with same account
- Verify backend is returning applications correctly

---

## Quick Reference

### Railway Dashboard Settings

**Service Settings:**

- Root Directory: `apps/web`
- Build Command: (empty)
- Start Command: (empty)
- Port: Auto-detected (3000)

**Variables:**

- `NEXT_PUBLIC_API_URL=https://visago-production.up.railway.app` (REQUIRED)
- `NEXT_PUBLIC_AI_SERVICE_URL=https://zippy-perfection-production.up.railway.app` (optional)

### Backend CORS

**Backend Variables:**

- `CORS_ORIGINS=https://your-web-app.railway.app,*` (add your web app domain)

### Testing

**Test URLs:**

- Web app: `https://your-web-app.railway.app`
- Backend API: `https://visago-production.up.railway.app/api/health`
- Mobile app: (your mobile app)

---

## Success Criteria

✅ Deployment is successful when:

- Web app loads at Railway URL
- Can register/login
- Can create applications
- Applications sync with mobile app
- Chat messages sync with mobile app
- No CORS errors
- No console errors

---

**Ready to deploy?** Follow the steps above, and your web app will work seamlessly with your mobile app! 🚀

**Last Updated:** 2025-11-27
