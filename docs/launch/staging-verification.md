# Staging Verification (Smoke Test)

Run after each deploy to staging/production to confirm core flow.

## How to Run

- From `apps/backend`:  
  `BASE_URL=https://your-staging-api npm run smoke:staging`

## What to Verify

- Auth: register/login succeeds, token returned
- Application: application created (id present)
- Checklist: 10–16 items returned
- Upload: document upload returns `fileUrl`
- Doc-check: `/doc-check/:applicationId/run` returns success
- Summary: `/doc-check/:applicationId/summary` returns readiness/status

## Latest Run

- Date: _pending_
- BASE*URL: \_pending*
- Result: _pending (pass/fail)_
- Notes: _pending_
