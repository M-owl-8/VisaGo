# Day-1 Scope

Last updated: 2025-12-17

## Must-have (P0)

- Auth (email/password + Google) — `apps/backend/src/routes/auth.ts`
- Application create/list/detail — `apps/backend/src/routes/applications.ts`
- Checklist generation with fallback — `apps/backend/src/routes/document-checklist.ts`, `.../services/visa-checklist-engine.service.ts`
- Document upload & status — `apps/backend/src/routes/documents.ts`
- Chat with AI — `apps/backend/src/routes/chat.ts`
- Payment freeze messaging (no charges) — `apps/backend/src/routes/payments-complete.ts:65-125`
- Error boundaries — `apps/web/app/error.tsx`

## Should-have (P1)

- Admin dashboard basic metrics — `apps/web/app/(dashboard)/admin/dashboard/page.tsx`
- Checklist feedback form — `apps/web/components/checklist/ChecklistFeedbackForm.tsx`
- Health checks detailed — `apps/backend/src/routes/health.ts`
- i18n coverage for dashboard pages — gaps in `apps/web/CURRENT_STATE_SUMMARY.md:98-111`

## Nice-to-have (P2)

- Advanced RAG improvements — `apps/ai-service`
- A/B testing for AI models — `apps/backend/src/ai-model-registry/registry.service.ts`
- Dark mode — not implemented

## Dangerous to Ship

- CORS wildcard in production — `apps/backend/src/index.ts:72-78`
- Firebase rules unverified — rules not in repo; requires console audit
- Checklist fallback may mislead without disclaimer — `apps/backend/src/services/visa-checklist-engine.service.ts`
- Payments partially implemented; freeze must remain on — `apps/backend/src/routes/payments-complete.ts`
- Virus scanning missing for uploads — not implemented

## User-facing Pages (Web)

- Landing: `apps/web/app/page.tsx`
- Auth: `apps/web/app/(auth)/login/page.tsx`, `.../register/page.tsx`, `.../forgot-password/page.tsx`
- Dashboard layout: `apps/web/app/(dashboard)/layout.tsx`
- Applications list/detail/docs: `apps/web/app/(dashboard)/applications/page.tsx`, `[id]/page.tsx`, `[id]/documents/page.tsx`
- Questionnaire: `apps/web/app/(dashboard)/questionnaire/page.tsx`
- Chat: `apps/web/app/(dashboard)/chat/page.tsx`
- Support: `apps/web/app/(dashboard)/support/page.tsx`
- Admin: `apps/web/app/(dashboard)/admin/*`

## Code References

- Backend routes: `apps/backend/src/routes/*.ts`
- Prisma models: `apps/backend/prisma/schema.prisma`
- Web components: `apps/web/components/*`
