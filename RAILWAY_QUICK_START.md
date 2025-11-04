# 🚀 Railway Deployment - Quick Start

## What Was Just Done ✅

Your project is now ready for Railway deployment:

1. ✅ **Credentials Updated**
   - Firebase credentials updated to new account
   - Old credentials deleted from Downloads
   - All credentials secured in GitHub vault

2. ✅ **Dockerfiles Created**
   - Backend Dockerfile (Node.js)
   - AI Service Dockerfile (Python)

3. ✅ **Railway Configuration Files**
   - `railway.json` - Multi-service deployment config
   - `RAILWAY_SETUP_GUIDE.md` - Comprehensive setup guide
   - Environment files configured

4. ✅ **All Changes Pushed to GitHub**
   - Repository ready for Railway auto-deployment

---

## 🎯 Next Steps (30 Minutes)

### Step 1: Start Railway Deployment
1. Go to: https://railway.app/dashboard
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select: **M-owl-8/VisaGo**
4. Click **"Deploy"**

### Step 2: Create Backend Service
Railway will auto-detect. Configure:
- **Name**: `backend`
- **Root Directory**: `apps/backend`
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Port**: `3000`

### Step 3: Create AI Service
Railway will auto-detect. Configure:
- **Name**: `ai-service`
- **Root Directory**: `apps/ai-service`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 8001`
- **Port**: `8001`

### Step 4: Add Database & Cache
- Click **"Add"** → Select **PostgreSQL**
- Click **"Add"** → Select **Redis**

### Step 5: Set Environment Variables
See **RAILWAY_SETUP_GUIDE.md** for complete list.

**Quick Variables for Backend:**
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.DATABASE_URL}}
```

---

## 🔑 Your API Endpoints (After Deployment)

After deployment, you'll get URLs like:

```
Backend:    https://backend-xxx.railway.app
AI Service: https://ai-service-xxx.railway.app
Database:   postgres://user:pass@host:5432/railway
Cache:      redis://host:6379
```

Update your frontend `.env`:
```typescript
export const API_URL = "https://backend-xxx.railway.app"
export const AI_SERVICE_URL = "https://ai-service-xxx.railway.app"
```

---

## 📝 Environment Variables to Add on Railway

### Backend Variables
See `apps/backend/.env.production` for reference. Key ones:
- `DATABASE_URL` - From PostgreSQL plugin
- `REDIS_URL` - From Redis plugin  
- `FIREBASE_*` - Already updated
- `OPENAI_API_KEY` - Your key
- `SMTP_PASSWORD` - Your SendGrid key

### AI Service Variables
See `apps/ai-service/.env` for reference. Key ones:
- `DATABASE_URL` - From PostgreSQL plugin
- `REDIS_URL` - From Redis plugin
- `OPENAI_API_KEY` - Your key

---

## ✅ Deployment Checklist

- [ ] Railway account created and logged in
- [ ] GitHub connected to Railway
- [ ] Backend service deployed
- [ ] AI Service deployed
- [ ] PostgreSQL database connected
- [ ] Redis cache connected
- [ ] Environment variables set
- [ ] Logs showing no errors
- [ ] Health endpoints responding
- [ ] Frontend .env updated with API URLs

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check logs on Railway dashboard
Backend → Logs
# Look for DATABASE_URL or dependency errors
```

### AI Service fails
```bash
# Check logs on Railway dashboard
AI Service → Logs
# Look for OPENAI_API_KEY or Python errors
```

### Database connection fails
```bash
# Verify PostgreSQL is running
# Check DATABASE_URL is copied correctly to Railway variables
# Test: psql ${{Postgres.DATABASE_URL}}
```

---

## 📚 Resources

- **Railway Docs**: https://docs.railway.app
- **Setup Guide**: See `RAILWAY_SETUP_GUIDE.md` (detailed 8-step guide)
- **GitHub Repo**: https://github.com/M-owl-8/VisaGo

---

## 💡 Pro Tips

1. **Use Railway CLI** for faster deployments:
   ```bash
   npm install -g @railway/cli
   railway login
   railway up
   ```

2. **Monitor Services**: Railway dashboard shows real-time logs

3. **Database Migrations**:
   ```bash
   # Run after first deployment
   npm run db:migrate
   npm run db:seed
   ```

4. **Custom Domains**: Add later in service settings

---

**Ready? Go to https://railway.app and start deploying! 🎉**