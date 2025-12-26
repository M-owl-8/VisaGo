# Observability

Last updated: 2025-12-17

## Logging

- Logger middleware: `apps/backend/src/middleware/logger.ts`
- Global error handler: `apps/backend/src/index.ts:335-381`
- Action: add requestId middleware before logger, propagate in responses.

## Metrics

- Basic monitoring routes: `apps/backend/src/routes/monitoring.ts`
- Slow query logger (console) — `apps/backend/src/services/slow-query-logger.ts`
- Action: implement metrics service (AI latency/failure, uploads, DB) and expose in monitoring route; add admin dashboard page.

## Tracing

- Not implemented. Action: add OpenTelemetry tracer with HTTP + Prisma instrumentation.

## Error Tracking

- Sentry initialized (`apps/backend/src/index.ts:117-127`)
- Action: configure alerts (error rate >5%, P95 latency >5s, AI failures, webhook failures).

## Health Checks

- `apps/backend/src/routes/health.ts` (basic)
- Action: include DB, Redis, Firebase, AI service connectivity; add `/ready` and `/live`.

## Dashboards (to build)

- API errors by endpoint
- AI latency/failure rate
- Upload success/failure
- Payment webhook success/failure
- DB slow queries

## Alerting (to configure in Sentry/monitoring)

- Error spike
- AI timeout rate
- Upload failure rate
- Webhook failures
- Redis/DB connectivity loss

## Code References

- `apps/backend/src/index.ts`
- `apps/backend/src/routes/monitoring.ts`
- `apps/backend/src/services/slow-query-logger.ts`
- `ANALYTICS_MONITORING_COMPLETE.md:264-321`


