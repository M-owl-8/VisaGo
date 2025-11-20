# Railway Service Verification & Setup Guide

## 🔍 Current Situation

### Directory Structure
- **Original Project**: `C:\work\VisaBuddy` (may exist)
- **Active Project**: `C:\work\VisaGo-clean` (cloned from GitHub: `M-owl-8/VisaGo`)
- **GitHub Repo**: `https://github.com/M-owl-8/VisaGo.git`
- **Branch**: `main`

### Service Name Mismatch ⚠️

**railway.json defines:**
- `"VisaBuddy Backend"` (service key: `backend`)
- `"VisaBuddy AI Service"` (service key: `ai-service`)

**Actual Railway Services:**
- `VisaGo` (backend service)
- `zippy-perfection` (AI service)

**This mismatch means Railway CLI and railway.json may not match your actual services!**

---

## ✅ Step-by-Step Verification

### Step 1: Verify Railway Services Exist

1. **Go to Railway Dashboard:**
   - Visit: https://railway.app
   - Navigate to your project (likely named `impartial-eagerness`)

2. **Check Services List:**
   - You should see:
     - ✅ **VisaGo** (backend) - Status: Green/Red/Crashed
     - ✅ **zippy-perfection** (AI service) - Status: Green/Red/Crashed
     - ✅ **Postgres** (database)
     - ✅ **Redis** (cache)

3. **Note the exact service names** - they must match when using Railway CLI

---

### Step 2: Verify Service Configurations

#### For VisaGo (Backend) Service:

1. **Go to VisaGo service → Settings → Source:**
   - ✅ Repository: `M-owl-8/VisaGo`
   - ✅ Branch: `main`
   - ✅ Root Directory: `/` (empty or `/`)
   - ✅ Dockerfile Path: `apps/backend/Dockerfile`

2. **Go to Settings → Build:**
   - ✅ Build Command: (empty - uses Dockerfile)
   - ✅ Start Command: (empty - uses Dockerfile CMD)

3. **Go to Settings → Variables:**
   - ✅ `DATABASE_URL` (auto-provided by Postgres plugin)
   - ✅ `REDIS_URL` (auto-provided by Redis plugin)
   - ✅ `NODE_ENV=production`
   - ✅ `PORT=3000`
   - ✅ `JWT_SECRET` (your secret)
   - ✅ `OPENAI_API_KEY` (your key)
   - ✅ `AI_SERVICE_URL` (should be: `http://zippy-perfection:8001` or public URL)

#### For zippy-perfection (AI Service):

1. **Go to zippy-perfection service → Settings → Source:**
   - ✅ Repository: `M-owl-8/VisaGo`
   - ✅ Branch: `main`
   - ✅ Root Directory: `apps/ai-service`
   - ✅ Dockerfile Path: `Dockerfile` (or `./Dockerfile`)

2. **Go to Settings → Variables:**
   - ✅ `PORT=8001`
   - ✅ `PYTHONUNBUFFERED=1`
   - ✅ `OPENAI_API_KEY` (your key)
   - ✅ `CORS_ORIGINS=*` (or specific origins)

---

### Step 3: Verify Service Connections

1. **Check Service URLs:**
   - VisaGo backend: `https://visabuddy-backend-production.up.railway.app` (or your custom domain)
   - zippy-perfection: `https://zippy-perfection-production.up.railway.app` (or your custom domain)

2. **Verify Internal Networking:**
   - Services in the same Railway project can communicate via service names
   - Backend should use: `http://zippy-perfection:8001` for internal calls
   - Or use public URLs if services are in different projects

3. **Check Environment Variables:**
   - Backend's `AI_SERVICE_URL` should point to zippy-perfection's URL
   - If same project: `http://zippy-perfection:8001`
   - If different project: `https://zippy-perfection-production.up.railway.app`

---

## 🔧 Fix Service Name Mismatch

### Option A: Update railway.json to Match Actual Services

**Current railway.json:**
```json
{
  "services": {
    "backend": {
      "name": "VisaBuddy Backend",  // ❌ Doesn't match "VisaGo"
    },
    "ai-service": {
      "name": "VisaBuddy AI Service",  // ❌ Doesn't match "zippy-perfection"
    }
  }
}
```

**Should be:**
```json
{
  "services": {
    "backend": {
      "name": "VisaGo",  // ✅ Matches actual service
    },
    "ai-service": {
      "name": "zippy-perfection",  // ✅ Matches actual service
    }
  }
}
```

**OR** rename services in Railway to match railway.json (not recommended if already deployed).

---

## 🚀 Deployment Methods

### Method 1: Railway CLI (Recommended - Bypasses GitHub Issues)

```powershell
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
cd C:\work\VisaGo-clean
railway link
# Select your project

# Deploy backend (VisaGo)
railway service VisaGo
railway up

# Deploy AI service (zippy-perfection)
railway service zippy-perfection
railway up
```

**Time**: ~5-10 minutes per service

### Method 2: Fix GitHub Integration (For Auto-Deploy)

1. **Disconnect GitHub at account level** (Railway Dashboard → Account → Integrations)
2. **Reconnect GitHub** with proper permissions
3. **Wait 2-3 minutes**
4. **Reconnect services** to repository
5. **Push to GitHub** - auto-deploys

**Time**: ~10-15 minutes (one-time setup) + ~5-10 minutes per deployment

### Method 3: Manual Deploy via Railway Dashboard

1. Go to service → Deployments
2. Click "Redeploy" or "Deploy Latest"
3. Monitor logs

**Time**: ~5-10 minutes per service

---

## ⏱️ Deployment Time Estimates

### Current Problems & Impact:

1. **GitHub Integration "Failed to fetch":**
   - **Impact**: Can't auto-deploy from GitHub
   - **Workaround**: Use Railway CLI (adds ~2 minutes setup)
   - **Fix Time**: 5-10 minutes (one-time)

2. **Service Name Mismatch:**
   - **Impact**: Railway CLI may not find services automatically
   - **Workaround**: Use exact service names (`VisaGo`, `zippy-perfection`)
   - **Fix Time**: 2 minutes (update railway.json or use correct names)

3. **Prisma Schema Issues (if still present):**
   - **Impact**: Backend crashes on startup
   - **Fix Time**: Already fixed in code, just needs redeploy (~5-10 minutes)

### Total Deployment Time:

- **First Time Setup**: 15-20 minutes
  - Fix GitHub integration: 5-10 min
  - Deploy backend: 5-10 min
  - Deploy AI service: 5-10 min

- **Subsequent Deployments**: 5-10 minutes per service
  - Using Railway CLI: ~5 min per service
  - Using GitHub (if fixed): ~5 min per service (automatic)

- **If Everything Works**: 10-15 minutes total for both services

---

## 📋 Quick Verification Checklist

Run this in PowerShell to verify your setup:

```powershell
# Check you're in the right directory
cd C:\work\VisaGo-clean
git remote -v  # Should show: M-owl-8/VisaGo

# Check Railway CLI
railway --version

# List services (after railway link)
railway service list

# Check service status
railway status
```

---

## 🎯 Recommended Action Plan

1. **✅ Use `C:\work\VisaGo-clean`** (this is your active project)
2. **✅ Verify Railway services** match: `VisaGo` and `zippy-perfection`
3. **✅ Use Railway CLI** with exact service names
4. **✅ Deploy backend first** (VisaGo)
5. **✅ Deploy AI service second** (zippy-perfection)
6. **✅ Verify both services are green** in Railway dashboard
7. **✅ Test endpoints** to confirm they're working

---

## 🆘 Troubleshooting

### Service Not Found Error:
```powershell
# List all services in project
railway service list

# Use exact service name (case-sensitive)
railway service VisaGo  # Not "visago" or "VisaGo Backend"
```

### Deployment Fails:
1. Check Railway logs for specific errors
2. Verify environment variables are set
3. Check Dockerfile paths are correct
4. Verify root directory settings

### Services Can't Communicate:
1. Check they're in the same Railway project
2. Use service names for internal URLs: `http://zippy-perfection:8001`
3. Or use public URLs if in different projects

---

**Last Updated**: 2025-11-20
**Status**: Ready for verification

