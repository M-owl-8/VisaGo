# Environment Variables Setup Guide

## Overview

This guide lists all required and optional environment variables for the Ketdik/VisaBuddy application. Environment variables are separated by service (backend, web app, AI service).

---

## Backend (apps/backend)

### Required Variables

```env
# Server Configuration
NODE_ENV=production                    # production, development, or test
PORT=3000                              # Port for backend API server

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
# OR for SQLite (development only):
# DATABASE_URL=file:./dev.db

# Security
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
# Generate with: openssl rand -base64 32
```

### Optional but Recommended

```env
# CORS (for web app access)
CORS_ORIGIN=https://yourdomain.uz,https://www.yourdomain.uz

# Redis (for caching and rate limiting)
REDIS_URL=redis://localhost:6379
# OR: redis://user:password@host:6379

# Storage
STORAGE_TYPE=local                     # local or firebase
LOCAL_STORAGE_PATH=uploads             # Path for local file storage

# Firebase Storage (if STORAGE_TYPE=firebase)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

# Google OAuth (for Google Sign-In)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Service (SendGrid or SMTP)
SENDGRID_API_KEY=SG....
# OR use SMTP:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment Gateways (optional)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYME_MERCHANT_ID=...
PAYME_API_KEY=...
CLICK_MERCHANT_ID=...
CLICK_API_KEY=...
UZUM_MERCHANT_ID=...
UZUM_API_KEY=...

# Frontend URL (for email links, CORS, etc.)
FRONTEND_URL=https://yourdomain.uz

# Error Tracking (optional)
SENTRY_DSN=https://...@sentry.io/...

# Logging
LOG_LEVEL=INFO                         # DEBUG, INFO, WARN, ERROR
LOG_FILE_ENABLED=true
LOG_FILE_PATH=logs
LOG_FILE_MAX_SIZE=10485760             # 10MB
LOG_FILE_MAX_FILES=5
```

---

## Web App (apps/web)

### Required Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.yourdomain.uz
# OR for local development:
# NEXT_PUBLIC_API_URL=http://localhost:3000

# AI Service (optional)
NEXT_PUBLIC_AI_SERVICE_URL=https://ai.yourdomain.uz
# OR for local development:
# NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8001
```

### Optional

```env
# Analytics (if using)
NEXT_PUBLIC_GA_ID=G-...
NEXT_PUBLIC_MIXPANEL_TOKEN=...
```

**Note:** All `NEXT_PUBLIC_*` variables are exposed to the browser. Never put secrets here.

---

## AI Service (apps/ai-service)

### Required Variables

```env
# OpenAI (required for AI features)
OPENAI_API_KEY=sk-...

# Service Configuration
PORT=8001
CORS_ORIGINS=https://yourdomain.uz
```

### Optional

```env
# Pinecone (for RAG/vector search)
PINECONE_API_KEY=pcsk-...
PINECONE_INDEX_NAME=visabuddy-visa-kb
PINECONE_ENVIRONMENT=gcp-starter

# Logging
LOG_LEVEL=INFO
RAG_ENABLED=true
USE_LOCAL_EMBEDDINGS_FALLBACK=true
```

---

## Development Setup

### 1. Backend

Create `apps/backend/.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=file:./dev.db
JWT_SECRET=dev-secret-key-minimum-32-characters-long-for-local-development
CORS_ORIGIN=http://localhost:3001
```

### 2. Web App

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8001
```

### 3. AI Service

Create `apps/ai-service/.env`:

```env
PORT=8001
OPENAI_API_KEY=sk-...
CORS_ORIGINS=http://localhost:3001
```

---

## Production Setup

### 1. Backend

Create `apps/backend/.env.production`:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/visabuddy
JWT_SECRET=<generate-strong-secret-32-chars-minimum>
CORS_ORIGIN=https://yourdomain.uz,https://www.yourdomain.uz
REDIS_URL=redis://your-redis-host:6379
OPENAI_API_KEY=sk-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SENDGRID_API_KEY=SG....
FRONTEND_URL=https://yourdomain.uz
LOG_LEVEL=INFO
```

### 2. Web App

Set environment variables on your server or in your deployment platform:

```bash
export NEXT_PUBLIC_API_URL=https://api.yourdomain.uz
export NEXT_PUBLIC_AI_SERVICE_URL=https://ai.yourdomain.uz
```

Or create `apps/web/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.uz
NEXT_PUBLIC_AI_SERVICE_URL=https://ai.yourdomain.uz
```

---

## Security Best Practices

1. **Never commit `.env` files to git**
   - Add `.env*` to `.gitignore`
   - Use `.env.example` as a template

2. **Generate strong secrets:**

   ```bash
   # JWT Secret (32+ characters)
   openssl rand -base64 32

   # General secret
   openssl rand -hex 32
   ```

3. **Use different secrets for development and production**

4. **Rotate secrets periodically** (especially JWT_SECRET)

5. **Restrict CORS_ORIGIN in production** to your actual domains

6. **Use environment-specific values:**
   - Development: localhost URLs, test API keys
   - Production: real domains, production API keys

---

## Validation

The backend automatically validates environment variables on startup using Zod schemas. If required variables are missing or invalid, the server will fail to start with a clear error message.

**To verify your setup:**

```bash
# Backend
cd apps/backend
npm run dev  # Will fail with clear errors if env vars are invalid

# Web App
cd apps/web
npm run build  # Will use fallback URLs if NEXT_PUBLIC_API_URL is not set
```

---

## Quick Reference

| Variable              | Required | Service    | Description                    |
| --------------------- | -------- | ---------- | ------------------------------ |
| `DATABASE_URL`        | ✅       | Backend    | PostgreSQL connection string   |
| `JWT_SECRET`          | ✅       | Backend    | JWT signing secret (32+ chars) |
| `NEXT_PUBLIC_API_URL` | ✅       | Web        | Backend API URL                |
| `OPENAI_API_KEY`      | ⚠️       | Backend/AI | Required for AI features       |
| `CORS_ORIGIN`         | ⚠️       | Backend    | Required if serving web app    |
| `REDIS_URL`           | ❌       | Backend    | Optional, for caching          |
| `GOOGLE_CLIENT_ID`    | ❌       | Backend    | Optional, for Google OAuth     |

---

**Last Updated:** November 27, 2025
