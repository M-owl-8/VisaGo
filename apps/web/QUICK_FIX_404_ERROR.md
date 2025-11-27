# Quick Fix: 404 Error on Registration

## The Problem

You're seeing `POST /api/auth/register 404` in Next.js logs, which means:

- The request is hitting Next.js server (port 3001) instead of backend (port 3000)
- Next.js doesn't have that route, so it returns 404

## Root Cause

`NEXT_PUBLIC_*` environment variables are **embedded at build time** in Next.js. Even if you update `.env.local`, the already-compiled code in `.next` folder still has the old values.

## Solution (3 Steps)

### Step 1: Stop Next.js

Press `Ctrl+C` in the terminal where Next.js is running.

### Step 2: Delete Build Cache

```powershell
cd apps/web
Remove-Item -Recurse -Force .next
```

This forces Next.js to rebuild with the new environment variables.

### Step 3: Restart Next.js

```powershell
npm run dev
```

## Verify It's Fixed

1. **Open browser console (F12)**
2. **Look for these messages:**

   ```
   🌐 Using API URL from environment: http://localhost:3000
   🔗 API Base URL: http://localhost:3000
   🔗 Full API endpoint will be: http://localhost:3000/api
   ```

3. **Check Network tab:**
   - Open DevTools (F12) → Network tab
   - Try registering
   - The request URL should be: `http://localhost:3000/api/auth/register`
   - NOT: `http://localhost:3001/api/auth/register`

4. **Try registering again** - should work now!

## Current Configuration

- ✅ `.env.local` exists with: `NEXT_PUBLIC_API_URL=http://localhost:3000`
- ✅ Backend is running on port 3000 (confirmed from backend logs)
- ✅ Next.js is running on port 3001
- ⚠️ Next.js needs to rebuild to pick up the new env var

## If Still Not Working

1. **Check backend is actually running:**

   ```powershell
   # Test backend directly
   Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET
   ```

   Should return a response (not an error).

2. **Check browser console for the actual API URL being used**

3. **Verify `.env.local` content:**

   ```powershell
   Get-Content .env.local
   ```

   Should show: `NEXT_PUBLIC_API_URL=http://localhost:3000`

4. **Hard refresh browser:** `Ctrl+Shift+R` or `Ctrl+F5`
