# 🚀 Railway Deployment Setup Guide

## Overview
This guide will help you deploy **VisaBuddy** to Railway with:
- ✅ **Backend** (Node.js/Express)
- ✅ **AI Service** (Python/FastAPI)
- ✅ **PostgreSQL Database**
- ✅ **Redis Cache**

---

## 📋 Prerequisites

1. **Railway Account** - https://railway.app (sign up with GitHub)
2. **GitHub Repository** - Already pushed (https://github.com/M-owl-8/VisaGo)
3. **Environment Variables** - Ready to configure

---

## 🎯 Step 1: Create New Railway Project

### 1a. Create a New Project
1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub"**
4. Select repository: **M-owl-8/VisaGo**
5. Confirm and authorize

### 1b. Create Services
Railway will auto-detect your services. You'll need to create:

---

## 📦 Step 2: Set Up Backend Service

### 2a. Add Backend Service
1. Click **"New Service"** → **"GitHub Repo"**
2. Select your repo: **M-owl-8/VisaGo**
3. Configure:
   - **Name**: `backend`
   - **Root Directory**: `apps/backend`
   - **Dockerfile Path**: `./Dockerfile`
   - **Port**: `3000`

### 2b. Set Environment Variables

Click **Backend** → **Variables** and add:

```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database (will be provided by PostgreSQL plugin)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT Secrets
JWT_SECRET=s<fRe0Zr>Bn9c:U^WHwq25@4j7E<YIVl
JWT_EXPIRY=7d
REFRESH_TOKEN_SECRET=yY;bCG^VqesuJE_NSkxw`64Q71WPK]f?

# Google OAuth
GOOGLE_CLIENT_ID=70376960035-09cj8bj1lcenp6rm1pmqi6v1m498qu8q.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# Firebase
FIREBASE_PROJECT_ID=visago-a86de
FIREBASE_STORAGE_BUCKET=visago-a86de.appspot.com
FIREBASE_PRIVATE_KEY_ID=3d6fa2d6c6ad05986e8d528a77908d6c834a9a3b
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@visago-a86de.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=109747648725594812022

# OpenAI
OPENAI_API_KEY=***REDACTED_OPENAI_API_KEY***
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# Email Service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=***REDACTED_SENDGRID_API_KEY***
SMTP_FROM_EMAIL=visago@bitway.com
SMTP_FROM_NAME=VisaBuddy Support
SMTP_REPLY_TO=support@bitway.com

# Redis (will be provided by Redis plugin)
REDIS_URL=${{Redis.DATABASE_URL}}
UPSTASH_REDIS_REST_URL=${{Redis.DATABASE_URL}}
UPSTASH_REDIS_REST_TOKEN=${{Redis.DATABASE_PUBLIC_KEY}}

# CORS
CORS_ORIGIN=https://yourdomain.com

# Storage
STORAGE_TYPE=firebase
SERVER_URL=https://yourdomain.com

# Features
ENABLE_AI_CHAT=true
ENABLE_PAYMENTS=true
ENABLE_ADMIN_PANEL=true
```

### 2c. Start Deploy
Click **"Deploy"** - Railway will build and deploy your backend

---

## 🤖 Step 3: Set Up AI Service

### 3a. Add AI Service
1. Click **"New Service"** → **"GitHub Repo"**
2. Select your repo: **M-owl-8/VisaGo**
3. Configure:
   - **Name**: `ai-service`
   - **Root Directory**: `apps/ai-service`
   - **Dockerfile Path**: `./Dockerfile`
   - **Port**: `8001`

### 3b. Set Environment Variables

Click **AI Service** → **Variables** and add:

```
PORT=8001
NODE_ENV=production
PYTHONUNBUFFERED=1

# OpenAI
OPENAI_API_KEY=***REDACTED_OPENAI_API_KEY***
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=500

# Pinecone
PINECONE_API_KEY=pcsk_your_pinecone_key_here
PINECONE_INDEX_NAME=visabuddy-visa-kb
PINECONE_ENVIRONMENT=gcp-starter

# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis
REDIS_URL=${{Redis.DATABASE_URL}}

# CORS
CORS_ORIGINS=https://yourdomain.com

# Logging
LOG_LEVEL=INFO

# Features
RAG_ENABLED=true
STORE_CONVERSATIONS=true
USE_LOCAL_EMBEDDINGS_FALLBACK=true

# Security
API_SECRET_KEY=your_secret_key_here
```

### 3c. Start Deploy
Click **"Deploy"** - Railway will build and deploy your AI service

---

## 🗄️ Step 4: Add PostgreSQL Database

### 4a. Add PostgreSQL Plugin
1. In Railway Dashboard → Click **"Add"**
2. Select **"Postgres"** from the plugins
3. Railway will automatically create a PostgreSQL instance

### 4b. Connect to Backend & AI Service
1. Click **Postgres** service
2. Click **"Generate Domain"** if not already done
3. Your connection string: `${{Postgres.DATABASE_URL}}`
4. This automatically connects to **Backend** and **AI Service**

---

## 🔴 Step 5: Add Redis Cache

### 5a. Add Redis Plugin
1. In Railway Dashboard → Click **"Add"**
2. Select **"Redis"** from the plugins
3. Railway will automatically create a Redis instance

### 5b. Connect to Services
1. Click **Redis** service
2. Redis connection string: `${{Redis.DATABASE_URL}}`
3. This automatically connects to **Backend** and **AI Service**

---

## 🔗 Step 6: Connect Services

### 6a. Link Services Together
In Railway Dashboard:
1. Click on **Backend** service
2. Go to **"Variables"**
3. Add **AI_SERVICE_URL** = `https://ai-service.railway.app` (get actual URL from AI Service deployment)

### 6b. Update Frontend Config
In your mobile app configuration, update:
```typescript
// Frontend API URL
export const API_URL = "https://backend.railway.app"
export const AI_SERVICE_URL = "https://ai-service.railway.app"
```

---

## 📊 Step 7: Monitor & Verify

### 7a. Check Logs
1. Click **Backend** → **"Logs"** - verify no errors
2. Click **AI Service** → **"Logs"** - verify no errors

### 7b. Test Endpoints
```bash
# Test Backend
curl https://backend.railway.app/health

# Test AI Service  
curl https://ai-service.railway.app/health
```

### 7c. Check Database
```bash
# Connect to Postgres
psql ${{Postgres.DATABASE_URL}}

# Verify tables exist
\dt
```

---

## 🔐 Step 8: Custom Domain (Optional)

### 8a. Add Custom Domain
1. Click **Backend** service
2. Go to **"Settings"** → **"Domain"**
3. Add your custom domain: `api.yourdomain.com`
4. Update DNS records at your domain provider

---

## 📝 Important Notes

### Environment Variables Priority
- Railway **plugin variables** (like `${{Postgres.DATABASE_URL}}`) are auto-injected
- You can override them with manual values if needed
- Secrets are encrypted in Railway vault

### Database Migrations
After first deploy, you may need to run:
```bash
# In Backend service logs/CLI
npm run db:migrate
npm run db:seed
```

### API Rate Limits
- Backend: 100 requests/minute
- AI Service: 20 requests/hour (per user)

### Storage
- Firebase is used for file uploads (configured in .env)
- Local uploads go to `/uploads` folder (ephemeral in Railway)

---

## 🆘 Troubleshooting

### Backend failing to start
- Check logs: `Railway Dashboard → Backend → Logs`
- Verify DATABASE_URL is set correctly
- Check Node version: should be 20+

### AI Service not responding
- Check logs: `Railway Dashboard → AI Service → Logs`
- Verify OPENAI_API_KEY is valid
- Check Python version: should be 3.11+

### Database connection errors
- Click Postgres → Verify "Generate Domain" is enabled
- Check Backend variables: DATABASE_URL should be set
- Test connection: `psql ${{Postgres.DATABASE_URL}}`

### Redis connection errors
- Click Redis → Verify service is running
- Check Backend variables: REDIS_URL should be set
- Verify Redis CLI works: `redis-cli -u ${{Redis.DATABASE_URL}}`

---

## 🚀 Deployment Checklist

- [ ] GitHub repo connected
- [ ] Backend service created and deployed
- [ ] AI Service created and deployed
- [ ] PostgreSQL database added
- [ ] Redis cache added
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Logs show no errors
- [ ] Health endpoints responding
- [ ] Frontend updated with API URLs

---

## 📚 Resources

- Railway Docs: https://docs.railway.app
- Railway Deployment: https://railway.app/deploy
- Railway CLI: https://docs.railway.app/cli/quick-start
- Support: https://railway.app/support

---

**Happy Deploying! 🎉**