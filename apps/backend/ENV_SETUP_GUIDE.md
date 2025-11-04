# 🔐 VisaBuddy Environment Setup Guide

## Overview

This guide explains all environment variables required for VisaBuddy backend, separated by environment (development, staging, production).

---

## 🚨 CRITICAL: Credential Security

### ❌ NEVER commit these files to Git:
- `.env`
- `.env.local`
- `.env.production`
- `*.json` (Firebase service accounts)
- `credentials.json`
- Any files with passwords, keys, or secrets

### ✅ Store credentials in:
- **Development**: Local `.env` file (in .gitignore)
- **Staging**: GitHub Secrets or Railway Environment
- **Production**: Railway Environment (never commit)

---

## 📋 Environment Variables by Category

### 1. 🌍 Environment & Port

**Required**: Always

```env
NODE_ENV=development          # development | staging | production
PORT=3000                     # Server port
LOG_LEVEL=debug              # debug | info | warn | error
```

---

### 2. 🔐 Authentication & Security

**Required**: Production (development can use test values)

```env
# JWT Configuration (CRITICAL)
JWT_SECRET=<32+ character random string>
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_EXPIRY=7d                          # Token expiry (7 days recommended)
REFRESH_TOKEN_EXPIRY=30d               # Refresh token expiry

# CORS Configuration
CORS_ORIGIN=https://visabuddy.app     # Comma-separated allowed origins
# Development: CORS_ORIGIN=http://localhost:3000,http://localhost:8081
# Production: CORS_ORIGIN=https://visabuddy.app,https://app.visabuddy.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000            # 1 minute
RATE_LIMIT_MAX_REQUESTS=100           # Requests per window
RATE_LIMIT_MAX_AUTH_REQUESTS=5        # Auth endpoint limits
```

**Development Example**:
```env
JWT_SECRET=dev-secret-key-32-characters-minimum-required-1234567890
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000,http://localhost:8081
```

**Production Example**:
```env
JWT_SECRET=<generate with crypto command above>
JWT_EXPIRY=7d
CORS_ORIGIN=https://visabuddy.app,https://app.visabuddy.app
RATE_LIMIT_WINDOW_MS=60000
```

---

### 3. 💾 Database

**Required**: Always (different for dev/prod)

```env
# PostgreSQL Connection String
DATABASE_URL=postgresql://user:password@host:port/database
# Format examples:
# Development (local): postgresql://postgres:password@localhost:5432/visabuddy_dev
# Production (Railway): postgresql://postgres:generated-password@containers.railway.app:port/railway

# Connection Pooling
DATABASE_POOL_MIN=5                   # Minimum idle connections
DATABASE_POOL_MAX=20                  # Maximum total connections
DATABASE_POOL_IDLE_TIMEOUT=30000      # 30 seconds
DATABASE_POOL_CONNECTION_TIMEOUT=2000 # 2 seconds
```

**How to get DATABASE_URL**:
- **Local PostgreSQL**: `postgresql://postgres:password@localhost:5432/visabuddy_dev`
- **Railway PostgreSQL**: Copy from Railway dashboard → Click PostgreSQL plugin → Copy DATABASE_URL
- **Supabase**: Go to Settings → Database → Connection String → PostgreSQL

---

### 4. 📦 Storage

**Required**: Production (local storage for development)

```env
# Storage Type
STORAGE_TYPE=local              # local | firebase | aws-s3
STORAGE_PROVIDER=firebase       # Provider name (for logging)

# Local Storage (Development)
LOCAL_STORAGE_PATH=./uploads    # Directory for uploaded files

# Firebase Storage (Production) ⚠️ CRITICAL - Use environment variables ONLY
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=key-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...

# AWS S3 (Alternative)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=visabuddy-documents
AWS_S3_URL=https://visabuddy-documents.s3.amazonaws.com
```

**⚠️ Firebase Setup**:
1. Go to https://console.firebase.google.com
2. Select your project
3. Settings → Service Accounts → Generate new private key
4. Copy JSON values into environment variables
5. **NEVER commit the JSON file to Git**

---

### 5. 📧 Email Configuration

**Required**: Production (notifications)

```env
# Email Provider
EMAIL_PROVIDER=sendgrid          # sendgrid | mailgun | smtp
SENDGRID_API_KEY=SG_...          # SendGrid API key
EMAIL_FROM=noreply@visabuddy.app # Sender email address

# Alternative: SMTP (Gmail, custom servers)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Gmail: Generate app password
SMTP_FROM=noreply@visabuddy.app
```

**SendGrid Setup**:
1. Create account at https://sendgrid.com
2. Create API key
3. Add to environment variables

**Gmail Setup** (for development/testing):
1. Enable 2-factor authentication
2. Generate app password: https://myaccount.google.com/apppasswords
3. Use app password in SMTP_PASSWORD

---

### 6. 💳 Payment Gateway Configuration

**Required**: Production (optional for development with test credentials)

```env
# Payme (Primary for Uzbekistan)
PAYME_MERCHANT_ID=your-merchant-id
PAYME_SECRET_KEY=your-secret-key
PAYME_API_URL=https://checkout.payme.uz  # Test: https://checkout.test.payme.uz

# Click
CLICK_MERCHANT_ID=your-merchant-id
CLICK_MERCHANT_USER_ID=your-user-id
CLICK_SECRET_KEY=your-secret-key
CLICK_API_URL=https://api.click.uz/v2    # Test: https://api.test.click.uz

# Uzum
UZUM_SERVICE_ID=your-service-id
UZUM_API_KEY=your-api-key
UZUM_API_URL=https://api.uzum.uz/api/merchant

# Stripe (Global)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Get Test Credentials**:
- Payme: https://payme.uz (merchant account)
- Click: https://click.uz (merchant account)
- Uzum: https://uzum.uz (merchant account)
- Stripe: https://stripe.com/docs/payments

---

### 7. 🤖 AI & RAG Configuration

**Required**: Production (optional for development)

```env
# OpenAI API
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4                # gpt-4 | gpt-3.5-turbo
OPENAI_MAX_TOKENS=2000

# Pinecone Vector Database (for RAG)
PINECONE_API_KEY=your-api-key
PINECONE_ENVIRONMENT=gcp-starter
PINECONE_INDEX_NAME=visabuddy-kb

# Alternative: LLaMA (local)
LLAMA_MODEL_PATH=./models/llama-7b
```

**OpenAI Setup**:
1. Create account at https://platform.openai.com
2. Generate API key
3. Set up billing
4. Add to environment variables

---

### 8. 🔔 Firebase Cloud Messaging (FCM)

**Required**: Production (for push notifications)

```env
FCM_PROJECT_ID=your-firebase-project-id
FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FCM_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
```

**Note**: Use same Firebase project as storage or create separate one

---

### 9. 📊 Google OAuth (Optional)

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_CALLBACK=https://api.visabuddy.app/api/auth/google/callback
```

**Setup**:
1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 credentials (Web application)
3. Add authorized redirect URIs
4. Copy credentials to environment

---

### 10. 🚨 Error Tracking (Sentry)

**Optional**: Production recommended

```env
SENTRY_DSN=https://key@sentry.io/project_id
SENTRY_ENVIRONMENT=production          # production | staging | development
SENTRY_TRACES_SAMPLE_RATE=0.1         # 10% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1       # 10% of profiles
```

---

### 11. 📈 Analytics

**Optional**: Production recommended

```env
# Google Analytics
GOOGLE_ANALYTICS_ID=UA-XXXXXXX-X

# Mixpanel
MIXPANEL_TOKEN=your-token
```

---

### 12. 🎯 Feature Flags

**Optional**: For gradual rollout

```env
FEATURE_FLAG_AI_CHAT=true
FEATURE_FLAG_PAYMENT_INTEGRATION=true
FEATURE_FLAG_NOTIFICATIONS=true
FEATURE_FLAG_ANALYTICS=true
```

---

### 13. ⚙️ Performance & Optimization

```env
# Query Optimization
QUERY_TIMEOUT_MS=30000              # 30 seconds
ENABLE_QUERY_LOGGING=false
ENABLE_SLOW_QUERY_LOGGING=true
SLOW_QUERY_THRESHOLD_MS=1000        # Log queries slower than 1 second

# Caching
CACHE_ENABLED=true
CACHE_TTL_USER=3600                 # 1 hour
CACHE_TTL_COUNTRIES=86400           # 24 hours
CACHE_TTL_VISA_TYPES=86400          # 24 hours
REDIS_URL=redis://localhost:6379    # Optional: for distributed cache
```

---

### 14. 📝 Logging

```env
LOG_LEVEL=info                      # error | warn | info | debug | trace
LOG_FORMAT=json                     # json | text
LOG_DESTINATION=console             # console | file | both

# File Logging
LOG_FILE_PATH=./logs/app.log
LOG_FILE_MAX_SIZE=10485760          # 10 MB
LOG_FILE_MAX_FILES=5                # Keep 5 log files
```

---

## 🚀 Quick Setup Guides

### Local Development

```bash
# Copy example file
cp .env.example .env

# Edit and add local values
nano .env
```

**Minimal `.env` for development**:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/visabuddy_dev
JWT_SECRET=dev-secret-12345678901234567890
CORS_ORIGIN=http://localhost:3000,http://localhost:8081
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./uploads
```

### Railway Production

```bash
# Add secrets to Railway
railway env:add JWT_SECRET=<generated-value>
railway env:add DATABASE_URL=<from-postgresql-plugin>
railway env:add STORAGE_TYPE=firebase
railway env:add FIREBASE_PROJECT_ID=...
railway env:add FIREBASE_PRIVATE_KEY=...
# ... etc
```

### GitHub Secrets (for CI/CD)

```bash
# Add to repository settings → Secrets → New repository secret
JWT_SECRET
DATABASE_URL
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY
PAYME_MERCHANT_ID
PAYME_SECRET_KEY
# ... etc
```

---

## ✅ Production Deployment Checklist

- [ ] JWT_SECRET is set and strong (32+ characters)
- [ ] DATABASE_URL points to production PostgreSQL
- [ ] STORAGE_TYPE=firebase with valid credentials
- [ ] All payment gateway credentials configured
- [ ] OPENAI_API_KEY set for AI features
- [ ] EMAIL configuration working
- [ ] CORS_ORIGIN set to production domain
- [ ] NODE_ENV=production
- [ ] SENTRY_DSN configured for error tracking
- [ ] All secrets in Railway/GitHub (not committed)
- [ ] SSL/TLS enabled (Railway handles auto HTTPS)
- [ ] Rate limiting configured appropriately

---

## 🔄 Rotating Credentials

**When to rotate**:
- Database password changed
- API key compromised
- Scheduled quarterly rotation

**How to rotate**:
1. Generate new secret/key
2. Add new value to environment
3. Test with new credentials
4. Remove old credentials
5. Document rotation date

---

## 📞 Troubleshooting

### "JWT_SECRET is not defined"
```
✅ Solution: Add JWT_SECRET to .env or environment variables
```

### "Database connection refused"
```
✅ Check DATABASE_URL format
✅ Verify PostgreSQL is running
✅ Check network/firewall access
```

### "Firebase initialization failed"
```
✅ Verify FIREBASE_PROJECT_ID is correct
✅ Check FIREBASE_PRIVATE_KEY formatting (with \n)
✅ Ensure Firebase project exists and is active
```

### "CORS error"
```
✅ Add frontend URL to CORS_ORIGIN
✅ Format: https://domain.com (no trailing slash)
```

---

## 🔗 Related Documentation

- [Phase 0 Security Audit](./PHASE_0_SECURITY_AUDIT_REPORT.md)
- [Database Migration Guide](./prisma/migration-sqlite-to-postgres.ts)
- [Firebase Setup](./FIREBASE_SETUP.md)
- [Payment Integration](./PAYMENT_SETUP.md)

---

**Last Updated**: 2024  
**Status**: Production Ready