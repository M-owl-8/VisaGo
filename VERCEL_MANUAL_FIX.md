# Vercel Manual Configuration Fix

## 🔴 Current Error

```
Error: No Output Directory named "public" found after the Build completed.
```

This means Vercel is treating your project as a **static site** instead of a **Next.js app**.

## ✅ IMMEDIATE FIX - Do This in Vercel Dashboard

### Step 1: Go to Vercel Project Settings

1. Visit: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **General**

### Step 2: Update These Settings

**1. Root Directory:**

- Set to: **`/`** (root) or leave **EMPTY**
- **NOT** `apps/web`

**2. Framework Preset:**

- Manually select: **Next.js**
- Don't rely on auto-detection

**3. Build Command:**

- Set to: `cd apps/web && npm run build`
- Or leave empty if using vercel.json

**4. Output Directory:**

- Set to: `apps/web/.next`
- This is the **critical setting** that's missing

**5. Install Command:**

- Set to: `npm install`
- Or leave empty if using vercel.json

### Step 3: Save and Redeploy

1. Click **Save** at the bottom
2. Go to **Deployments** tab
3. Click **Redeploy** on the latest deployment
4. Select **Use existing Build Cache** = No (to force fresh build)

## 🎯 Why This Happens

Vercel is not reading `vercel.json` because:

- Root Directory might be set to `apps/web` (so it looks for vercel.json there)
- OR Vercel's project settings override vercel.json
- OR Framework detection failed

## ✅ Alternative: Set Root Directory to `apps/web`

If you prefer to keep Root Directory as `apps/web`:

1. **In Vercel Dashboard:**
   - Set Root Directory: `apps/web`
   - Set Output Directory: `.next` (relative to apps/web)
   - Set Framework: Next.js

2. **Move vercel.json:**

   ```bash
   mv vercel.json apps/web/vercel.json
   ```

3. **Update apps/web/vercel.json:**
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "framework": "nextjs",
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm install"
   }
   ```

## 🔍 Verify Settings

After updating, check that:

- ✅ Framework shows "Next.js" (not "Other")
- ✅ Output Directory is set correctly
- ✅ Build Command matches your setup
- ✅ Root Directory matches where vercel.json is located

## 📝 Recommended: Use Root Directory = `/`

**Benefits:**

- Single vercel.json at repo root (cleaner)
- Works better with monorepo structure
- Easier to manage

**Settings:**

- Root Directory: `/` (empty)
- Output Directory: `apps/web/.next`
- Framework: Next.js
- Build Command: `cd apps/web && npm run build`
