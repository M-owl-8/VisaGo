# Vercel Root Directory Configuration

## 🔴 Current Error

```
Error: The file "/vercel/path0/.next/routes-manifest.json" couldn't be found.
```

## ✅ Solution: Set Root Directory to `apps/web`

The error suggests Vercel is building from the wrong directory. Since your Next.js app is in `apps/web`, you need to set the Root Directory accordingly.

### Option 1: Root Directory = `apps/web` (Recommended for this error)

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard → Your Project → Settings → General

2. **Set Root Directory:**
   - Root Directory: `apps/web`
   - Framework Preset: Next.js
   - Build Command: (leave empty - uses `npm run build` from package.json)
   - Output Directory: (leave empty - Vercel auto-detects `.next`)
   - Install Command: (leave empty - uses `npm install`)

3. **Update `vercel.json` at repo root:**
   - Since Root Directory is `apps/web`, Vercel will look for `vercel.json` in `apps/web/`
   - Move `vercel.json` from root to `apps/web/vercel.json`
   - Update paths to be relative to `apps/web`

### Option 2: Root Directory = `/` (Current setup)

If you want to keep Root Directory as `/` (repo root):

1. **Keep `vercel.json` at repo root** (current setup)
2. **Ensure these settings in Vercel:**
   - Root Directory: `/` (or empty)
   - Output Directory: `apps/web/.next`
   - Framework: Next.js
   - Build Command: `cd apps/web && npm run build`

## 🎯 Recommended Fix for Current Error

**Move vercel.json to apps/web/ and update Vercel Root Directory:**

1. Move `vercel.json` to `apps/web/vercel.json`
2. Update it to:

   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "framework": "nextjs"
   }
   ```

   (Vercel will auto-detect everything else when Root Directory is `apps/web`)

3. In Vercel Dashboard:
   - Set Root Directory: `apps/web`
   - Framework: Next.js
   - Leave other fields empty (auto-detected)

This is the simplest configuration and should fix the routes-manifest.json error.
