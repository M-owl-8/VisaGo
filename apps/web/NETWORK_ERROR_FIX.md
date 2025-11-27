# Network Error Fix Guide

## Problem

You're seeing "Network error. Please check your internet connection and try again." when trying to register/login.

**Root Cause:** Port conflict between Next.js web app and backend API server.

- Next.js web app runs on: `localhost:3000`
- Backend API should run on: `localhost:3001` (or another port)
- Web app is trying to connect to backend on the wrong port

## Solution

### Option 1: Use Environment Variable (Recommended)

1. **Create `.env.local` file in `apps/web/`:**

```bash
cd apps/web
```

Create a file named `.env.local` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

2. **Start backend on port 3001:**

In a separate terminal:

```bash
cd apps/backend
# Set PORT=3001 or update your backend .env
PORT=3001 npm run dev
```

Or if your backend uses a `.env` file, add:

```
PORT=3001
```

3. **Restart Next.js dev server:**

```bash
cd apps/web
npm run dev
```

The web app will now connect to `http://localhost:3001/api` instead of `http://localhost:3000/api`.

### Option 2: Change Backend Port in Backend Config

If you prefer to keep backend on port 3000 and Next.js on a different port:

1. **Start Next.js on port 3001:**

```bash
cd apps/web
PORT=3001 npm run dev
```

2. **Update `.env.local` in `apps/web/`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. **Access web app at:** `http://localhost:3001`

### Option 3: Use Production Backend (Quick Test)

If you just want to test the web app without running backend locally:

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://visago-production.up.railway.app
```

**Note:** This uses the production backend. Only use for testing, not development.

## Verify It's Working

1. Open browser console (F12)
2. Look for these messages:
   - `🌐 Using API URL from environment: http://localhost:3001`
   - `🔗 API Base URL: http://localhost:3001`
   - `🔗 Full API endpoint will be: http://localhost:3001/api`

3. Try registering again - the network error should be gone.

## Troubleshooting

### Still seeing network error?

1. **Check if backend is running:**

   ```bash
   # Check if backend process is running
   Get-Process -Name node | Where-Object { $_.Path -like "*backend*" }
   ```

2. **Check backend port:**
   - Look at backend console output
   - Should see: `Port: 3001` (or whatever port you configured)

3. **Test backend directly:**

   ```bash
   # In PowerShell
   Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET
   ```

   Should return a response (not an error).

4. **Check browser console:**
   - Open DevTools (F12) → Network tab
   - Try registering
   - Look at the failed request
   - Check the URL it's trying to connect to

5. **Verify .env.local is loaded:**
   - Restart Next.js dev server after creating `.env.local`
   - Check browser console for the API URL log message

## Common Issues

### "CORS error" instead of network error

- Backend needs CORS configured to allow `http://localhost:3000`
- Check backend CORS settings

### "404 Not Found"

- Backend is running but route doesn't exist
- Check backend routes: `/api/auth/register` should exist

### "Connection refused"

- Backend is not running
- Start backend: `cd apps/backend && npm run dev`

### Port already in use

- Another process is using the port
- Change port in backend `.env` or kill the process using that port
