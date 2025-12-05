# VisaRuleSet Schema Tolerance Update

**Date:** 2025-12-04  
**File:** `apps/backend/src/services/ai-embassy-extractor.service.ts`

---

## Summary

Updated the Zod schema for `VisaRuleSetData` to be tolerant of null/missing fields from GPT-4 responses. The schema now accepts null values and coerces them to safe defaults instead of throwing "Schema validation failed" errors.

---

## Changes Made

### 1. Added Nullable Helper Types

```typescript
const nullableString = z.union([z.string(), z.null()]).transform((v) => v ?? '');
const nullableNumber = z.union([z.number(), z.null()]).transform((v) => v ?? 0);
const nullableBool = z.union([z.boolean(), z.null()]).transform((v) => v ?? false);
```

These helpers accept null values and transform them to safe defaults:

- `null` strings → empty string `''`
- `null` numbers → `0`
- `null` booleans → `false`

### 2. Refactored Nested Schemas

All nested schemas now use the nullable helpers for optional fields:

- **RequiredDocumentSchema**: `validityRequirements`, `formatRequirements`, `description` now accept null
- **FinancialRequirementsSchema**: All numeric/string fields accept null
- **ProcessingInfoSchema**: All fields accept null
- **FeesSchema**: All fields accept null
- **AdditionalRequirementsSchema**: All nested fields accept null

### 3. Made Top-Level Blocks Optional with Defaults

- `requiredDocuments`: Optional, defaults to empty array `[]`
- `financialRequirements`: Optional
- `processingInfo`: Optional
- `fees`: Optional
- `additionalRequirements`: Optional

### 4. Added Passthrough Mode

Changed from `.strict()` to `.passthrough()` to allow unknown extra keys from GPT responses.

---

## Fields Now Tolerant to Null

### Required Documents

- ✅ `validityRequirements` - null → `''`
- ✅ `formatRequirements` - null → `''`
- ✅ `description` - null → `''`

### Financial Requirements

- ✅ `minimumBalance` - null → `0`
- ✅ `currency` - null → `''`
- ✅ `bankStatementMonths` - null → `0`
- ✅ `sponsorRequirements.allowed` - null → `false`
- ✅ `sponsorRequirements.requiredDocuments` - null → `[]`

### Processing Info

- ✅ `processingDays` - null → `0`
- ✅ `appointmentRequired` - null → `false`
- ✅ `interviewRequired` - null → `false`
- ✅ `biometricsRequired` - null → `false`

### Fees

- ✅ `visaFee` - null → `0`
- ✅ `serviceFee` - null → `0`
- ✅ `currency` - null → `''`

### Additional Requirements

- ✅ `travelInsurance.required` - null → `false`
- ✅ `travelInsurance.minimumCoverage` - null → `0`
- ✅ `travelInsurance.currency` - null → `''`
- ✅ `accommodationProof.required` - null → `false`
- ✅ `accommodationProof.types` - null → `[]`
- ✅ `returnTicket.required` - null → `false`
- ✅ `returnTicket.refundable` - null → `false`

---

## Production Impact

### Before

- GPT-4 responses with null values caused "Schema validation failed" errors
- Entire ruleset extraction failed even if only a few fields were null
- Partial data was lost

### After

- Null values are automatically coerced to safe defaults
- Partial rulesets are successfully saved and usable
- Only truly invalid data (e.g., missing `documentType`) causes failures

---

## Example: Production Error → Fixed

### Before (Would Fail)

```json
{
  "requiredDocuments": [
    {
      "documentType": "passport",
      "validityRequirements": null, // ❌ Schema validation failed
      "formatRequirements": null
    }
  ],
  "financialRequirements": {
    "bankStatementMonths": null // ❌ Schema validation failed
  }
}
```

### After (Succeeds)

```json
{
  "requiredDocuments": [
    {
      "documentType": "passport",
      "validityRequirements": null, // ✅ Coerced to ""
      "formatRequirements": null // ✅ Coerced to ""
    }
  ],
  "financialRequirements": {
    "bankStatementMonths": null // ✅ Coerced to 0
  }
}
```

**Result:** Ruleset is saved successfully with:

- `validityRequirements: ""`
- `formatRequirements: ""`
- `bankStatementMonths: 0`

---

## Verification

✅ **TypeScript Compilation**: Passes  
✅ **Linting**: Passes (only pre-existing warnings)  
✅ **Schema Validation**: Accepts null values and coerces to defaults  
✅ **Backward Compatibility**: Existing rulesets (AU tourist/student) remain valid

---

## Files Changed

1. **`apps/backend/src/services/ai-embassy-extractor.service.ts`**
   - Updated `VisaRuleSetDataSchema` with nullable helpers
   - Refactored nested schemas
   - Added defaults and passthrough mode

2. **`apps/backend/src/services/__tests__/visa-rules-schema-tolerance.test.ts`** (NEW)
   - Unit tests for null tolerance (optional, for future use)

---

## What Was NOT Changed

- ✅ Database schema (Prisma models)
- ✅ Existing VisaRuleSet rows in database
- ✅ TypeScript interface `VisaRuleSetData` (still matches schema output)
- ✅ Business logic in checklist generation
- ✅ Document validation logic

---

## Next Steps

1. Deploy to production
2. Monitor logs - should see fewer "Schema validation failed" errors
3. Verify that partial rulesets from ES, AE, US sources are now successfully saved

---

**Status:** ✅ **READY FOR PRODUCTION**

The schema is now tolerant to null/missing fields and will successfully parse partial GPT-4 responses instead of failing validation.
