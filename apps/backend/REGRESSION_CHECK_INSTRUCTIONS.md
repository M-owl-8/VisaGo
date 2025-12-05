# Regression Check Instructions for Document Upload Fix

## Quick End-to-End Sanity Check

### Prerequisites

- Backend running locally or deployed
- Database accessible (local or production)
- Web app running locally or deployed

### Step 1: Create Test Application

1. Open web app: `http://localhost:3000` (or production URL)
2. Create a new application:
   - Country: **Germany**
   - Visa Type: **Schengen Tourist Visa**
3. Wait for checklist generation (should show ~14 items)
4. Note the `applicationId` from the URL: `/applications/[applicationId]`

### Step 2: Upload Document via Checklist

1. On the application detail page, find the **"Valid Passport"** checklist item
2. Click **"Upload"** button
3. **Verify URL** contains: `?documentType=passport&name=Valid%20Passport`
4. Select a dummy file (any PNG/PDF, can be invalid/expired for testing)
5. Upload the file
6. **Verify success banner** shows: "Document uploaded successfully. AI is reviewing it..."
7. **Verify redirect** back to application page after 2 seconds

### Step 3: Check Database

**Option A: Using Prisma Studio**

```bash
cd apps/backend
npm run db:studio
```

- Navigate to `UserDocument` table
- Filter by `applicationId` = your test application ID
- **Verify:**
  - `documentType` = `'passport'` (NOT 'other' or 'document')
  - `status` = `'pending'` or `'rejected'` or `'verified'`
  - `verifiedByAI` = `true` or `false`
  - `aiNotesEn` contains validation notes (if rejected)

**Option B: Using Debug Script**

```bash
cd apps/backend
npm run debug:documents
```

- Update `applicationId` in `scripts/debug-documents.ts` to your test application ID
- Run script
- **Verify output shows:**
  - `documentType: "passport"` in UserDocuments
  - Checklist items include `"passport"` in documentTypes
  - Comparison report shows matches

### Step 4: Check Backend Logs

**Look for these logs in order:**

1. **Upload:**

   ```
   [UPLOAD_DEBUG] Received upload request { applicationId: '...', documentType: 'passport', ... }
   [UPLOAD_DEBUG] Created UserDocument { documentId: '...', documentType: 'passport', ... }
   [UPLOAD_DEBUG] Enqueued background processing job { documentId: '...', ... }
   ```

2. **Background Processing:**

   ```
   [DocumentProcessingQueue] Processing job { documentId: '...', ... }
   [DocumentProcessingQueue] AI validation completed { status: 'rejected'/'verified', ... }
   [DocumentClassifier] Skipping classification - explicit type { documentType: 'passport' }
   [DocumentProcessingQueue] Progress updated { applicationId: '...', ... }
   ```

3. **Merge (when checklist is fetched):**
   ```
   [CHECKLIST_MERGE_DEBUG_START] {
     documentsMapKeys: ['passport'],  // ✅ Should include 'passport'
     checklistItemTypes: ['passport', 'bank_statement', ...]
   }
   [CHECKLIST_MERGE_DEBUG_ITEM] {
     checklistItemDocumentType: 'passport',
     normalizedItemType: 'passport',
     docFound: true,  // ✅ Should be true
     docStatus: 'pending'/'rejected'/'verified'
   }
   [CHECKLIST_MERGE_DEBUG_SUMMARY] {
     documentsFound: 1,
     merged: 1,  // ✅ Should be > 0
     unmatchedDocuments: 0
   }
   ```

### Step 5: Check API Response

**Call checklist endpoint:**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/document-checklist/YOUR_APPLICATION_ID
```

**Verify response:**

```json
{
  "items": [
    {
      "documentType": "passport",
      "name": "Valid Passport",
      "status": "pending" | "verified" | "rejected",  // ✅ NOT "missing"
      "verificationNotes": "...",  // ✅ Present if rejected
      "aiVerified": true/false,
      "aiConfidence": 0.3-1.0
    },
    ...
  ],
  "summary": {
    "total": 14,
    "uploaded": 1,  // ✅ Should be > 0
    "verified": 0 or 1,  // ✅ Depends on validation result
    "missing": 13,
    "rejected": 0 or 1
  }
}
```

### Step 6: Check Frontend UI

1. **Application Detail Page:**
   - "Valid Passport" item should show:
     - Status: "Uploaded, awaiting AI review" (pending) OR
     - Status: "Verified by AI ✅" (verified) OR
     - Status: "AI found problems ❌" (rejected)
   - If rejected, red explanation box should appear below item

2. **Checklist Summary:**
   - Total Required: 8 (or 14)
   - Uploaded: 1 ✅
   - Verified: 0 or 1 (depending on validation)
   - Completion: > 0% ✅

### Step 7: Verify Classifier Behavior

**Test Case 1: Explicit Type Preserved**

- Upload with `documentType: 'passport'`
- Check logs: Should see `[DocumentClassifier] Skipping classification - explicit type`
- Check DB: `documentType` should still be `'passport'`

**Test Case 2: Generic Type Classified**

- Upload with `documentType: 'document'` (if possible via old flow)
- Check logs: Should see classification attempt
- Check DB: `documentType` may change to specific type if confidence >= 0.6

### Expected Results Summary

✅ **PASS Criteria:**

- UserDocument has `documentType: 'passport'` (not 'other')
- Merge logs show `docFound: true` for passport item
- Checklist API returns item with `status !== 'missing'`
- Frontend shows correct status label
- Summary shows `uploaded: 1` (or more)
- No timeout errors

❌ **FAIL Criteria:**

- UserDocument has `documentType: 'other'` or `'document'`
- Merge logs show `docFound: false` for passport item
- Checklist API returns item with `status: 'missing'`
- Summary shows `uploaded: 0`
- Frontend shows "Not uploaded"

### Troubleshooting

**If merge still fails:**

1. Check character codes in debug logs for whitespace differences
2. Verify documentType in DB matches checklist item type exactly (case-insensitive)
3. Check if document was created before the fix (may need to re-upload)

**If classifier overwrites type:**

1. Check logs for `[DocumentClassifier] Skipping classification - explicit type`
2. Verify GENERIC_TYPES constant includes all generic values
3. Check if documentType matches any checklist item type

**If status doesn't update:**

1. Wait 10-30 seconds for background job to complete
2. Refresh the page to refetch checklist
3. Check queue logs for job completion

---

**End of Regression Check Instructions**


