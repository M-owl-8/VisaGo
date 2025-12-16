# Performance

Last updated: 2025-12-17

## Bottlenecks

- Potential N+1 on applications/documents — `apps/backend/src/routes/applications.ts`, `.../services/applications.service.ts`
- Checklist generation latency (AI calls) — `apps/backend/src/services/visa-checklist-engine.service.ts`
- Chat AI latency — `apps/backend/src/routes/chat.ts` -> AI service
- Slow queries log only to console — `apps/backend/src/services/slow-query-logger.ts`

## Targets

- API P95 < 2s
- AI P95 < 10s
- Upload P95 < 3s to 202 response
- DB queries P95 < 100ms

## Caching

- Checklist cached per application in DB — `document-checklist.service.ts:180-219`
- Redis cache service — `cache.service.optimized.ts`
- Action: define cache keys (checklist, country, visa types), add invalidation on updates.

## Rate Limiting / Queues

- Chat & checklist limits — `chat-rate-limit.ts`, `checklist-rate-limit.ts`
- Document processing queue — `document-processing-queue.service.ts`

## Optimizations to Implement

1. Add indexes: `VisaApplication (userId,status,countryId,visaTypeId)`, `UserDocument (applicationId,status)` — `apps/backend/prisma/schema.prisma`
2. Use Prisma include to avoid N+1 in applications/documents routes
3. Add request time metrics (middleware) and expose in monitoring
4. Reduce prompt size / reuse context in AI calls
5. Image compression already available (enable compress=true for uploads) — `firebase-storage.service.ts:222-327`

## Load Testing

- Config: `apps/backend/load-test-artillery.yml` (extend)
- Scenarios: 100 concurrent app creations; 50 concurrent uploads; 200 chat messages

## Code References

- `apps/backend/src/routes/applications.ts`
- `apps/backend/src/services/visa-checklist-engine.service.ts`
- `apps/backend/src/routes/documents.ts`
- `apps/backend/src/services/slow-query-logger.ts`
