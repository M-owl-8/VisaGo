# Document Upload & Verification Pipeline

Last updated: 2025-12-17

## Sequence

1. UI selects file → POST `/api/documents/upload` (multer 20MB, MIME whitelist)  
   Code: `apps/backend/src/routes/documents.ts:64-111`
2. Ownership check (userId + applicationId)  
   Code: `apps/backend/src/routes/documents.ts:114-120`
3. Storage adapter chooses Firebase or local  
   Code: `apps/backend/src/services/storage-adapter.ts`
4. Firebase upload + signed URL (7 days)  
   Code: `apps/backend/src/services/firebase-storage.service.ts:222-386`
5. DB record create/update (re-upload resets status to pending)  
   Code: `apps/backend/src/routes/documents.ts:153-210`
6. Background queue job enqueued (AI validation, progress)  
   Code: `apps/backend/src/services/document-processing-queue.service.ts:25-220`
7. AI validation → status `verified|rejected` + notes  
   Code: `apps/backend/src/services/document-validation.service.ts`
8. Status polling `/api/documents/:documentId/status` or list `/api/documents`  
   Code: `apps/backend/src/routes/documents.ts:286-356`

## Re-upload Behavior

- Same applicationId + documentType → update existing row, set status `pending`  
  Code: `apps/backend/src/routes/documents.ts:153-210`
- Resets AI fields and notes  
  Code: `apps/backend/src/routes/documents.ts:169-183`

## Validation

- Size: 20MB limit (multer) — `apps/backend/src/routes/documents.ts:28-32`
- MIME: pdf/jpeg/png/doc/docx — `apps/backend/src/routes/documents.ts:33-47`
- Future: virus scan (not implemented)

## Auth & Access

- Auth required on all routes — `apps/backend/src/routes/documents.ts:55`
- Ownership enforced on fetch/status/delete — `apps/backend/src/routes/documents.ts:292-317`, `433-486`, `515-534`
- Signed URLs expire in 7 days; fallback makes file public if failure (needs tightening) — `firebase-storage.service.ts:365-376`

## Storage

- Firebase bucket (primary) — configure `FIREBASE_*` envs; `FIREBASE_STORAGE_BUCKET`
- Local fallback — `apps/backend/src/services/local-storage.service.ts`

## Auditing

- No history table; current record overwritten on re-upload (gap)
- ActivityLog model exists — `apps/backend/prisma/schema.prisma:297-310` (can log uploads)

## Code References

- Upload route: `apps/backend/src/routes/documents.ts`
- Storage adapter: `apps/backend/src/services/storage-adapter.ts`
- Firebase storage: `apps/backend/src/services/firebase-storage.service.ts`
- Queue: `apps/backend/src/services/document-processing-queue.service.ts`
- Validation: `apps/backend/src/services/document-validation.service.ts`
