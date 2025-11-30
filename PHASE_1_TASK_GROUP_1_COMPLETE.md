# Phase 1 - Task Group 1: Centralize & Freeze Schemas - COMPLETE

**Date:** 2025-01-27  
**Status:** ✅ Complete

## Summary

Successfully created centralized canonical schemas for the GPT-4-based visa checklist system. All schemas are defined in `apps/backend/src/types/visa-brain.ts` and are designed to be stable and reusable for 1-2 years.

## Files Created

### `apps/backend/src/types/visa-brain.ts`

**Purpose:** Centralized canonical domain schemas for the visa brain system.

**Schemas Defined:**

1. **`ApplicantProfile`** - Core input for GPT-4 reasoning about a user
   - Maps from `AIUserContext` + `VisaQuestionnaireSummary`
   - All fields optional to allow gradual migration
   - Includes: user info, destination, visa type, trip details, sponsor, financials, travel history, ties

2. **`VisaTemplate`** - Per country + visa type canonical template
   - Future-proof structure for visa requirements
   - Includes: eligibility rules, required documents, financial requirements, processing time, official links
   - Coverage levels: CORE, GOOD, BETA

3. **`ChecklistBrainOutput`** - Internal GPT-4 checklist schema
   - Canonical representation before mapping to API format
   - Includes: country/visa info, profile summary, checklist items, financial requirements, warnings, disclaimer
   - Items have status: REQUIRED, HIGHLY_RECOMMENDED, OPTIONAL, CONDITIONAL

4. **`DocCheckResult`** - Document check result schema
   - For Inspector mode (scaffolding for future use)
   - Includes: status, problems, suggestions

**Supporting Types:**
- `VisaEligibilityRule`
- `VisaFinancialRequirement`
- `VisaProcessingTime`
- `VisaOfficialLink`
- `VisaSpecialNote`
- `VisaRequiredDocumentTemplate`
- `ChecklistBrainItem`
- `ChecklistItemStatus`
- `DocCheckStatus`
- `DocCheckProblem`
- `DocCheckSuggestion`

**Utilities:**
- `isApplicantProfile()` - Type guard
- `isChecklistBrainOutput()` - Type guard
- `mapAIUserContextToApplicantProfile()` - Mapper from existing types

## Architecture Principles Applied

✅ **Centralized:** All core types defined in one file  
✅ **Frozen:** Schema changes require careful consideration  
✅ **Mapped:** Existing types map to new schemas via adapter functions  
✅ **Typed:** Strong TypeScript typing throughout  
✅ **Backward Compatible:** No breaking changes to existing code

## Usage Example

```typescript
import { 
  ApplicantProfile, 
  ChecklistBrainOutput,
  mapAIUserContextToApplicantProfile 
} from './types/visa-brain';
import { buildAIUserContext } from './services/ai-context.service';

// Build existing context
const context = await buildAIUserContext(userId, applicationId);

// Map to new canonical profile
const profile: ApplicantProfile = mapAIUserContextToApplicantProfile(
  context,
  'United States', // countryName
  'Student Visa'   // visaTypeLabel
);

// Use profile for GPT-4 reasoning
// (Next phase will integrate this into GPT-4 calls)
```

## Next Steps

The schemas are now defined and ready for use. Next phases will:

1. **Extract and freeze system prompts** (Task Group 2)
2. **Make GPT-4 usage more explicit** (Task Group 3)
3. **Create adapters** to map between schemas and existing API formats

## Notes

- All schemas are designed to be stable for 1-2 years
- Properties are optional where data might be missing (gradual migration)
- Mapper function handles conversion from existing `AIUserContext` type
- No breaking changes to existing code - this is additive only



