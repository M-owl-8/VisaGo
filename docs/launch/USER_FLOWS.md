# User Flows

Last updated: 2025-12-17

## Onboarding & Auth

1. Open app/web → Landing (`apps/web/app/page.tsx`)
2. Register/Login (`apps/backend/src/routes/auth.ts:21-200`)
3. Token stored; user state set (`frontend_new/src/store/auth.ts:274-370`)

## Create Application

1. Select country/visa type (`apps/backend/src/routes/countries.ts`, `.../routes/visa-types.ts`)
2. POST /api/applications (`apps/backend/src/routes/applications.ts`)
3. Application saved with status `draft` (`apps/backend/prisma/schema.prisma:131-158`)

## Generate Checklist

1. GET /api/document-checklist/:applicationId (`apps/backend/src/routes/document-checklist.ts`)
2. Service builds or returns cached checklist (`apps/backend/src/services/document-checklist.service.ts:180-299`)
3. AI enrichment via GPT-4o (`apps/backend/src/services/visa-checklist-engine.service.ts`)

## Upload Documents

1. User uploads via UI (`apps/web/app/(dashboard)/applications/[id]/documents/page.tsx`)
2. POST /api/documents/upload (multer 20MB, MIME check) (`apps/backend/src/routes/documents.ts:64-111`)
3. Stored in Firebase/local, DB record created/updated (`apps/backend/src/services/storage-adapter.ts`, `.../firebase-storage.service.ts`)
4. Background queue validates (`apps/backend/src/services/document-processing-queue.service.ts`)

## Verification Outcomes

- Status `pending` → AI validation → `verified` | `rejected` (`apps/backend/prisma/schema.prisma:190-234`)
- Notes and confidence saved (`apps/backend/src/services/document-validation.service.ts`)

## Progress Tracking

- Checkpoints per application (`apps/backend/prisma/schema.prisma:160-176`)
- Checklist status `processing|ready|failed` (`apps/backend/prisma/schema.prisma:629-644`)

## Payment / Subscription

- Payment methods listing `/api/payments/methods` honors freeze (`apps/backend/src/routes/payments-complete.ts:65-125`)
- Initiation `/api/payments/initiate` → gateway redirect (`apps/backend/src/routes/payments-complete.ts:256-362`)
- Webhooks with idempotency (`apps/backend/prisma/schema.prisma:260-281`)

## Support

- Support page (web) (`apps/web/app/(dashboard)/support/page.tsx`)
- Tickets/FAQ (static) (`apps/web/components/landing/FAQSection.tsx`)

## Code References

- Auth: `apps/backend/src/routes/auth.ts`
- Applications: `apps/backend/src/routes/applications.ts`
- Checklist: `apps/backend/src/routes/document-checklist.ts`
- Documents: `apps/backend/src/routes/documents.ts`
- Payments: `apps/backend/src/routes/payments-complete.ts`
- Chat: `apps/backend/src/routes/chat.ts`


