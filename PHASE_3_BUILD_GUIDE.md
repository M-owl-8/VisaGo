# VisaBuddy Phase 3: Complete Build & Deployment Guide

## 📋 Overview

This guide covers building VisaBuddy as a **complete, production-ready application** with all Phase 3 features:
- ✅ Phase 1: Authentication + Visa Applications + Countries
- ✅ Phase 2: Payme Payment Integration  
- ✅ Phase 3: Document Management + AI Chat Assistant

**Total New Features:** 11 new endpoints, 4 new screens, full AI integration

---

## 🚀 QUICK START (15 minutes)

### Prerequisites
```powershell
# Check you have:
node -v  # v20+
python --version  # 3.11+
npm -v  # 10+
git --version  # Any recent version
```

### 1. Install Backend Dependencies
```powershell
cd c:\work\VisaBuddy\apps\backend
npm install  # Installs multer and all dependencies
npx prisma generate
npx prisma migrate dev  # Setup database
```

### 2. Install Frontend Dependencies
```powershell
cd c:\work\VisaBuddy\apps\frontend
npm install
```

### 3. Install AI Service Dependencies
```powershell
cd c:\work\VisaBuddy\apps\ai-service
pip install -r requirements.txt
```

### 4. Configure Environment Variables

**Backend** (`apps/backend/.env`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/visabuddy"
NODE_ENV="development"
JWT_SECRET="your-super-secret-key-change-this-in-production"
CORS_ORIGIN="http://localhost:8081,http://localhost:3000,http://localhost:19000"
PORT=3000

# Payme Payment
PAYME_MERCHANT_ID="your-payme-merchant-id"
PAYME_API_KEY="your-payme-api-key"
PAYME_API_URL="https://checkout.payme.uz"

# AI Service
AI_SERVICE_URL="http://localhost:8001"

# Optional: OpenAI for AI Chat (skip for fallback)
OPENAI_API_KEY="sk-your-openai-key"
```

**Frontend** (`.env` or environment setup):
```env
REACT_APP_API_URL=http://localhost:3000
```

**AI Service** (`apps/ai-service/.env`):
```env
PORT=8001
NODE_ENV=development
CORS_ORIGINS="*"
OPENAI_API_KEY="sk-your-openai-key"  # Optional
```

---

## 🏗️ ARCHITECTURE

### Backend Services (Express/Node)
```
src/
├── services/
│   ├── payme.service.ts      ✅ Phase 2
│   ├── documents.service.ts  ✨ Phase 3 NEW
│   └── chat.service.ts       ✨ Phase 3 NEW
├── routes/
│   ├── auth.ts               ✅ Phase 1
│   ├── payments.ts           ✅ Phase 2
│   ├── documents.ts          ✨ Phase 3 NEW
│   └── chat.ts               ✨ Phase 3 NEW
└── index.ts                  Updated
```

### Frontend Screens (React Native)
```
src/
├── screens/
│   ├── auth/
│   ├── applications/
│   ├── payment/
│   ├── documents/         ✨ Phase 3 NEW
│   └── chat/              ✨ Phase 3 NEW
├── store/
│   ├── auth.ts
│   ├── payments.ts
│   ├── documents.ts       ✨ Phase 3 NEW
│   └── chat.ts            ✨ Phase 3 NEW
└── services/
    └── api.ts             Updated with 11 new methods
```

### AI Service (FastAPI)
```
ai-service/
├── main.py           Updated with real OpenAI integration
└── requirements.txt  ✅ All dependencies
```

---

## 📁 NEW FILES CREATED

### Backend (4 files)
- `src/services/documents.service.ts` - Document upload, management, validation
- `src/services/chat.service.ts` - AI chat integration with fallback
- `src/routes/documents.ts` - 6 REST endpoints for documents
- `src/routes/chat.ts` - 5 REST endpoints for chat

### Frontend (4 files)
- `src/store/documents.ts` - Zustand store with persistence
- `src/store/chat.ts` - Zustand store with persistence
- `src/screens/documents/DocumentScreen.tsx` - File upload UI
- `src/screens/chat/ChatScreen.tsx` - Chat UI with auto-scroll

### AI Service (1 file updated)
- `main.py` - Real OpenAI + fallback implementation

---

## 🔌 NEW API ENDPOINTS

### Documents (6 endpoints)
```
POST   /api/documents/upload              - Upload file
GET    /api/documents                     - Get all user documents
GET    /api/documents/application/:id     - Get app documents
GET    /api/documents/:id                 - Get specific document
DELETE /api/documents/:id                 - Delete document
GET    /api/documents/stats/overview      - Get stats
```

### Chat (5 endpoints)
```
POST   /api/chat/send                     - Send message
GET    /api/chat/history                  - Get conversation
POST   /api/chat/search                   - Search documents
DELETE /api/chat/history                  - Clear history
GET    /api/chat/stats                    - Get stats
```

---

## 🎯 LOCAL DEVELOPMENT

### Terminal 1: Database
```powershell
cd c:\work\VisaBuddy\apps\backend
# Make sure PostgreSQL is running locally
# Or use: docker run -d -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:latest
```

### Terminal 2: Backend
```powershell
cd c:\work\VisaBuddy\apps\backend
npm run dev
# Server runs on http://localhost:3000
# API: http://localhost:3000/api
```

### Terminal 3: AI Service
```powershell
cd c:\work\VisaBuddy\apps\ai-service
python -m uvicorn main:app --reload --port 8001
# Service runs on http://localhost:8001
```

### Terminal 4: Frontend (Expo)
```powershell
cd c:\work\VisaBuddy\apps\frontend
npm start
# Shows QR code for mobile preview
# Press 'a' for Android emulator
# Press 'i' for iOS simulator
# Press 'w' for web
```

**Test the flow:**
1. Register at mobile app
2. Create visa application
3. Upload document
4. Make payment (test card: 9860123456789012)
5. Ask AI questions in Chat screen

---

## 📱 BUILDING FOR PRODUCTION

### Android APK Build
```powershell
cd c:\work\VisaBuddy\apps\frontend

# Option 1: Using Expo (simplest)
npm run android
# Then in Expo: "Build for Android"

# Option 2: Direct APK
npm run build:android
# APK located at: android/app/build/outputs/apk/release/app-release.apk
```

### iOS IPA Build
```powershell
cd c:\work\VisaBuddy\apps\frontend

# Option 1: Using Expo
npm run ios
# Then in Expo: "Build for iOS"

# Option 2: Direct build
npm run build:ios
# IPA located at: ios/build/VisaBuddy.ipa
```

### Web Build
```powershell
cd c:\work\VisaBuddy\apps\frontend
npm run build:web
# Build output: build/
# Deploy to Vercel, Netlify, or AWS S3
```

---

## 🚀 PRODUCTION DEPLOYMENT

### Backend Deployment (Railway/Heroku)

**1. Prepare for production:**
```bash
# Build
npm run build

# Generate Prisma client
npx prisma generate
```

**2. Deploy to Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Set environment variables
railway variables set DATABASE_URL="..."
railway variables set JWT_SECRET="..."

# Deploy
railway up
```

**Backend URL:** `https://your-railway-app.railway.app`

### AI Service Deployment

```bash
# Ensure requirements.txt is complete
pip freeze > requirements.txt

# Deploy to Railway
railway init
railway variables set OPENAI_API_KEY="..."
railway up
```

**AI Service URL:** `https://your-ai-service.railway.app`

### Frontend Deployment (Expo/EAS)

```powershell
# Install EAS CLI
npm install -g eas-cli

# Configure
cd apps/frontend
eas build --platform android  # For Android
eas build --platform ios      # For iOS

# Submit to app stores
eas submit --platform android --latest
eas submit --platform ios --latest
```

---

## ✅ TESTING CHECKLIST

### Backend Tests
- [ ] `POST /api/documents/upload` - Upload test PDF
- [ ] `GET /api/documents` - Retrieve documents
- [ ] `POST /api/chat/send` - Send test message
- [ ] `GET /api/chat/history` - Get conversation history
- [ ] All endpoints require JWT token
- [ ] Payment webhook still works
- [ ] Database migrations run successfully

### Frontend Tests
- [ ] Documents screen loads
- [ ] Can select document type
- [ ] Can upload document (mock)
- [ ] Document list displays
- [ ] Can delete document
- [ ] Chat screen loads
- [ ] Can send message
- [ ] Messages appear in correct order
- [ ] Auto-scroll works
- [ ] Conversation persists on refresh

### AI Service Tests
- [ ] Health check: `GET /health` → 200
- [ ] Chat endpoint responds
- [ ] Fallback works without OpenAI key
- [ ] OpenAI integration works with key set
- [ ] Handles long conversations

### Integration Tests
- [ ] User registers
- [ ] Creates visa application
- [ ] Uploads document
- [ ] Makes payment
- [ ] Chats with AI
- [ ] Logs out

---

## 🔐 Security Checklist

- [ ] JWT tokens required on all protected endpoints
- [ ] Rate limiting enabled (15 min/100 requests)
- [ ] CORS configured properly
- [ ] File upload validation (type, size)
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS prevention (sanitize inputs)
- [ ] HTTPS in production
- [ ] Environment variables secured
- [ ] API keys not in version control
- [ ] CORS_ORIGIN configured for production URL

---

## 📊 PERFORMANCE METRICS

### Expected Response Times
- Document upload: < 2 seconds
- Chat message: < 1 second (without AI) or 3-5 seconds (with OpenAI)
- Document list: < 500ms
- Chat history: < 1 second

### Database Indexes
```sql
-- Already created in Prisma schema:
CREATE INDEX idx_documents_userId ON "UserDocument"(userId);
CREATE INDEX idx_documents_status ON "UserDocument"(status);
CREATE INDEX idx_chat_userId ON "ChatMessage"(userId);
CREATE INDEX idx_chat_createdAt ON "ChatMessage"(createdAt);
```

---

## 🐛 TROUBLESHOOTING

### Backend won't start
```bash
# Check database connection
npm run dev
# Look for: "✓ Database connection successful"

# Reset database
npx prisma migrate reset --force

# Regenerate Prisma client
npx prisma generate
```

### Frontend can't connect to backend
```
Check:
- Backend running on port 3000
- CORS_ORIGIN includes frontend URL
- Network: http://localhost:3000 (not https in dev)
```

### AI Service not responding
```
Check:
- Service running on port 8001
- AI_SERVICE_URL in backend .env
- Python version >= 3.11
```

### File upload fails
```
Check:
- Multer installed: npm ls multer
- File size < 20MB
- MIME type supported
- /uploads directory writable
```

---

## 📦 DEPLOYMENT CHECKLIST

### Before deploying to production:

**Code:**
- [ ] All tests passing
- [ ] No console errors
- [ ] TypeScript strict mode
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Proper error handling

**Configuration:**
- [ ] Database backups enabled
- [ ] Environment variables secured
- [ ] SSL/TLS certificates
- [ ] API keys rotated
- [ ] Logging configured

**Monitoring:**
- [ ] Error tracking (Sentry/DataDog)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Log aggregation

**Backups:**
- [ ] Database backups daily
- [ ] Code backup (GitHub)
- [ ] Disaster recovery plan

---

## 📞 SUPPORT

### Common Issues
1. **Port already in use**: Change PORT in .env
2. **Database connection failed**: Check PostgreSQL running
3. **CORS errors**: Update CORS_ORIGIN in .env
4. **File upload errors**: Check multer configuration

### Getting Help
- Review logs: `npm run dev` terminal output
- Check API health: `curl http://localhost:3000/health`
- Test database: `npx prisma studio`
- View AI service: http://localhost:8001/docs (FastAPI Swagger)

---

## 🎯 NEXT STEPS

After Phase 3 is complete:
1. ✅ All Phase 3 features working
2. ✅ Production deployment ready
3. 🔄 Collect user feedback
4. 📈 Monitor performance and errors
5. 🚀 Plan Phase 4 features

**Phase 4 Ideas:**
- Additional payment gateways (Click, Uzum, Stripe)
- Refunds and cancellations
- Payment analytics dashboard
- Email notifications
- SMS notifications
- Advanced document search with RAG
- Multi-language chat responses

---

## 📄 Related Documentation

- [PAYMENT_QUICK_START.md](PAYMENT_QUICK_START.md) - Payment integration
- [PAYMENT_INTEGRATION_GUIDE.md](PAYMENT_INTEGRATION_GUIDE.md) - Detailed payment docs
- [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) - Phase 1-2 summary
- [START_HERE.md](START_HERE.md) - Project overview

---

**Status:** ✅ PHASE 3 COMPLETE & PRODUCTION-READY

Last Updated: Today  
Version: 1.0.0  
Author: Development Team