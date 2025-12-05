# Compact Checklist Prompts Implementation

**Date:** 2025-01-27  
**Feature:** Replace legacy giant checklist prompts with compact, strict versions

---

## Overview

Replaced verbose checklist prompts with compact, strict prompts that:

- Use `CanonicalAIUserContext` for consistent input
- Use base document list from rules engine (rules mode)
- Only allow GPT to enrich fields, not invent new documentTypes
- Enforce hard limits and JSON schema
- Keep old prompts commented/behind feature flag

---

## Changes Made

### 1. Rules Mode (VisaChecklistEngineService)

**File:** `apps/backend/src/services/visa-checklist-engine.service.ts`

#### New Compact System Prompt

- **Before**: ~300 lines of verbose instructions
- **After**: ~30 lines focusing on enrichment only
- Key changes:
  - GPT MUST output exactly the documentTypes from BASE_DOCUMENTS
  - GPT MUST NOT add/remove documentTypes
  - GPT ONLY enriches: name, nameUz, nameRu, description, appliesToThisApplicant, reasonIfApplies
  - Optional embassy summary (first 500 chars) if available

#### New Compact User Prompt

- **Before**: Verbose human-readable context summary
- **After**: Compact JSON with CanonicalAIUserContext
- Includes:
  - BASE_DOCUMENTS (from rules engine)
  - APPLICANT_CONTEXT (compact JSON from CanonicalAIUserContext)
  - Optional PREVIOUS_CHECKLIST (for stable IDs)

#### Base Documents Logic

- Uses `buildBaseChecklistFromRules()` to determine documents BEFORE GPT call
- Documents are filtered by conditional logic (if version >= 2)
- GPT only enriches these pre-determined documents

#### Validation

- Validates that all base documents are present in response
- Validates that no extra documentTypes are added
- Auto-fixes: removes extras, adds missing with defaults

### 2. Legacy Mode (AIOpenAIService)

**File:** `apps/backend/src/services/ai-openai.service.ts`

#### New Compact System Prompt

- **Before**: ~40 lines
- **After**: ~25 lines
- Key changes:
  - Simplified rules
  - Hard limits on items (min-max range)
  - JSON schema enforcement

#### New Compact User Prompt

- **Before**: Verbose human-readable applicant info
- **After**: Compact JSON using CanonicalAIUserContext
- Includes:
  - APPLICANT_CONTEXT (JSON from CanonicalAIUserContext)
  - KNOWLEDGE_BASE (truncated to 800 chars)
  - DOCUMENT_GUIDES (truncated to 500 chars)

### 3. Feature Flag

**Environment Variable:** `USE_COMPACT_CHECKLIST_PROMPTS`

- Default: `true` (compact prompts enabled)
- Set to `false` to use old prompts
- Old prompts kept as `buildSystemPromptLegacy()` and `buildUserPromptLegacy()` methods

### 4. Embassy Summary Integration

**File:** `apps/backend/src/services/visa-checklist-engine.service.ts`

- Fetches latest `EmbassyPageContent` with `status='success'` for country/visaType
- Includes first 500 characters in system prompt (optional)
- Gracefully handles missing embassy content

---

## Prompt Comparison

### Rules Mode System Prompt

**Old (300+ lines):**

- Verbose instructions about source of truth
- Detailed personalization rules
- Category and group mapping rules
- Names and descriptions rules
- Dependencies and priority rules
- Strictness and conservatism rules
- Output rules

**New (30 lines):**

- CRITICAL RULES: Must output exact documentTypes, no additions/removals
- Only enrich: name, nameUz, nameRu, description, appliesToThisApplicant, reasonIfApplies
- Optional embassy summary
- Output schema

### Rules Mode User Prompt

**Old:**

- Verbose human-readable applicant profile
- Full VISA_RULE_SET JSON
- Financial requirements, processing info, additional requirements

**New:**

- BASE_DOCUMENTS (pre-determined list)
- APPLICANT_CONTEXT (compact JSON)
- Optional PREVIOUS_CHECKLIST

### Legacy Mode System Prompt

**Old (40 lines):**

- Verbose task description
- Full output schema with examples
- Detailed rules

**New (25 lines):**

- Simplified task
- Output schema
- Compact rules

### Legacy Mode User Prompt

**Old:**

- Verbose human-readable applicant information (15+ lines)
- Full knowledge base (1000 chars)
- Full document guides

**New:**

- APPLICANT_CONTEXT (compact JSON)
- KNOWLEDGE_BASE (800 chars)
- DOCUMENT_GUIDES (500 chars)

---

## Validation & Safety

### Rules Mode

1. **Base Documents Validation**: Ensures all base documents are present, no extras
2. **Auto-Fix**: Removes extras, adds missing with defaults
3. **Schema Validation**: Zod schema validation
4. **Document Type Lock**: GPT cannot invent new documentTypes

### Legacy Mode

1. **Hard Limits**: Enforced via `MIN_ITEMS_HARD` and `IDEAL_MIN_ITEMS`
2. **JSON Schema**: `response_format: { type: 'json_object' }`
3. **Validation**: `parseAndValidateChecklistResponse()` with strict checks

---

## Usage

### Enable Compact Prompts (Default)

```bash
# No action needed - enabled by default
# Or explicitly set:
USE_COMPACT_CHECKLIST_PROMPTS=true
```

### Disable Compact Prompts (Use Old Prompts)

```bash
USE_COMPACT_CHECKLIST_PROMPTS=false
```

---

## Benefits

1. **Reduced Token Usage**: ~70% reduction in prompt size
2. **Faster Responses**: Shorter prompts = faster GPT processing
3. **Stricter Control**: GPT cannot invent documents (rules mode)
4. **Consistent Input**: CanonicalAIUserContext ensures consistent data
5. **Better Validation**: Base documents validation prevents hallucinations
6. **Rollback Safety**: Old prompts kept for easy rollback

---

## Migration Notes

- **No Breaking Changes**: Old prompts still available via feature flag
- **Backward Compatible**: Existing API contracts unchanged
- **Gradual Rollout**: Can test compact prompts with feature flag
- **Monitoring**: Log validation warnings for document type mismatches

---

## Files Modified

1. `apps/backend/src/services/visa-checklist-engine.service.ts`
   - `buildSystemPrompt()` - New compact version
   - `buildSystemPromptLegacy()` - Old version (kept)
   - `buildUserPrompt()` - New compact version
   - `buildUserPromptLegacy()` - Old version (kept)
   - `generateChecklist()` - Uses base documents, embassy summary

2. `apps/backend/src/services/ai-openai.service.ts`
   - `generateChecklistLegacy()` - Uses compact prompts
   - `buildLegacySystemPromptCompact()` - New compact version
   - `buildLegacySystemPromptLegacy()` - Old version (kept)
   - `buildLegacyUserPromptCompact()` - New compact version
   - `buildLegacyUserPromptLegacy()` - Old version (kept)

---

**End of Implementation**
