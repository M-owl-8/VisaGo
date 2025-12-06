# GPT-4 Document Structure Analysis & Design

**Date:** January 2025  
**Purpose:** Understand real structure and design clean JSON contract for GPT-4 document validation

---

## STEP 1 – Real Structure Analysis

### Core files for GPT and documents

- **`apps/backend/src/services/ai-openai.service.ts`** → OpenAI integration service; handles GPT-4 API calls, checklist generation (hybrid + legacy modes), token tracking, error handling
- **`apps/backend/src/services/document-checklist.service.ts`** → Document checklist generation service; orchestrates AI checklist generation, DB caching, fallback mechanisms
- **`apps/backend/src/services/document-validation.service.ts`** → Document validation service; validates uploaded documents using GPT-4o-mini, returns `AIDocumentValidationResult` with status/confidence/notes
- **`apps/backend/src/services/doc-check.service.ts`** → Document check service (Phase 3); matches documents to checklist items, runs GPT-4 checks, stores results in `DocumentCheckResult` table
- **`apps/backend/src/services/documents.service.ts`** → Document upload service; handles file uploads, storage, basic document CRUD operations
- **`apps/backend/src/routes/document-checklist.ts`** → Checklist API routes; `GET /api/document-checklist/:applicationId` to get/generate checklist
- **`apps/backend/src/routes/documents.ts`** → Document upload routes; `POST /api/documents/upload` handles file upload and triggers AI validation
- **`apps/backend/src/routes/doc-check.ts`** → Doc-check API routes; `POST /api/doc-check/:applicationId/run` triggers check, `GET /api/doc-check/:applicationId/summary` returns readiness summary

### Document-related Prisma models

**UserDocument:**

- **Important fields:**
  - `id`, `userId`, `applicationId`
  - `documentType`, `documentName`, `fileUrl`, `fileName`, `fileSize`
  - `status` (pending/verified/rejected)
  - `verifiedByAI` (Boolean, nullable)
  - `aiConfidence` (Float, nullable, 0-1)
  - `aiNotesUz`, `aiNotesRu`, `aiNotesEn` (String, nullable)
  - `verificationNotes` (String, nullable)
  - `expiryDate` (DateTime, nullable)
- **Main relations:**
  - `user` → `User` (many-to-one)
  - `application` → `VisaApplication` (many-to-one)
  - No direct relation to `DocumentCheckResult` (commented out in schema)

**DocumentCheckResult:**

- **Important fields:**
  - `id`, `applicationId`, `checklistItemId`
  - `documentId` (String, nullable - FK to UserDocument.id, but no Prisma relation)
  - `status` (String: 'OK' | 'MISSING' | 'PROBLEM' | 'UNCERTAIN')
  - `problemsJson` (String, nullable - JSON array of problems)
  - `suggestionsJson` (String, nullable - JSON array of suggestions)
  - `confidence` (Float, nullable - AI confidence score)
  - `notes` (String, nullable - human/AI notes)
- **Main relations:**
  - `application` → `VisaApplication` (many-to-one)
  - No Prisma relation to `UserDocument` (documentId is plain FK field)

**DocumentChecklist:**

- **Important fields:**
  - `id`, `applicationId` (unique)
  - `status` (processing/ready/failed)
  - `checklistData` (String, nullable - JSON string with checklist items)
  - `aiGenerated` (Boolean)
  - `generatedAt`, `errorMessage`
- **Main relations:**
  - `application` → `Application` (one-to-one)

### Existing AI types / prompt files

**Found:**

1. **`apps/backend/src/config/ai-prompts.ts`**
   - Contains `CHECKLIST_SYSTEM_PROMPT` (comprehensive prompt for checklist generation)
   - Contains `DOC_CHECK_SYSTEM_PROMPT` (prompt for document checking/inspection)
   - Both prompts are well-structured with sections and JSON schema definitions
   - Already references types from `visa-brain.ts`

2. **`apps/backend/src/types/visa-brain.ts`**
   - Contains canonical domain schemas:
     - `DocCheckResult` interface (with `status`, `problems`, `suggestions`)
     - `DocCheckProblem` interface (with `code`, `message`, `userMessage?`)
     - `DocCheckSuggestion` interface (with `code`, `message`)
     - `DocCheckStatus` type ('OK' | 'MISSING' | 'PROBLEM' | 'UNCERTAIN')
   - Also contains `ChecklistBrainOutput`, `ChecklistBrainItem`, `ApplicantProfile` types

3. **`apps/backend/src/services/document-validation.service.ts`**
   - Defines `AIDocumentValidationResult` interface:
     ```typescript
     {
       status: 'verified' | 'rejected' | 'needs_review';
       verifiedByAI: boolean;
       confidence?: number;
       notesUz: string;
       notesRu?: string;
       notesEn?: string;
     }
     ```
   - This is used for upload-time validation (different from doc-check)

**Summary:**

- Prompts are centralized in `src/config/ai-prompts.ts`
- Types are in `src/types/visa-brain.ts` (for doc-check) and inline in `document-validation.service.ts` (for upload validation)
- There's a slight mismatch: `AIDocumentValidationResult` (upload-time) vs `DocCheckResult` (summary check) - they serve different purposes but could be unified

---

## STEP 2 – Proposed JSON Contract & Mapping

### Proposed DocumentValidationResultAI and mapping

**TypeScript Type:**

```typescript
/**
 * DocumentValidationResultAI
 *
 * Unified GPT-4 response format for document validation.
 * This can be used for both:
 * - Upload-time validation (maps to UserDocument)
 * - Summary doc-check (maps to DocumentCheckResult)
 */
export interface DocumentValidationResultAI {
  /**
   * Overall validation status
   * - "verified": Document meets all requirements (high confidence)
   * - "rejected": Document has critical issues (unacceptable)
   * - "needs_review": Document may be acceptable but needs manual review
   * - "uncertain": Cannot determine status (poor quality, ambiguous)
   */
  status: 'verified' | 'rejected' | 'needs_review' | 'uncertain';

  /**
   * AI confidence score (0.0 to 1.0)
   * - 0.9-1.0: Very high confidence
   * - 0.7-0.89: High confidence
   * - 0.5-0.69: Medium confidence
   * - 0.0-0.49: Low confidence
   */
  confidence: number;

  /**
   * Whether document is verified by AI (true only if status === "verified" AND confidence >= 0.7)
   */
  verifiedByAI: boolean;

  /**
   * Problems found (if any)
   * Empty array if status is "verified"
   */
  problems: Array<{
    code: string; // e.g., "INSUFFICIENT_BALANCE", "EXPIRED_DOCUMENT", "MISSING_SIGNATURE"
    message: string; // English explanation for internal logs
    userMessage?: string; // User-facing explanation (optional, for display)
  }>;

  /**
   * Suggestions for improvement (if any)
   * May be empty even if problems exist
   */
  suggestions: Array<{
    code: string; // e.g., "ADD_CO_SPONSOR", "PROVIDE_3_MONTHS_HISTORY", "GET_TRANSLATION"
    message: string; // English message
  }>;

  /**
   * Multilingual notes/explanation
   * Required in Uzbek, optional in Russian and English
   */
  notes: {
    uz: string; // Required: Uzbek explanation
    ru?: string; // Optional: Russian explanation
    en?: string; // Optional: English explanation
  };

  /**
   * Optional: Raw JSON response from GPT-4 (for debugging/audit)
   * This can be stored separately if needed, not in Prisma models
   */
  rawJson?: string;
}
```

**Mapping Table:**

| `DocumentValidationResultAI.field` | → `UserDocument.field`                                                                                  | → `DocumentCheckResult.field`                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `status`                           | → `status` (mapped: "verified"→"verified", "rejected"→"rejected", "needs_review"/"uncertain"→"pending") | → `status` (mapped: "verified"→"OK", "rejected"/"needs_review"→"PROBLEM", "uncertain"→"UNCERTAIN") |
| `confidence`                       | → `aiConfidence` (Float)                                                                                | → `confidence` (Float)                                                                             |
| `verifiedByAI`                     | → `verifiedByAI` (Boolean)                                                                              | → (not stored, can be derived: `status === "OK" && confidence >= 0.7`)                             |
| `problems`                         | → (not stored in UserDocument)                                                                          | → `problemsJson` (JSON.stringify of problems array)                                                |
| `suggestions`                      | → (not stored in UserDocument)                                                                          | → `suggestionsJson` (JSON.stringify of suggestions array)                                          |
| `notes.uz`                         | → `aiNotesUz` (String)                                                                                  | → `notes` (String, can include all languages or just UZ)                                           |
| `notes.ru`                         | → `aiNotesRu` (String, nullable)                                                                        | → (can be included in `notes` field or separate)                                                   |
| `notes.en`                         | → `aiNotesEn` (String, nullable)                                                                        | → (can be included in `notes` field or separate)                                                   |
| `rawJson`                          | → (not stored, optional for debugging)                                                                  | → (not stored, optional for debugging)                                                             |

**Notes on Mapping:**

1. **Status Mapping:**
   - `UserDocument.status`: Uses "pending"/"verified"/"rejected" (existing enum)
   - `DocumentCheckResult.status`: Uses "OK"/"MISSING"/"PROBLEM"/"UNCERTAIN" (from `DocCheckStatus` type)
   - Mapping function needed to convert between formats

2. **Problems & Suggestions:**
   - `UserDocument` doesn't store problems/suggestions (simpler model for upload-time validation)
   - `DocumentCheckResult` stores them as JSON strings (for summary doc-check)

3. **Notes:**
   - `UserDocument` has separate fields for each language (`aiNotesUz`, `aiNotesRu`, `aiNotesEn`)
   - `DocumentCheckResult.notes` is a single String field (can store all languages or just UZ)

4. **Proposed Minimal Schema Additions:**
   - No changes needed to `UserDocument` (all fields exist)
   - No changes needed to `DocumentCheckResult` (all fields exist)
   - Optional: Add `rawJson` field to `DocumentCheckResult` if we want to store raw GPT-4 response for debugging (but not required)

---

## STEP 3 – Proposed Locations for Types & Prompts

### Proposed locations for AI types and prompt files

**1. Shared AI Types File:**

**Location:** `apps/backend/src/types/ai-responses.ts`

**Justification:**

- Follows existing pattern: `src/types/` folder already contains `visa-brain.ts`, `ai-context.ts`, `questionnaire-v2.ts`
- Clear naming: `ai-responses.ts` indicates this contains AI response types
- Separation of concerns: Keep domain schemas (`visa-brain.ts`) separate from AI response contracts (`ai-responses.ts`)
- This file will contain:
  - `DocumentValidationResultAI` (unified validation result)
  - `ChecklistResponseAI` (if we want to extract checklist types from `ai-openai.service.ts`)
  - Any other GPT-4 response types

**2. Document Validation System Prompt:**

**Location:** `apps/backend/src/config/ai-prompts.ts` (add new export)

**Justification:**

- Already contains `CHECKLIST_SYSTEM_PROMPT` and `DOC_CHECK_SYSTEM_PROMPT`
- Centralized location for all AI prompts (matches project style)
- Easy to find and maintain
- Add as: `DOCUMENT_VALIDATION_SYSTEM_PROMPT`

**3. Document Validation User Prompt Template:**

**Location:** `apps/backend/src/config/ai-prompts.ts` (add new export function)

**Justification:**

- User prompts are often dynamic (include document metadata, context)
- Create a function: `buildDocumentValidationUserPrompt(params)` that returns the prompt string
- Keeps prompts together in one file

**Alternative Consideration:**

- Could create `apps/backend/src/prompts/` folder with `.txt` files, but this doesn't match existing style (prompts are in TypeScript files)
- The existing `apps/ai-service/prompts/system_prompt.txt` is for the Python service, not the backend

**Summary of File Structure:**

```
apps/backend/src/
├── config/
│   └── ai-prompts.ts                    # ✅ EXISTS - Add DOCUMENT_VALIDATION_SYSTEM_PROMPT + buildDocumentValidationUserPrompt()
├── types/
│   ├── visa-brain.ts                    # ✅ EXISTS - Contains DocCheckResult, DocCheckProblem, DocCheckSuggestion
│   └── ai-responses.ts                  # 🆕 NEW - Contains DocumentValidationResultAI, ChecklistResponseAI (if extracted)
└── services/
    ├── ai-openai.service.ts             # ✅ EXISTS - Will use new types and prompts
    ├── document-validation.service.ts    # ✅ EXISTS - Will use new types and prompts
    └── doc-check.service.ts              # ✅ EXISTS - Will use new types and prompts
```

**File Contents Preview:**

**`apps/backend/src/types/ai-responses.ts`:**

```typescript
/**
 * AI Response Types
 *
 * Unified TypeScript types for GPT-4 API responses.
 * These types define the JSON contracts that GPT-4 must return.
 */

export interface DocumentValidationResultAI {
  // ... (as defined above)
}

// Optional: Extract checklist types if we want to centralize them
export interface ChecklistResponseAI {
  // ... (if extracted from ai-openai.service.ts)
}
```

**`apps/backend/src/config/ai-prompts.ts`:**

```typescript
// ... existing CHECKLIST_SYSTEM_PROMPT and DOC_CHECK_SYSTEM_PROMPT ...

/**
 * DOCUMENT_VALIDATION_SYSTEM_PROMPT
 *
 * System prompt for GPT-4 document validation (upload-time).
 * This prompt instructs GPT-4 to validate an uploaded document.
 */
export const DOCUMENT_VALIDATION_SYSTEM_PROMPT = `...`;

/**
 * Build user prompt for document validation
 */
export function buildDocumentValidationUserPrompt(params: {
  document: { ... };
  checklistItem?: { ... };
  application: { ... };
  // ... other context
}): string {
  return `...`;
}
```

---

## Summary

**Current State:**

- ✅ Prompts are centralized in `src/config/ai-prompts.ts`
- ✅ Some types exist in `src/types/visa-brain.ts` (for doc-check)
- ⚠️ Upload-time validation uses inline `AIDocumentValidationResult` type
- ⚠️ Two separate validation flows (upload-time vs summary check) with slightly different types

**Proposed Changes:**

1. Create `src/types/ai-responses.ts` with unified `DocumentValidationResultAI` type
2. Add `DOCUMENT_VALIDATION_SYSTEM_PROMPT` to `src/config/ai-prompts.ts`
3. Add `buildDocumentValidationUserPrompt()` function to `src/config/ai-prompts.ts`
4. Update `document-validation.service.ts` to use new types and prompts
5. Update `doc-check.service.ts` to use unified type (map to `DocCheckResult` format)

**Benefits:**

- Single source of truth for AI response types
- Consistent prompt structure
- Easier to maintain and update
- Clear separation between domain schemas (`visa-brain.ts`) and AI contracts (`ai-responses.ts`)

---

**Ready for Implementation**

After review, I will implement:

- The types file (`ai-responses.ts`)
- The prompt additions (`ai-prompts.ts`)
- The GPT-4 document-validation flow updates
- The integration into upload route
- The summary doc-check endpoint updates
