# Launch Checklist (MVP Readiness)

## Product / UX

- [ ] Users can register/login (backend/web) — **Owner:** backend/web — **ETA:** 0.5–1d — **Verify:** `POST /api/auth/register`, `POST /api/auth/login`
- [ ] Create application flow works — **Owner:** backend/web — **ETA:** 0.5d — **Verify:** `POST /api/applications`
- [ ] Checklist view renders in web/admin — **Owner:** web — **ETA:** 0.5d — **Verify:** UI path /admin or app view (manual)

## Backend Correctness

- [ ] Prisma migrations applied to Postgres — **Owner:** backend/devops — **ETA:** 0.5d — **Verify:** `npm run db:migrate:deploy`
- [ ] Checklist generation works with approved `VisaRuleSet` — **Owner:** backend/ai — **ETA:** 1d — **Verify:** `POST /api/applications/ai-generate` or checklist route; expect checklist persisted in `DocumentChecklist`
- [ ] Document upload persists to storage (local/Firebase) — **Owner:** backend/devops — **ETA:** 0.5–1d — **Verify:** `POST /api/documents/upload` (manual with file)
- [ ] Doc-check endpoint returns AI validation — **Owner:** backend/ai — **ETA:** 1d — **Verify:** doc-check route (see `routes/doc-check.ts`)

## AI Correctness

- [ ] Checklist prompt produces valid JSON (no parse errors) — **Owner:** ai — **ETA:** 0.5d — **Verify:** run `npm run ai:evaluate:checklist`
- [ ] Doc validation prompt produces valid JSON — **Owner:** ai — **ETA:** 0.5d — **Verify:** `npm run ai:evaluate:doccheck`
- [ ] Conditions respected (sponsor/employment/travel) — **Owner:** ai — **ETA:** 0.5d — **Verify:** unit `visa-checklist-conditions` (Jest)

## Storage Correctness

- [ ] Firebase creds present or STORAGE_TYPE=local set — **Owner:** devops — **ETA:** 0.25d — **Verify:** env validation + upload smoke test
- [ ] Uploaded files retrievable — **Owner:** backend — **ETA:** 0.5d — **Verify:** GET file URL or storage inspection

## Security / Privacy

- [ ] JWT_SECRET >= 32 chars, CORS_ORIGIN set — **Owner:** backend/devops — **ETA:** 0.25d — **Verify:** startup logs/env check
- [ ] HTTPS termination (Nginx/Cloud) — **Owner:** devops — **ETA:** 0.5d — **Verify:** curl over https
- [ ] Secrets not logged; PII redaction in logs — **Owner:** backend — **ETA:** 0.5d — **Verify:** review logger middleware, run smoke with logs on

## Observability

- [ ] Error logging enabled (Sentry/Datadog optional) — **Owner:** devops — **ETA:** 0.5d — **Verify:** trigger test error and see capture
- [ ] Health check endpoint responds — **Owner:** backend — **ETA:** 0.1d — **Verify:** `GET /api/health`
- [ ] Basic metrics: request/AI latency captured — **Owner:** backend — **ETA:** 0.5d — **Verify:** logs/metrics dashboard

## Deployment & Rollback

- [ ] Docker images build for backend/web/ai-service — **Owner:** devops — **ETA:** 0.5–1d — **Verify:** `docker build` for each
- [ ] Railway/Vercel configs verified (or VPS Nginx) — **Owner:** devops — **ETA:** 0.5d — **Verify:** deploy to staging
- [ ] Rollback plan: revert image/tag + db backup tested — **Owner:** devops — **ETA:** 0.5d — **Verify:** restore from backup in staging

## Verification Commands/Endpoints

- Backend tests: `cd apps/backend && npm test` (must pass)
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Checklist eval: `npm run ai:evaluate:checklist`
- Doc-check eval: `npm run ai:evaluate:doccheck`
- Health: `GET /api/health`

## Owners Legend

- backend = Node/Express/Prisma contributors
- web = Next.js/admin contributors
- ai = Prompt/RAG/LLM contributors
- devops = infra/deployment contributors


