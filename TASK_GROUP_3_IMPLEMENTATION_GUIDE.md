# Task Group 3 - Freeze System Prompts - Implementation Guide

**Status:** Partially Complete

## Completed

✅ **`apps/backend/src/config/ai-prompts.ts`** - Created
- `CHECKLIST_SYSTEM_PROMPT` - Extracted and refactored from inline prompt
- `DOC_CHECK_SYSTEM_PROMPT` - New prompt for document checking (scaffolding)

## Remaining Changes Needed

### `apps/backend/src/services/ai-openai.service.ts`

**1. Add import at the top (after line 3):**
```typescript
import { CHECKLIST_SYSTEM_PROMPT } from '../config/ai-prompts';
```

**2. Replace the inline system prompt (lines ~1221-1404):**

Find this line:
```typescript
const systemPrompt = `You are a STRICT visa document checklist generator specialized for Uzbek applicants.
```

And replace the ENTIRE template literal (ending with `Your goal: produce the most reliable, accurate, embassy-ready checklist every time.`;`) with:

```typescript
// Use frozen system prompt from centralized config
// Dynamic context (risk score, profile details) goes in user message, not system prompt
const systemPrompt = CHECKLIST_SYSTEM_PROMPT;
```

**Important:** The system prompt is now frozen and centralized. Any dynamic additions (like risk score details, applicant profile summary) should be added to the `userPrompt` variable, NOT by modifying the system prompt string.

## Verification

After making changes:
1. The system prompt should be imported from `ai-prompts.ts`
2. The inline prompt (180+ lines) should be replaced with a single line using the constant
3. All dynamic context should be in the user message, not the system prompt
4. No linting errors

## Notes

- The new `CHECKLIST_SYSTEM_PROMPT` is structured with clear sections
- It references `ApplicantProfile` and `ChecklistBrainOutput` interfaces
- It includes the JSON schema description
- The `DOC_CHECK_SYSTEM_PROMPT` is ready for future use (Inspector mode)



