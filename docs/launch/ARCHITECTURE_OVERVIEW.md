# Architecture Overview

Last updated: 2025-12-17

## System Components

- Backend API (Express, TS) — `apps/backend/src/index.ts`
- Web Admin (Next.js) — `apps/web`
- Mobile App (React Native) — `frontend_new`
- AI Service (FastAPI) — `apps/ai-service`
- Database: PostgreSQL via Prisma — `apps/backend/prisma/schema.prisma`
- Cache/Queue: Redis (fallback to in-memory) — `apps/backend/src/services/cache.service.optimized.ts`
- Storage: Firebase Storage (fallback local) — `apps/backend/src/services/storage-adapter.ts`
- Monitoring: Sentry — `apps/backend/src/index.ts:117-127`

## Data Flow (ASCII)

```
User(Web/Mobile)
    |
    v
Backend API (Express)
    |-- Prisma -> Postgres
    |-- Redis (cache/queues)
    |-- Firebase Storage (docs)
    |-- AI Service (HTTP) -> OpenAI/DeepSeek
    v
Responses to client
```

## Service Responsibilities

- Applications: `apps/backend/src/routes/applications.ts`, `.../services/applications.service.ts`
- Checklist: `apps/backend/src/routes/document-checklist.ts`, `.../services/visa-checklist-engine.service.ts`
- Documents: `apps/backend/src/routes/documents.ts`, `.../services/document-processing-queue.service.ts`, `.../services/firebase-storage.service.ts`
- Payments: `apps/backend/src/routes/payments-complete.ts`, `.../services/payment-gateway.service.ts`
- Chat: `apps/backend/src/routes/chat.ts`, `.../services/chat.service.ts`
- Auth: `apps/backend/src/routes/auth.ts`, `.../middleware/auth.ts`

## Deployment

- CI: `.github/workflows/ci.yml`
- Containers: `docker-compose.yml`, `apps/backend/Dockerfile`, `apps/web/Dockerfile`
- Env validation: `apps/backend/src/config/env.ts`

## Code References

- `apps/backend/src/index.ts:70-182` — env checks, CORS, middleware
- `apps/backend/prisma/schema.prisma` — DB models (User, VisaApplication, UserDocument, Payment, DocumentChecklist)
- `apps/backend/src/services/ai-openai.service.ts:48-118` — model selection, token caps
- `apps/backend/src/routes/documents.ts:64-275` — upload flow
- `apps/backend/src/routes/chat.ts:28-523` — chat endpoints
- `apps/backend/src/routes/monitoring.ts` — health/metrics (basic)


