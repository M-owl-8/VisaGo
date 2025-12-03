# Debug Documents - Instructions

## Overview

This document provides instructions for debugging document upload and checklist merge issues for application `cmipymhi800019p85dg3w9whe`.

## Changes Made

### 1. Enhanced Logging in `mergeChecklistItemsWithDocuments()`

**File:** `apps/backend/src/services/document-checklist.service.ts`

Added three new debug log statements:

- `[CHECKLIST_MERGE_DEBUG_START]` - Logs at the start of merge function
- `[CHECKLIST_MERGE_DEBUG_ITEM]` - Logs for each checklist item being processed
- `[CHECKLIST_MERGE_DEBUG_SUMMARY]` - Logs summary before final completion log

### 2. Debug Script

**File:** `apps/backend/scripts/debug-documents.ts`

A standalone script that queries the database directly to show:

- All UserDocument rows for the application
- The DocumentChecklist and parsed checklist items
- Comparison report showing which documentTypes match or don't match

### 3. NPM Script

**File:** `apps/backend/package.json`

Added: `"debug:documents": "ts-node --project scripts/tsconfig.json scripts/debug-documents.ts"`

---

## How to Run the Debug Script Locally

### Prerequisites

1. **Get Production DATABASE_URL from Railway:**
   - Go to Railway Dashboard: https://railway.app
   - Navigate to your **Backend Service** (not the database service)
   - Click on **Variables** tab
   - Find `DATABASE_URL` and copy its value
   - It should look like: `postgresql://postgres:password@host.railway.app:5432/railway`

2. **Get the Public Database URL:**

   The `postgres.railway.internal` URL only works inside Railway's network. For local access:
   - Go to Railway Dashboard → Your **Database Service** (not backend)
   - Click on **"Connect"** or **"Public Network"** tab
   - Look for **"Public Network"** or **"Connection URL"**
   - Copy the public URL (should have `*.railway.app` or `*.up.railway.app` domain)

   **OR use Railway CLI (recommended):**

   ```powershell
   # Install Railway CLI if not installed
   npm install -g @railway/cli

   # Login to Railway
   railway login

   # Link to your project
   railway link

   # Run the script (Railway CLI will inject DATABASE_URL automatically)
   railway run npm run debug:documents
   ```

3. **Set DATABASE_URL (if using public URL):**

   **Option A: Set as PowerShell environment variable:**

   ```powershell
   $env:DATABASE_URL="postgresql://postgres:password@public-host.railway.app:5432/railway"
   cd apps/backend
   npm run debug:documents
   ```

   **Option B: Create/update `.env` file in `apps/backend/`:**

   ```
   DATABASE_URL="postgresql://postgres:password@public-host.railway.app:5432/railway"
   ```

   Then run: `cd apps/backend && npm run debug:documents`

**Note:**

- If you don't set DATABASE_URL, it will use local SQLite (`file:./prisma/dev.db`) which won't have production data
- The script automatically selects the correct Prisma schema (PostgreSQL vs SQLite) based on DATABASE_URL

### Steps

1. **Navigate to backend directory:**

   ```bash
   cd apps/backend
   ```

2. **Run the debug script:**

   ```bash
   npm run debug:documents
   ```

   Or directly:

   ```bash
   ts-node --project scripts/tsconfig.json scripts/debug-documents.ts
   ```

### Expected Output

The script will output:

- Count and details of all UserDocument rows
- Character codes for each documentType (to detect hidden characters)
- Checklist items with their documentTypes
- A comparison report showing matches/mismatches
- A JSON report at the end

**Example output structure:**

```
🔍 Debugging Documents for Application: cmipymhi800019p85dg3w9whe
============================================================

📄 UserDocuments found: 1

  Document 1:
    ID: cmxxxxx...
    documentType: "passport" (length: 8)
    status: pending
    verifiedByAI: false
    ...

📋 DocumentChecklist found:
    Status: ready
    ...

📝 Checklist Items found: 14
  Item 1:
    documentType: "passport" (length: 8)
    ...

📊 COMPARISON REPORT
============================================================
...
```

---

## Where to Find Logs in Railway (RECOMMENDED METHOD)

Since the production database uses `postgres.railway.internal` (internal network only), the best way to debug is to check Railway logs directly.

### Step 1: Access Railway Dashboard

1. Go to https://railway.app
2. Navigate to your **Backend Service**
3. Click on the **"Logs"** tab (or **"Deployments"** → Latest → **"View Logs"**)

### Step 2: Filter Logs

In the Railway logs viewer, use the search/filter box and search for:

```
CHECKLIST_MERGE_DEBUG
```

Or more specifically:

```
CHECKLIST_MERGE_DEBUG_START
CHECKLIST_MERGE_DEBUG_ITEM
CHECKLIST_MERGE_DEBUG_SUMMARY
```

### Step 3: Filter by Application ID

To see logs only for your specific application, search for:

```
cmipymhi800019p85dg3w9whe
```

### Step 4: Trigger the Logs

To see the merge logs, you need to trigger a checklist fetch:

**Option A: Via Web App (Easiest)**

1. Go to https://ketdik.org/applications/cmipymhi800019p85dg3w9whe
2. Refresh the page
3. The logs will appear in Railway immediately

**Option B: Via API Call**

1. Make a GET request to: `https://ketdik.org/api/document-checklist/cmipymhi800019p85dg3w9whe`
2. Use browser dev tools, Postman, or curl
3. The logs will appear in Railway immediately

**Option C: Via Railway Shell**

```bash
railway shell
# Then inside Railway shell:
curl http://localhost:3000/api/document-checklist/cmipymhi800019p85dg3w9whe
```

### Step 5: View the Debug Output

You should see logs like:

```
[CHECKLIST_MERGE_DEBUG_START] {
  applicationId: 'cmipymhi800019p85dg3w9whe',
  documentsMapKeys: ['passport'],
  checklistItemTypes: ['passport', 'bank_statement', ...],
  documentsCount: 1,
  itemCount: 14
}

[CHECKLIST_MERGE_DEBUG_ITEM] {
  applicationId: 'cmipymhi800019p85dg3w9whe',
  checklistItemDocumentType: 'passport',
  docFound: false,
  docType: undefined,
  documentTypeLength: 8,
  docTypeLength: undefined,
  documentTypeCharCodes: [112, 97, 115, 115, 112, 111, 114, 116],
  docTypeCharCodes: null
}

[CHECKLIST_MERGE_DEBUG_SUMMARY] {
  applicationId: 'cmipymhi800019p85dg3w9whe',
  documentsFound: 1,
  merged: 0,
  unmatchedDocuments: 1,
  totalItems: 14
}
```

---

## How to Interpret Results

### Scenario 1: `docFound: false` but documentType appears in both lists

**Symptoms:**

- `documentsMapKeys` includes `'passport'`
- `checklistItemDocumentType` is `'passport'`
- But `docFound: false`

**Most Likely Causes:**

1. **Trailing/Leading Whitespace:**
   - Check `documentTypeLength` vs `docTypeLength`
   - Check `documentTypeCharCodes` - look for space character (code 32) at start/end
   - Example: `"passport "` (with trailing space) vs `"passport"`

2. **Case Sensitivity:**
   - Check if one is `"Passport"` and other is `"passport"`
   - The Map lookup is case-sensitive

3. **Hidden Characters:**
   - Check char codes for non-printable characters
   - Look for codes like 160 (non-breaking space), 8203 (zero-width space), etc.

4. **Timing Issue:**
   - Document was created after checklist was generated
   - Checklist needs to be regenerated to include the new document

### Scenario 2: DocumentType in DB is `'document'` instead of `'passport'`

**Symptoms:**

- `documentsMapKeys` shows `['document']`
- `checklistItemTypes` shows `['passport', 'bank_statement', ...]`
- No match possible

**Explanation:**

- The upload was made before the fix was deployed
- Or the upload used the generic upload page (without documentType query param)
- Solution: Re-upload the document with the correct documentType

### Scenario 3: Multiple Documents with Same Type

**Symptoms:**

- `documentsFound: 2` or more
- `merged: 0`
- Multiple documents with same `documentType`

**Explanation:**

- The Map uses `documentType` as key, so only the last document with that type is stored
- Earlier documents are overwritten in the map
- Check if there are duplicate uploads

---

## Debug Log Examples

### Example 1: Successful Match

```json
{
  "applicationId": "cmipymhi800019p85dg3w9whe",
  "checklistItemDocumentType": "passport",
  "docFound": true,
  "docType": "passport",
  "docStatus": "pending",
  "documentTypeLength": 8,
  "docTypeLength": 8
}
```

### Example 2: Mismatch Due to Whitespace

```json
{
  "applicationId": "cmipymhi800019p85dg3w9whe",
  "checklistItemDocumentType": "passport",
  "docFound": false,
  "docType": "passport ",
  "documentTypeLength": 8,
  "docTypeLength": 9,
  "documentTypeCharCodes": [112, 97, 115, 115, 112, 111, 114, 116],
  "docTypeCharCodes": [112, 97, 115, 115, 112, 111, 114, 116, 32]
}
```

Notice the trailing `32` (space) in `docTypeCharCodes`.

### Example 3: Case Mismatch

```json
{
  "applicationId": "cmipymhi800019p85dg3w9whe",
  "checklistItemDocumentType": "passport",
  "docFound": false,
  "docType": "Passport",
  "documentTypeCharCodes": [112, 97, 115, 115, 112, 111, 114, 116],
  "docTypeCharCodes": [80, 97, 115, 115, 112, 111, 114, 116]
}
```

Notice first character: `112` (lowercase 'p') vs `80` (uppercase 'P').

---

## Next Steps After Debugging

1. **If whitespace issue:** Trim documentType when creating UserDocument
2. **If case issue:** Normalize to lowercase in both places
3. **If timing issue:** Ensure checklist is regenerated after document upload
4. **If wrong documentType:** User needs to re-upload with correct type

---

## Quick Reference

**Run debug script:**

```bash
cd apps/backend && npm run debug:documents
```

**View Railway logs:**

- Railway Dashboard → Backend Service → Logs → Search: `CHECKLIST_MERGE_DEBUG`

**Trigger merge logs:**

- GET `/api/document-checklist/cmipymhi800019p85dg3w9whe`
- Or refresh application page in web app
