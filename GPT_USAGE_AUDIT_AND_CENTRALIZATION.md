# GPT-4 Usage Audit and Centralization - Step 1 Complete

## Summary

Completed audit and centralization of all GPT-4 usage in the backend. All critical flows now use:

- Centralized AI models configuration
- Consistent temperature, max tokens, and response_format settings
- CanonicalAIUserContext for all checklist and verification flows
- Compact prompts where applicable
- JSON response format validation

## Files Created/Modified

### 1. `apps/backend/src/config/ai-models.ts` (NEW)

- Centralized configuration for all GPT-4 model usage
- Defines model names, temperature, max tokens, timeout, and response format per task type
- Environment variable overrides supported
- Task types: checklist, checklistLegacy, docVerification, rulesExtraction, riskExplanation, checklistExplanation, chat, evaluation

### 2. `apps/backend/src/services/visa-checklist-engine.service.ts` (MODIFIED)

- Updated to use `getAIConfig('checklist')`
- Uses centralized model, temperature, maxTokens, and responseFormat
- Already uses CanonicalAIUserContext ✓
- Already uses compact prompts ✓

### 3. `apps/backend/src/services/visa-doc-checker.service.ts` (MODIFIED)

- Updated to use `getAIConfig('docVerification')`
- Uses centralized model, temperature, maxTokens, and responseFormat
- Already uses CanonicalAIUserContext ✓
- Already uses compact prompts ✓

### 4. `apps/backend/src/services/ai-embassy-extractor.service.ts` (MODIFIED)

- Updated to use `getAIConfig('rulesExtraction')`
- Uses centralized model, temperature, maxTokens, and responseFormat
- Uses JSON response format ✓

### 5. `apps/backend/src/services/document-validation.service.ts` (MODIFIED)

- Updated to use `getAIConfig('docVerification')`
- Uses centralized model, temperature, maxTokens, and responseFormat
- Uses JSON response format ✓

### 6. `apps/backend/src/services/ai-openai.service.ts` (MODIFIED)

- Updated `generateChecklistLegacy()` to use `getAIConfig('checklistLegacy')`
- Uses centralized model, temperature, maxTokens, and responseFormat
- Already uses CanonicalAIUserContext for compact prompts ✓

## Model Usage by Flow

### Checklist Generation (Rules Mode)

- **Service**: `VisaChecklistEngineService`
- **Model**: `gpt-4o` (configurable via `OPENAI_MODEL_CHECKLIST`)
- **Temperature**: 0.3
- **Max Tokens**: 3000
- **Response Format**: JSON object
- **Context**: CanonicalAIUserContext ✓
- **Prompt**: Compact ✓

### Checklist Generation (Legacy Mode)

- **Service**: `AIOpenAIService.generateChecklistLegacy()`
- **Model**: `gpt-4o` (configurable via `OPENAI_MODEL_CHECKLIST`)
- **Temperature**: 0.3
- **Max Tokens**: 3000
- **Response Format**: JSON object
- **Context**: CanonicalAIUserContext (for compact prompts) ✓
- **Prompt**: Compact (default) ✓

### Document Verification

- **Service**: `VisaDocCheckerService` and `DocumentValidationService`
- **Model**: `gpt-4o` (configurable via `OPENAI_MODEL_DOC_VERIFICATION`)
- **Temperature**: 0.2
- **Max Tokens**: 500
- **Response Format**: JSON object
- **Context**: CanonicalAIUserContext ✓
- **Prompt**: Compact ✓

### Rules Extraction (Embassy Pages)

- **Service**: `AIEmbassyExtractorService`
- **Model**: `gpt-4o` (configurable via `OPENAI_MODEL_RULES_EXTRACTION`)
- **Temperature**: 0.3
- **Max Tokens**: 4000
- **Response Format**: JSON object
- **Context**: N/A (embassy page content)

### Risk Explanation (Future - Step 3)

- **Service**: `VisaRiskExplanationService` (to be created)
- **Model**: `gpt-4o` (configurable via `OPENAI_MODEL_RISK_EXPLANATION`)
- **Temperature**: 0.3
- **Max Tokens**: 1500
- **Response Format**: JSON object
- **Context**: CanonicalAIUserContext

### Checklist Item Explanation (Future - Step 4)

- **Service**: `VisaChecklistExplanationService` (to be created)
- **Model**: `gpt-4o` (configurable via `OPENAI_MODEL_CHECKLIST_EXPLANATION`)
- **Temperature**: 0.3
- **Max Tokens**: 1000
- **Response Format**: JSON object
- **Context**: CanonicalAIUserContext

### General Chat/RAG

- **Service**: `AIOpenAIService.chatWithRAG()`
- **Model**: `gpt-4o-mini` (configurable via `OPENAI_MODEL`)
- **Temperature**: 0.7
- **Max Tokens**: 2000 (configurable via `OPENAI_MAX_TOKENS`)
- **Response Format**: Text (no JSON)
- **Context**: Chat messages

### Evaluation Scripts

- **Service**: `eval-checklists.ts` (uses services above)
- **Model**: `gpt-4o` (configurable via `OPENAI_MODEL_EVALUATION`)
- **Temperature**: 0.3
- **Max Tokens**: 2000
- **Response Format**: JSON object
- **Context**: CanonicalAIUserContext (converted to AIUserContext for testing)

## Current Default Settings

### Temperature

- **Checklist Generation**: 0.3 (low for consistency)
- **Document Verification**: 0.2 (very low for strict evaluation)
- **Rules Extraction**: 0.3 (low for consistency)
- **Risk/Explanation**: 0.3 (low for deterministic output)
- **Chat/RAG**: 0.7 (higher for natural conversation)

### Max Tokens

- **Checklist Generation**: 3000 (detailed checklists)
- **Document Verification**: 500 (concise responses)
- **Rules Extraction**: 4000 (complete rule sets)
- **Risk Explanation**: 1500 (summary + recommendations)
- **Checklist Explanation**: 1000 (why + tips)
- **Chat/RAG**: 2000 (standard)
- **Evaluation**: 2000 (standard)

### Response Format

- **All structured outputs**: `{ type: 'json_object' }` ✓
- **Chat/RAG**: Text (no JSON)

## CanonicalAIUserContext Usage

All critical flows now use `CanonicalAIUserContext`:

- ✅ `VisaChecklistEngineService` - Uses `buildCanonicalAIUserContext()`
- ✅ `VisaDocCheckerService` - Uses `buildCanonicalAIUserContext()`
- ✅ `AIOpenAIService.generateChecklistLegacy()` - Uses `buildCanonicalAIUserContext()` for compact prompts
- ✅ `ChecklistRulesService` - Uses `buildCanonicalAIUserContext()` for condition evaluation

## JSON Validation

All JSON responses are validated:

- ✅ Checklist responses use `parseAndValidateChecklistResponse()`
- ✅ Document verification uses Zod schemas
- ✅ Rules extraction uses `VisaRuleSetDataSchema` (Zod)
- ✅ All use `response_format: { type: 'json_object' }`

## Environment Variables

All models can be overridden via environment variables:

- `OPENAI_MODEL_CHECKLIST` - Checklist generation (default: `gpt-4o`)
- `OPENAI_MODEL_DOC_VERIFICATION` - Document verification (default: `gpt-4o`)
- `OPENAI_MODEL_RULES_EXTRACTION` - Rules extraction (default: `gpt-4o`)
- `OPENAI_MODEL_RISK_EXPLANATION` - Risk explanation (default: `gpt-4o`)
- `OPENAI_MODEL_CHECKLIST_EXPLANATION` - Checklist explanation (default: `gpt-4o`)
- `OPENAI_MODEL` - General chat/RAG (default: `gpt-4o-mini`)
- `OPENAI_MODEL_EVALUATION` - Evaluation scripts (default: `gpt-4o`)
- `OPENAI_MAX_TOKENS` - General max tokens (default: `2000`)

## Next Steps

- ✅ Step 1: Audit and centralize GPT-4 usage - **COMPLETE**
- ⏳ Step 2: Make US B1/B2 flow "perfect" (rules mode only)
- ⏳ Step 3: Add GPT-based risk explanation + improvement advice
- ⏳ Step 4: Add "Why do I need this document?" per checklist item
- ⏳ Step 5: Add Germany tourist visa via GPT-powered rule pipeline
- ⏳ Step 6: Minimal feedback loop for bad checklists
