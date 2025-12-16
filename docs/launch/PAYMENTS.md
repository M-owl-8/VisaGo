# Payments

Last updated: 2025-12-17

## Providers

- Payme, Click, Uzum, Stripe (conditionally enabled by env) — `apps/backend/src/routes/payments-complete.ts:17-55`
- Freeze flag (promo) — `apps/backend/src/utils/payment-freeze.ts`, `.../routes/payments-complete.ts:65-125`

## Flows

1. List methods `/api/payments/methods` (respects freeze)
2. Initiate `/api/payments/initiate` with applicationId, returnUrl — `apps/backend/src/routes/payments-complete.ts:256-362`
3. Gateway redirect/checkout
4. Webhook → signature check → idempotency → status update — `apps/backend/src/routes/payments-complete.ts:564-670`, `apps/backend/prisma/schema.prisma:260-281`
5. Refunds `/api/payments/:id/refund` — `apps/backend/src/routes/payments-complete.ts:466-563`

## Data Model

- Payment: status `pending|completed|failed|refunded|partially_refunded`, unique applicationId — `apps/backend/prisma/schema.prisma:236-258`
- Refund: status `pending|processing|completed|failed` — `apps/backend/prisma/schema.prisma:584-603`
- WebhookIdempotency: dedupe by fingerprint — `apps/backend/prisma/schema.prisma:260-281`

## Security

- Signature verification per gateway: `apps/backend/src/services/webhook-security.ts`
- Idempotency for webhooks: WebhookIdempotency model
- Auth: payment read requires auth (`payments-complete.ts:131-188`)
- Payment freeze: returns empty methods and message (`payments-complete.ts:95-124`)

## Edge Cases to Test

- Duplicate webhook deliveries (should be ignored after first)
- Payment initiate twice (should be idempotent)
- Refund partial vs full
- Invalid signature → 400/401
- Freeze enabled → no charge

## Acceptance Criteria

- No double charges (idempotency works)
- Status transitions correct
- Webhooks verified
- Entitlements gated on payment status (if/when enabled)
