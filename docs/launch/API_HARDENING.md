# API Hardening

Last updated: 2025-12-17

## Input Validation

- Middleware: `apps/backend/src/middleware/validation.ts`, `.../request-validation.ts`
- Auth register/login validation: `apps/backend/src/routes/auth.ts:33-132`
- To add: Zod/request validation on applications, chat, admin routes.

## Authentication & Authorization

- JWT verify middleware: `apps/backend/src/middleware/auth.ts:54-270`
- Admin guard: `apps/backend/src/middleware/admin.ts`
- Ownership checks: documents (`apps/backend/src/routes/documents.ts:114-120`), applications (verify userId), payments (ensure user owns payment).

## Rate Limiting

- Login/register: `apps/backend/src/routes/auth.ts:33-132`
- Chat: `apps/backend/src/middleware/chat-rate-limit.ts`
- Checklist/doc validation: `apps/backend/src/middleware/checklist-rate-limit.ts`

## CORS

- Config: `apps/backend/src/index.ts:154-182`, `apps/backend/src/config/env.ts:172-183`
- Action: Fail startup if `CORS_ORIGIN='*'` in production.

## Error Handling

- Global handler: `apps/backend/src/index.ts:335-381`
- Standard shape: `{success:false,error:{status,message,code}}`
- User-friendly errors: `apps/backend/src/utils/user-friendly-errors.ts`

## Security Headers

- Helmet enabled: `apps/backend/src/index.ts:149`
- Additional headers: `apps/backend/src/middleware/securityHeaders.ts`

## Payments Security

- Signature verification: `apps/backend/src/services/webhook-security.ts`
- Idempotency: `apps/backend/prisma/schema.prisma:260-281`
- Payment freeze flag: `apps/backend/src/utils/payment-freeze.ts`

## Data Protection

- Prisma ORM (parameterized queries)
- Sanitization: `apps/backend/src/utils/input-sanitization.ts`
- Avoid logging secrets: Logger sanitization in `apps/backend/src/middleware/logger.ts`

## Actions to Implement

1. Enforce CORS strict in prod (startup fail on `*`)
2. Add validation to remaining routes (applications, chat search, admin)
3. Ensure all resource fetches include userId scope (payments, applications)
4. Add AV scan hook before accepting uploads
5. Add requestId middleware and propagate to logs


