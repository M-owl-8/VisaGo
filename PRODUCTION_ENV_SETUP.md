# Production Environment Setup Guide

**Date:** 2025-01-XX  
**Status:** Ready for Production

## Overview

This guide provides step-by-step instructions for setting up the production environment for VisaBuddy/Ketdik.

## Required Environment Variables

### Critical (Must Have)

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Security
JWT_SECRET=<at-least-32-characters-long-secret-key>
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Storage (choose one)
STORAGE_TYPE=firebase  # or 'local'
# If Firebase:
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
# If Local:
LOCAL_STORAGE_PATH=/app/uploads

# AI Services
OPENAI_API_KEY=sk-...
# Optional: Together AI for Ketdik routing
TOGETHER_API_KEY=...
TOGETHER_BASE_URL=https://api.together.ai/v1
KETDIK_MODEL_ID=murodbekshamsid_9585/DeepSeek-R1-ketdik-r1-v1-9cf6dce1
```

### Recommended

```bash
# Redis (for rate limiting and caching)
REDIS_URL=redis://host:6379

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=INFO
LOG_FILE_ENABLED=true
LOG_FILE_PATH=/app/logs

# Frontend URL (for email links)
FRONTEND_URL=https://yourdomain.com

# OCR (optional, defaults to tesseract)
OCR_PROVIDER=tesseract  # or 'google_vision', 'aws_textract', 'azure'
```

### Optional

```bash
# Payment Gateways
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYME_MERCHANT_ID=...
PAYME_API_KEY=...
CLICK_MERCHANT_ID=...
CLICK_API_KEY=...
UZUM_MERCHANT_ID=...
UZUM_API_KEY=...

# Email
SENDGRID_API_KEY=SG....
# or SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Feature Flags
USE_GLOBAL_DOCUMENT_CATALOG=false
ENABLE_ENSEMBLE_VALIDATION=false
ENABLE_MOCK_PAYMENTS=false
PAYMENT_FREEZE_ENABLED=true
PAYMENT_FREEZE_START_DATE=2025-01-01
PAYMENT_FREEZE_DURATION_MONTHS=3
```

## Environment Setup by Platform

### Railway

1. **Create Project**

   ```bash
   railway login
   railway init
   ```

2. **Add Services**
   - PostgreSQL database
   - Redis (optional but recommended)
   - Backend service
   - AI service (if separate)

3. **Set Variables**

   ```bash
   railway variables set NODE_ENV=production
   railway variables set JWT_SECRET=$(openssl rand -base64 32)
   railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
   railway variables set REDIS_URL=${{Redis.REDIS_URL}}
   # ... add all other variables
   ```

4. **Deploy**
   ```bash
   railway up
   ```

### Vercel (Frontend)

1. **Install CLI**

   ```bash
   npm i -g vercel
   ```

2. **Deploy**

   ```bash
   cd apps/web
   vercel
   ```

3. **Set Environment Variables**
   - `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
   - `NEXT_PUBLIC_AI_SERVICE_URL=https://your-ai-service.railway.app`

### Docker Compose

1. **Create `.env` file**

   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Start Services**

   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Run Migrations**
   ```bash
   docker-compose exec backend npm run db:migrate:deploy
   ```

## Pre-Deployment Checklist

### 1. Environment Validation

Run environment validation:

```bash
cd apps/backend
npm run validate:env
```

This will check:

- ✅ All required variables present
- ✅ JWT_SECRET length >= 32
- ✅ DATABASE_URL format valid
- ✅ CORS_ORIGIN not set to '\*'
- ✅ Storage configuration valid

### 2. Database Setup

```bash
# Run migrations
npm run db:migrate:deploy

# Verify schema
npm run db:studio  # Check database structure
```

### 3. Storage Setup

**Firebase:**

1. Create Firebase project
2. Enable Storage API
3. Create service account
4. Download JSON key
5. Set environment variables

**Local:**

1. Create uploads directory
2. Set permissions: `chmod 755 /app/uploads`
3. Ensure disk space available

### 4. Security Verification

```bash
# Check for secrets in code
npm run lint
# Review .gitignore (ensure .env files excluded)

# Verify CORS
# In production, CORS_ORIGIN should be specific domains, not '*'
```

### 5. Health Checks

```bash
# Basic health check
curl https://your-api.com/api/health

# Detailed health check
curl https://your-api.com/api/health/detailed

# Liveness probe
curl https://your-api.com/api/health/live

# Readiness probe
curl https://your-api.com/api/health/ready
```

## Post-Deployment Verification

### 1. Smoke Tests

```bash
# Health check
curl https://your-api.com/api/health

# Authentication
curl -X POST https://your-api.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'

# Application creation (with auth token)
curl -X POST https://your-api.com/api/applications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"countryId":"...","visaTypeId":"..."}'
```

### 2. Monitoring Setup

1. **Sentry**
   - Verify error tracking
   - Set up alerts for error rate > 1%
   - Set up alerts for latency > 2s

2. **Logs**
   - Verify logs are being written
   - Check log rotation is working
   - Verify sensitive data is redacted

3. **Metrics**
   - Monitor API response times
   - Monitor AI service latency
   - Monitor database query times
   - Monitor storage usage

### 3. Performance Verification

```bash
# Test response times
time curl https://your-api.com/api/health

# Test with load (if Artillery/k6 available)
artillery quick --count 100 --num 10 https://your-api.com/api/health
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database is accessible
   - Check firewall rules
   - Verify credentials

2. **JWT_SECRET Too Short**
   - Generate new secret: `openssl rand -base64 32`
   - Update environment variable
   - Restart service

3. **CORS Errors**
   - Verify CORS_ORIGIN is set correctly
   - Check frontend URL matches CORS_ORIGIN
   - Ensure no wildcard '\*' in production

4. **Storage Errors**
   - Verify storage type is set correctly
   - Check Firebase credentials (if using Firebase)
   - Verify storage path permissions (if using local)

5. **AI Service Errors**
   - Verify OPENAI_API_KEY is valid
   - Check API quota/limits
   - Verify model names are correct

## Security Best Practices

1. **Secrets Management**
   - Never commit `.env` files
   - Use platform secrets management (Railway, Vercel)
   - Rotate secrets regularly
   - Use different secrets for dev/staging/prod

2. **CORS Configuration**
   - Never use `*` in production
   - Specify exact domains
   - Include both `https://domain.com` and `https://www.domain.com` if needed

3. **Database**
   - Use SSL connections
   - Restrict database access by IP
   - Use strong passwords
   - Enable connection pooling

4. **Logging**
   - Redact sensitive data (passwords, tokens, PII)
   - Use structured logging
   - Set appropriate log levels
   - Rotate logs regularly

## Maintenance

### Daily

- Monitor error rates
- Check health endpoints
- Review critical alerts

### Weekly

- Review security logs
- Check dependency updates
- Review performance metrics

### Monthly

- Rotate secrets
- Update dependencies
- Review and optimize database queries
- Security audit

## Support

For issues or questions:

- Check logs: `docker-compose logs backend`
- Check health: `/api/health/detailed`
- Review Sentry for errors
- Check database connectivity

---

**Last Updated:** 2025-01-XX
