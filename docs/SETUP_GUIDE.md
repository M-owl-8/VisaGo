# VisaBuddy - Complete Setup Guide

This guide will walk you through setting up the VisaBuddy application from scratch, including all required services and configurations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Service Configuration](#service-configuration)
5. [Database Setup](#database-setup)
6. [Environment Variables](#environment-variables)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js** >= 20.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 14.0
- **Python** >= 3.10 (for AI service)
- **Git**

### Optional but Recommended

- **Redis** >= 6.0 (for distributed rate limiting and caching)
- **Docker** & **Docker Compose** (for containerized deployment)

### System Requirements

- **RAM**: Minimum 4GB, Recommended 8GB+
- **Disk Space**: Minimum 5GB free
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd VisaBuddy
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all service dependencies
npm run install-all
```

### 3. Set Up Environment Variables

**For Linux/macOS:**
```bash
./scripts/setup-env.sh
```

**For Windows:**
```powershell
.\scripts\setup-env.ps1
```

This script will:
- Generate `.env.example` files for each service
- Prompt you to create `.env` files
- Generate secure secrets (JWT_SECRET, etc.)

### 4. Set Up Database

```bash
cd apps/backend

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed database with initial data
npm run db:seed
```

### 5. Start Services

**Option A: Using Docker Compose (Recommended)**
```bash
# From project root
docker-compose up -d
```

**Option B: Manual Start**
```bash
# Terminal 1: Backend
cd apps/backend
npm run dev

# Terminal 2: AI Service
cd apps/ai-service
python -m uvicorn main:app --reload --port 8001

# Terminal 3: Frontend (if developing)
cd apps/frontend
npm run dev
```

### 6. Verify Installation

```bash
# Run verification script
./scripts/verify-setup.sh  # Linux/macOS
.\scripts\verify-setup.ps1  # Windows
```

---

## Detailed Setup

### Step 1: Install Prerequisites

#### Node.js Installation

**Windows/macOS:**
- Download from [nodejs.org](https://nodejs.org/)
- Run the installer

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### PostgreSQL Installation

**Windows:**
- Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- Run the installer
- Remember the postgres user password

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Python Installation

**Windows/macOS:**
- Download from [python.org](https://www.python.org/downloads/)

**Linux:**
```bash
sudo apt-get install python3 python3-pip
```

#### Redis Installation (Optional but Recommended)

**Windows:**
- Download from [redis.io](https://redis.io/download)
- Or use WSL2

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

---

### Step 2: Database Configuration

#### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE visabuddy;

# Create user (optional, for production)
CREATE USER visabuddy_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE visabuddy TO visabuddy_user;

# Exit psql
\q
```

#### Update Database URL

In `apps/backend/.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/visabuddy"
# Or with custom user:
DATABASE_URL="postgresql://visabuddy_user:your_secure_password@localhost:5432/visabuddy"
```

---

### Step 3: Environment Variables Setup

#### Backend Environment Variables

Create `apps/backend/.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3000,http://localhost:19006

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/visabuddy

# JWT Authentication
JWT_SECRET=your_generated_secret_here_min_32_chars
JWT_EXPIRES_IN=7d

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Storage Configuration
STORAGE_TYPE=local  # or 'firebase'
LOCAL_STORAGE_PATH=./uploads

# Firebase (Optional - if using Firebase Storage)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI API (Required for AI chat)
OPENAI_API_KEY=sk-your-openai-api-key

# Email Service (Optional)
EMAIL_SERVICE=console  # or 'smtp', 'sendgrid', 'ses'
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment Gateways (Optional)
PAYME_MERCHANT_ID=your-payme-merchant-id
PAYME_API_KEY=your-payme-api-key
CLICK_MERCHANT_ID=your-click-merchant-id
CLICK_SERVICE_ID=your-click-service-id
CLICK_API_KEY=your-click-api-key
STRIPE_API_KEY=sk_test_your-stripe-key
```

**Generate Secure Secrets:**
```bash
# Linux/macOS
./scripts/generate-secrets.sh

# Windows
.\scripts\generate-secrets.ps1
```

#### Frontend Environment Variables

Create `apps/frontend/.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
```

#### AI Service Environment Variables

Create `apps/ai-service/.env`:

```env
OPENAI_API_KEY=sk-your-openai-api-key
DATABASE_URL=postgresql://postgres:password@localhost:5432/visabuddy
```

---

### Step 4: Service-Specific Configuration

#### Google OAuth Setup

See [SETUP_GOOGLE_OAUTH.md](./SETUP_GOOGLE_OAUTH.md) for detailed instructions.

**Quick Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs
6. Copy Client ID and Secret to `.env`

#### Firebase Storage Setup

See [SETUP_FIREBASE.md](./SETUP_FIREBASE.md) for detailed instructions.

**Quick Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Storage
4. Create a service account
5. Download service account JSON
6. Extract credentials to `.env`

#### OpenAI API Setup

See [SETUP_OPENAI.md](./SETUP_OPENAI.md) for detailed instructions.

**Quick Steps:**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy to `.env`

#### Payment Gateway Setup

See [SETUP_PAYMENT_GATEWAYS.md](./SETUP_PAYMENT_GATEWAYS.md) for detailed instructions.

#### Email Service Setup

See [SETUP_EMAIL.md](./SETUP_EMAIL.md) for detailed instructions.

---

### Step 5: Run Database Migrations

```bash
cd apps/backend

# Generate Prisma client
npm run db:generate

# Apply migrations
npm run db:migrate

# Verify migration
npm run db:status
```

---

### Step 6: Start Services

#### Development Mode

**Backend:**
```bash
cd apps/backend
npm run dev
```

**AI Service:**
```bash
cd apps/ai-service
python -m uvicorn main:app --reload --port 8001
```

**Frontend:**
```bash
cd apps/frontend
npm run dev
```

#### Production Mode

**Using Docker Compose:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Manual:**
```bash
# Backend
cd apps/backend
npm run build
npm start

# AI Service
cd apps/ai-service
uvicorn main:app --host 0.0.0.0 --port 8001
```

---

## Service Configuration

### Backend Service

- **Port**: 3000 (default)
- **Health Check**: `http://localhost:3000/api/health`
- **API Base**: `http://localhost:3000/api`

### AI Service

- **Port**: 8001 (default)
- **Health Check**: `http://localhost:8001/health`
- **API Docs**: `http://localhost:8001/docs`

### Frontend Service

- **Port**: 19006 (Expo default)
- **Development**: `http://localhost:19006`

---

## Database Setup

### Initial Schema

The database schema is managed by Prisma. After running migrations, you'll have:

- **Users** - User accounts and authentication
- **VisaApplications** - Visa application records
- **UserDocuments** - Uploaded documents
- **ChatSessions** - AI chat conversations
- **Payments** - Payment transactions
- **Countries** - Supported countries
- **VisaTypes** - Available visa types

### Seeding Data (Optional)

```bash
cd apps/backend
npm run db:seed
```

This will populate:
- Default countries
- Visa types
- Admin user (if configured)

---

## Environment Variables

### Validation

Validate your environment variables:

```bash
# Linux/macOS
./scripts/validate-env.sh backend
./scripts/validate-env.sh frontend
./scripts/validate-env.sh ai-service

# Windows
.\scripts\validate-env.ps1 backend
.\scripts\validate-env.ps1 frontend
.\scripts\validate-env.ps1 ai-service
```

### Required vs Optional

**Backend Required:**
- `DATABASE_URL`
- `JWT_SECRET` (min 32 characters)
- `NODE_ENV`
- `PORT`
- `CORS_ORIGIN`

**Backend Optional:**
- `REDIS_URL` (recommended for production)
- `OPENAI_API_KEY` (required for AI chat)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (for Google OAuth)
- `FIREBASE_PROJECT_ID` (for Firebase Storage)
- Payment gateway credentials
- Email service credentials

---

## Verification

### 1. Check Service Health

**Backend:**
```bash
curl http://localhost:3000/api/health
```

**AI Service:**
```bash
curl http://localhost:8001/health
```

### 2. Test Database Connection

```bash
cd apps/backend
npm run db:status
```

### 3. Run Verification Script

```bash
# Linux/macOS
./scripts/verify-setup.sh

# Windows
.\scripts\verify-setup.ps1
```

### 4. Test API Endpoints

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Authentication Status:**
```bash
curl http://localhost:3000/api/auth/status
```

**Register User:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:** `Can't reach database server`

**Solutions:**
- Verify PostgreSQL is running: `pg_isready` or `systemctl status postgresql`
- Check `DATABASE_URL` in `.env`
- Verify database exists: `psql -U postgres -l`
- Check firewall settings

#### 2. Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solutions:**
- Find process: `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows)
- Kill process or change port in `.env`

#### 3. JWT_SECRET Too Short

**Error:** `JWT_SECRET must be at least 32 characters`

**Solutions:**
- Generate new secret: `./scripts/generate-secrets.sh`
- Update `.env` file

#### 4. CORS Errors

**Error:** `Origin not allowed by CORS`

**Solutions:**
- Check `CORS_ORIGIN` in `.env`
- Ensure frontend URL is included
- In development, you can use `*` (NOT recommended for production)

#### 5. Redis Connection Failed

**Error:** `Redis connection failed`

**Solutions:**
- Verify Redis is running: `redis-cli ping`
- Check `REDIS_URL` in `.env`
- Application will fall back to in-memory storage

#### 6. Prisma Client Not Generated

**Error:** `Cannot find module '@prisma/client'`

**Solutions:**
```bash
cd apps/backend
npm run db:generate
```

#### 7. Migration Errors

**Error:** `Migration failed`

**Solutions:**
- Check database connection
- Verify `DATABASE_URL` is correct
- Reset database (development only): `npm run db:reset`
- Check migration files for syntax errors

### Getting Help

1. Check logs:
   - Backend: Console output or `logs/` directory
   - AI Service: Console output
   - Database: PostgreSQL logs

2. Verify environment:
   ```bash
   ./scripts/verify-setup.sh
   ```

3. Check service status:
   ```bash
   curl http://localhost:3000/api/monitoring/status
   ```

4. Review documentation:
   - [API Documentation](./API_DOCUMENTATION.md)
   - [Developer Guide](./DEVELOPER_GUIDE.md)
   - Service-specific setup guides in `docs/`

---

## Next Steps

After completing setup:

1. **Read API Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
2. **Review Developer Guide**: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
3. **Configure Production**: See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)
4. **Set Up Monitoring**: Configure logging and error tracking
5. **Test Application**: Run through complete user flows

---

## Production Setup

For production deployment, see:
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)
- [docker-compose.prod.yml](../docker-compose.prod.yml)
- [scripts/setup-production.sh](../scripts/setup-production.sh)

**Important Production Checklist:**
- [ ] Use strong `JWT_SECRET` (32+ characters)
- [ ] Set `CORS_ORIGIN` to specific domains (not `*`)
- [ ] Enable Redis for rate limiting
- [ ] Configure proper storage (Firebase or secure local storage)
- [ ] Set up SSL/TLS certificates
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerting
- [ ] Review security settings
- [ ] Test all external service integrations

---

**Last Updated:** 2024
**Version:** 1.0.0








