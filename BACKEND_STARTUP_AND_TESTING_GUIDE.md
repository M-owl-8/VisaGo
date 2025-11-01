# 🚀 Backend Startup & Testing Guide

**Project**: VisaBuddy Backend API  
**Framework**: Node.js + Express + TypeScript  
**Database**: PostgreSQL (Supabase)  
**Status**: ✅ **READY TO RUN**

---

## 📋 Prerequisites

### Required
- ✅ Node.js 18+ (check: `node --version`)
- ✅ npm 9+ (check: `npm --version`)
- ✅ PostgreSQL or Supabase account

### Environment Variables Needed
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/database
OPENAI_API_KEY=sk-proj-xxx
FIREBASE_PROJECT_ID=your-project
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000,http://localhost:8081
```

---

## 🚀 Quick Start (3 steps)

### Step 1: Navigate to Backend
```powershell
cd c:\work\VisaBuddy\apps\backend
```

### Step 2: Install Dependencies
```powershell
npm install --legacy-peer-deps
```

### Step 3: Start Development Server
```powershell
npm run dev
```

**Expected Output**:
```
[timestamp] Server running on port 3000
✅ Database connected
✅ Cache service initialized
✅ AI service ready
```

---

## 🔧 Full Setup Process

### Step 1: Navigate to Project
```powershell
cd c:\work\VisaBuddy\apps\backend
```

### Step 2: Create Environment File
Create `.env` file:
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/visabuddy
OPENAI_API_KEY=sk-proj-your-key-here
FIREBASE_PROJECT_ID=visabuddy-xxx
FIREBASE_STORAGE_BUCKET=visabuddy-xxx.appspot.com
FIREBASE_PRIVATE_KEY='{"type":"service_account",...}'
JWT_SECRET=your-jwt-secret-key-min-32-chars
CORS_ORIGIN=http://localhost:3000,http://localhost:8081
LOG_LEVEL=debug
```

### Step 3: Setup Database

**Option A: Using Supabase** (Recommended)
```powershell
# 1. Create account at https://supabase.com
# 2. Create new project
# 3. Copy DATABASE_URL from settings
# 4. Paste into .env file

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

**Option B: Using Local PostgreSQL**
```powershell
# Install PostgreSQL locally
# Create database:
# psql -U postgres
# CREATE DATABASE visabuddy;

# Set DATABASE_URL in .env
# Then run migrations
npm run db:generate
npm run db:migrate
npm run db:seed
```

### Step 4: Install Dependencies
```powershell
npm install --legacy-peer-deps
```

### Step 5: Start Server
```powershell
npm run dev
```

---

## 🧪 Testing the Backend

### Health Check
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### List Countries
```bash
curl http://localhost:3000/api/countries
# Expected: Array of countries with visa info
```

### Authentication Flow

**1. Register New User**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
# Response: {"id":"...", "token":"..."}
```

**2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
# Response: {"token":"...", "user":{...}}
```

**3. Get Current User**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
# Response: {"id":"...", "email":"...", ...}
```

### Create Visa Application
```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "countryId": 1,
    "visaTypeId": 1,
    "status": "draft"
  }'
# Response: {"id":"...", "status":"draft", ...}
```

### Upload Document
```bash
# Prepare multipart form
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "type=passport"
# Response: {"id":"...", "url":"...", "size":...}
```

### Chat with AI
```bash
# 1. Create chat session
curl -X POST http://localhost:3000/api/chat-rag/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Visa Question"}'
# Response: {"sessionId":"..."}

# 2. Send message
curl -X POST http://localhost:3000/api/chat-rag/SESSION_ID/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"What documents do I need for a US visa?"}'
# Response: {"message":"...", "response":"..."}
```

---

## 📊 Performance Testing

### Load Testing with Apache Bench
```powershell
# Install Apache Bench (if not installed)
# Download: https://www.apachelounge.com/download/

# Test endpoint with 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:3000/api/health

# Results show:
# - Requests per second
# - Response time (min, mean, max)
# - Connection success rate
```

### Load Testing with k6
```powershell
# Install k6
npm install -g k6

# Create load test (load-test.js):
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

export default function() {
  let res = http.get('http://localhost:3000/api/countries');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}

# Run test
k6 run load-test.js
```

---

## 🔍 Debugging

### Enable Debug Logging
```bash
# Set in .env
LOG_LEVEL=debug

# Or start with debug flag
DEBUG=* npm run dev
```

### View Prisma Studio
```powershell
# Interactive database viewer
npm run db:studio

# Opens browser at http://localhost:5555
# View and edit database records
```

### Check Database Connection
```bash
# Using psql (if PostgreSQL installed locally)
psql DATABASE_URL

# Or test via API
curl http://localhost:3000/api/health
```

### Common Errors

**Error: "ECONNREFUSED"**
```
Cause: Database not running
Solution:
1. Check DATABASE_URL in .env
2. Verify database is running
3. Test connection: psql $DATABASE_URL
```

**Error: "Too many connections"**
```
Cause: Connection pool exhausted
Solution:
1. Increase pool size in db-pool.service.ts
2. Restart server
3. Check for connection leaks
```

**Error: "OPENAI_API_KEY not set"**
```
Cause: Environment variable missing
Solution:
1. Create .env file
2. Add OPENAI_API_KEY
3. Restart server
```

---

## 📁 Backend Structure

```
backend/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config/               # Configuration
│   │   └── database.ts       # Database setup
│   ├── services/             # Business logic
│   │   ├── db-pool.service.ts
│   │   ├── cache.service.ts
│   │   ├── ai-openai.service.ts
│   │   ├── firebase-storage.service.ts
│   │   └── local-storage.service.ts
│   ├── routers/              # API routes
│   │   ├── auth.ts
│   │   ├── countries.ts
│   │   ├── applications.ts
│   │   ├── documents.ts
│   │   ├── payments.ts
│   │   └── chat-rag.ts
│   ├── middleware/           # Express middleware
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── utils/                # Helper functions
│   └── types/                # TypeScript types
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Seed script
├── .env                      # Environment variables
├── package.json
└── tsconfig.json
```

---

## 🛠️ Useful Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build TypeScript |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run migrations |
| `npm run db:reset` | Reset database |
| `npm run db:seed` | Seed initial data |
| `npm run db:studio` | Open database UI |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run tests |

---

## 📦 Database Models

```sql
-- Users
CREATE TABLE User (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  role ENUM('user', 'admin', 'staff'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Countries & Visa Info
CREATE TABLE Country (
  id UUID PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  code VARCHAR(2) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE VisaType (
  id UUID PRIMARY KEY,
  country_id UUID REFERENCES Country(id),
  name VARCHAR NOT NULL,
  description TEXT,
  processing_days INT,
  fee DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Applications & Tracking
CREATE TABLE VisaApplication (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES User(id),
  country_id UUID REFERENCES Country(id),
  visa_type_id UUID REFERENCES VisaType(id),
  status VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- And 10+ more tables for documents, payments, chat, etc.
```

---

## 🔐 Security Checklist

- ✅ JWT tokens for auth
- ✅ Password hashing with bcryptjs
- ✅ Rate limiting (100 req/user/15min)
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ SQL injection prevention (Prisma ORM)
- ✅ Input validation with Zod
- ✅ Activity logging
- ✅ Admin audit trail
- ✅ SSL/TLS in production

---

## 🚀 Deployment

### Environment Variables for Production
```bash
NODE_ENV=production
PORT=80 (or 443 for HTTPS)
DATABASE_URL=your-production-db
OPENAI_API_KEY=production-key
FIREBASE_PRIVATE_KEY=production-json
JWT_SECRET=very-long-secure-random-string
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=warn
```

### Deploy to Railway
```powershell
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Deploy
railway up
```

### Deploy to Heroku
```powershell
# 1. Install Heroku CLI
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# 2. Login
heroku login

# 3. Create app
heroku create your-app-name

# 4. Add database
heroku addons:create heroku-postgresql:hobby-dev

# 5. Deploy
git push heroku main
```

---

## 📊 Expected Output When Running

```
$ npm run dev

> visabuddy-backend@1.0.0 dev
> ts-node -r tsconfig-paths/register src/index.ts

[2024-01-15T10:30:45.123Z] Server running on port 3000
[2024-01-15T10:30:45.456Z] ✅ Database connected
[2024-01-15T10:30:45.789Z] ✅ Cache service initialized
[2024-01-15T10:30:46.012Z] ✅ OpenAI service ready
[2024-01-15T10:30:46.234Z] ✅ Storage service configured
[2024-01-15T10:30:46.456Z] ✅ All services initialized

Ready to accept requests!
```

---

## ✅ Verification Checklist

After starting server, verify:

- [ ] Server started on port 3000
- [ ] Database connected successfully
- [ ] No error messages in console
- [ ] Health check returns 200
- [ ] Can create user account
- [ ] Can login and get token
- [ ] Can fetch countries list
- [ ] Chat endpoints accessible
- [ ] Document upload works
- [ ] Rate limiting active

---

## 🎯 Next Steps

1. **Start Backend**
   ```powershell
   cd c:\work\VisaBuddy\apps\backend
   npm run dev
   ```

2. **Test Endpoints**
   - Use Postman, Insomnia, or curl
   - Import API collection
   - Run test suite

3. **Setup Frontend Connection**
   - Update API_URL in frontend config
   - Test mobile app connection
   - Verify authentication flow

4. **Build Mobile APK**
   - Use EAS Build (recommended)
   - Test on emulator/device
   - Submit to Play Store

---

## 🆘 Support

- **Issues?** Check error logs
- **Database problems?** Check `npm run db:studio`
- **API not responding?** Verify port 3000 is free
- **Environment variables?** Check `.env` file
- **Need help?** Check documentation in `c:\work\VisaBuddy\`

---

**Ready to launch!** 🚀

Your backend is production-ready. Next step: Build and test the mobile app with EAS Build.