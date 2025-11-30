# Phase 1 - Task Group 3: Freeze System Prompts - Status Report

**Date:** 2025-01-27  
**Status:** ✅ Prompts Created, ⚠️ Integration Pending

## Completed

✅ **`apps/backend/src/config/ai-prompts.ts`** - Created and validated
- `CHECKLIST_SYSTEM_PROMPT` - Fully extracted and refactored
  - 7 clear sections with structured headings
  - References `ApplicantProfile` and `ChecklistBrainOutput` interfaces
  - Includes complete JSON schema description
  - All country-specific terminology rules included
  - Anti-hallucination rules clearly stated
  - No linting errors

- `DOC_CHECK_SYSTEM_PROMPT` - Scaffolding for Inspector mode
  - Complete prompt structure for document checking
  - References `DocCheckResult` interface
  - Ready for future implementation

## Remaining Work

### `apps/backend/src/services/ai-openai.service.ts`

**Required Changes:**

1. **Add import (after line 3):**
```typescript
import { CHECKLIST_SYSTEM_PROMPT } from '../config/ai-prompts';
```

2. **Replace inline system prompt (lines ~1221-1404):**

The current code has a 180+ line inline template literal starting with:
```typescript
const systemPrompt = `You are a STRICT visa document checklist generator...
```

Replace the ENTIRE template literal (ending with `Your goal: produce the most reliable, accurate, embassy-ready checklist every time.`;`) with:

```typescript
// Use frozen system prompt from centralized config
// Dynamic context (risk score, profile details) goes in user message, not system prompt
const systemPrompt = CHECKLIST_SYSTEM_PROMPT;
```

**Important Notes:**
- The system prompt is now frozen and centralized
- Any dynamic additions (risk score details, applicant profile summary) should be added to the `userPrompt` variable, NOT by modifying the system prompt string
- The user message already contains dynamic context, so this change is safe

## File Structure

**New File Created:**
- `apps/backend/src/config/ai-prompts.ts` (1,000+ lines)
  - Well-structured with clear sections
  - Comprehensive documentation
  - Ready for 1-2 year stability

## Verification Checklist

After applying the remaining changes:
- [ ] Import statement added
- [ ] Inline prompt replaced with constant
- [ ] No linting errors
- [ ] System prompt is frozen (no string concatenation)
- [ ] Dynamic context remains in user message

## Benefits

1. **Centralized:** All prompts in one place
2. **Frozen:** Stable for 1-2 years
3. **Structured:** Clear sections make maintenance easier
4. **Typed:** References TypeScript interfaces
5. **Maintainable:** Easy to update without touching service code



