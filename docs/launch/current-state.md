# Current State – Ketdik / VisaBuddy (Launch Readiness)

## Architecture Summary

- **Backend API (Express/TS/Prisma)** — `apps/backend/src/index.ts`; routes for auth, applications, checklist, documents, doc-check, payments, admin, monitoring.
- **Database** — PostgreSQL via Prisma (`apps/backend/prisma/schema*.prisma`); schema-selector switches SQLite/Postgres.
- **AI/Checklist/Doc Validation** — OpenAI via `apps/backend/src/services/ai-openai.service.ts`; checklist engine `services/visa-checklist-engine.service.ts`; doc-check `services/doc-check.service.ts`; condition evaluator `utils/condition-evaluator.ts`; evaluation framework `services/evaluation.service.ts`.
- **RAG/Embassy** — `services/rag.service.ts` (in-memory KB + embassy crawl text); crawler `services/embassy-crawler.service.ts`, sources `services/embassy-source.service.ts`.
- **Storage** — Local/Firebase via `services/storage-adapter.ts`, `firebase-storage.service.ts`, `local-storage.service.ts`; uploads under `apps/backend/uploads/`.
- **Admin/Web (Next.js)** — `apps/web` (App Router) with admin UI; deployable via Docker/Nixpacks/Vercel configs.
- **Python AI service (FastAPI/RAG)** — `apps/ai-service/main.py` with embeddings, RAG, DeepSeek/OpenAI connectors.
- **Deployment artifacts** — `docker-compose.yml`, `docker-compose.prod.yml`, `apps/backend/Dockerfile`, `apps/web/Dockerfile`, `apps/ai-service/nixpacks.toml`, `apps/backend/nixpacks.toml`, Railway/Vercel guides.

## Environment Variables (backend)

Required (from `apps/backend/src/config/env.ts`):

- `NODE_ENV`, `PORT`
- `DATABASE_URL` (Postgres), `JWT_SECRET` (>=32 chars)
- `STORAGE_TYPE` (`local`|`firebase`), `LOCAL_STORAGE_PATH`
- `CORS_ORIGIN`
- `OCR_PROVIDER` (`tesseract`|`google_vision`|`aws_textract`|`azure`)

Optional/feature:

- `REDIS_URL`; Firebase keys (`FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`)
- OpenAI: `OPENAI_API_KEY`
- OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Payments: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYME_*`, `CLICK_*`, `UZUM_*`
- Logging: `SENTRY_DSN`, `DATADOG_API_KEY`, `LOG_LEVEL`, `LOG_FILE_ENABLED`, etc.
- Feature flags: `USE_GLOBAL_DOCUMENT_CATALOG`, `ENABLE_ENSEMBLE_VALIDATION`, `ENABLE_MOCK_PAYMENTS`, `PAYMENT_FREEZE_*`

Frontend env (apps/web):

- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AI_SERVICE_URL` plus standard Next.js envs (see `apps/web/README.md` / deployment guides).

Python AI service:

- See `apps/ai-service/HOW_TO_RUN.md`, `PINECONE_CONFIG.md`; typically `OPENAI_API_KEY`, embedding store keys.

## Core User Journey Status

Flow: Auth → Create application → Generate checklist → Upload docs (Firebase/local) → AI doc validation → Status persisted → UI shows results.

- Auth/routes present (`src/routes/auth.ts`), JWT middleware; working but integration tests failing due to env validation.
- Application creation (`routes/applications.ts`, `services/applications.service.ts`) — implemented.
- Checklist generation: rules + GPT prompt (`visa-checklist-engine.service.ts`, `ai-openai.service.ts`); condition evaluator present; fallback checklists available; approved rules required.
- Document upload: routes in `routes/documents.ts`; storage adapter supports Firebase/local.
- AI verification: `doc-check.service.ts` + `document-validation.service.ts`; GPT prompts exist; ensemble flag optional.
- Persistence: `DocumentChecklist` model, `UserDocument`, `DocumentCheckResult` in Prisma schema.
- Admin/monitoring: admin routes (`routes/admin`), monitoring route, logging middleware; Sentry optional.
- UI: Next.js admin available; no recent e2e validation in this session.

## Current Test/Build Status (evidence)

- Backend `npm test` failing (26 suites). Examples:
  - Env validation blocking tests: `JWT_SECRET` length, `OCR_PROVIDER` invalid when unset (see `tests/visa-checklist-conditions.test.ts` error).
  - Missing exports/mocks: `src/__tests__/database.test.ts` expects `mockUser` et al. from `./test-utils`.
  - Vitest-only test `tests/visa-doc-checker.test.ts` missing dependency and path resolutions.
  - AI context tests missing required fields and `await` usage (`tests/ai-context-canonical.test.ts`).
  - Integration tests (auth/e2e) blocked by env validation (`src/config/env.ts`).
- Type/lint not re-run in this session; likely to surface same env validation issues unless test envs are set.

## Known Production Blockers (P0)

- Env validation strictness blocks runtime if `JWT_SECRET` <32 or `OCR_PROVIDER` invalid; ensure prod envs set (file: `apps/backend/src/config/env.ts`).
- Test suite red, indicating unverified flows; payment tests currently require Postgres URL and schema alignment.
- AI doc-check tests rely on vitest, not wired into Jest; doc-check service not validated in CI.
- Missing/incorrect mocks in tests (`database.test.ts`, `ai-context-canonical.test.ts`) prevent confidence in persistence and risk scoring.
- Deployment envs for storage (Firebase) and Redis not validated; risk of runtime failure if unset.

## Risks (examples)

- **P0**: Env misconfig causes backend startup failure (JWT_SECRET length, OCR_PROVIDER) — file `src/config/env.ts`.
- **P0**: Payments tests imply Postgres-only; if prod uses Postgres, ensure DATABASE_URL and migrations applied — `schema.prisma`, `mock-payment.service.ts`.
- **P0**: AI checklist/doc-check unverified due to failing tests — `visa-checklist-engine.service.ts`, `doc-check.service.ts`.
- **P1**: RAG/embassy integration currently basic (cached text, in-memory) — `services/rag.service.ts`, `embassy-crawler.service.ts`.
- **P1**: Logging/observability optional; Sentry/Datadog not guaranteed.
- **P2**: Frontend admin not re-tested; mobile UX not in scope here.

## Missing/Uncertain

- No confirmation of production storage bucket credentials in repo.
- No verified deployment manifests for combined stack (backend + web + ai-service) in one orchestration; docker-compose present but not validated here.
- AI service (Python) not exercised in this session; RAG embeddings freshness unknown.


