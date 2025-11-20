# Quick Railway Deployment Trigger

**Problem:** Railway didn't auto-deploy after git push  
**Quick Fix:** Trigger deployment manually

---

## 🚀 Quick Actions (Choose One)

### Option 1: Railway Dashboard (Easiest)

1. Go to https://railway.app
2. Open your backend service
3. Click "Deployments" tab
4. Click "Redeploy" or "Deploy Latest"

### Option 2: Empty Commit (Fastest)

```bash
git commit --allow-empty -m "chore: trigger Railway redeployment"
git push
```

### Option 3: Railway CLI

```bash
railway up
```

---

## ⚙️ Check Settings First

Before redeploying, verify in Railway dashboard:

- **Service Settings → Build:**
  - Root Directory: Empty (or `/`)
  - Dockerfile Path: `apps/backend/Dockerfile`
  - Build Method: Dockerfile

- **Project Settings → GitHub:**
  - Repository connected
  - Branch: `main`
  - Auto-deploy: Enabled

---

## 📋 Full Guide

See `MANUAL_RAILWAY_DEPLOY.md` for detailed instructions.

---

**Quick Fix:** Use Option 1 (Dashboard) or Option 2 (Empty commit)

