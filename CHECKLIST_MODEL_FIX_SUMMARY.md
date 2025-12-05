# Checklist AI Model Configuration Fix - Patch Summary

**Date:** January 2025  
**Status:** ✅ Complete  
**Issue:** Checklist generation was using `gpt-4o-mini` instead of GPT-4 models

---

## Modified Files

### 1. **apps/backend/src/services/ai-openai.service.ts** (MODIFIED)

- Added `CHECKLIST_MODEL` static property that uses `OPENAI_MODEL_CHECKLIST` env var with default `gpt-4o`
- Added `getChecklistModel()` method to retrieve checklist model
- Added `callChecklistAPI()` private method with fallback logic
- Updated timeout from 35000ms → 60000ms
- Updated all checklist generation calls to use `callChecklistAPI()` instead of direct OpenAI calls
- Added comprehensive logging before every checklist request
- Updated logging to show actual model used in responses

### 2. **apps/backend/src/services/visa-checklist-engine.service.ts** (MODIFIED)

- Updated to use `AIOpenAIService.getChecklistModel()` instead of `AIOpenAIService.MODEL`
- Added console.log before checklist API call
- Updated logging to show actual model used

---

## Fixes Applied

### 1. **New Model Configuration**

- **Before:** `MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'` (used for everything)
- **After:**
  - `MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'` (for general AI tasks)
  - `CHECKLIST_MODEL = process.env.OPENAI_MODEL_CHECKLIST || 'gpt-4o'` (for checklist generation)

### 2. **Fallback Hierarchy**

Checklist generation now uses this model hierarchy:

1. **Primary:** `OPENAI_MODEL_CHECKLIST` env var (if set)
2. **Fallback 1:** `gpt-4o` (default if env var not set)
3. **Fallback 2:** `gpt-4.1` (if gpt-4o fails/timeouts)

**Important:** NEVER falls back to `gpt-4o-mini` for checklist generation.

### 3. **Timeout Increase**

- **Before:** 35000ms (35 seconds)
- **After:** 60000ms (60 seconds)
- Reason: GPT-4 models can take longer to generate comprehensive checklists

### 4. **Robust Fallback Logic**

The new `callChecklistAPI()` method:

- Tries models in order: `OPENAI_MODEL_CHECKLIST` → `gpt-4o` → `gpt-4.1`
- Retries on timeout errors automatically
- Stops on first successful response
- Logs each attempt with detailed context
- Throws error only if all models fail

### 5. **Enhanced Logging**

Added logging at multiple points:

- **Before request:** `console.log('[Checklist][AI] Using model: <model>')`
- **During attempt:** `logInfo('[Checklist][AI] Attempting checklist generation')`
- **On success:** `logInfo('[Checklist][AI] Successfully generated checklist')`
- **On failure:** `logWarn('[Checklist][AI] Model attempt failed')`
- **In responses:** Includes `model` field showing actual model used

### 6. **Updated All Checklist Calls**

- **Hybrid mode:** Uses `callChecklistAPI()` with fallback
- **Legacy mode:** Uses `callChecklistAPI()` with fallback
- **VisaChecklistEngine:** Uses `getChecklistModel()` directly

---

## Model Hierarchy Details

### Environment Variable Priority

1. `OPENAI_MODEL_CHECKLIST` → Used if set (can be `gpt-4o`, `gpt-4.1`, `gpt-4-turbo`, etc.)
2. Default: `gpt-4o` → Used if env var not set
3. Fallback: `gpt-4.1` → Used if primary model fails/timeouts

### Fallback Behavior

- **Timeout errors:** Automatically retries with next model in hierarchy
- **API errors:** Retries with next model
- **Malformed output:** Handled by existing retry logic in `generateChecklist()`
- **All models fail:** Throws error (caught by outer error handler)

---

## Code Changes Summary

### New Properties & Methods

**`CHECKLIST_MODEL`** (static readonly):

```typescript
public static readonly CHECKLIST_MODEL = process.env.OPENAI_MODEL_CHECKLIST || 'gpt-4o';
```

**`getChecklistModel()`** (static method):

```typescript
static getChecklistModel(): string {
  return this.CHECKLIST_MODEL;
}
```

**`callChecklistAPI()`** (private static method):

- Handles model fallback logic
- Wraps OpenAI API calls with retry on timeout
- Provides detailed logging
- Returns OpenAI response object

### Updated Calls

**Hybrid Mode** (line ~1017):

```typescript
// Before:
response = await AIOpenAIService.openai.chat.completions.create({
  model: this.MODEL,  // ❌ Could be gpt-4o-mini
  ...
});

// After:
response = await this.callChecklistAPI(
  [...],
  {...},
  { country, visaType, mode: 'hybrid' }
);  // ✅ Always uses GPT-4 with fallback
```

**Legacy Mode** (line ~1707):

```typescript
// Before:
response = await AIOpenAIService.openai.chat.completions.create({
  model: this.MODEL,  // ❌ Could be gpt-4o-mini
  ...
});

// After:
response = await this.callChecklistAPI(
  [...],
  {...},
  { country, visaType, mode: 'legacy' }
);  // ✅ Always uses GPT-4 with fallback
```

**VisaChecklistEngine** (line ~95):

```typescript
// Before:
model: AIOpenAIService.MODEL,  // ❌ Could be gpt-4o-mini

// After:
model: checklistModel,  // ✅ Always uses GPT-4 (gpt-4o or configured)
```

---

## Logging Improvements

### Before Every Checklist Request

```typescript
console.log(`[Checklist][AI] Using model: ${model} (attempt ${i + 1}/${modelsToTry.length})`, {
  country: context.country,
  visaType: context.visaType,
  mode: context.mode || 'unknown',
});
```

### In All Response Logs

- Added `model` field showing actual model used
- Added `responseTimeMs` for performance tracking
- Added `tokensUsed` for cost tracking

### Example Log Output

```
[Checklist][AI] Using model: gpt-4o (attempt 1/3)
[Checklist][AI] Attempting checklist generation { model: 'gpt-4o', attempt: 1, ... }
[Checklist][AI] Successfully generated checklist { model: 'gpt-4o', inputTokens: 1200, ... }
```

---

## Removed Hardcoded Mini References

### Checklist Generation

- ✅ Removed `this.MODEL` usage in `generateChecklist()` (hybrid mode)
- ✅ Removed `this.MODEL` usage in `generateChecklist()` (legacy mode)
- ✅ Removed `AIOpenAIService.MODEL` usage in `VisaChecklistEngine`

### Comments Updated

- ✅ Updated comment: "Use gpt-4o-mini for checklist generation" → Removed (now incorrect)
- ✅ Added comment: "NEVER falls back to gpt-4o-mini for checklist generation"

### Remaining References (Intentional)

- `MODEL` property still defaults to `gpt-4o-mini` for **non-checklist** tasks (chat, document validation, etc.)
- Comment in `dev.ts` about testing `gpt-4o-mini` checklist (test file, not production code)

---

## Verification Checklist

✅ **Model Configuration**

- `CHECKLIST_MODEL` uses `OPENAI_MODEL_CHECKLIST` env var
- Defaults to `gpt-4o` if env var not set
- Never defaults to `gpt-4o-mini`

✅ **Fallback Logic**

- Tries `OPENAI_MODEL_CHECKLIST` first
- Falls back to `gpt-4o` on timeout/failure
- Falls back to `gpt-4.1` if `gpt-4o` fails
- Never falls back to `gpt-4o-mini`

✅ **Timeout**

- Increased from 35000ms to 60000ms
- Applied to OpenAI client initialization

✅ **Logging**

- Console.log before every checklist request
- LogInfo for each attempt
- LogInfo on success with model name
- LogWarn on failure with retry info
- All response logs include model field

✅ **All Checklist Paths Updated**

- Hybrid mode uses `callChecklistAPI()`
- Legacy mode uses `callChecklistAPI()`
- VisaChecklistEngine uses `getChecklistModel()`

---

## Environment Variables

### New Variable (Optional)

```bash
OPENAI_MODEL_CHECKLIST=gpt-4o  # or gpt-4.1, gpt-4-turbo, etc.
```

**If not set:** Defaults to `gpt-4o`

**If set to `gpt-4o-mini`:** Will use it (user's choice), but fallback hierarchy still applies

---

## Testing Recommendations

1. **Test with default (no env var):**
   - Should use `gpt-4o`
   - Check logs: `[Checklist][AI] Using model: gpt-4o`

2. **Test with `OPENAI_MODEL_CHECKLIST=gpt-4.1`:**
   - Should use `gpt-4.1` first
   - Check logs: `[Checklist][AI] Using model: gpt-4.1`

3. **Test timeout scenario:**
   - Should retry with `gpt-4o` if primary model times out
   - Check logs: `[Checklist][AI] Model attempt failed` → retry with next model

4. **Verify no mini usage:**
   - Search logs for `gpt-4o-mini` in checklist generation
   - Should not appear unless explicitly configured

---

## Summary

**Before:**

- Checklist generation could use `gpt-4o-mini` (default)
- 35 second timeout
- No fallback logic
- Limited logging

**After:**

- Checklist generation ALWAYS uses GPT-4 (`gpt-4o` or `gpt-4.1`)
- 60 second timeout
- Robust fallback hierarchy
- Comprehensive logging
- Never falls back to `gpt-4o-mini` unless explicitly configured

**Result:** Checklist generation now consistently uses high-quality GPT-4 models with proper fallback handling and detailed logging for debugging.



