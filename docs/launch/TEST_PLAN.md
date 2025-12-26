# Test Plan

Last updated: 2025-12-17

## Scope

- Backend API (auth, applications, checklist, documents, payments, chat)
- Web admin flows
- Mobile critical flows (baseline)
- AI responses validation

## Test Matrix

- Unit: services, utilities
- Integration: routes + DB
- E2E: critical user journeys
- Load: concurrency on key endpoints

## Critical Paths

1. Auth: register/login → token set (`apps/backend/src/routes/auth.ts`)
2. Application create → checklist → upload doc → status update (`routes/applications.ts`, `routes/document-checklist.ts`, `routes/documents.ts`)
3. Chat send/receive with application context (`routes/chat.ts`)
4. Payments: initiate → webhook → status update (`routes/payments-complete.ts`)

## Unit Tests (Backend)

- ai-openai.service (mock OpenAI) — `apps/backend/src/services/ai-openai.service.ts`
- visa-checklist-engine.service — ensure validation/fallback
- document-validation.service — statuses map correctly
- payment-gateway.service — signature + idempotency

## Integration Tests (Backend)

- Auth flow (`apps/backend/src/__tests__/integration/auth-flow.test.ts`)
- Applications CRUD
- Documents upload/list/status
- Payments initiate/webhook (sandbox)
- Chat history/session security

## E2E (Web/Mobile)

- Journey: register → application → checklist → doc upload → chat
- Payment happy-path (test gateway)
- Admin: view applications, documents, payments
- Error cases: invalid file, rate limit, expired token

## Load Testing

- Tool: Artillery/k6
- Scenarios:
  - 100 concurrent application creations
  - 50 concurrent document uploads (20MB)
  - 200 concurrent chat messages
- Targets: P95 < 2s (API), no errors >1%

## Test Data

- Users: normal + admin
- Applications: draft/submitted
- Documents: passport (pdf/jpg), bank statement (pdf)
- Payments: sandbox tokens for each gateway

## Minimum Pass Criteria

- All P0 paths pass (auth, checklist, upload, chat, payments)
- No unauthorized access (403) across resources
- AI responses validated (JSON schema)
- Load test meets targets

## Code References

- Jest config: `apps/backend/jest.config.js`
- Tests folder: `apps/backend/src/__tests__/`
- Load test config: `apps/backend/load-test-artillery.yml`


