# Visa Rules Extraction and Review Implementation

**Date:** 2025-01-27  
**Feature:** Extract visa rules from EmbassyPageContent via GPT and admin review flow

---

## Overview

Implemented complete flow for extracting visa rules from embassy page content using GPT-4, creating candidates for review, and admin approval workflow.

---

## Changes Made

### 1. Created VisaRulesExtractionService

**File:** `apps/backend/src/services/visa-rules-extraction.service.ts`

- `processPageContent()`: Processes a single `EmbassyPageContent` and creates `VisaRuleSetCandidate`
  - Checks if candidate already exists
  - Gets previous approved rules for context
  - Calls `AIEmbassyExtractorService.extractVisaRulesFromPage()` to extract rules via GPT
  - Computes diff between old and new rules
  - Creates candidate with confidence score and diff metadata

- `processAllPending()`: Processes all page contents that need extraction
  - Finds page contents with `status='success'` that don't have candidates yet
  - Processes them sequentially with 2-second delay

- `computeDiff()`: Computes human-readable diff between old and new rule sets
  - Added/removed/modified documents
  - Financial requirements changes
  - Processing info changes
  - Fee changes

### 2. Created CLI Script

**File:** `apps/backend/scripts/visa-extract-rules.ts`

- Command: `pnpm visa:extract-rules`
- Options:
  - No args: Process all pending (default limit: 10)
  - `--limit <n>`: Custom limit
  - `--page-content-id <id>`: Process specific page content

### 3. Backend Admin Endpoints

**File:** `apps/backend/src/routes/admin.ts`

#### GET /api/admin/visa-rule-candidates

- List candidates with filtering (countryCode, visaType, status)
- Returns formatted candidates with parsed data

#### GET /api/admin/visa-rule-candidates/:id

- Get candidate detail with:
  - Candidate data
  - Existing approved rule set (for comparison)
  - Computed diff
  - Source and page content info

#### POST /api/admin/visa-rule-candidates/:id/approve

- Approves candidate and creates new `VisaRuleSet`
- Unapproves all other versions for same country/visa type
- Creates new approved rule set with version++
- Creates `VisaRuleSetChangeLog` entry
- Updates candidate status to 'approved'

#### POST /api/admin/visa-rule-candidates/:id/reject

- Rejects candidate with optional notes
- Updates candidate status to 'rejected'

### 4. Frontend Admin UI

#### List Page

**File:** `apps/web/app/(dashboard)/admin/visa-rule-candidates/page.tsx`

- Table of candidates showing:
  - Country code and visa type
  - Status badge (pending/approved/rejected)
  - Confidence score
  - Source name/URL
  - Created/reviewed dates
- Filters: country, visa type, status
- Click to view detail

#### Detail Page

**File:** `apps/web/app/(dashboard)/admin/visa-rule-candidates/[id]/page.tsx`

- Shows new rules (document count, financial requirements, processing info)
- Shows diff (added/removed/modified documents)
- Lists all required documents with categories and conditions
- Approve/Reject buttons (only for pending candidates)
- Success/error messages

### 5. Verified Integration

**File:** `apps/backend/src/services/visa-rules.service.ts`

- `getActiveRuleSet()` already returns latest approved version:
  - Filters by `isApproved: true`
  - Orders by `version: 'desc'`
  - Returns most recent approved rule set

---

## Usage

### Extract Rules from Page Content

```bash
# Process all pending (limit 10)
pnpm visa:extract-rules

# Process with custom limit
pnpm visa:extract-rules -- --limit 20

# Process specific page content
pnpm visa:extract-rules -- --page-content-id <id>
```

### Admin Review Flow

1. Navigate to `/admin/visa-rule-candidates`
2. View list of candidates with filters
3. Click candidate to view detail
4. Review new rules and diff
5. Click "Approve" or "Reject"
6. Approved candidates create new `VisaRuleSet` with version++

---

## Data Flow

```
1. EmbassyPageContent (status='success')
   ↓
2. VisaRulesExtractionService.processPageContent()
   ↓
3. AIEmbassyExtractorService.extractVisaRulesFromPage()
   ↓
4. GPT-4 extracts rules from cleaned text
   ↓
5. Validate JSON schema
   ↓
6. Compute diff with existing approved rules
   ↓
7. Create VisaRuleSetCandidate (status='pending')
   ↓
8. Admin reviews in UI
   ↓
9. On approve:
   - Create new VisaRuleSet (version++, isApproved=true)
   - Unapprove all other versions
   - Create VisaRuleSetChangeLog entry
   - Update candidate status to 'approved'
   ↓
10. getActiveRuleSet() returns new approved version
```

---

## Diff Computation

The diff includes:

- **Added Documents**: New document types in candidate
- **Removed Documents**: Document types removed from old rules
- **Modified Documents**: Documents with changed category/description/condition
- **Financial Changes**: Minimum balance, currency changes
- **Processing Changes**: Processing days changes
- **Fee Changes**: Visa fee changes

---

## Database Models Used

### VisaRuleSetCandidate

- Stores proposed rules before approval
- Links to `EmbassySource` and `EmbassyPageContent`
- Tracks confidence, status, review info

### VisaRuleSet

- Stores approved rules
- Version incremented on each approval
- Only one version per country/visa type is approved at a time

### VisaRuleSetChangeLog

- Tracks all changes to rule sets
- Stores diff metadata
- Links to `VisaRuleSet`

---

## Notes

- Extraction uses existing `AIEmbassyExtractorService` (reuses prompt logic)
- Diff is computed and stored in candidate metadata
- Only one approved rule set per country/visa type at a time
- Version is auto-incremented on approval
- Change log tracks all approvals with diff
- Frontend shows human-readable diff for easy review

---

**End of Implementation**
