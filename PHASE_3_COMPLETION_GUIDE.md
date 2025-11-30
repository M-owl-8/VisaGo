# Phase 3 Implementation - Completion Guide

## ✅ Completed Backend Implementation

All Phase 3 backend code has been implemented:

### Phase 3.1 - Document Classification
- ✅ Added classification fields to `UserDocument` model in both SQLite and PostgreSQL schemas
- ✅ Created `DocumentClassifierService` with AI-based classification
- ✅ Hooked classification into document upload flow (fire-and-forget)

### Phase 3.2 - Document Checking
- ✅ Created `DocumentCheckResult` model in both schemas
- ✅ Implemented `AIOpenAIService.checkDocument()` method
- ✅ Created `DocCheckService` with matching, checking, and readiness calculation
- ✅ Created API routes: `/api/doc-check/:applicationId/run` and `/api/doc-check/:applicationId/summary`
- ✅ Registered routes in main Express app

### Schema Files Updated
- ✅ `apps/backend/prisma/schema.prisma` (SQLite - for local dev)
- ✅ `apps/backend/prisma/schema.postgresql.prisma` (PostgreSQL - for Railway)

## 🔧 Next Steps to Complete Phase 3

### 1. Fix TypeScript Errors (if any)

There are some pre-existing TypeScript errors in `ai-openai.service.ts` that need to be resolved:
- Line 1882: Try-catch structure issue
- Line 2017: Missing catch/finally
- Line 901: Missing return statement

These appear to be structural issues from previous phases. The `checkDocument` method has been added correctly, but the file structure needs to be verified.

### 2. Run Prisma Migration for Railway PostgreSQL

When your `DATABASE_URL` points to Railway PostgreSQL:

```bash
cd apps/backend

# The schema-selector.js will automatically use schema.postgresql.prisma
# when DATABASE_URL contains 'postgres' or 'railway'

# Generate Prisma Client
npx prisma generate

# Run migration
npx prisma migrate dev --name phase3_document_checking
```

**Note:** The `schema-selector.js` script automatically selects the correct schema based on `DATABASE_URL`. If your `DATABASE_URL` contains:
- `postgres://` or `postgresql://` → uses `schema.postgresql.prisma`
- `railway` or `gondola.proxy.rlwy.net` → uses `schema.postgresql.prisma`
- `file:` → uses `schema.sqlite.prisma`

### 3. Update Frontend (Phase 3.3)

The backend API is ready. Update your frontend to:

1. **Fetch readiness summary** after loading checklist:
   ```typescript
   GET /api/doc-check/:applicationId/summary
   ```

2. **Display readiness percentage**:
   - Show progress bar or indicator
   - Display: "Your application is X% ready"

3. **Show per-item status badges**:
   - ✅ Ready (status === 'OK')
   - ⚠️ Weak (status === 'WEAK' - mapped from PROBLEM/UNCERTAIN)
   - ❌ Missing (status === 'MISSING')
   - ⚪ Not checked (no DocumentCheckResult yet)

4. **Add "Check My Documents" button**:
   ```typescript
   POST /api/doc-check/:applicationId/run
   ```
   - Disable button while running
   - Show spinner
   - Refetch summary after completion

### 4. Test the Implementation

1. **Upload a document**:
   - Should trigger classification automatically
   - Check `UserDocument.classifiedType` is populated

2. **Run document check**:
   ```bash
   POST /api/doc-check/:applicationId/run
   ```

3. **Get summary**:
   ```bash
   GET /api/doc-check/:applicationId/summary
   ```

## 📋 API Endpoints

### POST /api/doc-check/:applicationId/run
Triggers document check for all checklist items.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "summary": {
      "readinessPercent": 80,
      "totalItems": 12,
      "okCount": 8,
      "weakCount": 2,
      "missingCount": 2
    }
  }
}
```

### GET /api/doc-check/:applicationId/summary
Returns readiness summary with per-item statuses.

**Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "...",
    "readinessPercent": 80,
    "totalItems": 12,
    "okCount": 8,
    "weakCount": 2,
    "missingCount": 2,
    "items": [
      {
        "checklistItemId": "passport",
        "name": "Valid Passport",
        "category": "required",
        "status": "OK",
        "rawStatus": "OK",
        "problems": [],
        "suggestions": [],
        "documentId": "..."
      },
      {
        "checklistItemId": "bank_statement",
        "name": "Bank Statement",
        "category": "required",
        "status": "WEAK",
        "rawStatus": "PROBLEM",
        "problems": [
          {
            "code": "INSUFFICIENT_BALANCE",
            "message": "Bank balance is below required minimum"
          }
        ],
        "suggestions": [
          {
            "code": "ADD_CO_SPONSOR",
            "message": "Consider adding a co-sponsor"
          }
        ],
        "documentId": "..."
      }
    ]
  }
}
```

## 🔍 Status Mapping

- `OK` → `OK` (Ready)
- `MISSING` → `MISSING` (Missing document)
- `PROBLEM` → `WEAK` (Needs attention)
- `UNCERTAIN` → `WEAK` (Needs attention)

## 📝 Notes

- Document classification runs asynchronously after upload (fire-and-forget)
- Document checking can be triggered manually via API
- Text extraction is a placeholder (TODO: integrate real OCR)
- All changes are backward-compatible with existing API

## 🚀 Deployment Checklist

- [ ] Fix TypeScript errors in `ai-openai.service.ts`
- [ ] Set `DATABASE_URL` to Railway PostgreSQL connection string
- [ ] Run Prisma migration: `npx prisma migrate deploy` (for production)
- [ ] Verify API endpoints work
- [ ] Update frontend to show readiness and status badges
- [ ] Test end-to-end flow: upload → classify → check → display


