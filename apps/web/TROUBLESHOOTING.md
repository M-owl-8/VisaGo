# Troubleshooting Guide

## Network Error Issues

### Problem: "Cannot connect to server" or "Network Error"

This usually means the web app can't reach the backend API.

### Solutions:

#### 1. Check if Backend is Running

**For Local Development:**

```bash
# In a separate terminal, start the backend
cd apps/backend
npm run dev
```

The backend should be running on `http://localhost:3000`

#### 2. Configure API URL for Local Development

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Then restart the Next.js dev server:

```bash
cd apps/web
npm run dev
```

#### 3. Check Backend CORS Settings

The backend needs to allow requests from `http://localhost:3001` (or whatever port Next.js is using).

Check `apps/backend/src/index.ts` - CORS should allow localhost origins.

#### 4. Use Production Backend

If you want to use the production backend instead:

```env
NEXT_PUBLIC_API_URL=https://visago-production.up.railway.app
```

#### 5. Check Browser Console

Open browser DevTools (F12) and check:

- Console tab for error messages
- Network tab to see if API requests are being made
- Check the request URL and response

### Common Issues:

1. **Backend not running**: Start it with `cd apps/backend && npm run dev`
2. **Wrong port**: Backend defaults to 3000, web app to 3000/3001
3. **CORS error**: Backend needs to allow your web app origin
4. **Firewall/antivirus**: May be blocking localhost connections

### Quick Test:

Open in browser: `http://localhost:3000/health` (or your backend URL + `/health`)

If this works, the backend is running. If not, start the backend first.
