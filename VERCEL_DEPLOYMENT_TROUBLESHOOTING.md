# Vercel Deployment Troubleshooting

## Issue: Deployment Not Triggered After Push

If Vercel is connected to GitHub but deployments aren't triggering automatically, check the following:

## ✅ Step 1: Verify Vercel Project Settings

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Check Project Settings → General:**
   - **Root Directory**: Should be set to `/` (root) or empty
   - If it's set to `apps/web`, Vercel won't find `vercel.json` at the repo root
   - **Fix**: Change Root Directory to `/` (root) or leave it empty

3. **Check Git Integration:**
   - **Repository**: Should show your GitHub repo
   - **Production Branch**: Should be `main` (or your default branch)
   - **Auto-deploy**: Should be enabled

## ✅ Step 2: Verify vercel.json Location

**Current Setup:**

- `vercel.json` is at **repo root** (`/vercel.json`)
- This is correct if Root Directory is set to `/` (root)

**If Root Directory is `apps/web`:**

- Vercel expects `vercel.json` in `apps/web/`
- You have two options:
  1. **Option A (Recommended)**: Change Root Directory to `/` in Vercel settings
  2. **Option B**: Move `vercel.json` back to `apps/web/` and update paths

## ✅ Step 3: Check Webhook Configuration

1. **In Vercel Dashboard:**
   - Go to Project Settings → Git
   - Verify the webhook is active
   - Check if there are any webhook errors

2. **In GitHub:**
   - Go to your repo → Settings → Webhooks
   - Look for Vercel webhook
   - Check if it's active and receiving events
   - Check recent deliveries for errors

## ✅ Step 4: Manual Trigger

If auto-deploy isn't working, manually trigger a deployment:

1. **In Vercel Dashboard:**
   - Go to Deployments tab
   - Click "Redeploy" on the latest deployment
   - OR click "Deploy" → "Import Git Repository" (if needed)

2. **Or via Vercel CLI:**
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod
   ```

## ✅ Step 5: Verify vercel.json Configuration

**Current `vercel.json` at repo root:**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "cd apps/web && npm run build",
  "outputDirectory": "apps/web/.next"
}
```

**This configuration assumes:**

- Root Directory in Vercel is set to `/` (root)
- Build command runs from repo root
- Output directory is relative to repo root

## 🔧 Quick Fix Options

### Option 1: Update Vercel Root Directory (Recommended)

1. Vercel Dashboard → Your Project → Settings → General
2. Set **Root Directory** to `/` (or leave empty)
3. Save settings
4. Push a new commit or manually redeploy

### Option 2: Move vercel.json to apps/web (If Root Directory must be apps/web)

If you must keep Root Directory as `apps/web`, move `vercel.json` back:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

Then update Root Directory in Vercel to `apps/web`.

## 📋 Checklist

- [ ] Root Directory in Vercel is set to `/` (root)
- [ ] `vercel.json` is at repo root
- [ ] Production branch is `main`
- [ ] Auto-deploy is enabled
- [ ] GitHub webhook is active
- [ ] No webhook errors in GitHub
- [ ] Framework is set to `nextjs` in vercel.json
- [ ] `outputDirectory` is set correctly

## 🚨 Still Not Working?

1. **Check Vercel logs:**
   - Go to Deployments → Latest deployment → View logs
   - Look for errors or warnings

2. **Reconnect GitHub integration:**
   - Vercel Dashboard → Settings → Git
   - Disconnect and reconnect the repository

3. **Create a new Vercel project:**
   - Sometimes a fresh project setup resolves webhook issues
   - Import the same repository
   - Set Root Directory to `/`
   - Configure environment variables
