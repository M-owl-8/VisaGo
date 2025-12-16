# Deployment Runbook

Last updated: 2025-12-17

## Environments

- Dev: local (SQLite), `npm run dev`
- Staging/Prod: PostgreSQL, Redis, Firebase, AI keys

## Pre-Deployment Checklist

1. Set env vars (see `apps/backend/src/config/env.ts` required fields)
2. Ensure `CORS_ORIGIN` is not `*` in production
3. BACKUP database
4. Run tests: `npm run test` (backend), web build
5. Run migrations in staging

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

- `/api/health` (extend to DB/Redis/Firebase/AI)
- `/api/chat` test message
- `/api/document-checklist/:applicationId`
- `/api/documents` upload small file (non-prod bucket)

## Rollback

1. Revert to previous image/build
2. Restore DB backup if schema/data issues
3. Disable traffic (set maintenance) if needed

## Monitoring

- Enable Sentry DSN; configure alerts (error rate, latency, AI failures, webhooks)
- Add dashboards for AI latency, upload failures, payment webhooks

## Incident Response

- Escalation: Backend lead → DevOps
- Capture requestId, userId, applicationId in logs
- Runbook per incident type (webhook failures, AI downtime, storage issues)

## Code References

- CI: `.github/workflows/ci.yml`
- Backend start: `apps/backend/src/index.ts`
- Prisma: `apps/backend/prisma/schema.prisma`
