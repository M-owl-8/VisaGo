# Document Verification Prompt and Logic Improvements

## Summary

Improved the `VisaDocCheckerService` to ensure it receives clean input, uses simplified prompts, and produces deterministic structured output with tri-language support.

## Changes Made

### 1. Simplified Prompts

**Before:** Long, verbose system prompt (~220 lines) with extensive explanations.

**After:** Compact system prompt (~25 lines) that focuses on:

- Clear decision rules (APPROVED / NEED_FIX / REJECTED)
- Risk level guidelines (LOW / MEDIUM / HIGH)
- Output schema with field length limits

**Feature Flag:** `USE_COMPACT_DOC_VERIFICATION_PROMPTS` (default: `true`)

- Set to `false` to use legacy prompts if needed
- Legacy prompts kept for reference/rollback

### 2. CanonicalAIUserContext Integration

**Before:** Used optional `AIUserContext` with nullable fields.

**After:**

- Automatically converts `AIUserContext` to `CanonicalAIUserContext` for consistent input
- Includes only relevant context fields:
  - `sponsorType`
  - `currentStatus`
  - `bankBalanceUSD`
  - `monthlyIncomeUSD`
  - `riskLevel`

**Benefits:**

- GPT always receives complete, non-nullable data
- Consistent input structure across all document checks
- Better handling of conditional requirements

### 3. Tri-Language Notes (EN/UZ/RU)

**Before:** Single `short_reason` field (English only).

**After:**

- `short_reason`: Short reason (max 200 chars) - required
- `notes`: Optional object with:
  - `en`: English note (max 500 chars)
  - `uz`: Uzbek note (max 500 chars)
  - `ru`: Russian note (max 500 chars)

**Schema:**

```typescript
{
  status: "APPROVED" | "NEED_FIX" | "REJECTED",
  short_reason: string (max 200),
  notes?: {
    en?: string (max 500),
    uz?: string (max 500),
    ru?: string (max 500),
  },
  embassy_risk_level: "LOW" | "MEDIUM" | "HIGH",
  technical_notes?: string | null (max 1000)
}
```

### 4. Stronger Validation and Enum Mapping

**Improvements:**

- **Zod Schema Validation:** All fields validated with max length constraints
- **Enum Mapping:** Internal enums (`DocumentVerificationStatus`, `EmbassyRiskLevel`) ensure type safety
- **Common Issue Fixing:** `fixCommonValidationIssues()` handles:
  - Invalid enum values → fallback to safe defaults
  - Old format notes (`notesEn`, `notesUz`, `notesRu`) → new format
  - Overly long strings → truncated to max length
- **Graceful Fallbacks:** Invalid responses return conservative `NEED_FIX` status

**Validation Flow:**

1. Parse JSON (with markdown code block extraction)
2. Validate against Zod schema
3. Fix common issues if validation fails
4. Map to internal enums
5. Return validated result

### 5. Input Requirements

**Service now ensures:**

- ✅ **Specific requiredDocument rule** (with condition already resolved where possible)
- ✅ **Full text of uploaded document** (or best OCR output, truncated to 8000 chars)
- ✅ **CanonicalAIUserContext** (converted from AIUserContext if provided)

**Prompt Structure:**

```
REQUIRED_DOCUMENT_RULE:
{...rule JSON...}

USER_DOCUMENT_TEXT:
{...document text (max 8000 chars)...}

METADATA:
{...optional metadata...}

APPLICANT_CONTEXT:
{...relevant canonical context...}
```

### 6. Unit Tests

Added comprehensive unit tests (`apps/backend/tests/visa-doc-checker.test.ts`) covering:

**Test Cases:**

1. ✅ Valid bank statement → APPROVED
2. ✅ Insufficient history → NEED_FIX
3. ✅ Low balance → NEED_FIX (HIGH risk)
4. ✅ Wrong document type → REJECTED
5. ✅ Invalid JSON response handling
6. ✅ Missing notes field (optional)
7. ✅ String truncation (long responses)
8. ✅ Enum mapping validation
9. ✅ Old format notes conversion

**Test Coverage:**

- Document verification logic
- Validation and error handling
- Enum mapping
- Common issue fixing
- Tri-language notes handling

## Integration Updates

### `document-validation.service.ts`

Updated to handle new tri-language notes format:

```typescript
const notes = checkResult.notes
  ? {
      en: checkResult.notes.en || checkResult.short_reason || 'Document checked.',
      uz: checkResult.notes.uz || checkResult.short_reason || 'Hujjat tekshirildi.',
      ru: checkResult.notes.ru || checkResult.short_reason || 'Документ проверен.',
    }
  : {
      en: checkResult.short_reason || 'Document checked.',
      uz: checkResult.short_reason || 'Hujjat tekshirildi.',
      ru: checkResult.short_reason || 'Документ проверен.',
    };
```

## Files Modified

1. **`apps/backend/src/services/visa-doc-checker.service.ts`**
   - Added compact prompts
   - Integrated CanonicalAIUserContext
   - Added tri-language notes to schema
   - Added validation and enum mapping
   - Added `fixCommonValidationIssues()` helper
   - Added `mapToInternalEnums()` helper

2. **`apps/backend/src/services/document-validation.service.ts`**
   - Updated to handle new tri-language notes format

3. **`apps/backend/tests/visa-doc-checker.test.ts`** (NEW)
   - Comprehensive unit tests with synthetic document examples

## Result

✅ **GPT has clean input:** CanonicalAIUserContext ensures consistent, complete data  
✅ **Short prompts:** Compact prompts reduce token usage (~75% reduction)  
✅ **Deterministic structure:** Strong validation and enum mapping ensure reliable output  
✅ **Tri-language support:** Notes available in EN/UZ/RU for better UX  
✅ **Well-tested:** Unit tests cover common scenarios and edge cases

## Usage

The service is backward compatible. Existing code continues to work, but now benefits from:

- More reliable validation
- Tri-language notes (when GPT provides them)
- Better error handling
- Consistent canonical context

**Example:**

```typescript
const result = await VisaDocCheckerService.checkDocument(
  requiredDocumentRule, // Specific rule (condition resolved)
  documentText, // Full OCR text
  aiUserContext, // Will be converted to canonical
  metadata // Optional
);

// Result includes:
// - status: "APPROVED" | "NEED_FIX" | "REJECTED"
// - short_reason: string (max 200)
// - notes?: { en?, uz?, ru? }
// - embassy_risk_level: "LOW" | "MEDIUM" | "HIGH"
// - technical_notes?: string | null
```

## Next Steps

1. Monitor GPT responses in production to ensure compact prompts work well
2. Collect feedback on tri-language notes quality
3. Consider adding more structured fields (e.g., `problems`, `suggestions`) if needed
4. Expand unit tests with more document types (passport, employment letter, etc.)
