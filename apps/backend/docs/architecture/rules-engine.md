# Rules Engine Architecture

This document describes the architecture of the visa document requirements rules engine, including the single source of truth and fallback mechanisms.

## 1. Entities and Sources of Truth

### VisaRuleSet (Primary Source of Truth)

**Location**: `apps/backend/prisma/schema.prisma` (VisaRuleSet model)

**Structure**:

- `countryCode`: ISO 3166-1 alpha-2 (e.g., "US", "GB")
- `visaType`: Normalized visa type (e.g., "tourist", "student")
- `data`: JSON field containing `VisaRuleSetData` structure
- `isApproved`: Boolean flag (only approved rule sets are used in production)
- `version`: Incremental version number

**Data Structure** (`VisaRuleSetData`):

```typescript
{
  version?: number, // Version 2+ supports conditional logic
  requiredDocuments: Array<{
    documentType: string,
    category: 'required' | 'highly_recommended' | 'optional',
    description?: string,
    validityRequirements?: string,
    formatRequirements?: string,
    condition?: string // Version 2+: conditional inclusion
  }>,
  financialRequirements?: { ... },
  processingInfo?: { ... },
  fees?: { ... },
  additionalRequirements?: { ... }
}
```

**Authority**: For supported countries & visa types, `VisaRuleSet` (with `isApproved = true`) is the **SINGLE authoritative source** for document requirements.

### VisaRuleReference + DocumentCatalog (Catalog Mode)

**Location**:

- `apps/backend/prisma/schema.prisma` (VisaRuleReference, DocumentCatalog models)
- `apps/backend/src/services/checklist-rules.service.ts`

**Structure**:

- `VisaRuleReference`: Links `VisaRuleSet` to `DocumentCatalog` entries
- `DocumentCatalog`: Global document type definitions with multilingual names/descriptions
- Used when `USE_GLOBAL_DOCUMENT_CATALOG=true` environment variable is set

**Authority**: When catalog mode is enabled, `VisaRuleReference` + `DocumentCatalog` provide the canonical document metadata, but the requirement rules still come from `VisaRuleSet.data.requiredDocuments[]`.

### VisaType.documentTypes (Legacy - Display/Marketing Only)

**Location**: `apps/backend/prisma/schema.prisma` (VisaType model, line 100)

**Structure**: JSON string array of document type names

**Status**: **LEGACY FIELD** - Do not use as a primary rules source. This field exists for backward compatibility and display/marketing purposes only. It is not used by the rules engine.

**Authority**: **NOT a source of truth** - May contain outdated or incomplete data.

### fallback-checklists.ts (Static Emergency Fallback)

**Location**: `apps/backend/src/data/fallback-checklists.ts`

**Structure**: Pre-defined static checklists for 8 countries × 2 visa types (US, GB, CA, AU, DE, ES, JP, AE)

**Status**: **EMERGENCY FALLBACK ONLY** - Used only when:

- There is no approved `VisaRuleSet` for (country, visaType), OR
- Both rules-based and legacy GPT-based generation have failed

**Authority**: **NOT a source of truth** - Static templates that may not reflect current embassy requirements.

## 2. Checklist Generation Sources

The system uses a **rules-first** approach with explicit fallback hierarchy:

### 1. VisaRuleSet (Primary - Rules-First Mode)

**When Used**: When an approved `VisaRuleSet` exists for (countryCode, visaType)

**Process**:

1. `VisaRulesService.getActiveRuleSet()` fetches latest approved rule set
2. `ChecklistRulesService.buildBaseChecklist()` builds base checklist from rules
3. Condition evaluation filters documents based on applicant profile
4. `VisaChecklistEngineService.generateChecklist()` enriches with AI (GPT-4)
5. Returns personalized checklist with expert reasoning

**Service**: `VisaChecklistEngineService` in `apps/backend/src/services/visa-checklist-engine.service.ts`

**Model**: `gpt-4o` (via `getAIConfig('checklist')`)

### 2. Legacy GPT Pipeline (Fallback Mode)

**When Used**:

- No approved `VisaRuleSet` exists for (countryCode, visaType), OR
- Rules-based generation failed (timeout, error, invalid response)

**Process**:

1. `AIOpenAIService.generateChecklistLegacy()` generates checklist from scratch
2. Uses embedded system prompt (different from rules mode)
3. Returns checklist without rule-based grounding

**Service**: `AIOpenAIService` in `apps/backend/src/services/ai-openai.service.ts`

**Model**: `gpt-4o` (via `getAIConfig('checklistLegacy')`)

**Status**: **LEGACY** - New features should prefer rules-first mode.

### 3. Static Fallback (Last Resort)

**When Used**:

- Both rules-based and legacy GPT generation failed, OR
- Both returned insufficient items (< MIN_ITEMS_HARD = 4)

**Process**:

1. `buildFallbackChecklistFromStaticConfig()` loads pre-defined checklist
2. Merges with existing uploaded documents
3. Returns static template checklist

**Service**: `fallback-checklist-helper.ts` in `apps/backend/src/utils/fallback-checklist-helper.ts`

**Data**: `fallback-checklists.ts` in `apps/backend/src/data/fallback-checklists.ts`

**Status**: **EMERGENCY FALLBACK ONLY** - Static templates, not a source of truth.

## 3. Design Decisions for Future Phases

- **Document Type Normalization**: We will centralize `documentType` normalization using `normalizeDocumentType()` from `document-types-map.ts` across all services.

- **Prompt Unification**: We will unify prompt templates (currently duplicated between `ai-prompts.ts` and embedded prompts in services) to reduce maintenance burden and ensure consistency.

- **Error Logging**: We will improve error logging to always persist `aiErrorOccurred` and `aiFallbackUsed` flags to the database, and add structured logging for all fallback mode transitions.

- **VisaRuleSet as Canonical Rules DB**: We will treat `VisaRuleSet` as the canonical rules database for tuning GPT-4/DeepSeek models, ensuring all AI prompts reference approved rule sets as authoritative ground truth.

- **Condition Language Expansion**: We will expand the condition evaluator DSL to support more operators (e.g., `>`, `<`, `>=`, `<=`) and validate conditions before storing in the database.

- **Country Code Normalization**: We will complete country code normalization across all services using `CountryRegistry` to prevent country mismatches.

## 4. Current Implementation Status

### Phase 1 Refactor (Completed)

- **Centralized Rule Set Selection**: Created `findApprovedRuleSet()` helper in `VisaRulesService` to centralize normalization and query logic. Both `getActiveRuleSet()` and `getActiveRuleSetWithReferences()` now use this helper.

- **Documented Precedence of Rule Sources**: Added clear documentation in `VisaRulesService` and `DocumentChecklistService` explaining that `VisaRuleSet` is the single source of truth, with legacy sources marked as fallback-only.

- **Added Logging for Fallback Modes**: Enhanced logging in `DocumentChecklistService` to clearly indicate when fallback modes are used, with structured log messages showing the decision chain (rules → legacy → static).

- **Marked Legacy Sources as Deprecated**:
  - Added Prisma comment on `VisaType.documentTypes` field marking it as legacy
  - Added warning comment in `fallback-checklists.ts` marking it as emergency-only
  - Added deprecation comment on `AIOpenAIService.generateChecklistLegacy()` marking it as legacy

- **Explicit Mode Routing**: Refactored `DocumentChecklistService.generateChecklistAsync()` to have explicit, self-documented decision logic with clear comments explaining when each mode is used.
