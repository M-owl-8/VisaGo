# Document Upload Flow Analysis
## Technical Deep-Dive: Current Behavior vs Expected UX

**Date:** 2025-01-XX  
**Application ID (test case):** `cmipymhi800019p85dg3w9whe`  
**Document Type:** Valid Passport (passport)

---

## Section 1 – Current Pipeline (Step-by-Step)

### Step 1: User Clicks "Upload" on Checklist Item

**Component:** `apps/web/components/applications/DocumentChecklistItem.tsx` (lines 184-190)

- User sees checklist item "Valid Passport" with `documentType: 'passport'`
- Clicks "Upload" button
- **Generated URL:** `/applications/${applicationId}/documents?documentType=${encodeURIComponent(item.documentType || 'document')}&name=${encodeURIComponent(name || 'Document')}`
- **Actual URL:** `/applications/cmipymhi800019p85dg3w9whe/documents?documentType=passport&name=Valid%20Passport`

**Status:** ✅ **CORRECT** - URL includes correct `documentType=passport` and `name=Valid%20Passport`

---

### Step 2: Upload Page Loads

**Component:** `apps/web/app/(dashboard)/applications/[id]/documents/page.tsx` (lines 18-21)

- `useSearchParams()` reads query params
- `documentTypeFromQuery = searchParams.get('documentType') ?? searchParams.get('document_type') ?? 'document'`
- `documentNameFromQuery = searchParams.get('name') ?? 'Document'`
- **Result:** `documentTypeFromQuery = 'passport'`, `documentNameFromQuery = 'Valid Passport'`
- Page header displays: "Upload Valid Passport" ✅

**Status:** ✅ **CORRECT** - Query params are read correctly

---

### Step 3: User Selects File and Uploads

**Component:** `apps/web/app/(dashboard)/applications/[id]/documents/page.tsx` (lines 26-69)

- `handleFileUpload` is called
- `effectiveDocumentType = documentTypeFromQuery || 'document'` → `'passport'` ✅
- Calls `apiClient.uploadDocument(params.id, effectiveDocumentType, file)`
- Debug log: `[UPLOAD_UI_DEBUG] Uploading with documentType: passport`

**API Client:** `apps/web/lib/api/client.ts` (lines 312-329)

- Creates FormData with:
  - `applicationId: 'cmipymhi800019p85dg3w9whe'`
  - `documentType: 'passport'` ✅
  - `file: <File object>`
- POST to `/api/documents/upload` with `timeout: 120000` (120 seconds)

**Status:** ✅ **CORRECT** - Frontend sends correct `documentType: 'passport'`

---

### Step 4: Backend Receives Upload Request

**Route:** `apps/backend/src/routes/documents.ts` (lines 61-82)

- `POST /api/documents/upload` handler
- Extracts: `{ applicationId, documentType } = req.body`
- **Log:** `[UPLOAD_DEBUG] Received upload request { applicationId: 'cmipymhi800019p85dg3w9whe', documentType: 'passport', fileName: '...', fileSize: ... }`

**Status:** ✅ **CORRECT** - Backend receives `documentType: 'passport'`

---

### Step 5: File Upload & Document Creation

**Route:** `apps/backend/src/routes/documents.ts` (lines 84-176)

- File uploaded via `StorageAdapter.uploadFile()` (Firebase or local)
- Application fetched from DB
- **Checklist lookup** (lines 125-154):
  - Calls `DocumentChecklistService.generateChecklist(applicationId, userId)`
  - Tries to find matching checklist item: `checklist.items.find(item => item.documentType === 'passport')`
  - **Log:** `[UPLOAD_DEBUG] Checklist item lookup { documentType: 'passport', checklistItemFound: true/false, ... }`
- **UserDocument created** (lines 156-168):
  ```typescript
  const document = await prisma.userDocument.create({
    data: {
      documentType: 'passport',  // ✅ Correct at creation
      status: 'pending',
      // ... other fields
    }
  });
  ```
- **Log:** `[UPLOAD_DEBUG] Created UserDocument { documentId: '...', documentType: 'passport', status: 'pending', ... }`

**Status:** ✅ **CORRECT** - Document created with `documentType: 'passport'`

---

### Step 6: Background Processing Job Enqueued

**Route:** `apps/backend/src/routes/documents.ts` (lines 178-215)

- Enqueues job via `DocumentProcessingQueueService.enqueueDocumentProcessing(document.id, applicationId, userId)`
- **HTTP Response returned immediately** (lines 217-233):
  ```json
  {
    "success": true,
    "data": {
      "documentId": "...",
      "documentType": "passport",
      "status": "pending"
    },
    "message": "Document uploaded successfully. Processing in background."
  }
  ```
- **Response time:** <2 seconds ✅

**Status:** ✅ **CORRECT** - Fast response, processing happens in background

---

### Step 7: Background Job Processing (Queue)

**Service:** `apps/backend/src/services/document-processing-queue.service.ts` (lines 40-218)

**Step 7a: AI Validation** (lines 70-162)

- Loads document from DB (still has `documentType: 'passport'` ✅)
- Calls `validateDocumentWithAI()` with `documentType: 'passport'`
- **Issue:** Validation service may receive document, but checklist item lookup happens again here (lines 78-91)
- Saves validation result: `status: 'rejected'` or `'verified'`, `verifiedByAI: true/false`, `aiNotesEn/Uz/Ru`
- **Log:** `[DocumentProcessingQueue] AI validation completed { status: 'rejected', verifiedByAI: false, confidence: 0.3 }`

**Step 7b: Document Classification** (lines 164-177)

- Calls `DocumentClassifierService.analyzeAndUpdateDocument(documentId)`
- **Classifier logic** (`apps/backend/src/services/document-classifier.service.ts` lines 244-260):
  - Checks if `documentType` is generic: `GENERIC_TYPES = ['document', 'other', null, undefined, '']`
  - Current type: `'passport'` → **NOT generic** → **Should skip classification** ✅
  - **Log:** `[DocumentClassifier] Skipped because type is explicit { documentId, documentType: 'passport' }`
- **BUT:** If document was created with `'document'` (old flow), classifier would run and might change it to `'other'`

**Step 7c: Progress Update** (lines 179-194)

- Calls `ApplicationsService.updateProgressFromDocuments(applicationId)`
- Which calls `DocumentChecklistService.recalculateDocumentProgress(applicationId)`

**Status:** ⚠️ **PARTIALLY CORRECT** - Classification should skip, but there's a timing/race condition risk

---

### Step 8: Progress Recalculation

**Service:** `apps/backend/src/services/document-checklist.service.ts` (lines 1309-1441)

**Step 8a: Load Existing Checklist** (lines 1351-1381)

- Fetches `DocumentChecklist` from DB (status: 'ready')
- Parses `checklistData` JSON to get items array
- **Items have:** `documentType: 'passport'`, `'bank_statement'`, etc.

**Step 8b: Build Documents Map** (lines 1327-1346)

- Creates `existingDocumentsMap` from `application.documents`:
  ```typescript
  const existingDocumentsMap = new Map(
    application.documents.map((doc) => [
      doc.documentType,  // ⚠️ KEY: This is what's in DB
      { type: doc.documentType, status: doc.status, ... }
    ])
  );
  ```
- **Problem:** If document in DB has `documentType: 'other'` or `'document'`, map keys become `['other']` or `['other', 'document']`

**Step 8c: Merge Documents with Checklist** (lines 1412-1416)

- Calls `mergeChecklistItemsWithDocuments(items, existingDocumentsMap, applicationId)`
- **Merge logic** (lines 1194-1287):
  ```typescript
  const mergedItems = items.map((item) => {
    const doc = existingDocumentsMap.get(item.documentType);
    // item.documentType = 'passport'
    // existingDocumentsMap.get('passport') → undefined if DB has 'other'
    if (doc) {
      return { ...item, status: doc.status, ... };
    }
    return item; // status remains 'missing'
  });
  ```
- **Log:** `[CHECKLIST_MERGE_DEBUG_START] { documentsMapKeys: ['other'], checklistItemTypes: ['passport', 'bank_statement', ...] }`
- **Log:** `[CHECKLIST_MERGE_DEBUG_ITEM] { checklistItemDocumentType: 'passport', docFound: false }`
- **Log:** `[CHECKLIST_MERGE_DEBUG_SUMMARY] { documentsFound: 1, merged: 0, unmatchedDocuments: 1 }`

**Status:** ❌ **BROKEN** - Merge fails because `documentType` mismatch

---

### Step 9: Frontend Refetches Checklist

**Hook:** `apps/web/lib/hooks/useApplication.ts` (lines 100-133)

- After redirect, `router.refresh()` triggers refetch
- Calls `apiClient.getDocumentChecklist(applicationId)`
- Backend route: `GET /api/document-checklist/:applicationId`
- **Response:** Checklist with items, all showing `status: 'missing'` because merge failed

**Component:** `apps/web/app/(dashboard)/applications/[id]/page.tsx` (lines 89-90)

- `checklistItems = checklist?.items || []`
- Renders `DocumentChecklist` component
- Each item shows: "Not uploaded" (status: 'missing')

**Component:** `apps/web/components/checklist/ChecklistSummary.tsx`

- Calculates: `uploaded: items.filter(i => i.status !== 'missing').length` → **0**
- Calculates: `verified: items.filter(i => i.status === 'verified').length` → **0**
- Displays: "Total Required: 8, Uploaded: 0, Verified: 0, Completion: 0%"

**Status:** ❌ **BROKEN** - UI shows incorrect state

---

## Section 2 – Problems (With Code & Log References)

### Problem 1: DocumentType Overwritten After Creation

**Root Cause:** DocumentClassifier runs in background and may overwrite `documentType` if it was initially `'document'` or if there's a race condition.

**Evidence from logs:**
```
[UPLOAD_DEBUG] Created UserDocument { documentType: 'passport', ... }
[DocumentClassifier] Classified document ... type: 'other', confidence: 0.1
[DocumentClassifier] Document analyzed and updated { documentType: 'other' }
```

**Code Location:** `apps/backend/src/services/document-classifier.service.ts` (lines 232-327)

**Why it happens:**
- If document was created with `documentType: 'document'` (old flow or fallback), classifier sees it as generic
- Classifier runs with low confidence (0.1) but still updates to `'other'`
- **Current fix:** Classifier checks `GENERIC_TYPES` and should skip if type is `'passport'`, but:
  - If document was created before fix, it may already be `'document'` or `'other'`
  - Race condition: Classification might run before document is fully saved with correct type

**Impact:** Document in DB ends up with `documentType: 'other'` instead of `'passport'`, breaking merge.

---

### Problem 2: Merge Fails Due to DocumentType Mismatch

**Root Cause:** `mergeChecklistItemsWithDocuments()` uses `documentType` as the map key, but documents in DB have different types than checklist items expect.

**Evidence from logs:**
```
[CHECKLIST_MERGE_DEBUG_START] {
  documentsMapKeys: ['other', 'document'],
  checklistItemTypes: ['passport', 'passport_photo', 'bank_statement', ...]
}
[CHECKLIST_MERGE_DEBUG_ITEM] {
  checklistItemDocumentType: 'passport',
  docFound: false  // ❌ No match
}
[CHECKLIST_MERGE_DEBUG_SUMMARY] {
  documentsFound: 2,
  merged: 0,  // ❌ Nothing matched
  unmatchedDocuments: 2
}
```

**Code Location:** `apps/backend/src/services/document-checklist.service.ts` (lines 1194-1287)

**Why it happens:**
- Checklist items have `documentType: 'passport'`, `'bank_statement'`, etc.
- Documents in DB have `documentType: 'other'`, `'document'`
- Map lookup: `existingDocumentsMap.get('passport')` → `undefined` (key doesn't exist)
- Result: All items remain `status: 'missing'`

**Impact:** Checklist never shows documents as uploaded, summary counts stay at 0.

---

### Problem 3: AI Validation Results Not Surfaces in Checklist

**Root Cause:** Even if validation runs and sets `status: 'rejected'` or `'verified'` on `UserDocument`, the merge fails, so checklist items never get these statuses.

**Evidence:**
- `UserDocument` in DB has: `status: 'rejected'`, `verifiedByAI: false`, `aiNotesEn: 'Document expired...'`
- But checklist item shows: `status: 'missing'` (because merge failed)

**Code Location:** `apps/backend/src/services/document-checklist.service.ts` (lines 1248-1259)

**Merge logic:**
```typescript
if (doc) {
  return {
    ...item,
    status: doc.status,  // Would be 'rejected' or 'verified'
    verificationNotes: doc.aiNotesUz || doc.verificationNotes,
    aiVerified: doc.verifiedByAI === true,
    aiConfidence: doc.aiConfidence || undefined,
  };
}
return item; // Never reached if doc is undefined
```

**Why it fails:**
- `doc` is `undefined` because `existingDocumentsMap.get('passport')` returns nothing
- Merge never copies AI validation results to checklist item
- Frontend never sees `status: 'rejected'` or `'verified'`

**Impact:** Users never see AI validation feedback in the UI.

---

### Problem 4: Progress Calculation Returns Zero

**Root Cause:** Progress is calculated from merged checklist, but if merge fails, all items are `'missing'`, so progress = 0.

**Code Location:** `apps/backend/src/services/document-checklist.service.ts` (lines 1294-1299)

```typescript
private static calculateDocumentProgress(items: ChecklistItem[]): number {
  const requiredItems = items.filter((item) => item.required);
  const completed = requiredItems.filter((item) => item.status === 'verified');
  return requiredItems.length > 0
    ? Math.round((completed.length / requiredItems.length) * 100)
    : 0;
}
```

**Evidence from logs:**
```
[DocumentProgress] Recalculated progress from documents {
  progress: 0,  // ❌ Should be > 0
  totalRequired: 8,
  verified: 0
}
```

**Why it happens:**
- All items have `status: 'missing'` (merge failed)
- `completed.length = 0`
- `progress = (0 / 8) * 100 = 0`

**Impact:** Application progress percentage stays at 0% even after uploads.

---

### Problem 5: Timeout on Frontend (Historical, Now Fixed)

**Root Cause (Historical):** Upload endpoint used to wait for AI validation + classification + progress update synchronously, taking 70+ seconds.

**Evidence:**
- Frontend timeout: `timeout: 120000` (120 seconds)
- Old flow: Upload → AI validation (30s) → Classification (10s) → Progress update with AI checklist generation (30s) = **~70s total**
- Sometimes exceeded 120s → "timeout of 120000ms exceeded"

**Current Status:** ✅ **FIXED** - Upload now returns immediately, processing happens in background queue.

**Code Location:** `apps/backend/src/routes/documents.ts` (lines 178-233)

---

## Section 3 – Design Plan (No Code)

### Subsection A: documentType & Matching

#### A1. Ensure documentType Flows Correctly from Checklist → Upload → DB

**Current State:**
- ✅ Checklist item has `documentType: 'passport'`
- ✅ Upload URL includes `?documentType=passport`
- ✅ Frontend reads and sends `documentType: 'passport'`
- ✅ Backend receives and creates `UserDocument` with `documentType: 'passport'`

**Design Requirements:**
1. **Verify documentType is never lost:**
   - Add validation in upload route: If `documentType` is `'document'` or `'other'` but checklist item exists with specific type, log warning and use checklist item's type instead
   - Add database constraint or application-level check: Reject `documentType: 'document'` if application has checklist with specific types

2. **Prevent classifier from overwriting:**
   - Current fix (checking `GENERIC_TYPES`) is correct, but add additional safeguard:
   - Before classification, check if `documentType` exists in any checklist item for that application
   - If yes, skip classification entirely (even if type is technically "generic")
   - Add log: `[DocumentClassifier] Skipped - type matches checklist item`

3. **Handle legacy documents:**
   - Migration script: For existing documents with `documentType: 'other'` or `'document'`, try to match to checklist items by:
     - File name patterns (e.g., "passport" in filename → `'passport'`)
     - Upload timestamp proximity to checklist item creation
     - Manual admin tool to reassign documentTypes

#### A2. Ensure Merge Always Has Compatible Keys

**Current State:**
- Merge uses `documentType` as key: `existingDocumentsMap.get(item.documentType)`
- If keys don't match, merge fails

**Design Requirements:**
1. **Normalize documentType values:**
   - Before merge, normalize both sides:
     - Trim whitespace
     - Convert to lowercase for comparison (but keep original for display)
     - Handle variations: `'passport'` vs `'Passport'` vs `'passport '`

2. **Add fallback matching:**
   - If exact match fails, try fuzzy matching:
     - Check if document filename contains checklist item name keywords
     - Check if document was uploaded within 5 minutes of checklist item creation
     - For legacy documents, allow manual mapping

3. **Add merge validation:**
   - After merge, log warnings if `unmatchedDocuments > 0`
   - Create admin dashboard to view unmatched documents and manually assign them

---

### Subsection B: AI Validation → Checklist UX

#### B1. Status Mapping

**Current State:**
- `UserDocument.status`: `'pending'`, `'verified'`, `'rejected'`
- `ChecklistItem.status`: `'missing'`, `'pending'`, `'verified'`, `'rejected'`
- Mapping happens in merge, but merge fails

**Design Requirements:**
1. **Status flow:**
   ```
   UserDocument.status → ChecklistItem.status
   'pending' → 'pending' (Uploaded, awaiting AI review)
   'verified' → 'verified' (Verified by AI ✅)
   'rejected' → 'rejected' (AI found problems ❌)
   (no document) → 'missing' (Not uploaded)
   ```

2. **UI Labels:**
   - `'pending'`: "Uploaded, awaiting AI review" (amber clock icon)
   - `'verified'`: "Verified by AI ✅" (green checkmark, if `aiVerified: true`)
   - `'rejected'`: "AI found problems ❌" (red X, show explanation)
   - `'missing'`: "Not uploaded" (gray)

3. **Status update timing:**
   - Immediately after upload: `'pending'` (document exists, validation in progress)
   - After AI validation completes: `'verified'` or `'rejected'`
   - Frontend should poll or use WebSocket to update status in real-time

#### B2. AI Notes Exposure

**Current State:**
- `UserDocument` has: `aiNotesEn`, `aiNotesUz`, `aiNotesRu`, `verificationNotes`
- Merge copies: `verificationNotes: doc.aiNotesUz || doc.verificationNotes`
- But merge fails, so notes never reach checklist item

**Design Requirements:**
1. **Notes in checklist item:**
   - Checklist item should have: `verificationNotes` (localized based on user language)
   - Display notes below item when `status: 'rejected'` or `'verified'`
   - Format: Collapsible section "AI Review Notes" with explanation

2. **Localization:**
   - Use `aiNotesEn` for English, `aiNotesUz` for Uzbek, `aiNotesRu` for Russian
   - Fallback: If user language not available, use English

3. **Confidence display:**
   - Show `aiConfidence` as percentage: "AI Confidence: 85%"
   - Color code: Green (>0.8), Yellow (0.5-0.8), Red (<0.5)

---

### Subsection C: Progress & Summary

#### C1. Progress Calculation

**Current State:**
- Formula: `(verified required documents / total required documents) * 100`
- But all items are `'missing'`, so progress = 0

**Design Requirements:**
1. **Progress tiers:**
   - `uploaded`: Items with `status !== 'missing'` (pending, verified, rejected all count)
   - `verified`: Items with `status === 'verified'`
   - `completion`: `(verified / totalRequired) * 100`

2. **Summary counts:**
   ```typescript
   summary: {
     total: items.length,
     uploaded: items.filter(i => i.status !== 'missing').length,
     verified: items.filter(i => i.status === 'verified').length,
     rejected: items.filter(i => i.status === 'rejected').length,
     missing: items.filter(i => i.status === 'missing').length,
   }
   ```

3. **Progress percentage:**
   - Use `verified` count (not `uploaded`) for completion percentage
   - This encourages users to fix rejected documents

#### C2. Frontend Summary Interpretation

**Current State:**
- Backend returns summary, frontend displays it
- But summary is wrong because merge failed

**Design Requirements:**
1. **Consistent status values:**
   - Backend and frontend must use same status enum: `'missing' | 'pending' | 'verified' | 'rejected'`
   - Add TypeScript types shared between backend and frontend

2. **Real-time updates:**
   - After upload, show optimistic update: "Uploading..." → "Processing..." → "Verified" or "Rejected"
   - Poll checklist endpoint every 5 seconds until status changes from `'pending'`
   - Or use WebSocket for instant updates

3. **Error handling:**
   - If summary shows `uploaded: 0` but user just uploaded, show warning: "Document uploaded but not yet processed. Please refresh in a moment."

---

### Subsection D: Timeouts & UX Polish

#### D1. Async Processing UX

**Current State:**
- ✅ Upload returns immediately (<2s)
- ⚠️ Processing happens in background (10-30s)
- ❌ Frontend doesn't show processing status

**Design Requirements:**
1. **Upload flow:**
   - Show success banner: "Document uploaded successfully. Processing in background..."
   - Redirect to application page
   - On application page, show item as "Uploaded, processing..." (pending status)

2. **Processing status:**
   - Poll checklist endpoint every 3-5 seconds
   - Update item status when it changes from `'pending'` → `'verified'` or `'rejected'`
   - Show spinner on item while processing

3. **Error handling:**
   - If processing fails after 60 seconds, show: "Processing is taking longer than expected. Please refresh the page."
   - Add manual "Refresh" button on checklist

#### D2. Timeout Prevention

**Current State:**
- ✅ Upload endpoint returns immediately
- ✅ Processing is async (no timeout risk)

**Design Requirements:**
1. **Queue monitoring:**
   - Add health check endpoint: `GET /api/queues/document-processing/health`
   - Show queue status in admin dashboard
   - Alert if queue is backed up (>100 pending jobs)

2. **Job retry strategy:**
   - Current: 3 attempts with exponential backoff
   - Add: Dead letter queue for permanently failed jobs
   - Admin tool to manually retry failed jobs

3. **Frontend timeout:**
   - Keep `timeout: 120000` for upload (file transfer only)
   - Remove timeout for checklist fetch (should be fast, <2s)

---

## Summary of Root Causes

1. **DocumentType mismatch:** Documents in DB have `'other'` or `'document'`, checklist expects `'passport'`, `'bank_statement'`, etc.
2. **Merge failure:** `existingDocumentsMap.get('passport')` returns `undefined` because key doesn't exist
3. **Status never updates:** Because merge fails, checklist items never get `status: 'verified'` or `'rejected'`
4. **Progress stays zero:** Because all items are `'missing'`, progress calculation returns 0

## Critical Fix Priority

1. **HIGH:** Ensure `documentType` from upload is never overwritten (classifier fix is correct, but add validation)
2. **HIGH:** Fix merge to handle documentType mismatches (normalize, fuzzy match, or manual mapping)
3. **MEDIUM:** Add polling/WebSocket for real-time status updates
4. **LOW:** Add admin tools for manual documentType reassignment

---

**End of Analysis**



