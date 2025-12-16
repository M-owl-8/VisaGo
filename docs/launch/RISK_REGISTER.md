# Risk Register (Top 20)

Last updated: 2025-12-17

| #   | Risk                                                          | Impact | Likelihood | Mitigation                                                                                | Owner    |
| --- | ------------------------------------------------------------- | ------ | ---------- | ----------------------------------------------------------------------------------------- | -------- |
| 1   | CORS misconfig allows cross-origin abuse (`index.ts:154-182`) | High   | Med        | Enforce strict origins in prod                                                            | Backend  |
| 2   | Firebase rules permissive/mis-set                             | High   | Med        | Audit rules, signed URL 7d max (`firebase-storage.service.ts:365-376`)                    | Backend  |
| 3   | AI hallucination without disclaimer                           | High   | Med        | Add disclaimer + source citations (`chat.service.ts`, `visa-checklist-engine.service.ts`) | Backend  |
| 4   | Payments webhook replay                                       | High   | Low        | WebhookIdempotency table (`schema.prisma:260-281`), verify signature                      | Backend  |
| 5   | JWT secret weak                                               | High   | Low        | Enforce >=32 chars (`config/env.ts:21`)                                                   | Backend  |
| 6   | Checklist regeneration causing inconsistency                  | Med    | Med        | Enforce one-time & status checks (`document-checklist.service.ts:180-219`)                | Backend  |
| 7   | Document access by other users                                | High   | Low        | Ownership checks (`routes/documents.ts:114-120`)                                          | Backend  |
| 8   | Missing input validation on some routes                       | Med    | Med        | Apply Zod/request validation (`middleware/validation.ts`)                                 | Backend  |
| 9   | AI cost overrun                                               | Med    | Med        | Token tracking (`schema.prisma:386-401`), rate limits (`chat-rate-limit.ts`)              | Backend  |
| 10  | Missing monitoring alerts                                     | Med    | High       | Configure Sentry alerts; add metrics (`routes/monitoring.ts`)                             | DevOps   |
| 11  | Slow queries/N+1                                              | Med    | Med        | Add indexes (`schema.prisma`), use includes, monitor (`slow-query-logger.ts`)             | Backend  |
| 12  | Upload virus scanning absent                                  | High   | Med        | Integrate AV before accept (not implemented)                                              | Backend  |
| 13  | Data loss on migration                                        | High   | Low        | Backups + rollback documented in RUNBOOK                                                  | DevOps   |
| 14  | Mobile layout breakage                                        | Med    | Med        | Fix hero/scroll (`apps/web/app/page.tsx`, `HeroSection.tsx`)                              | Frontend |
| 15  | Incomplete i18n                                               | Low    | Med        | Audit translations (`apps/web/CURRENT_STATE_SUMMARY.md:98-111`)                           | Frontend |
| 16  | Payment freeze mis-set                                        | Med    | Low        | Validate freeze flag (`payment-freeze.ts`, `payments-complete.ts:65-125`)                 | Backend  |
| 17  | Cache invalidation errors                                     | Med    | Med        | Define cache keys & TTL (`cache.service.optimized.ts`, `document-checklist.service.ts`)   | Backend  |
| 18  | Rate limit bypass via missing requestId                       | Low    | Med        | Add requestId correlation in logs                                                         | Backend  |
| 19  | Health checks not covering dependencies                       | Low    | Med        | Extend `/api/health` to DB/Redis/AI/Firebase                                              | Backend  |
| 20  | Admin panel incomplete CRUD                                   | Low    | Med        | Finish admin routes/pages (`apps/web/app/(dashboard)/admin/*`)                            | Frontend |
