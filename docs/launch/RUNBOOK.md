# Deployment Runbook

Last updated: 2025-01-XX

## Environments

- Dev: local (SQLite), `npm run dev`
- Staging/Prod: PostgreSQL, Redis, Firebase, AI keys

## Pre-Deployment Checklist

1. ✅ Set env vars (see `apps/backend/src/config/env.ts` required fields)
   - Required: `DATABASE_URL`, `JWT_SECRET` (>=32 chars), `NODE_ENV=production`
   - Recommended: `CORS_ORIGIN`, `REDIS_URL`, `SENTRY_DSN`, `OPENAI_API_KEY`
   - See `PRODUCTION_ENV_SETUP.md` for complete list
2. ✅ Ensure `CORS_ORIGIN` is not `*` in production (specific domains only)
3. ✅ BACKUP database (critical before migrations)
4. ✅ Run tests: `npm run test` (backend), web build
5. ✅ Run migrations in staging first: `npm run db:migrate:deploy`
6. ✅ Verify health checks: `/api/health`, `/api/health/detailed`
7. ✅ Security audit: `npm audit` (should show 0 vulnerabilities)
8. ✅ Environment validation: `npm run validate:env`

## Deploy Steps (Backend)

1. `npm ci`
2. `npm run build`
3. `npm run db:migrate:deploy`
4. `npm run start:prod`

## Deploy Steps (Web)

1. `npm ci`
2. `npm run build`
3. `npm run start` (or Vercel/Netlify deploy)

## Database Migrations

- Location: `apps/backend/prisma/migrations/`
- Command: `npm run db:migrate:deploy`
- Rollback: restore DB backup or revert migration with `prisma migrate resolve --applied <migration>` + restore data

## Secrets Management

- Backend env: DATABASE*URL, JWT_SECRET, OPENAI_API_KEY, DEEPSEEK_API_KEY, REDIS_URL, FIREBASE*\*, STRIPE/Payme/Click/Uzum keys
- Web env: NEXT_PUBLIC_API_URL
- Store in platform secrets (Railway/Vercel), not in repo

## Health & Smoke Checks

### Basic Health

- `GET /api/health` - Basic health check (database connectivity)
- `GET /api/health/detailed` - Detailed health (DB, Redis, Storage, AI)
- `GET /api/health/live` - Liveness probe (for Kubernetes/Docker)
- `GET /api/health/ready` - Readiness probe (for Kubernetes/Docker)

### Functional Tests

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/applications` - Create application (with auth)
- `GET /api/document-checklist/:applicationId` - Get checklist
- `POST /api/documents/upload` - Upload document (test file)
- `POST /api/chat/message` - Send chat message

### Verification Commands

```bash
# Health check
curl https://your-api.com/api/health

# Detailed health
curl https://your-api.com/api/health/detailed

# Test registration
curl -X POST https://your-api.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

## Rollback

1. Revert to previous image/build
2. Restore DB backup if schema/data issues
3. Disable traffic (set maintenance) if needed

## Monitoring

### Sentry Configuration

- ✅ Enable Sentry DSN in environment variables
- ✅ Configure alerts:
  - Error rate > 1% (5-minute window)
  - API latency P95 > 2s
  - AI service failures
  - Payment webhook failures
  - Database connection errors

### Metrics to Monitor

- API response times (P50, P95, P99)
- AI service latency
- Document upload success rate
- Database query performance
- Redis cache hit rate
- Error rates by endpoint
- Active user count

### Dashboards

- Create dashboard for:
  - AI latency trends
  - Upload success/failure rates
  - Payment webhook status
  - Database performance
  - Error rate by service

## Incident Response

- Escalation: Backend lead → DevOps
- Capture requestId, userId, applicationId in logs
- Runbook per incident type (webhook failures, AI downtime, storage issues)

## Code References

- CI: `.github/workflows/ci.yml`
- Backend start: `apps/backend/src/index.ts`
- Prisma: `apps/backend/prisma/schema.prisma`
