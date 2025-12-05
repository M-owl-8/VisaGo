# Quick Start: Debug Document Merge Issue

## Problem

Application `cmipymhi800019p85dg3w9whe` has 1 uploaded document but checklist shows `merged: 0`.

## Solution: Check Railway Logs (Easiest)

### Step 1: Trigger Checklist Fetch

Open in browser or make API call:

```
https://ketdik.org/applications/cmipymhi800019p85dg3w9whe
```

### Step 2: View Railway Logs

1. Go to: https://railway.app → Your Backend Service → **Logs** tab
2. Search for: `CHECKLIST_MERGE_DEBUG`
3. Look for logs with: `cmipymhi800019p85dg3w9whe`

### Step 3: Analyze the Logs

Look for these key logs:

**1. `[CHECKLIST_MERGE_DEBUG_START]`**

- Check `documentsMapKeys` - what documentTypes are in the map?
- Check `checklistItemTypes` - what documentTypes are in checklist items?

**2. `[CHECKLIST_MERGE_DEBUG_ITEM]`**

- For each item, check:
  - `checklistItemDocumentType` - what the checklist expects
  - `docFound` - is it true or false?
  - `docType` - what documentType is in the database?
  - `documentTypeCharCodes` vs `docTypeCharCodes` - compare character codes

\*\*3. `[CHECKLIST_MERGE_DEBUG_SUMMARY]`

- Check `merged` count - should be > 0 if documents match

## Common Issues to Look For

### Issue 1: Character Mismatch

If `docFound: false` but both show `'passport'`:

- Compare `documentTypeCharCodes` arrays
- Look for trailing spaces (code 32 at end)
- Look for case differences (112='p' vs 80='P')

### Issue 2: Wrong documentType in DB

If `documentsMapKeys` shows `['document']` instead of `['passport']`:

- Document was uploaded before the fix
- Need to re-upload with correct documentType

### Issue 3: Timing Issue

If no documents found:

- Document might have been uploaded after checklist was generated
- Checklist needs to be regenerated

## Alternative: Run Debug Script (If You Have Public DB URL)

If you have a public PostgreSQL URL (not `*.railway.internal`):

```powershell
$env:DATABASE_URL="postgresql://postgres:pass@public-host.railway.app:5432/railway"
cd apps/backend
npm run debug:documents
```

But **checking Railway logs is easier** since you don't need database access!


