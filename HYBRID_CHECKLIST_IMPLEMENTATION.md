# Hybrid Checklist System Implementation

**Date:** 2025-01-27  
**Status:** Implementation Complete

---

## Overview

This implementation evolves the GPT-4 checklist system into a **hybrid model** where:

- **Rule Engine** decides which documents are in the checklist (base + conditional + risk-based)
- **GPT-4** only enriches those documents with names, descriptions, and whereToObtain instructions

**FULL HYBRID COVERAGE:** All 8 countries × visa types use hybrid mode:

- **USA:** student, tourist
- **Canada:** student, tourist
- **UK:** student, tourist
- **Australia:** student, tourist
- **Spain:** tourist (Schengen)
- **Germany:** tourist (Schengen)
- **Japan:** tourist
- **UAE:** tourist

**Total:** 12 visa combinations (8 countries × visa types)

Legacy GPT-4 full generation path only used for unsupported future countries.

---

## Files Created

### 1. `apps/backend/src/data/visaDocumentRules.ts`

**Purpose:** Defines rule-based document checklist configurations

**Contents:**

- Type definitions: `VisaDocumentRuleSet`, `DocumentRule`, `ConditionalRule`, `RiskAdjustment`
- Rule configurations for 12 visa combinations:
  - **USA:** student (F-1), tourist (B1/B2)
  - **Canada:** student, tourist
  - **UK:** student (CAS-based), tourist
  - **Australia:** student, tourist
  - **Spain:** tourist (Schengen)
  - **Germany:** tourist (Schengen)
  - **Japan:** tourist
  - **UAE:** tourist
- Each rule set includes: base documents, conditional documents (sponsor, travel history, refusals, property, family), risk adjustments
- Helper function: `findVisaDocumentRuleSet(countryCode, visaType)` - Normalizes country names and finds matching rule set

**Key Features:**

- Base documents with category (required/highly_recommended/optional) and required flag
- Conditional documents based on questionnaire answers (sponsor type, travel history, refusals, property, family)
- Risk adjustments based on risk score level (adds documents for high risk, minimizes for low risk)

### 2. `apps/backend/src/services/checklist-rules.service.ts`

**Purpose:** Rule engine that evaluates rules against user context to build base checklist

**Contents:**

- Type: `BaseChecklistItem` - Document with type, category, required status
- Function: `buildBaseChecklistFromRules(userContext, ruleSet)` - Main rule engine
  - Algorithm:
    1. Start with `ruleSet.baseDocuments`
    2. Evaluate `conditionalDocuments` rules against user context
    3. Apply `riskAdjustments` based on risk score level
    4. Deduplicate by document ID (last rule wins)
- Helper: `evaluateCondition()` - Checks if condition matches user context

**Key Features:**

- Pure, deterministic function (no GPT-4 calls)
- Evaluates conditions from questionnaire summary and risk score
- Handles sponsor type, travel history, refusals, minor status, property, family ties

---

## Files Modified

### 3. `apps/backend/src/services/ai-openai.service.ts`

**Purpose:** Modified to support hybrid mode alongside legacy mode

**Changes:**

1. **New Helper Method:** `isHybridChecklistEnabled(countryCode, visaType)`
   - Checks if rule set exists for this country+visa type
   - Returns `true` for hybrid mode, `false` for legacy mode

2. **Modified `generateChecklist()` Method:**
   - **Early Check:** Determines if hybrid mode is enabled
   - **Hybrid Path (if enabled):**
     - Imports rule engine and rule set finder
     - Builds base checklist from rules
     - Calls GPT-4 with hybrid prompt (enrichment only)
     - Validates GPT-4 response matches base checklist
     - Corrects any mismatches (removes extras, adds missing, fixes category/required)
     - Returns enriched checklist
   - **Legacy Path (if not enabled):**
     - Uses existing GPT-4 full generation logic (unchanged)
     - All original behavior preserved

3. **New Helper Methods for Hybrid Mode:**
   - `buildHybridSystemPrompt()` - System prompt telling GPT-4 to only enrich, not decide documents
   - `buildHybridUserPrompt()` - User prompt with base checklist and context
   - `parseHybridResponse()` - Parses JSON from GPT-4 response
   - `validateHybridResponse()` - Validates GPT-4 output matches base checklist
   - `correctHybridResponse()` - Fixes mismatches (removes extras, adds missing, fixes category/required)
   - `inferPriorityFromCategory()` - Maps category to priority (required→high, highly_recommended→medium, optional→low)

**Key Features:**

- Backwards compatible: Legacy path unchanged
- Safety: Validates GPT-4 doesn't add/remove documents
- Auto-correction: Fixes mismatches automatically
- Logging: Clear distinction between hybrid and legacy mode in logs

---

## How It Works

### Hybrid Mode Flow

```
1. User requests checklist for USA student visa
   ↓
2. isHybridChecklistEnabled('US', 'student') → true
   ↓
3. findVisaDocumentRuleSet('US', 'student') → returns rule set
   ↓
4. buildBaseChecklistFromRules(userContext, ruleSet)
   - Starts with base documents (passport, i20_form, sevis_fee_receipt, ...)
   - Evaluates conditionals:
     * If sponsorType='parent' → adds sponsor_bank_statement, sponsor_employment_letter
     * If hasTravelHistory=false → adds employment_letter, property_documents
     * If previousVisaRejections=true → adds refusal_explanation_letter
     * If hasPropertyInUzbekistan=true → adds property_documents
   - Applies risk adjustments:
     * If riskScore.level='high' → adds employment_letter, property_documents, family_ties_proof
   - Returns base checklist (e.g., 12-15 documents)
   ↓
5. buildHybridSystemPrompt() + buildHybridUserPrompt()
   - System prompt: "You are NOT allowed to add or remove documents"
   - User prompt: Includes base checklist JSON with documentType, category, required
   ↓
6. GPT-4 API call (with retry logic)
   - Input: Base checklist + context
   - Output: Enriched checklist with names, descriptions, whereToObtain
   - Retry: Up to 2 attempts if parsing/validation fails
   ↓
7. parseHybridResponse() + validateHybridResponse()
   - Parses JSON
   - Validates: all base documents present, no extras, category/required match
   - If validation fails → Retry (up to 2 attempts)
   ↓
8. correctHybridResponse() (if needed)
   - Removes extra documents
   - Adds missing documents (with minimal placeholders)
   - Fixes category/required mismatches
   ↓
9. Severe Safety Fallback (if GPT fails after 2 attempts)
   - Builds minimal checklist from rule set only
   - Uses basic document names from knowledge base
   - No GPT enrichment, but checklist is complete and valid
   ↓
10. Convert to internal format
   - Maps to ChecklistItem structure
   - Merges with uploaded documents (in document-checklist.service)
   - Applies country terminology corrections
   ↓
10. Store in DB and return to frontend
```

### Legacy Mode Flow (Unchanged)

```
1. User requests checklist for unsupported visa (e.g., future country)
   ↓
2. isHybridChecklistEnabled(countryCode, visaType) → false (no rule set found)
   ↓
3. Uses existing GPT-4 full generation logic
   - GPT-4 decides which documents to include
   - GPT-4 assigns categories
   - GPT-4 generates descriptions
   - Original behavior preserved
   - Only used for countries not in the 8 supported countries
```

---

## API Compatibility

**No changes to public API:**

- `GET /api/document-checklist/:applicationId` - Same request/response format
- Response structure unchanged: `{ items, summary, progress, aiGenerated, ... }`
- Frontend and mobile apps continue working without changes

**Database Schema:**

- `DocumentChecklist` model is backed by a real database table
- Migration: `20251130042626_add_document_checklist` creates the `DocumentChecklist` table in PostgreSQL
- `DocumentChecklist.checklistData` format unchanged (JSON string)
- `aiGenerated` flag still used (true for both hybrid and legacy GPT paths)

**Database Migration Notes:**

- **Development (SQLite):** Uses `prisma db push` which syncs schema directly, so the table exists automatically
- **Production (PostgreSQL):** Uses `prisma migrate deploy` which applies migrations. The `DocumentChecklist` table is created via migration `20251130042626_add_document_checklist`
- If you encounter "table does not exist" errors, verify that migrations have been applied in production

---

## Safety & Backwards Compatibility

### Safety Features

1. **Rule Set Validation:**
   - If rule set not found → Falls back to legacy mode
   - If base checklist empty → Falls back to legacy mode

2. **GPT-4 Response Validation & Retry:**
   - Up to 2 attempts if parsing/validation fails
   - Auto-correction of mismatches
   - Severe safety fallback if GPT fails twice (builds checklist from rules only)
   - Validates all base documents present
   - Validates no extra documents
   - Validates category/required match
   - Auto-corrects mismatches

3. **Error Handling:**
   - Hybrid mode errors → Falls back to legacy mode
   - Legacy mode errors → Uses fallback checklist (existing behavior)

### Backwards Compatibility

1. **Unsupported Visas:**
   - Continue using legacy GPT-4 full generation
   - No behavior changes

2. **Existing Data:**
   - Existing checklists in DB continue working
   - No migration needed

3. **API Contract:**
   - Same request/response format
   - Same error handling
   - Same status codes

---

## Validation Test Script

A comprehensive test script is available at `apps/backend/scripts/validateRules.ts`:

**Usage:**

```bash
cd apps/backend
ts-node --project scripts/tsconfig.json scripts/validateRules.ts
```

**What it tests:**

- All 12 visa combinations (8 countries × visa types)
- Multiple context variations:
  - Empty context (minimal)
  - High risk (no travel, previous rejections)
  - Parent sponsor
  - Relative sponsor
  - Has property and family
- Validation checks:
  - No duplicate documents
  - Document count between 5-18
  - At least one required document
  - All rule sets present

**Output:**

- Detailed test results for each visa combination
- Document lists for each context variation
- Summary of all rule sets found
- Missing rule sets (if any)

## Testing Recommendations

### Test Cases

1. **Hybrid Mode - USA Student:**
   - Self-funded → Should include base documents only
   - Parent-sponsored → Should include sponsor documents
   - No travel history → Should include employment letter, property docs
   - Previous refusals → Should include refusal explanation letter
   - High risk → Should include additional supporting documents

2. **Hybrid Mode - All 12 Visa Combinations:**
   - Run `scripts/validateRules.ts` to test all rule sets
   - Verify document counts are reasonable (5-18)
   - Verify no duplicates
   - Verify conditional documents appear when conditions match
   - Verify risk adjustments work correctly

3. **Hybrid Mode - Canada Student:**
   - Verify LOA terminology (not I-20)
   - Verify GIC certificate included
   - Test conditional rules

4. **Hybrid Mode - Schengen Tourist (Spain/Germany):**
   - Verify travel insurance (30,000 EUR) included
   - Verify accommodation proof included
   - Test conditional rules

5. **Legacy Mode - Unsupported Visa:**
   - Japan tourist → Should use legacy GPT-4 generation
   - Verify no rule set found → Falls back correctly

6. **Error Cases:**
   - GPT-4 adds extra document → Should be removed
   - GPT-4 removes document → Should be added back
   - GPT-4 changes category → Should be corrected
   - GPT-4 timeout → Should fall back to legacy or fallback checklist

---

## Future Enhancements

1. **Add More Visa Rules:**
   - UK student/tourist
   - Australia student/tourist
   - Japan student/tourist
   - UAE tourist
   - Poland tourist

2. **Rule Refinements:**
   - Add more conditional rules (e.g., minor status, married vs single)
   - Add more risk adjustments
   - Fine-tune category assignments

3. **Monitoring:**
   - Track hybrid vs legacy mode usage
   - Monitor validation failures
   - Track auto-corrections

4. **Performance:**
   - Hybrid mode should be faster (smaller prompt, simpler task)
   - Monitor token usage reduction

---

## Summary

**Files Created:** 2

- `apps/backend/src/data/visaDocumentRules.ts`
- `apps/backend/src/services/checklist-rules.service.ts`

**Files Modified:** 1

- `apps/backend/src/services/ai-openai.service.ts`

**Total Lines Added:** ~800 lines

**Backwards Compatibility:** ✅ Full (legacy path unchanged)

**API Compatibility:** ✅ Full (no API changes)

**Database Compatibility:** ✅ Full (no schema changes)

**Safety:** ✅ Hybrid mode has fallbacks to legacy mode

**Status:** ✅ Ready for testing
