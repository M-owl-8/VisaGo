# VisaBuddy/Ketdik Launch Plan

Last updated: 2025-12-17

## Scope and Owners

All items list owner (role), priority (P0/P1/P2), effort (S/M/L), and Definition of Done. Code references point to current implementations that must back each claim.

## Product / UX

### P0

- Landing hero overlap & double-scroll fix — Owner: Frontend — Effort: S — DoD: No horizontal scroll on 320–768px, hero readable, single scroll container. Code: `apps/web/app/page.tsx:42-64`, `apps/web/components/landing/HeroSection.tsx:12-77`.
- Auth input consistency — Owner: Frontend — Effort: S — DoD: Inputs render consistently across browsers. Code: `apps/web/components/auth/AuthField.tsx`.
- Footer spacing — Owner: Frontend — Effort: S — DoD: Footer does not create nested scroll. Code: `apps/web/components/landing/LandingFooter.tsx`.
- Error boundaries — Owner: Frontend — Effort: M — DoD: All major routes wrapped. Code: `apps/web/app/error.tsx:9-80`, `apps/web/components/errors/ErrorBoundary.tsx`.
- Loading states — Owner: Frontend — Effort: M — DoD: Skeletons/spinners on checklist, doc upload, chat. Code: `apps/web/components/ui/Skeleton.tsx`, `apps/web/components/checklist/DocumentChecklist.tsx`.

### P1

- Accessibility (WCAG 2.1 AA) — Owner: Frontend — Effort: L — DoD: Focus states, contrast, keyboard nav. Code: Not found in repo (needs audit).
- Clear validation messages — Owner: Frontend — Effort: M — DoD: All forms show actionable errors. Code: `apps/web/lib/stores/auth.ts`, `apps/web/components/landing/HeroSection.tsx` (CTA validation).
- Toast system — Owner: Frontend — Effort: S — DoD: Consistent toast UX. Code: `apps/web/components/ui/Toast.tsx`, `apps/web/components/ui/ToastContainer.tsx`.

### P2

- Animations — Owner: Frontend — Effort: M — DoD: Smooth transitions without layout shift. Code: `apps/web/components/layout/PageTransition.tsx`.
- Dark mode — Owner: Frontend — Effort: L — DoD: Theme toggle end-to-end. Code: Not found.

## Backend / API

### P0

- Input validation on all write endpoints — Owner: Backend — Effort: M — DoD: Zod/request validation applied; 400 on invalid. Code: `apps/backend/src/middleware/validation.ts`, `apps/backend/src/middleware/request-validation.ts`.
- Authorization checks — Owner: Backend — Effort: M — DoD: Resource ownership enforced. Code: `apps/backend/src/middleware/auth.ts:54-270`, `apps/backend/src/routes/documents.ts:114-120`, `apps/backend/src/routes/applications.ts`.
- Error format standard — Owner: Backend — Effort: S — DoD: `{success:false,error:{message,code}}`. Code: `apps/backend/src/index.ts:335-381`.
- Rate limiting on AI endpoints — Owner: Backend — Effort: M — DoD: Per-user/IP limits on chat/checklist. Code: `apps/backend/src/middleware/chat-rate-limit.ts`, `apps/backend/src/middleware/checklist-rate-limit.ts`.
- CORS strict in prod — Owner: Backend — Effort: S — DoD: No `*` in production. Code: `apps/backend/src/index.ts:154-182`, `apps/backend/src/config/env.ts:172-183`.

### P1

- Idempotency for payments — Owner: Backend — Effort: M — DoD: Idempotent initiation & webhooks. Code: `apps/backend/prisma/schema.prisma:260-281`, `apps/backend/src/routes/payments-complete.ts:256-362`.
- Request ID correlation — Owner: Backend — Effort: M — DoD: All logs carry requestId. Code: `apps/backend/src/middleware/logger.ts` (needs extension).

## AI

### P0

- GPT output validation — Owner: Backend — Effort: M — DoD: Zod validates before DB write. Code: `apps/backend/src/services/visa-checklist-engine.service.ts:38-94`, `apps/backend/src/utils/json-validator.ts`.
- Fallbacks — Owner: Backend — Effort: M — DoD: Rule-based checklist fallback; graceful chat errors. Code: `apps/backend/src/services/visa-checklist-engine.service.ts:221-294`, `apps/backend/src/routes/chat.ts:28-258`.
- Token tracking/limits — Owner: Backend — Effort: M — DoD: Per-user token tracking. Code: `apps/backend/prisma/schema.prisma:386-401`, `apps/backend/src/services/ai-openai.service.ts:97-118`.

### P1

- AI response caching — Owner: Backend — Effort: M — DoD: Checklist cached by applicationId. Code: `apps/backend/src/services/document-checklist.service.ts:180-214`.
- A/B model routing — Owner: Backend — Effort: L — DoD: Registry-based routing. Code: `apps/backend/src/ai-model-registry/registry.service.ts`.

## Docs Upload & Verification

### P0

- Size/type validation — Owner: Backend — Effort: S — DoD: 20MB cap, allowed MIME enforced. Code: `apps/backend/src/routes/documents.ts:28-47`.
- Re-upload reset — Owner: Backend — Effort: S — DoD: Same documentType updates record, sets status pending. Code: `apps/backend/src/routes/documents.ts:153-210`.
- AuthZ on upload — Owner: Backend — Effort: S — DoD: Verify application ownership. Code: `apps/backend/src/routes/documents.ts:114-120`.
- Signed URLs expiry — Owner: Backend — Effort: M — DoD: Max 7 days, no public fallback in prod. Code: `apps/backend/src/services/firebase-storage.service.ts:365-376`.

### P1

- Document history retention — Owner: Backend — Effort: M — DoD: Keep prior file metadata. Code: Not found (needs design).
- Virus scanning — Owner: Backend — Effort: L — DoD: AV scan before accept. Code: Not found.

## Payments

### P0

- Webhook signature + idempotency — Owner: Backend — Effort: M — DoD: Verify signature, dedupe. Code: `apps/backend/src/services/webhook-security.ts`, `apps/backend/prisma/schema.prisma:260-281`.
- Payment status state machine — Owner: Backend — Effort: M — DoD: pending→completed/failed/refunded. Code: `apps/backend/prisma/schema.prisma:236-258`.
- Freeze flag honored — Owner: Backend — Effort: S — DoD: Promo freeze blocks charge. Code: `apps/backend/src/utils/payment-freeze.ts`, `apps/backend/src/routes/payments-complete.ts:65-125`.

### P1

- Reconciliation job — Owner: Backend — Effort: M — DoD: Daily reconcile. Code: `apps/backend/src/routes/payments-complete.ts:709-788`.

## Security / Compliance

### P0

- JWT strength & rotation plan — Owner: Backend — Effort: S — DoD: >=32 chars, rotation documented. Code: `apps/backend/src/config/env.ts:21`, `apps/backend/src/index.ts:80-86`.
- XSS/SQLi protection — Owner: Backend — Effort: S — DoD: Sanitization & ORM. Code: `apps/backend/src/utils/input-sanitization.ts`, Prisma everywhere.
- Rate limit auth — Owner: Backend — Effort: S — DoD: Login/Register limited. Code: `apps/backend/src/routes/auth.ts:33-132`.

### P1

- Audit logging — Owner: Backend — Effort: M — DoD: Sensitive ops logged. Code: `apps/backend/prisma/schema.prisma:283-310`.
- 2FA for admins — Owner: Backend — Effort: L — Code: Not found.

## Observability

### P0

- Error tracking — Owner: Backend — Effort: S — DoD: Sentry configured. Code: `apps/backend/src/index.ts:117-127`.
- Health checks — Owner: Backend — Effort: S — DoD: Ready/live with DB/Redis/Firebase/AI. Code: `apps/backend/src/routes/health.ts`.

### P1

- Metrics dashboard — Owner: Backend — Effort: L — DoD: AI latency/failures, uploads, DB. Code: `apps/backend/src/routes/monitoring.ts` (basic).
- Request tracing — Owner: Backend — Effort: L — Code: Not found; add OpenTelemetry.

## Performance

### P0

- DB pooling + indexes — Owner: Backend — Effort: S — DoD: Pool configured, indexes on hot queries. Code: `apps/backend/src/services/db-pool.service.ts`, `apps/backend/prisma/schema.prisma:155-158`.
- Caching — Owner: Backend — Effort: M — DoD: Checklist cache, invalidation. Code: `apps/backend/src/services/cache.service.optimized.ts`, `apps/backend/src/services/document-checklist.service.ts`.
- Queueing for uploads — Owner: Backend — Effort: M — DoD: Upload returns 202, background job handles AI validation. Code: `apps/backend/src/routes/documents.ts:220-275`, `apps/backend/src/services/document-processing-queue.service.ts:25-220`.

### P1

- AI timeout/retry tuning — Owner: Backend — Effort: S — Code: `apps/backend/src/services/ai-openai.service.ts`.
- CDN/static — Owner: Frontend — Effort: M — Code: Not found (needs setup).

## Release / Deploy

### P0

- Env validation — Owner: DevOps — Effort: M — DoD: Required envs validated on boot. Code: `apps/backend/src/config/env.ts:12-193`.
- CI/CD gates — Owner: DevOps — Effort: L — DoD: Tests/lint/typecheck/security on PR. Code: `.github/workflows/ci.yml:1-338`.
- Runbook & rollback — Owner: DevOps — Effort: L — Code: `docs/launch/RUNBOOK.md` (to create).

## Support / Ops

### P0

- Alerts configured — Owner: DevOps — Effort: M — DoD: Sentry alerts for error rate, latency, AI failures, webhooks. Code: Sentry config exists; alerts not configured (manual).
- Incident response — Owner: DevOps — Effort: M — DoD: Playbooks documented. Code: `docs/launch/RUNBOOK.md` (to create).

## Top 10 P0 Items (Tracking)

1. Hero overlap/double scroll fix (web) — `apps/web/app/page.tsx`, `HeroSection.tsx`
2. CORS strict in prod — `apps/backend/src/index.ts`, `config/env.ts`
3. Input validation coverage — `middleware/validation.ts`
4. AuthZ on uploads & applications — `routes/documents.ts`, `routes/applications.ts`
5. Doc upload size/type enforcement — `routes/documents.ts`
6. Signed URL expiry & Firebase rules audit — `services/firebase-storage.service.ts`
7. GPT output validation & fallback — `visa-checklist-engine.service.ts`
8. Payment webhook signature/idempotency — `services/webhook-security.ts`, `schema.prisma`
9. AI rate limiting & logging — `middleware/chat-rate-limit.ts`, `middleware/checklist-rate-limit.ts`
10. CI/CD gate enforcement — `.github/workflows/ci.yml`

## Code References (selected)

- Backend entrypoint: `apps/backend/src/index.ts`
- Auth routes: `apps/backend/src/routes/auth.ts`
- Chat routes & service: `apps/backend/src/routes/chat.ts`, `apps/backend/src/services/chat.service.ts`
- Documents: `apps/backend/src/routes/documents.ts`, `apps/backend/src/services/storage-adapter.ts`
- Checklist engine: `apps/backend/src/services/visa-checklist-engine.service.ts`
- Prisma schema: `apps/backend/prisma/schema.prisma`
- Web landing & layout: `apps/web/app/page.tsx`, `apps/web/components/landing/HeroSection.tsx`
