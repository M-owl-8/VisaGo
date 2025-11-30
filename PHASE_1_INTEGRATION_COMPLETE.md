# Phase 1 Integration - Manual Application Required

## Status
⚠️ **File corruption issue**: The `ai-openai.service.ts` file keeps getting corrupted during automated edits. All architecture files are complete and ready.

## Completed Architecture Files ✅

1. ✅ `apps/backend/src/types/visa-brain.ts` - All canonical schemas
2. ✅ `apps/backend/src/config/ai-prompts.ts` - CHECKLIST_SYSTEM_PROMPT and DOC_CHECK_SYSTEM_PROMPT
3. ✅ `apps/backend/src/services/ai-context.service.ts` - buildApplicantProfile() function
4. ✅ `apps/backend/src/utils/checklist-mappers.ts` - All mapper functions

## Required Manual Changes

Due to file stability issues, please apply these changes manually to `apps/backend/src/services/ai-openai.service.ts`:

### STEP 0: Add Imports (Line ~3)

**FIND:**
```typescript
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';
```

**REPLACE WITH:**
```typescript
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { CHECKLIST_SYSTEM_PROMPT } from '../config/ai-prompts';
import { buildApplicantProfile } from './ai-context.service';
import type { ApplicantProfile, ChecklistBrainOutput } from '../types/visa-brain';
import { isChecklistBrainOutput } from '../types/visa-brain';
import {
  parseChecklistResponse,
  mapBrainOutputToLegacy,
  mapLegacyToBrainOutput,
  type LegacyChecklistResponse,
} from '../utils/checklist-mappers';
```

### STEP 1: Build ApplicantProfile (Line ~1214)

**FIND:**
```typescript
      // Get visa knowledge base for the country and visa type
      const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');
```

**REPLACE WITH:**
```typescript
      // Build ApplicantProfile from AIUserContext (canonical schema)
      const applicantProfile: ApplicantProfile = buildApplicantProfile(userContext, country, visaType);

      // Get visa knowledge base for the country and visa type
      const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');
```

### STEP 2: Replace System Prompt (Line ~1221)

**FIND:** The entire large template literal starting with:
```typescript
      const systemPrompt = `You are a STRICT visa document checklist generator specialized for Uzbek applicants.
...
Your goal: produce the most reliable, accurate, embassy-ready checklist every time.`;
```

**REPLACE WITH:**
```typescript
      // Use frozen system prompt from centralized config
      const systemPrompt = CHECKLIST_SYSTEM_PROMPT;
```

### STEP 3: Update User Prompt (Lines ~1406-1534)

**FIND:** The entire block from:
```typescript
      // Extract risk factors and key information from user context
      const riskFactors: string[] = [];
      ...
      const userPrompt = `Generate the document checklist following the schema and rules above.
...
Return ONLY valid JSON matching the schema, no other text, no markdown, no comments.`;
```

**REPLACE WITH:**
```typescript
      // Build user prompt with structured ApplicantProfile JSON
      const applicantProfileJson = JSON.stringify(applicantProfile, null, 2);
      const visaKnowledgeText = visaKb || 'No specific knowledge base available for this country/visa type.';
      const riskInfoJson = JSON.stringify(userContext.riskScore ?? {}, null, 2);

      const userPrompt = `You are given:

1) ApplicantProfile as JSON.
2) Visa knowledge notes for this country and visa type.
3) Risk information for this applicant (probability, risk factors, positives).

Use ONLY this information plus your general visa expertise to generate a checklist that strictly follows the ChecklistBrainOutput schema described in the system prompt.

Do not invent fake embassies, fake document types, or unrealistic requirements.

=== APPLICANT PROFILE JSON ===
${applicantProfileJson}

=== VISA KNOWLEDGE TEXT ===
${visaKnowledgeText}

${documentGuidesText ? `\n=== DOCUMENT GUIDES ===\n${documentGuidesText}` : ''}

=== RISK INFO JSON ===
${riskInfoJson}

Return ONLY valid JSON matching the ChecklistBrainOutput schema, no other text, no markdown, no comments.`.trim();
```

### STEP 4: Update Parsing Logic (Line ~1630)

**FIND:**
```typescript
      const rawContent = response.choices[0]?.message?.content || '{}';

      logInfo('[OpenAI][Checklist] Raw GPT-4 response received', {
        country,
        visaType,
        responseLength: rawContent.length,
        responsePreview: rawContent.substring(0, 200),
      });

      // Use new JSON validator with retry logic
      const { parseAndValidateChecklistResponse } = await import('../utils/json-validator');
      const { autoTranslateChecklistItems } = await import('../utils/translation-helper');
      const { getFallbackChecklist } = await import('../data/fallback-checklists');

      let parsed: any = null;
      let validationResult: any = null;
      let attempt = 1;
      let needsRetry = false;

      // First attempt
      const firstAttempt = parseAndValidateChecklistResponse(
        rawContent,
        country,
        visaType,
        attempt
      );

      parsed = firstAttempt.parsed;
      validationResult = firstAttempt.validation;
      needsRetry = firstAttempt.needsRetry;
```

**REPLACE WITH:**
```typescript
      const rawContent = response.choices[0]?.message?.content || '{}';

      logInfo('[OpenAI][Checklist] Raw GPT-4 response received', {
        country,
        visaType,
        responseLength: rawContent.length,
        responsePreview: rawContent.substring(0, 200),
      });

      // Parse response - may be in ChecklistBrainOutput or legacy format
      const parseResult = parseChecklistResponse(rawContent, applicantProfile);

      let brainOutput: ChecklistBrainOutput | null = null;
      let legacyChecklist: LegacyChecklistResponse | null = null;
      let validationResult: any = null;
      let attempt = 1;
      let needsRetry = false;

      if (parseResult.format === 'brain' && parseResult.brainOutput) {
        // GPT-4 returned the new canonical format - use type guard for safety
        brainOutput = parseResult.brainOutput;
        if (isChecklistBrainOutput(brainOutput)) {
          logInfo('[OpenAI][Checklist] Received ChecklistBrainOutput format', {
            country,
            visaType,
            itemCount: brainOutput.requiredDocuments.length,
          });
          // Convert to legacy format for backward compatibility
          legacyChecklist = mapBrainOutputToLegacy(brainOutput, visaType);
        } else {
          logWarn('[OpenAI][Checklist] Brain output failed type guard, treating as invalid', {
            country,
            visaType,
          });
        }
      } else if (parseResult.format === 'legacy' && parseResult.legacy) {
        // GPT-4 returned the old format (backward compatibility)
        legacyChecklist = parseResult.legacy;
        logInfo('[OpenAI][Checklist] Received legacy format (backward compatibility)', {
          country,
          visaType,
          itemCount: legacyChecklist.checklist.length,
        });
        // Optionally convert to brain output for internal processing
        brainOutput = mapLegacyToBrainOutput(legacyChecklist, applicantProfile);
      }

      // If we still don't have parsed data, use existing validator as fallback
      if (!legacyChecklist) {
        logWarn('[OpenAI][Checklist] Unknown response format, using existing validator', {
          country,
          visaType,
        });
        // Fall back to existing validation logic
        const { parseAndValidateChecklistResponse } = await import('../utils/json-validator');
        const { autoTranslateChecklistItems } = await import('../utils/translation-helper');
        const { getFallbackChecklist } = await import('../data/fallback-checklists');

        // First attempt
        const firstAttempt = parseAndValidateChecklistResponse(
          rawContent,
          country,
          visaType,
          attempt
        );

        legacyChecklist = firstAttempt.parsed as LegacyChecklistResponse | null;
        validationResult = firstAttempt.validation;
        needsRetry = firstAttempt.needsRetry;
        
        if (legacyChecklist && legacyChecklist.checklist) {
          brainOutput = mapLegacyToBrainOutput(legacyChecklist, applicantProfile);
        }
      }
```

### STEP 5: Update Retry Logic (Line ~1685)

**FIND:**
```typescript
      // Retry if needed
      if (needsRetry && attempt < 2) {
        ...
        parsed = retryAttempt.parsed;
        validationResult = retryAttempt.validation;
        needsRetry = retryAttempt.needsRetry;
      }

      // If still invalid after retry, use fallback
      if (!parsed || !validationResult.isValid) {
```

**REPLACE WITH:**
```typescript
      // Retry if needed (only if we're using the fallback validator)
      if (needsRetry && attempt < 2 && !legacyChecklist) {
        logWarn('[OpenAI][Checklist] First attempt failed, retrying with stricter instructions', {
          country,
          visaType,
          errors: validationResult?.errors || [],
        });

        attempt = 2;
        const retryPrompt = `${userPrompt}\n\nCRITICAL: Your previous response was invalid. You MUST return ONLY valid JSON matching the ChecklistBrainOutput schema with:
- Exactly 10-16 items
- ALL THREE statuses (REQUIRED, HIGHLY_RECOMMENDED, OPTIONAL)
- Complete UZ and RU translations for every field
- Valid JSON structure with no markdown or extra text`;

        const retryResponse = await AIOpenAIService.openai.chat.completions.create({
          model: this.MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: retryPrompt },
          ],
          temperature: 0.3,
          max_completion_tokens: 2000,
          response_format: { type: 'json_object' },
        });

        const retryContent = retryResponse.choices[0]?.message?.content || '{}';
        const retryParseResult = parseChecklistResponse(retryContent, applicantProfile);
        
        if (retryParseResult.format === 'brain' && retryParseResult.brainOutput && isChecklistBrainOutput(retryParseResult.brainOutput)) {
          brainOutput = retryParseResult.brainOutput;
          legacyChecklist = mapBrainOutputToLegacy(brainOutput, visaType);
        } else if (retryParseResult.format === 'legacy' && retryParseResult.legacy) {
          legacyChecklist = retryParseResult.legacy;
          brainOutput = mapLegacyToBrainOutput(legacyChecklist, applicantProfile);
        } else {
          // Still invalid, use existing validator
          const { parseAndValidateChecklistResponse } = await import('../utils/json-validator');
          const retryAttempt = parseAndValidateChecklistResponse(
            retryContent,
            country,
            visaType,
            attempt
          );
          legacyChecklist = retryAttempt.parsed as LegacyChecklistResponse | null;
          validationResult = retryAttempt.validation;
          needsRetry = retryAttempt.needsRetry;
          if (legacyChecklist && legacyChecklist.checklist) {
            brainOutput = mapLegacyToBrainOutput(legacyChecklist, applicantProfile);
          }
        }
      }

      // If still invalid after retry, use fallback
      if (!legacyChecklist || (validationResult && !validationResult.isValid)) {
```

### STEP 6: Update Fallback Logic (Line ~1720)

**FIND:**
```typescript
        parsed = {
          type: visaType,
          country: country,
          checklist: fallbackItems,
          aiFallbackUsed: true,
        };
        ...
      } else {
        // Auto-translate missing translations
        if (validationResult.warnings.some((w: string) => w.includes('Missing'))) {
          ...
        }
        parsed = autoCorrectChecklist(parsed, country, visaType);
        ...
      }
```

**REPLACE WITH:**
```typescript
        legacyChecklist = {
          type: visaType,
          country: country,
          checklist: fallbackItems,
        };
        ...
      } else if (legacyChecklist) {
        // Auto-translate missing translations
        const { autoTranslateChecklistItems } = await import('../utils/translation-helper');
        if (validationResult?.warnings?.some((w: string) => w.includes('Missing'))) {
          logInfo('[OpenAI][Checklist] Auto-translating missing translations');
          await autoTranslateChecklistItems(legacyChecklist.checklist);
        }

        // Auto-correct any remaining issues
        const { autoCorrectChecklist } = await import('../utils/json-validator');
        const corrected = autoCorrectChecklist(legacyChecklist, country, visaType);
        legacyChecklist = corrected as LegacyChecklistResponse;

        logInfo('[OpenAI][Checklist] Validation passed after corrections', {
          country,
          visaType,
          itemCount: legacyChecklist.checklist.length,
          warnings: validationResult?.warnings?.length || 0,
        });
      }
```

### STEP 7: Update Final Return Logic (Line ~1755)

**FIND:** All references to `parsed.checklist` and `parsed.type` in the final section, replace with `legacyChecklist.checklist` and `legacyChecklist.type`.

**SPECIFICALLY FIND:**
```typescript
      // Final logging for checklist generation
      logInfo('[OpenAI][Checklist] Checklist generation completed', {
        ...
        itemCount: parsed.checklist?.length || 0,
      });

      // Ensure the response has the correct structure
      if (!parsed.checklist || !Array.isArray(parsed.checklist)) {
        ...
      }

      if (parsed.checklist.length === 0) {
        ...
      }

      const itemCount = parsed.checklist.length;
      ...
      if (parsed.checklist.length > MAX_ITEMS) {
        ...
      }

      for (const item of parsed.checklist) {
        ...
      }

      const enrichedChecklist = parsed.checklist.map((item: any) => {
        ...
      });

      return {
        type: parsed.type || visaType,
        checklist: enrichedChecklist,
      };
```

**REPLACE WITH:**
```typescript
      // Ensure we have a valid legacy checklist at this point
      if (!legacyChecklist || !legacyChecklist.checklist || !Array.isArray(legacyChecklist.checklist)) {
        throw new Error('Invalid checklist format from AI: missing or invalid checklist array');
      }

      // Validate that checklist is not empty
      if (legacyChecklist.checklist.length === 0) {
        throw new Error('AI returned empty checklist array');
      }

      // Final logging for checklist generation
      logInfo('[OpenAI][Checklist] Checklist generation completed', {
        model: this.MODEL,
        country,
        visaType,
        tokensUsed: totalTokens,
        inputTokens,
        outputTokens,
        responseTimeMs: responseTime,
        itemCount: legacyChecklist.checklist.length,
        format: brainOutput ? 'brain' : 'legacy',
      });

      // STEP 3: Handle "too few items" gracefully - warn but don't fail
      const MIN_ITEMS = 10;
      const MAX_ITEMS = 16;
      const itemCount = legacyChecklist.checklist.length;

      if (itemCount < MIN_ITEMS) {
        logWarn('[OpenAI][Checklist] AI returned too few items, minimum 10 required', {
          country,
          visaType,
          itemCount,
          minimumRequired: MIN_ITEMS,
        });
      }

      if (legacyChecklist.checklist.length > MAX_ITEMS) {
        logWarn('[OpenAI][Checklist] AI returned more than recommended items', {
          country,
          visaType,
          itemCount: legacyChecklist.checklist.length,
          recommendedMax: MAX_ITEMS,
        });
      }

      // Validate required fields for each item
      for (const item of legacyChecklist.checklist) {
        if (!item.document && !item.name) {
          throw new Error('Invalid checklist item: missing document or name field');
        }
      }

      // Import helper for category consistency
      const { ensureCategoryConsistency } = await import('../utils/checklist-helpers');

      // Validate and enrich checklist items with category support
      const enrichedChecklist = legacyChecklist.checklist.map((item: any) => {
        const { category, required, priority } = ensureCategoryConsistency({
          category: item.category,
          required: item.required,
          priority: item.priority || (item.required ? 'high' : 'medium'),
        });

        return {
          document: item.document || item.name || 'Unknown',
          name: item.name || item.document || 'Unknown',
          nameUz: item.nameUz || item.name || item.document || "Noma'lum",
          nameRu: item.nameRu || item.name || item.document || 'Неизвестно',
          category,
          required,
          description: item.description || '',
          descriptionUz: item.descriptionUz || item.description || '',
          descriptionRu: item.descriptionRu || item.description || '',
          priority,
          whereToObtain: item.whereToObtain || '',
          whereToObtainUz: item.whereToObtainUz || item.whereToObtain || '',
          whereToObtainRu: item.whereToObtainRu || item.whereToObtain || '',
        };
      });

      return {
        type: legacyChecklist.type || visaType,
        checklist: enrichedChecklist,
      };
```

### STEP 8: Add TODO Comment (Line ~2020)

**FIND:**
```typescript
  /**
   * Track AI usage for billing
   */
  static async trackUsage(userId: string, tokensUsed: number, cost: number): Promise<void> {
```

**REPLACE WITH:**
```typescript
  /**
   * TODO (Phase 2+): Document Checking (Inspector Mode)
   * 
   * Implement document inspection using DOC_CHECK_SYSTEM_PROMPT and DocCheckResult.
   * Given a ChecklistBrainItem + extracted document text + ApplicantProfile,
   * call GPT-4 to produce a DocCheckResult (status, problems, suggestions).
   * 
   * @see {@link DOC_CHECK_SYSTEM_PROMPT} - System prompt for document checking
   * @see {@link DocCheckResult} - Canonical result schema
   */
  // static async checkDocument(
  //   checklistItem: ChecklistBrainItem,
  //   documentContent: string,
  //   profile: ApplicantProfile
  // ): Promise<DocCheckResult> {
  //   // TODO: Implement in Phase 2+
  //   throw new Error('Document checking not yet implemented');
  // }

  /**
   * Track AI usage for billing
   */
  static async trackUsage(userId: string, tokensUsed: number, cost: number): Promise<void> {
```

## Verification Checklist

After applying all changes:
- [ ] Imports added at top
- [ ] `buildApplicantProfile()` called before visaKb
- [ ] `systemPrompt = CHECKLIST_SYSTEM_PROMPT`
- [ ] User prompt contains `=== APPLICANT PROFILE JSON ===`
- [ ] Parsing uses `parseChecklistResponse()`
- [ ] Uses `mapBrainOutputToLegacy()` before validator
- [ ] All `parsed` references changed to `legacyChecklist`
- [ ] TODO comment added for doc-check
- [ ] TypeScript builds successfully
- [ ] No lint errors

## Notes

- All architecture files are complete and ready
- The changes preserve backward compatibility
- The public API response shape remains unchanged
- The validator still receives legacy format



