# State Machines

Last updated: 2025-12-17

## Application (VisaApplication / Application)

States (DB): `draft`, `submitted`, `under_review`, `approved`, `rejected`, `expired`

- VisaApplication: `apps/backend/prisma/schema.prisma:131-158`
- Application (new model): `apps/backend/prisma/schema.prisma:605-627`

Transitions & Triggers

- draft → submitted: User submits application (`apps/backend/src/routes/applications.ts`)
- submitted → under_review: Internal/manual review start (service logic TBD)
- under_review → approved|rejected: Manual/AI decision (`apps/backend/src/services/applications.service.ts`)
- any → expired: Time-based job (not implemented; add cron)

Validation

- Unique (userId,countryId,visaTypeId) (`schema.prisma:155-158`)
- Progress tracked via `Checkpoint` (`schema.prisma:160-176`)

## UserDocument

States: `pending`, `verified`, `rejected`

- Model: `apps/backend/prisma/schema.prisma:190-234`

Transitions & Triggers

- pending → verified/rejected: AI validation in queue (`apps/backend/src/services/document-processing-queue.service.ts:117-220`)
- pending → pending: Re-upload same documentType resets status (`apps/backend/src/routes/documents.ts:153-210`)

Checks

- MIME/size guard (20MB) (`apps/backend/src/routes/documents.ts:28-47`)
- Ownership check (`apps/backend/src/routes/documents.ts:114-120`)

## DocumentChecklist

States: `processing`, `ready`, `failed`

- Model: `apps/backend/prisma/schema.prisma:629-644`
- Generation: `apps/backend/src/services/document-checklist.service.ts:180-299`

Transitions

- processing → ready: AI/rule checklist done
- processing → failed: Exception during generation
- failed → ready: Retry/fallback generation

## Payments

States: `pending`, `completed`, `failed`, `refunded`, `partially_refunded`

- Model: `apps/backend/prisma/schema.prisma:236-258`
- Webhooks drive transitions (`apps/backend/src/routes/payments-complete.ts:564-670`)

## Mismatch Notes / Fixes

- Dual application models (Application vs VisaApplication). Min-impact fix: standardize routes to use VisaApplication until migration plan; document mapping in RUNBOOK.
- No explicit expired transition job; add scheduled task.

## Code References

- Prisma models: `apps/backend/prisma/schema.prisma`
- Checklist engine: `apps/backend/src/services/visa-checklist-engine.service.ts`
- Document queue: `apps/backend/src/services/document-processing-queue.service.ts`
- Payments: `apps/backend/src/routes/payments-complete.ts`
