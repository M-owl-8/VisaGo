# Phase 3: Expert Checklist Generation - Implementation Summary

## Overview

Phase 3 successfully implements centralized, expert-level checklist generation for GPT-4 with:

- Unified V2 system prompt in `ai-prompts.ts`
- Enriched JSON schema with expert reasoning fields and source tracking
- Anti-hallucination rules and safety checks
- Comprehensive logging metrics

## New/Updated Prompt Definitions

### 1. VISA_CHECKLIST_SYSTEM_PROMPT_V2

**Location**: `apps/backend/src/config/ai-prompts.ts`

**Key Features**:

- Defines role: "Expert visa document checklist generator for Uzbek applicants"
- Explicit rules:
  - VisaRuleSet is PRIMARY LAW (no contradictions allowed)
  - Must use normalized documentType values (aligned with DocumentCatalog)
  - Anti-hallucination: No invented documents, no fake names
  - ai_extra documents limited to max 2-3, must be "highly_recommended" or "optional", never "required"
- Requires expertReasoning for every item:
  - `financialRelevance`: Why document matters for financial sufficiency
  - `tiesRelevance`: How document strengthens ties to Uzbekistan
  - `riskMitigation`: Array of risk drivers addressed
  - `embassyOfficerPerspective`: What officers look for
- Source tracking: Every item must have `source = "rules"` or `source = "ai_extra"`

### 2. buildVisaChecklistUserPromptV2()

**Location**: `apps/backend/src/config/ai-prompts.ts`

**Purpose**: Centralized helper that builds comprehensive user prompt from:

- `CanonicalAIUserContext` (applicant profile, risk data, expert fields)
- `VisaRuleSetData` (official rules)
- Base checklist items (from rules, after condition evaluation)
- `CountryVisaPlaybook` (optional country-specific guidance)

**Output**: Structured user prompt with:

- Applicant context (risk level, risk drivers, financial/ties/travel scores)
- Base documents list (from rules)
- Official rules summary
- Country playbook hints (if available)
- Clear instructions for GPT-4

## Final Zod Schema for Checklist Items

**Location**: `apps/backend/src/services/visa-checklist-engine.service.ts`

```typescript
const ChecklistItemSchema = z.object({
  // Required fields
  id: z.string(),
  documentType: z.string(), // Normalized (aligned with DocumentCatalog)
  category: z.enum(['required', 'highly_recommended', 'optional']),
  required: z.boolean(),
  name: z.string(),
  nameUz: z.string(),
  nameRu: z.string(),
  description: z.string(),
  appliesToThisApplicant: z.boolean(),
  group: z.enum(['identity', 'financial', 'travel', 'education', 'employment', 'ties', 'other']),
  priority: z.number().int().min(1),

  // Phase 3: Source tracking (REQUIRED)
  source: z.enum(['rules', 'ai_extra']).default('rules'),

  // Optional but strongly encouraged
  reasonIfApplies: z.string().optional(),
  extraRecommended: z.boolean().optional(),
  dependsOn: z.array(z.string()).optional(),

  // Phase 3: Expert reasoning (strongly encouraged)
  expertReasoning: z
    .object({
      financialRelevance: z.string().nullable().optional(),
      tiesRelevance: z.string().nullable().optional(),
      riskMitigation: z.array(z.string()).optional(),
      embassyOfficerPerspective: z.string().nullable().optional(),
    })
    .optional(),

  // Additional optional fields (financialDetails, tiesDetails, countrySpecificRequirements)
  // ... (existing fields preserved)
});
```

## How Main Checklist Generation Function Calls GPT-4

**Location**: `apps/backend/src/services/visa-checklist-engine.service.ts` → `generateChecklist()`

### Model Configuration

- **Model**: Resolved via `AIOpenAIService.resolveModelForTask('checklist_enrichment', defaultChecklistModel)`
- **Default**: From `getAIConfig('checklist')` (typically `gpt-4o` or `gpt-4o-mini`)
- **Response Format**: JSON mode (if configured in `aiConfig.responseFormat`)

### Prompt Flow

1. **System Prompt**: `VISA_CHECKLIST_SYSTEM_PROMPT_V2` (centralized, expert-level)
2. **User Prompt**: `buildVisaChecklistUserPromptV2(canonicalContext, ruleSet, baseDocuments, playbook)`
3. **Messages Array**:
   ```typescript
   [
     { role: 'system', content: VISA_CHECKLIST_SYSTEM_PROMPT_V2 },
     { role: 'user', content: userPrompt },
   ];
   ```

### Validation Process

1. **JSON Extraction**: Uses `extractJsonFromResponse()` from `json-validator.ts`
2. **Schema Validation**: `ChecklistResponseSchema.safeParse(normalizedParsed)`
3. **Phase 3 Validation**: `validateAndEnrichChecklistItems()`:
   - Sets `source` field correctly (rules vs ai_extra)
   - Validates ai_extra count ≤ 3
   - Ensures ai_extra items are not marked as "required"
   - Enriches with expertReasoning if missing
4. **Auto-fix**: Attempts to fix common issues (missing fields, invalid types)
5. **Fallback**: If validation fails → falls back to legacy/static fallback

### Response Processing

1. Parse JSON from GPT-4 response
2. Validate against Zod schema
3. Enrich with source tracking and expert fields
4. Apply risk-weighted prioritization
5. Log metrics (rulesItemsCount, aiExtraItemsCount, expertFieldsCoverage, etc.)
6. Return `ChecklistResponse` with validated items

## New Logs and Metrics

### ChecklistGenerationLog Interface Updates

**Location**: `apps/backend/src/utils/gpt-logging.ts`

**New Fields** (Phase 3):

- `rulesItemsCount?: number` - Items with `source = "rules"`
- `aiExtraItemsCount?: number` - Items with `source = "ai_extra"`
- `requiredCount?: number` - Items with `category = "required"`
- `highlyRecommendedCount?: number` - Items with `category = "highly_recommended"`
- `optionalCount?: number` - Items with `category = "optional"`
- `expertFieldsCoverage?: number` - Percentage (0-100) of items with non-empty expertReasoning

### Logging Implementation

**Location**: `apps/backend/src/services/visa-checklist-engine.service.ts` → `generateChecklist()`

**Metrics Computed**:

```typescript
const rulesItemsCount = checklist.filter((item) => item.source === 'rules').length;
const aiExtraItemsCount = checklist.filter((item) => item.source === 'ai_extra').length;
const requiredCount = checklist.filter((item) => item.category === 'required').length;
const highlyRecommendedCount = checklist.filter(
  (item) => item.category === 'highly_recommended'
).length;
const optionalCount = checklist.filter((item) => item.category === 'optional').length;
const expertFieldsCoverage = (itemsWithExpertReasoning / totalItems) * 100;
```

**Safety Checks Logged**:

- Warning if `aiExtraItemsCount > 3` (threshold exceeded)
- Warning if ai_extra items are marked as "required" (invalid, auto-corrected)
- Warning if expertReasoning is missing for many items

## Anti-Hallucination Safety Checks

### 1. Source Validation

- All items from base documents → `source = "rules"`
- All items added by GPT-4 → `source = "ai_extra"`
- ai_extra items automatically trimmed if count > 3 (keeps highest priority)

### 2. Category Validation

- ai_extra items cannot be `category = "required"` (auto-downgraded to "highly_recommended")
- Only items from VisaRuleSet can be marked as "required"

### 3. Document Type Validation

- All documentType values must be normalized (aligned with DocumentCatalog)
- Unknown document types are logged but not rejected (backward compatibility)

### 4. Expert Reasoning Validation

- Missing expertReasoning is enriched with empty structure (doesn't fail validation)
- Coverage percentage is logged for monitoring

## Files Modified

1. **`apps/backend/src/config/ai-prompts.ts`**
   - Added `VISA_CHECKLIST_SYSTEM_PROMPT_V2`
   - Added `buildVisaChecklistUserPromptV2()` helper

2. **`apps/backend/src/services/visa-checklist-engine.service.ts`**
   - Updated `ChecklistItemSchema` to include `source` field
   - Refactored `generateChecklist()` to use V2 prompts
   - Added `validateAndEnrichChecklistItems()` method
   - Added Phase 3 logging metrics
   - Added safety checks for ai_extra items

3. **`apps/backend/src/utils/gpt-logging.ts`**
   - Extended `ChecklistGenerationLog` interface with Phase 3 metrics

## Backward Compatibility

- **No database schema changes** - All changes are at application layer
- **Legacy prompts preserved** - `buildSystemPromptLegacy()` and `buildUserPromptLegacy()` still exist for fallback
- **Optional fields** - `expertReasoning` and `source` have defaults for backward compatibility
- **Existing API contracts preserved** - No breaking changes to HTTP responses

## Next Steps (Documentation)

Update `apps/backend/docs/architecture/rules-engine.md` with:

- Section "Phase 3 – Expert Checklist Generation"
- Description of V2 prompts and their role
- Explanation of source tracking (rules vs ai_extra)
- Expert reasoning fields and their purpose
- Anti-hallucination rules and safety checks
- Logging metrics and monitoring

---

## PHASE 3 IMPLEMENTATION COMPLETED

All Phase 3 goals have been successfully implemented:
✅ Centralized V2 prompts in `ai-prompts.ts`
✅ Enriched JSON schema with expertReasoning and source tracking
✅ Anti-hallucination rules and safety checks
✅ Comprehensive logging metrics
✅ TypeScript compilation passes
✅ Backward compatibility maintained
