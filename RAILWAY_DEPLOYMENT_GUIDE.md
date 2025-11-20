# Railway Deployment Guide

This guide helps you deploy all VisaBuddy services to Railway.app and configure the mobile app to use the deployed backend.

## 🚀 Quick Start

### 1. Fix Backend Schema Selector Issue

The backend is currently failing because it's trying to use SQLite schema on Railway (which uses PostgreSQL). This has been fixed in `apps/backend/prisma/schema-selector.js` to properly detect Railway's PostgreSQL connection.

### 2. Deploy Services to Railway

Railway will automatically detect and deploy services based on `railway.json`:

1. **Backend Service** (`apps/backend`)
   - Port: 3000
   - Database: PostgreSQL (auto-provisioned)
   - Redis: Auto-provisioned

2. **AI Service** (`apps/ai-service`)
   - Port: 8001
   - Python/FastAPI service

### 3. Required Environment Variables

#### Backend Service

Set these in Railway dashboard for the backend service:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=<auto-provided by Railway PostgreSQL plugin>
REDIS_URL=<auto-provided by Railway Redis plugin>
JWT_SECRET=<generate a strong secret>
OPENAI_API_KEY=<your OpenAI API key>
AI_SERVICE_URL=http://ai-service:8001  # Internal service URL
BACKEND_URL=https://your-backend.railway.app  # Public backend URL
CORS_ORIGINS=https://your-frontend-domain.com,*
```

#### AI Service

Set these in Railway dashboard for the AI service:

```env
PORT=8001
PYTHONUNBUFFERED=1
OPENAI_API_KEY=<your OpenAI API key>
BACKEND_URL=https://your-backend.railway.app  # Backend public URL
CORS_ORIGINS=https://your-backend.railway.app,*
PINECONE_API_KEY=<optional - for RAG>
PINECONE_INDEX_NAME=visabuddy-visa-kb
PINECONE_ENVIRONMENT=us-east-1
```

### 4. Fix Seed Script Issue

The start script was trying to run `node prisma/seed.js` but the file is `seed.ts`. This has been fixed in `package.json` to use:

```json
"start": "node prisma/schema-selector.js && prisma generate && prisma db push --accept-data-loss --skip-generate && ts-node --project prisma/tsconfig.seed.json prisma/seed.ts && NODE_PATH=/app/node_modules:/app/apps/backend/node_modules node dist/index.js"
```

### 5. Configure Mobile App for Production

The mobile app needs to point to your Railway backend URL. Update `frontend_new/src/services/api.ts`:

**Option 1: Build with Environment Variable (Recommended)**

Before building the APK:

```powershell
# Set your Railway backend URL
$env:EXPO_PUBLIC_API_URL="https://your-backend.railway.app"
cd frontend_new
npm run build:apk
```

**Option 2: Hardcode in Code**

Edit `frontend_new/src/services/api.ts` and replace the default URL:

```typescript
// Default production Railway URL
return 'https://your-backend.railway.app';
```

### 6. Build Standalone APK

Once the backend URL is configured:

```powershell
cd frontend_new
npm run build:apk
```

The APK will be at: `frontend_new/android/app/build/outputs/apk/release/app-release.apk`

### 7. Install on Physical Device

**Via USB:**
```powershell
adb install frontend_new/android/app/build/outputs/apk/release/app-release.apk
```

**Via ADB over WiFi:**
```powershell
# Connect device via USB first
adb tcpip 5555
adb connect <your-device-ip>:5555
# Disconnect USB
adb install frontend_new/android/app/build/outputs/apk/release/app-release.apk
```

## 🔧 Troubleshooting

### Backend Crashes with Schema Error

**Error**: `error: Error validating datasource 'db': the URL must start with the protocol 'file:'`

**Solution**: The schema selector should now properly detect Railway's PostgreSQL. If it still fails:

1. Check Railway logs to see what `DATABASE_URL` format is being used
2. The schema selector checks for:
   - `postgres://` or `postgresql://` prefix
   - Contains `postgres`, `railway`, `gondola.proxy.rlwy.net`, or `rlwy.net`
   - Not starting with `file:` and not ending with `.db`

### Seed Script Fails

**Error**: `npm error command failed: node prisma/seed.js`

**Solution**: The start script has been updated to use `ts-node` to run `seed.ts` instead of trying to run non-existent `seed.js`.

### Mobile App Can't Connect to Backend

**Symptoms**: App shows network errors or can't load data

**Solutions**:
1. Verify Railway backend is running and accessible
2. Check CORS settings - add your device's network to `CORS_ORIGINS`
3. Verify the API URL in the APK matches your Railway backend URL
4. Check Railway logs for incoming requests

### AI Service Not Responding

**Symptoms**: Chat/checklist/probability endpoints return errors

**Solutions**:
1. Verify `AI_SERVICE_URL` in backend environment variables
2. Check AI service logs in Railway
3. Verify `OPENAI_API_KEY` is set in AI service
4. Check that `BACKEND_URL` in AI service matches backend's public URL

## 📋 Railway Service URLs

After deployment, Railway will provide URLs like:
- Backend: `https://visabuddy-backend-production.up.railway.app`
- AI Service: `https://visabuddy-ai-service-production.up.railway.app`

Update these in:
1. Backend `AI_SERVICE_URL` (use internal service name for internal calls)
2. AI Service `BACKEND_URL` (use public backend URL)
3. Mobile app `EXPO_PUBLIC_API_URL` (use public backend URL)

## ✅ Verification Checklist

- [ ] Backend service deployed and running
- [ ] AI service deployed and running
- [ ] PostgreSQL database connected
- [ ] Redis connected
- [ ] Environment variables set correctly
- [ ] Backend can reach AI service
- [ ] Mobile app APK built with correct backend URL
- [ ] APK installed on physical device
- [ ] App can connect to Railway backend
- [ ] All features work (login, questionnaire, chat, etc.)

## 🎯 Next Steps

1. Deploy to Railway
2. Get service URLs
3. Update environment variables
4. Rebuild mobile app with production URL
5. Test on physical device
6. Monitor Railway logs for any issues

