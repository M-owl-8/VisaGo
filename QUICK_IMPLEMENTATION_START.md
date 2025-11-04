# VisaBuddy Quick Implementation Start Guide

**Use this guide to begin implementation TODAY**

---

## ⚡ IMMEDIATE ACTIONS (Next 2 Hours)

### 1. Clone & Setup
```bash
cd c:\work\VisaBuddy

# Install all dependencies
npm install
npm install -w apps/backend
npm install -w apps/frontend

# Install AI service dependencies
cd apps/ai-service
pip install -r requirements.txt
cd ../..
```

### 2. Fix Critical Security Issues
```bash
# Remove exposed .env from git history
git rm --cached apps/backend/.env
git rm --cached apps/backend/.env.production
git rm --cached apps/frontend/.env

# Update .gitignore
echo ".env" >> .gitignore
echo ".env.*.local" >> .gitignore

git add .gitignore
git commit -m "Remove .env files and update gitignore"
```

### 3. Create Development Environment Files

**File: `apps/backend/.env.local`** (git-ignored)
```env
# Environment
NODE_ENV=development
PORT=3000

# Database (Use SQLite for local testing)
DATABASE_URL="file:./prisma/dev.db"

# JWT (Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_random_32_char_string_here_1234567890ab
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d

# CORS
CORS_ORIGIN=*

# Storage (Local for development)
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads

# Redis (Optional for local dev)
REDIS_URL=redis://localhost:6379

# Email (Use placeholder for now)
EMAIL_PROVIDER=smtp
SENDGRID_API_KEY=placeholder_for_now
EMAIL_FROM=noreply@visabuddy-dev.local

# Payment (Test keys)
PAYME_MERCHANT_ID=test_merchant
PAYME_SECRET_KEY=test_secret
CLICK_MERCHANT_ID=test_merchant
CLICK_SECRET_KEY=test_secret
STRIPE_SECRET_KEY=sk_test_placeholder

# OpenAI (Get from openai.com)
OPENAI_API_KEY=sk-YOUR_KEY_HERE
OPENAI_MODEL=gpt-4-mini

# Firebase (Placeholder - get from Firebase console)
FIREBASE_PROJECT_ID=test-project
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=test@test.iam.gserviceaccount.com

# Features
FEATURE_FLAG_AI_CHAT=true
FEATURE_FLAG_PAYMENT_INTEGRATION=true
FEATURE_FLAG_NOTIFICATIONS=true

# Logging
LOG_LEVEL=debug
```

**File: `apps/frontend/.env.local`** (git-ignored)
```env
# API Configuration
API_BASE_URL=http://localhost:3000
API_TIMEOUT=30000

# Google OAuth
GOOGLE_WEB_CLIENT_ID=placeholder_for_now
GOOGLE_ANDROID_CLIENT_ID=placeholder_for_now

# Firebase
FIREBASE_API_KEY=placeholder_for_now
FIREBASE_PROJECT_ID=placeholder_for_now

# Analytics
GOOGLE_ANALYTICS_ID=placeholder_for_now

# Feature Flags
FEATURE_AI_CHAT=true
FEATURE_PAYMENTS=true
FEATURE_NOTIFICATIONS=true
```

**File: `apps/ai-service/.env.local`** (git-ignored)
```env
# Environment
ENVIRONMENT=development
PORT=8001

# OpenAI (Get from openai.com)
OPENAI_API_KEY=sk-YOUR_KEY_HERE
OPENAI_MODEL=gpt-4-mini
OPENAI_MAX_TOKENS=1000

# CORS
CORS_ORIGINS=*

# Logging
LOG_LEVEL=debug
```

---

## 🗄️ DATABASE SETUP (10 minutes)

```bash
cd apps/backend

# Generate Prisma client
npm run db:generate

# Create/migrate database (SQLite for local)
npm run db:migrate

# Seed with sample data
npm run db:seed
```

**What gets created:**
- ✅ SQLite database (dev.db)
- ✅ 10 sample countries (USA, UK, Canada, etc.)
- ✅ 3 visa types per country
- ✅ 2 test users (user@test.com, admin@test.com)

---

## 🚀 START SERVICES (3 terminals)

### Terminal 1: Backend API
```bash
cd apps/backend
npm run dev

# Expected output:
# [INFO] Server running on http://localhost:3000
# [INFO] Database connected
```

### Terminal 2: Frontend App
```bash
cd apps/frontend
npm start

# Follow the prompts to:
# - Open Expo Dev Tools
# - Scan QR code or press 'a' for Android Emulator
```

### Terminal 3: AI Service
```bash
cd apps/ai-service
python -m uvicorn main:app --reload --port 8001

# Expected output:
# INFO:     Uvicorn running on http://127.0.0.1:8001
```

---

## ✅ VERIFICATION CHECKS (After starting services)

### Backend Health Check
```bash
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2024-11-03T...","environment":"development"}
```

### Frontend App
- [ ] Splash screen shows
- [ ] Can navigate to Login
- [ ] Can see country list (if API connected)

### AI Service Health Check
```bash
curl http://localhost:8001/docs

# Should show Swagger UI
```

---

## 🔧 ESSENTIAL FILES TO UPDATE (This Week)

### Priority 1: API Integration (Frontend)

**File: `apps/frontend/src/services/api.ts`**
```typescript
// Update the base URL configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Add all missing endpoints:
export const api = {
  auth: {
    register: (email, password, name) => POST('/api/auth/register', ...),
    login: (email, password) => POST('/api/auth/login', ...),
    refresh: () => POST('/api/auth/refresh', ...),
    logout: () => POST('/api/auth/logout', ...),
  },
  countries: {
    list: (page?, search?) => GET('/api/countries', ...),
    getById: (id) => GET(`/api/countries/${id}`, ...),
    getVisas: (id) => GET(`/api/countries/${id}/visas`, ...),
  },
  applications: {
    create: (data) => POST('/api/applications', ...),
    list: (page?, status?) => GET('/api/applications', ...),
    getById: (id) => GET(`/api/applications/${id}`, ...),
    update: (id, data) => PATCH(`/api/applications/${id}`, ...),
  },
  documents: {
    upload: (file, appId) => POST('/api/documents/upload', ...),
    getById: (id) => GET(`/api/documents/${id}`, ...),
    list: (appId) => GET(`/api/documents`, ...),
  },
  chat: {
    sendMessage: (sessionId, message, context) => POST('/api/chat/message', ...),
    getHistory: (sessionId) => GET(`/api/chat/sessions/${sessionId}/history`, ...),
  },
  payments: {
    create: (data) => POST('/api/payments/create', ...),
    getStatus: (id) => GET(`/api/payments/${id}`, ...),
  },
};
```

**File: `apps/frontend/src/screens/auth/LoginScreen.tsx`**
```typescript
// Replace hardcoded logic with API calls
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await api.auth.login(email, password);
    await AsyncStorage.setItem('accessToken', response.accessToken);
    await AsyncStorage.setItem('refreshToken', response.refreshToken);
    // Navigate to home
  } catch (error) {
    // Show error toast
  }
};
```

### Priority 2: Backend Endpoints

**File: `apps/backend/src/routes/auth.ts`**
- [ ] Complete POST /api/auth/refresh
- [ ] Complete POST /api/auth/logout
- [ ] Add POST /api/auth/google/callback

**File: `apps/backend/src/routes/countries.ts`**
- [ ] Complete GET /api/countries (with pagination, search)
- [ ] Complete GET /api/countries/:id/visas
- [ ] Add data seed

**File: `apps/backend/src/routes/documents.ts`**
- [ ] Complete POST /api/documents/upload (with Firebase)
- [ ] Complete GET /api/documents (list for app)

### Priority 3: AI Service

**File: `apps/ai-service/main.py`**
- [ ] Configure OpenAI API
- [ ] Populate visa_kb.json with 10+ countries
- [ ] Implement /ai/chat endpoint
- [ ] Test responses

---

## 🧪 FIRST TEST CASE (Do This in Hour 3)

### Test User Registration
```bash
# 1. Start backend service
# 2. Run this command:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Password123!",
    "firstName":"John",
    "lastName":"Doe"
  }'

# Expected response:
# {
#   "user": { "id": "...", "email": "test@example.com", ... },
#   "accessToken": "eyJ...",
#   "refreshToken": "eyJ..."
# }
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Password123!"
  }'

# Should return tokens
```

### Test Countries List
```bash
curl http://localhost:3000/api/countries

# Should return array of countries
```

---

## 📋 TODAY'S CHECKLIST

- [ ] Clone repository and install dependencies
- [ ] Fix security issues (remove .env from git)
- [ ] Create .env.local files for all 3 apps
- [ ] Run database migrations
- [ ] Start all 3 services
- [ ] Verify health checks
- [ ] Test user registration via curl
- [ ] Test user login via curl
- [ ] Test countries list via curl

**Time Required**: 2-3 hours  
**Success Metric**: All 3 services running + API endpoints responding

---

## 📞 IF YOU GET STUCK

### Database migration fails
```bash
# Reset database
cd apps/backend
npm run db:reset

# Then re-migrate
npm run db:migrate
npm run db:seed
```

### Port already in use
```bash
# Kill process using port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Or use different port
PORT=3001 npm run dev
```

### Node modules issues
```bash
# Clean and reinstall
rm -r node_modules apps/*/node_modules
npm install
npm install -w apps/backend
npm install -w apps/frontend
```

### Python dependencies issues
```bash
cd apps/ai-service
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 📚 NEXT STEPS (After verification)

1. **Week 1**: Complete auth + country selection
2. **Week 2**: Document upload + AI verification
3. **Week 3**: Payment integration
4. **Week 4**: Chat + notifications
5. **Week 5**: Admin + final testing
6. **Week 6**: Production deployment

See `SPECIFICATION_VS_IMPLEMENTATION_ACTION_PLAN.md` for detailed phase-by-phase plan.

---

**Happy coding! 🚀**