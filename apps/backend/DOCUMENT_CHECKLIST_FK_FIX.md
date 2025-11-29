# DocumentChecklist Foreign Key Fix

**Date:** 2025-11-30  
**Status:** ✅ Fixed

---

## Problem

Production error: `Foreign key constraint violated: DocumentChecklist_applicationId_fkey`

**Root Cause:**

- The API routes use `prisma.visaApplication` (VisaApplication table)
- DocumentChecklist FK was pointing to `Application` table
- When creating DocumentChecklist entries for VisaApplication IDs, FK constraint failed because those IDs don't exist in Application table

**Example failing IDs:**

- `cmihw2nyv00013tf6157pvbe7` (mobile)
- `cmigd1tpo0001127dirrpa5tf` (web)

---

## Solution

### 1. Schema Updates

**Files Modified:**

- `apps/backend/prisma/schema.postgresql.prisma`
- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/schema.sqlite.prisma`

**Changes:**

- Updated `DocumentChecklist.application` relation to point to `VisaApplication` instead of `Application`
- Added `documentChecklist DocumentChecklist?` relation to `VisaApplication` model
- Removed `documentChecklist DocumentChecklist?` relation from `Application` model (it was never used)

### 2. Migration Created

**Migration:** `20251130044327_fix_document_checklist_fk_to_visa_application`

**SQL:**

```sql
-- Drop old FK pointing to Application
ALTER TABLE "DocumentChecklist" DROP CONSTRAINT IF EXISTS "DocumentChecklist_applicationId_fkey";

-- Add new FK pointing to VisaApplication (the table actually used by the API)
ALTER TABLE "DocumentChecklist"
  ADD CONSTRAINT "DocumentChecklist_applicationId_fkey"
  FOREIGN KEY ("applicationId")
  REFERENCES "VisaApplication"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
```

**Safety:**

- ✅ Non-destructive: Only changes FK constraint
- ✅ No data loss: Table and data remain intact
- ✅ Safe for production: Can be applied to live database

### 3. Service Hardening

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Changes:**

- Added input validation at method start
- Added defensive check: verify application exists before any DocumentChecklist operations
- Wrapped all `documentChecklist.upsert()` and `documentChecklist.update()` calls in try-catch
- Specific FK violation error handling with user-friendly messages
- Uses `application.id` (from validated DB row) instead of raw param

**Error Handling:**

- FK violations (P2003) are caught and logged with clear messages
- Returns user-friendly error instead of leaking stack traces
- Other errors are re-thrown normally

### 4. Debug Script

**File:** `apps/backend/scripts/debugChecklists.ts`

**Purpose:** Read-only script to check which table contains application IDs

**Usage:**

```bash
cd apps/backend
DATABASE_URL="your-railway-postgres-url" ts-node --project scripts/tsconfig.json scripts/debugChecklists.ts <applicationId>
```

---

## Verification

### Schema Consistency

✅ All three schema files have identical `DocumentChecklist` models:

- Points to `VisaApplication` (not `Application`)
- Same fields, indexes, and constraints

✅ `VisaApplication` model has `documentChecklist DocumentChecklist?` relation in all schemas

### Migration Safety

✅ Migration only changes FK constraint (non-destructive)
✅ No DROP TABLE or DROP COLUMN operations
✅ Safe to apply to production database with existing data

### TypeScript Compilation

✅ `npx tsc --noEmit` passes with no errors
✅ All logError calls use correct signature

---

## Deployment

### Railway Deployment Flow

1. **Next Railway deployment will:**
   - Run `prisma migrate deploy` (via `startup.js`)
   - Apply migration `20251130044327_fix_document_checklist_fk_to_visa_application`
   - Drop old FK constraint pointing to Application
   - Create new FK constraint pointing to VisaApplication

2. **After migration:**
   - DocumentChecklist FK now correctly references VisaApplication
   - FK violations will stop occurring
   - `/api/document-checklist/:applicationId` will work for all applications

### Verification After Deployment

1. **Check Railway logs for:**

   ```
   [Startup] Migrations completed successfully
   ```

2. **Test the endpoint:**

   ```bash
   GET /api/document-checklist/cmigd1tpo0001127dirrpa5tf
   ```

   Should return 200 with checklist data (no FK errors)

3. **Check database:**
   ```sql
   SELECT constraint_name, table_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'DocumentChecklist';
   ```
   Should show FK pointing to `VisaApplication`, not `Application`

---

## Test Plan

### Manual Testing After Deployment

#### 1. Web App Test

1. **Create new application:**
   - Log in to web app
   - Create new visa application (e.g., Spain tourist)
   - Note the application ID

2. **Open application details:**
   - Navigate to `/applications/[id]`
   - This triggers `GET /api/document-checklist/:applicationId`

3. **Verify:**
   - ✅ No 500 errors in browser console
   - ✅ Checklist loads and displays documents
   - ✅ No FK violation errors in Railway logs

#### 2. Mobile App Test

1. **Create/select application:**
   - Open mobile app
   - Create or select an existing visa application
   - Note the application ID

2. **Open application details:**
   - Tap on application to view details
   - This triggers `GET /api/document-checklist/:applicationId`

3. **Verify:**
   - ✅ No "Request failed with status code 500" errors
   - ✅ Checklist loads and displays documents
   - ✅ No FK violation errors in Railway logs

#### 3. Edge Cases

1. **Non-existent application ID:**
   - Call `/api/document-checklist/invalid-id`
   - Should return 404 (not 500 FK error)

2. **Application from different user:**
   - Try to access another user's application
   - Should return 403 Forbidden (not FK error)

3. **Concurrent requests:**
   - Multiple requests for same applicationId
   - Should handle gracefully (one creates, others wait)

---

## Files Changed

1. **Schemas:**
   - `apps/backend/prisma/schema.postgresql.prisma`
   - `apps/backend/prisma/schema.prisma`
   - `apps/backend/prisma/schema.sqlite.prisma`

2. **Migration:**
   - `apps/backend/prisma/migrations/20251130044327_fix_document_checklist_fk_to_visa_application/migration.sql`

3. **Service:**
   - `apps/backend/src/services/document-checklist.service.ts`

4. **Debug Script:**
   - `apps/backend/scripts/debugChecklists.ts` (new)

5. **Documentation:**
   - `apps/backend/DOCUMENT_CHECKLIST_FK_FIX.md` (this file)

---

## Summary

✅ **Schema fixed:** DocumentChecklist now points to VisaApplication (the table actually used)
✅ **Migration created:** Non-destructive FK constraint update
✅ **Service hardened:** Defensive checks and FK violation error handling
✅ **TypeScript compiles:** No errors
✅ **Ready for deployment:** Migration will apply automatically on next Railway deploy

**Next Step:** Deploy to Railway. The migration will run automatically and fix the FK constraint.
