# Manual Railway Deployment Guide

**Issue:** Railway did not automatically redeploy after git push  
**Solution:** Manual deployment trigger and configuration check

---

## 🔍 Step 1: Check Railway Dashboard

1. **Go to Railway Dashboard:**
   - Visit: https://railway.app
   - Login to your account
   - Navigate to your project

2. **Check Service Status:**
   - Find your backend service
   - Check if it shows "Active" or "Inactive"
   - Look at the latest deployment timestamp

---

## 🚀 Step 2: Manual Deployment Trigger

### Option A: Trigger via Railway Dashboard

1. **Go to your backend service**
2. **Click on "Deployments" tab**
3. **Click "Redeploy" or "Deploy Latest" button**
4. **Or click the three dots (⋯) menu → "Redeploy"**

### Option B: Trigger via Railway CLI

```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project (if not already linked)
railway link

# Deploy manually
railway up
```

### Option C: Force Redeploy via Git

Sometimes Railway needs a new commit to trigger:

```bash
# Make a small change to trigger deployment
git commit --allow-empty -m "chore: trigger Railway redeployment"
git push
```

---

## ⚙️ Step 3: Verify Railway Configuration

### Check Service Settings

1. **Go to your backend service in Railway**
2. **Click "Settings" tab**
3. **Verify these settings:**
   - **Root Directory:** Should be empty (or `/`)
   - **Dockerfile Path:** Should be `apps/backend/Dockerfile`
   - **Build Command:** Should be empty (uses Dockerfile)
   - **Start Command:** Should be empty (uses Dockerfile CMD)

### Check GitHub Integration

1. **Go to Project Settings**
2. **Check "GitHub" section**
3. **Verify:**
   - ✅ Repository is connected
   - ✅ Branch is set to `main`
   - ✅ Auto-deploy is enabled
   - ✅ Service is linked to the repository

---

## 🔧 Step 4: Check Environment Variables

1. **Go to your backend service**
2. **Click "Variables" tab**
3. **Verify all required variables are set:**
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - At least 32 characters
   - `CORS_ORIGIN` - Not `*` in production
   - `NODE_ENV` - Should be `production`
   - `PORT` - Should be `3000`
   - Other required variables

---

## 📋 Step 5: Verify Build Configuration

### Check if Railway is Using Dockerfile

1. **Go to service settings**
2. **Check "Build" section**
3. **Verify:**
   - Build method is "Dockerfile"
   - Dockerfile path is correct: `apps/backend/Dockerfile`
   - Build context is root directory

### If Railway is Using Nixpacks Instead

If Railway is auto-detecting nixpacks, you need to:

1. **Delete or rename nixpacks.toml files:**

   ```bash
   # These should not exist (we deleted them earlier)
   # If they exist, delete them:
   rm apps/backend/nixpacks.toml
   rm nixpacks.toml
   ```

2. **Force Railway to use Dockerfile:**
   - In Railway dashboard → Service Settings
   - Set "Build Method" to "Dockerfile"
   - Set "Dockerfile Path" to `apps/backend/Dockerfile`

---

## 🎯 Step 6: Manual Deployment Steps

### Using Railway Dashboard:

1. **Go to your backend service**
2. **Click "Deployments" tab**
3. **Click "New Deployment" or "Redeploy"**
4. **Select branch:** `main`
5. **Click "Deploy"**

### Using Railway CLI:

```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project (if needed)
railway link

# Deploy
railway up
```

---

## 🔍 Step 7: Monitor Deployment

1. **Watch the deployment logs:**
   - Go to "Deployments" tab
   - Click on the latest deployment
   - Watch the build logs in real-time

2. **Look for:**
   - ✅ Build starts successfully
   - ✅ Dependencies install
   - ✅ Dockerfile builds
   - ✅ No errors in logs

---

## ⚠️ Common Issues

### Issue: Railway Not Connected to GitHub

**Solution:**

1. Go to Project Settings → GitHub
2. Connect your repository
3. Select branch: `main`
4. Enable auto-deploy

### Issue: Wrong Build Method

**Solution:**

1. Go to Service Settings → Build
2. Change to "Dockerfile"
3. Set Dockerfile path: `apps/backend/Dockerfile`
4. Save and redeploy

### Issue: Wrong Root Directory

**Solution:**

1. Go to Service Settings
2. Set "Root Directory" to empty (or `/`)
3. Save and redeploy

### Issue: Nixpacks Auto-Detection

**Solution:**

1. Delete any `nixpacks.toml` files
2. Force Dockerfile usage in settings
3. Redeploy

---

## ✅ Verification Checklist

After manual deployment:

- [ ] Deployment started in Railway dashboard
- [ ] Build logs show Dockerfile being used
- [ ] Build completes without errors
- [ ] Dependencies are installed
- [ ] Backend starts successfully
- [ ] Health endpoint is accessible
- [ ] No "Cannot find module" errors

---

## 🆘 If Deployment Still Fails

1. **Check Railway Logs:**
   - Look for specific error messages
   - Check if Dockerfile is being used
   - Verify build context is correct

2. **Verify Git Connection:**
   - Check if Railway can access your repo
   - Verify branch is correct
   - Check if auto-deploy is enabled

3. **Check Service Configuration:**
   - Verify Dockerfile path
   - Check root directory setting
   - Confirm environment variables

---

## 📞 Quick Actions

### Force Redeploy Now:

```bash
# Option 1: Empty commit
git commit --allow-empty -m "chore: trigger Railway redeployment"
git push

# Option 2: Railway CLI
railway up

# Option 3: Railway Dashboard
# Go to service → Deployments → Redeploy
```

---

**Last Updated:** November 18, 2025  
**Status:** Manual deployment guide







