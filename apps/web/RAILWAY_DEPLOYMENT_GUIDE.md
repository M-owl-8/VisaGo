# Railway Deployment Guide for Web App

**Platform:** Railway.app  
**App Location:** `apps/web`  
**Framework:** Next.js 14.2.0

---

## Quick Start

### Step 1: Create New Service in Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Click **"New Project"** (or select existing project)
3. Click **"New Service"**
4. Select **"GitHub Repo"**
5. Choose your repository
6. Railway will auto-detect the service

### Step 2: Configure Service Settings

**In Railway Dashboard → Your Web Service → Settings:**

1. **Root Directory:**
   - Set to: `apps/web`

2. **Build Command:**
   - Leave empty (uses `nixpacks.toml` or auto-detects)
   - OR set to: `npm install && npm run build`

3. **Start Command:**
   - Leave empty (uses `nixpacks.toml` or auto-detects)
   - OR set to: `npm start`

4. **Port:**
   - Railway will auto-detect (Next.js uses 3000)
   - Or set manually: `3000`

### Step 3: Set Environment Variables

**In Railway Dashboard → Your Web Service → Variables:**

Add these environment variables:

```env
NEXT_PUBLIC_API_URL=https://visago-production.up.railway.app
NEXT_PUBLIC_AI_SERVICE_URL=https://zippy-perfection-production.up.railway.app
NODE_ENV=production
PORT=3000
```

**Important:**

- `NEXT_PUBLIC_API_URL` is **REQUIRED**
- These are embedded at build time, so set them BEFORE the first build
- Railway will automatically redeploy when you add/modify variables

### Step 4: Deploy

1. Railway will automatically deploy when you:
   - Push to the connected branch (usually `main`)
   - Add/modify environment variables
   - Click "Redeploy" in the dashboard

2. **Monitor the deployment:**
   - Go to **Deployments** tab
   - Watch build logs in real-time
   - Wait for "Deployed successfully" message

### Step 5: Get Your URL

1. After deployment, Railway will provide a URL like:
   - `https://your-service-name.up.railway.app`

2. **Custom Domain (Optional):**
   - Go to **Settings** → **Networking**
   - Click **"Generate Domain"** or **"Add Custom Domain"**
   - Follow Railway's instructions for DNS setup

---

## Configuration Details

### Build Process

Railway will:

1. Detect Next.js (via `package.json`)
2. Install dependencies: `npm ci` (or `npm install`)
3. Build the app: `npm run build`
4. Start the app: `npm start`

### File Structure

Railway needs:

- `apps/web/package.json` - Detects Node.js/Next.js
- `apps/web/next.config.js` - Next.js configuration
- `apps/web/railway.json` - Railway-specific config (optional)
- `apps/web/nixpacks.toml` - Nixpacks config (optional, auto-detected)

### Environment Variables

**Required:**

- `NEXT_PUBLIC_API_URL` - Backend API URL

**Optional:**

- `NEXT_PUBLIC_AI_SERVICE_URL` - AI service URL
- `NODE_ENV` - Set to `production`
- `PORT` - Railway sets this automatically

**Note:** `NEXT_PUBLIC_*` variables are embedded at build time. If you change them, Railway will automatically rebuild.

---

## Troubleshooting

### Build Fails

**Error: "Cannot find module"**

- Solution: Make sure Root Directory is set to `apps/web`
- Check that `package.json` exists in `apps/web/`

**Error: "Build command failed"**

- Solution: Check build logs for specific error
- Try setting build command manually: `cd apps/web && npm install && npm run build`

**Error: "TypeScript errors"**

- Solution: Fix TypeScript errors locally first
- Run: `npm run typecheck` in `apps/web/`

### App Doesn't Start

**Error: "Port already in use"**

- Solution: Railway sets PORT automatically, don't hardcode it
- Check that start command is: `npm start` (not `next start -p 3000`)

**Error: "Cannot connect to API"**

- Solution: Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend CORS allows your Railway domain
- Test backend API directly: `curl https://visago-production.up.railway.app/api/health`

### 404 Errors

**All routes return 404**

- Solution: Next.js needs to be built correctly
- Check build logs for errors
- Verify `npm run build` completes successfully

### Environment Variables Not Working

**Variables not being used**

- Solution: `NEXT_PUBLIC_*` vars are embedded at BUILD time
- After adding/modifying, Railway will auto-rebuild
- Wait for rebuild to complete before testing

---

## Railway Dashboard Settings

### Recommended Settings

**Service Settings:**

- **Root Directory:** `apps/web`
- **Build Command:** (empty - auto-detect)
- **Start Command:** (empty - auto-detect)
- **Healthcheck Path:** `/`
- **Healthcheck Timeout:** 100

**Networking:**

- **Port:** Auto-detected (3000)
- **Public:** Enabled (for public access)

**Variables:**

- Set all `NEXT_PUBLIC_*` variables here
- Railway will auto-rebuild when you change them

---

## Deployment Checklist

Before deploying:

- [ ] Root Directory set to `apps/web`
- [ ] `NEXT_PUBLIC_API_URL` environment variable set
- [ ] Backend API is accessible
- [ ] Backend CORS allows Railway domain
- [ ] Local build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run typecheck`

After deploying:

- [ ] Build completes successfully
- [ ] App starts without errors
- [ ] Can access app at Railway URL
- [ ] Login page loads
- [ ] API calls work (check Network tab)
- [ ] No console errors

---

## Custom Domain Setup

1. **In Railway Dashboard:**
   - Go to your service
   - Click **Settings** → **Networking**
   - Click **"Add Custom Domain"**

2. **Configure DNS:**
   - Railway will provide a CNAME record
   - Add it to your domain's DNS settings
   - Wait for DNS propagation (usually < 1 hour)

3. **SSL Certificate:**
   - Railway automatically provisions SSL
   - HTTPS will be enabled automatically

---

## Monitoring & Logs

### View Logs

1. Go to Railway Dashboard
2. Select your web service
3. Click **"Deployments"** tab
4. Click on a deployment to see logs
5. Or click **"Logs"** tab for real-time logs

### Monitor Health

- Railway automatically monitors the healthcheck endpoint (`/`)
- If healthcheck fails, Railway will restart the service
- Check logs if service keeps restarting

---

## Cost Optimization

**Railway Free Tier:**

- $5 credit per month
- Sufficient for development/testing
- Pay-as-you-go for production

**Tips:**

- Use Railway's sleep feature for dev environments
- Monitor usage in Railway dashboard
- Set up usage alerts

---

## Rollback

If deployment fails:

1. **In Railway Dashboard:**
   - Go to **Deployments** tab
   - Find the last successful deployment
   - Click **"Redeploy"**

2. **Or via Git:**
   - Revert the problematic commit
   - Push to trigger new deployment

---

## Support

**Railway Support:**

- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)

**Common Issues:**

- Check Railway status: https://status.railway.app
- Review build logs for specific errors
- Verify environment variables are set correctly

---

**Last Updated:** 2025-11-27
