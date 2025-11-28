# Fix Vercel Deployment Not Triggering

## 🔴 Most Likely Issue: Root Directory Mismatch

Your `vercel.json` is now at the **repo root**, but Vercel might still be configured to use `apps/web` as the Root Directory.

## ✅ Quick Fix Steps

### Step 1: Update Vercel Project Settings

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Click on your project

2. **Open Settings:**
   - Click **Settings** tab
   - Go to **General** section

3. **Update Root Directory:**
   - Find **Root Directory** field
   - **Change it from `apps/web` to `/`** (or leave it empty)
   - Click **Save**

4. **Verify Framework Detection:**
   - Scroll to **Framework Preset**
   - Should show **Next.js** (auto-detected from vercel.json)
   - If not, manually select **Next.js**

### Step 2: Trigger Manual Deployment

After updating settings:

1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
   - OR
3. Make a small change and push to trigger auto-deploy:
   ```bash
   # Add a comment to trigger deployment
   echo "# Deployment trigger" >> README.md
   git add README.md
   git commit -m "chore: trigger Vercel deployment"
   git push origin main
   ```

## 🔄 Alternative: If You Must Keep Root Directory as `apps/web`

If you can't change the Root Directory, move `vercel.json` back to `apps/web/`:

**Move the file:**

```bash
mv vercel.json apps/web/vercel.json
```

**Update `apps/web/vercel.json`:**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

**Note:** Paths are relative to `apps/web` in this case.

## ✅ Verify Webhook is Active

1. **In Vercel:**
   - Settings → Git
   - Verify repository is connected
   - Check if webhook URL is shown

2. **In GitHub:**
   - Repo → Settings → Webhooks
   - Find Vercel webhook
   - Check "Recent Deliveries" for errors
   - If webhook is missing or failed, reconnect in Vercel

## 🎯 Recommended Solution

**Use Option 1** (update Root Directory to `/`):

- ✅ Keeps vercel.json at repo root (cleaner for monorepo)
- ✅ Works better with monorepo structure
- ✅ Single source of truth for deployment config
