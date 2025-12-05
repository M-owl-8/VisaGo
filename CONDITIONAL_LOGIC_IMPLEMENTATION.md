# Conditional Logic Implementation for VisaRuleSet

**Date:** 2025-01-27  
**Feature:** Per-document conditional logic in VisaRuleSet.data

---

## Overview

Added support for conditional document inclusion in VisaRuleSet. Each document in `requiredDocuments` can now have an optional `condition` field that determines whether it should be included based on the applicant's profile.

---

## Changes Made

### 1. Extended VisaRuleSetData Interface

**File:** `apps/backend/src/services/visa-rules.service.ts`

- Added optional `version` field (defaults to 1 for backward compatibility)
- Added optional `condition` field to `requiredDocuments` items
- Version 2+ enables conditional logic support

```typescript
export interface VisaRuleSetData {
  version?: number; // Default: 1, Version 2+ supports conditions

  requiredDocuments: Array<{
    documentType: string;
    category: 'required' | 'highly_recommended' | 'optional';
    description?: string;
    validityRequirements?: string;
    formatRequirements?: string;
    condition?: string; // NEW: Optional condition string
  }>;
  // ... rest of fields
}
```

### 2. Created Condition Evaluator

**File:** `apps/backend/src/utils/condition-evaluator.ts`

- Safe condition evaluator (NO `eval()` - uses explicit parsing)
- Supports limited DSL:
  - Equality/inequality: `===`, `!==`
  - Boolean values: `true`, `false`
  - AND/OR logic: `&&`, `||`
  - Parentheses for grouping
- Returns: `true | false | 'unknown'`

**Supported Field Paths:**

- `sponsorType`
- `currentStatus`
- `isStudent`
- `isEmployed`
- `hasInternationalTravel`
- `previousVisaRejections`
- `previousOverstay`
- `hasPropertyInUzbekistan`
- `hasFamilyInUzbekistan`
- `hasChildren`
- `hasUniversityInvitation`
- `hasOtherInvitation`
- `visaType`
- `riskScore.level`

**Example Conditions:**

```typescript
"sponsorType !== 'self'"; // Include only if sponsored
"currentStatus === 'employed'"; // Include only if employed
'previousVisaRejections === true'; // Include only if previous refusals
"(sponsorType !== 'self') && (currentStatus === 'employed')"; // AND logic
'(isStudent === true) || (hasUniversityInvitation === true)'; // OR logic
```

### 3. Integrated into Checklist Building

**File:** `apps/backend/src/services/checklist-rules.service.ts`

- Updated `buildBaseChecklistFromRules()` to evaluate conditions
- Logic:
  - If no condition → document always included
  - If condition exists and evaluates to `true` → include
  - If evaluates to `false` → exclude
  - If evaluates to `'unknown'` → include as `highly_recommended` and log warning

**Backward Compatibility:**

- Rules without `version` field (or version < 2) work as before
- Rules without `condition` field work as before
- Only rules with `version >= 2` and `condition` field use conditional logic

### 4. Updated Zod Schema Validation

**File:** `apps/backend/src/services/ai-embassy-extractor.service.ts`

- Added `condition` field to `RequiredDocumentSchema` (optional)
- Added `version` field to `VisaRuleSetDataSchema` (optional)
- Schema is backward compatible - existing rules without conditions still validate

### 5. Unit Tests

**File:** `apps/backend/tests/condition-evaluator.test.ts`

- Tests for simple equality conditions
- Tests for AND/OR logic
- Tests for parentheses
- Tests for unknown fields
- Tests for invalid syntax
- Tests for complex nested conditions

---

## Usage Examples

### Example 1: Sponsor Documents

```json
{
  "version": 2,
  "requiredDocuments": [
    {
      "documentType": "sponsor_bank_statement",
      "category": "required",
      "condition": "sponsorType !== 'self'"
    },
    {
      "documentType": "sponsor_employment_letter",
      "category": "required",
      "condition": "sponsorType !== 'self'"
    }
  ]
}
```

**Result:** These documents are only included if `sponsorType` is not `'self'`.

### Example 2: Employment Documents

```json
{
  "version": 2,
  "requiredDocuments": [
    {
      "documentType": "employment_letter",
      "category": "required",
      "condition": "currentStatus === 'employed'"
    },
    {
      "documentType": "employer_letter",
      "category": "required",
      "condition": "isEmployed === true"
    }
  ]
}
```

**Result:** These documents are only included if the applicant is employed.

### Example 3: Student Documents

```json
{
  "version": 2,
  "requiredDocuments": [
    {
      "documentType": "university_acceptance_letter",
      "category": "required",
      "condition": "(isStudent === true) || (hasUniversityInvitation === true)"
    }
  ]
}
```

**Result:** Document is included if applicant is a student OR has university invitation.

### Example 4: Risk-Based Documents

```json
{
  "version": 2,
  "requiredDocuments": [
    {
      "documentType": "refusal_explanation_letter",
      "category": "highly_recommended",
      "condition": "previousVisaRejections === true"
    },
    {
      "documentType": "additional_financial_proof",
      "category": "highly_recommended",
      "condition": "riskScore.level === 'high'"
    }
  ]
}
```

**Result:** Documents are included based on risk factors.

---

## Safety Features

1. **No `eval()`** - All parsing and evaluation is explicit
2. **Limited DSL** - Only supports safe operations (equality, AND/OR)
3. **Unknown handling** - Returns `'unknown'` for invalid conditions or missing fields
4. **Backward compatible** - Existing rules without conditions work unchanged
5. **Versioning** - Feature is behind version flag (version >= 2)
6. **Logging** - Warnings logged when conditions evaluate to `'unknown'`

---

## Migration Guide

### For Existing Rules

No migration needed! Existing rules continue to work as before.

### For New Rules with Conditions

1. Set `version: 2` in your VisaRuleSetData
2. Add `condition` field to documents that need conditional logic
3. Use supported field paths and operators only

### Example Migration

**Before (version 1):**

```json
{
  "requiredDocuments": [
    {
      "documentType": "sponsor_bank_statement",
      "category": "required"
    }
  ]
}
```

**After (version 2 with condition):**

```json
{
  "version": 2,
  "requiredDocuments": [
    {
      "documentType": "sponsor_bank_statement",
      "category": "required",
      "condition": "sponsorType !== 'self'"
    }
  ]
}
```

---

## Testing

Run tests:

```bash
npm test -- condition-evaluator.test.ts
```

Test coverage:

- ✅ Simple equality/inequality
- ✅ Boolean conditions
- ✅ AND/OR logic
- ✅ Parentheses grouping
- ✅ Unknown field handling
- ✅ Invalid syntax handling
- ✅ Complex nested conditions

---

## Future Enhancements

Potential additions (not implemented):

- Numeric comparisons (`>`, `<`, `>=`, `<=`)
- String contains operations
- Array membership checks
- More field paths as needed

---

## Notes

- Conditions are evaluated against `CanonicalAIUserContext` (rock-solid interface)
- All critical fields have defaults, so conditions should rarely evaluate to `'unknown'`
- When condition evaluates to `'unknown'`, document is included as `highly_recommended` (safe default)
- Logging helps identify issues with condition evaluation

---

**End of Implementation**
