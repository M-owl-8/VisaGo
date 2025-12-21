# Launch Timeline & Gates

## Gates (must pass for launch)

- P0: Backend env configured (JWT_SECRET ≥32, DATABASE_URL Postgres, OCR_PROVIDER valid)
- P0: Prisma migrations applied; app boots without errors
- P0: Core flows green in staging: register/login → create application → checklist → upload doc → doc-check → status visible
- P0: Tests for checklist/doc-check/condition logic pass (or equivalent manual verification with evidence)
- P0: Storage working (local/Firebase) with retrieval
- P0: Health and basic monitoring enabled; rollback path defined

## Estimates

- Best-case: 3–4 days (if fixes are straightforward and env is set)
- Likely: 5–7 days (due to current test failures and env/mocks cleanup)
- Worst-case: 9–12 days (if payment/AI flows need refactor or infra blockers)

## Day-by-Day (next 7–10 days)

Day 1: Fix env/test blockers — set test env vars; fix Zod refinement; align mocks/imports; get tests to run on SQLite.
Day 2: Resolve remaining test failures (database.test, ai-context, doc-checker); update expectations; rerun full suite.
Day 3: Manual E2E in staging: auth, application, checklist, upload, doc-check; verify storage; fix any P0 found.
Day 4: Observability: enable Sentry/logging; verify health checks; add minimal dashboards/alerts.
Day 5: Deployment rehearsal: build Docker images; deploy to staging (Railway/VPS/Vercel); run smoke tests.
Day 6–7: Buffer for fixes from staging; finalize launch checklist; prepare rollback/runbook.
Day 8–10 (if needed): Address deferred P1s, polish UX/admin, optimize prompts.

## Earliest Safe Launch

If P0 items above are completed and staging E2E passes, earliest safe launch is **Day 5–6** from start of this plan.
