# Backend Deployment Fix for Railway

## 🔴 **Problem**

Railway deployment is failing with:

```
npm error No workspaces found:
npm error   --workspace=visabuddy-backend
```

## ✅ **Solution Applied**

Fixed the `nixpacks.toml` files to use the correct workspace path:

- Changed from: `--workspace=visabuddy-backend`
- Changed to: `-w apps/backend`

## 📝 **What Was Fixed**

1. **`apps/backend/nixpacks.toml`** - Updated workspace path
2. **`nixpacks.toml`** (root) - Created root-level config as fallback

## 🚀 **Next Steps**

### Option 1: Use Dockerfile (Recommended)

Railway is configured to use Dockerfile, but it might be auto-detecting nixpacks. To force Dockerfile usage:

1. **In Railway Dashboard:**
   - Go to your backend service
   - Go to Settings → Build
   - Make sure "Dockerfile Path" is set to: `apps/backend/Dockerfile`
   - Make sure "Root Directory" is empty (or set to `/`)
   - Disable "Auto-detect Build Configuration" if available

2. **Or remove/rename nixpacks.toml:**
   - Rename `nixpacks.toml` to `nixpacks.toml.backup`
   - This forces Railway to use Dockerfile

### Option 2: Use Nixpacks (Fixed)

If Railway is using nixpacks, the fix is already applied:

1. **Commit and push the changes:**

   ```bash
   git add apps/backend/nixpacks.toml nixpacks.toml
   git commit -m "Fix Railway deployment: correct workspace path"
   git push
   ```

2. **Railway will auto-deploy:**
   - Railway will detect the changes
   - It will rebuild with the fixed configuration
   - Backend should start successfully

## 🔍 **Verify the Fix**

After deployment, check Railway logs:

1. **Go to Railway Dashboard**
2. **Click on your backend service**
3. **Check Deployments tab**
4. **View logs** - Should see:
   - ✅ `npm ci` succeeds
   - ✅ `npm run build -w apps/backend` succeeds
   - ✅ `npm run start -w apps/backend` starts the server
   - ✅ No more "No workspaces found" errors

## 📋 **Expected Logs (Success)**

```
[INFO] Starting Container
[INFO] npm ci
[INFO] npm run build -w apps/backend
[INFO] Prisma generate...
[INFO] TypeScript compilation...
[INFO] npm run start -w apps/backend
[INFO] Server listening on port 3000
```

## 🚨 **If Still Failing**

### Check Railway Settings:

1. **Root Directory:**
   - Should be empty or `/`
   - NOT `apps/backend`

2. **Build Command:**
   - Should be empty (uses Dockerfile/nixpacks)
   - OR set to: `npm ci && npm run build -w apps/backend`

3. **Start Command:**
   - Should be empty (uses Dockerfile/nixpacks)
   - OR set to: `npm run start -w apps/backend`

### Alternative: Use Dockerfile Explicitly

If nixpacks continues to cause issues:

1. **In Railway Dashboard:**
   - Settings → Build
   - Set "Build Command" to: (empty)
   - Set "Start Command" to: (empty)
   - Make sure Dockerfile path is: `apps/backend/Dockerfile`

2. **The Dockerfile is already configured correctly** and should work

## ✅ **After Fix is Applied**

Once the backend deploys successfully:

1. ✅ Backend will be online at: `https://visabuddy-backend-production.up.railway.app`
2. ✅ Health endpoint will respond: `/api/health`
3. ✅ Your mobile app will be able to connect
4. ✅ All features will work

## 🎯 **Quick Checklist**

- [x] Fixed `apps/backend/nixpacks.toml` workspace path
- [x] Created root `nixpacks.toml` as fallback
- [ ] Commit and push changes
- [ ] Verify Railway deployment succeeds
- [ ] Test backend health endpoint
- [ ] Test mobile app connection







