# Phase 2 Manual Integration Steps for ai-openai.service.ts

Due to file stability issues, please apply these changes manually. Each step is independent and can be verified separately.

## STEP 1: Add Imports (Line ~3)

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
import { VisaTemplateService } from './visa-template.service';
import type {
  ApplicantProfile,
  ChecklistBrainOutput,
  VisaTemplate as VisaTemplateType,
  VisaRequiredDocumentTemplate,
} from '../types/visa-brain';
import { isChecklistBrainOutput } from '../types/visa-brain';
import {
  parseChecklistResponse,
  mapBrainOutputToLegacy,
  mapLegacyToBrainOutput,
  type LegacyChecklistResponse,
} from '../utils/checklist-mappers';
```

---

## STEP 2: Add Helper Functions (Before `isHybridChecklistEnabled`, around line ~432)

**FIND:**
```typescript
  /**
   * Check if hybrid checklist generation is enabled for this country+visa type
   * Hybrid mode: Rule engine decides documents, GPT-4 only enriches
   * Legacy mode: GPT-4 decides everything (old behavior)
   */
  private static isHybridChecklistEnabled(countryCode: string, visaType: string): boolean {
```

**INSERT BEFORE IT:**
```typescript
  /**
   * Normalize visa type to canonical visaTypeCode
   * Maps current visa type strings to Phase 2 canonical codes
   */
  private static normalizeVisaTypeCode(visaType: string, profile: ApplicantProfile): string {
    const lower = visaType.toLowerCase();

    // Student long-stay visas (F-1, study permits, Tier 4, D visas, etc.)
    if (
      lower.includes('student') ||
      lower.includes('study') ||
      lower.includes('education') ||
      lower.includes('college') ||
      lower.includes('university') ||
      lower.includes('language')
    ) {
      return 'student_long_stay';
    }

    // Tourist / short-term visits
    if (
      lower.includes('tourist') ||
      lower.includes('visitor') ||
      lower.includes('short') ||
      lower.includes('travel') ||
      lower.includes('vacation')
    ) {
      return 'tourist_short';
    }

    // Fallback: treat as tourist_short for now
    return 'tourist_short';
  }

  /**
   * Ensure core required documents from VisaTemplate are present in ChecklistBrainOutput
   */
  private static ensureCoreDocumentsPresent(
    brainOutput: ChecklistBrainOutput,
    visaTemplate: VisaTemplateType | null
  ): ChecklistBrainOutput {
    if (!visaTemplate) return brainOutput;

    const coreDocs = visaTemplate.requiredDocuments.filter((d) => d.isCoreRequired);
    if (!coreDocs.length) return brainOutput;

    const existingIds = new Set(
      brainOutput.requiredDocuments.map((item) => item.id.toLowerCase())
    );

    const missingCoreDocs: VisaRequiredDocumentTemplate[] = coreDocs.filter((doc) => {
      return !existingIds.has(doc.id.toLowerCase());
    });

    if (!missingCoreDocs.length) return brainOutput;

    const missingItems = missingCoreDocs.map((doc): ChecklistBrainOutput['requiredDocuments'][number] => ({
      id: doc.id,
      status: 'REQUIRED',
      whoNeedsIt: doc.whoNeedsIt,
      name: doc.name,
      nameUz: doc.name, // TODO: human translation
      nameRu: doc.name, // TODO: human translation
      description: doc.description,
      descriptionUz: doc.description,
      descriptionRu: doc.description,
      whereToObtain: '',
      whereToObtainUz: '',
      whereToObtainRu: '',
      priority: 'high',
      isCoreRequired: true,
      isConditional: !!doc.isConditional,
      conditionDescription: doc.conditionDescription,
    }));

    const updated: ChecklistBrainOutput = {
      ...brainOutput,
      requiredDocuments: [...brainOutput.requiredDocuments, ...missingItems],
      warnings: [
        ...(brainOutput.warnings ?? []),
        `Some core documents from VisaTemplate were missing from the AI response and were auto-added: ${missingCoreDocs
          .map((d) => d.id)
          .join(', ')}`,
      ],
    };

    return updated;
  }

```

---

## STEP 3: Build ApplicantProfile & Fetch Template (In LEGACY mode section, around line ~1214)

**FIND:**
```typescript
      // Get visa knowledge base for the country and visa type
      const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');
```

**REPLACE WITH:**
```typescript
      // Build ApplicantProfile from AIUserContext (canonical schema) - Phase 1
      const applicantProfile: ApplicantProfile = buildApplicantProfile(userContext, country, visaType);

      // Normalize countryCode and visaTypeCode for template lookup - Phase 2
      const normalizedCountryCode =
        applicantProfile.destinationCountryCode || applicantProfile.nationality || 'UZ';
      const normalizedVisaTypeCode = this.normalizeVisaTypeCode(visaType, applicantProfile);

      // Fetch VisaTemplate (may be null) - Phase 2
      logInfo('[VisaTemplate] Fetching visa template', {
        countryCode: normalizedCountryCode,
        visaTypeCode: normalizedVisaTypeCode,
      });
      const visaTemplate: VisaTemplateType | null = await VisaTemplateService.getTemplate(
        normalizedCountryCode,
        normalizedVisaTypeCode
      );

      if (!visaTemplate) {
        logWarn('[VisaTemplate] No template found, using AI-only mode', {
          countryCode: normalizedCountryCode,
          visaTypeCode: normalizedVisaTypeCode,
        });
      } else {
        logInfo('[VisaTemplate] Template loaded', {
          countryCode: normalizedCountryCode,
          visaTypeCode: normalizedVisaTypeCode,
          templateId: visaTemplate.id,
          coverageLevel: visaTemplate.coverageLevel,
          coreDocsCount: visaTemplate.requiredDocuments.filter((d) => d.isCoreRequired).length,
        });
      }

      // Get visa knowledge base for the country and visa type
      const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');
```

---

## STEP 4: Replace System Prompt (Around line ~1221)

**FIND the entire large system prompt starting with:**
```typescript
      const systemPrompt = `You are a STRICT visa document checklist generator specialized for Uzbek applicants.
```

**REPLACE the entire template literal (everything from `const systemPrompt = \`` to the closing `\`;`) WITH:**
```typescript
      // Use frozen system prompt from centralized config - Phase 1
      const systemPrompt = CHECKLIST_SYSTEM_PROMPT;
```

---

## STEP 5: Update User Prompt (Around line ~1406)

**FIND the entire userPrompt construction block** (starts with extracting risk factors, ends with the userPrompt assignment).

**REPLACE the entire block with:**
```typescript
      // Build user prompt with structured ApplicantProfile JSON - Phase 1
      // Include VisaTemplate JSON if available - Phase 2
      const applicantProfileJson = JSON.stringify(applicantProfile, null, 2);
      const visaKnowledgeText = visaKb || 'No specific knowledge base available for this country/visa type.';
      const riskInfoJson = JSON.stringify(userContext.riskScore ?? {}, null, 2);
      const visaTemplateJson = visaTemplate ? JSON.stringify(visaTemplate, null, 2) : null;

      const userPrompt = `You are given:

1) ApplicantProfile as JSON.
2) VisaTemplate as JSON (${visaTemplate ? 'available' : 'not available'}).
3) Visa knowledge notes for this country and visa type.
4) Risk information for this applicant (probability, risk factors, positives).

Rules:
- If VisaTemplate is provided:
  - You MUST include all documents where VisaTemplate.requiredDocuments[].isCoreRequired === true.
  - You MAY add additional documents based on ApplicantProfile and knowledge, but you cannot remove or rename core ones.
- If VisaTemplate is NOT provided:
  - Generate the best possible checklist using ApplicantProfile and visa knowledge.

Use ONLY this information plus your general visa expertise to generate a checklist that strictly follows the ChecklistBrainOutput schema described in the system prompt.

Do not invent fake embassies, fake document types, or unrealistic requirements.

=== APPLICANT PROFILE JSON ===
${applicantProfileJson}

${visaTemplateJson ? `=== VISA TEMPLATE JSON ===\n${visaTemplateJson}\n` : ''}

=== VISA KNOWLEDGE TEXT ===
${visaKnowledgeText}

${documentGuidesText ? `\n=== DOCUMENT GUIDES ===\n${documentGuidesText}\n` : ''}

=== RISK INFO JSON ===
${riskInfoJson}

Return ONLY valid JSON matching the ChecklistBrainOutput schema, no other text, no markdown, no comments.`.trim();
```

---

## STEP 6: Update Parsing Logic (Around line ~1632)

**FIND:**
```typescript
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
      // Parse response - may be in ChecklistBrainOutput or legacy format - Phase 1
      const parseResult = parseChecklistResponse(rawContent, applicantProfile);

      let brainOutput: ChecklistBrainOutput | null = null;
      let legacyChecklist: LegacyChecklistResponse | null = null;
      let validationResult: any = null;
      let attempt = 1;
      let needsRetry = false;

      if (parseResult.format === 'brain' && parseResult.brainOutput) {
        brainOutput = parseResult.brainOutput;
        if (isChecklistBrainOutput(brainOutput)) {
          logInfo('[OpenAI][Checklist] Received ChecklistBrainOutput format', {
            country,
            visaType,
            itemCount: brainOutput.requiredDocuments.length,
          });
          legacyChecklist = mapBrainOutputToLegacy(brainOutput, visaType);
        } else {
          logWarn('[OpenAI][Checklist] Brain output failed type guard, treating as invalid', {
            country,
            visaType,
          });
        }
      } else if (parseResult.format === 'legacy' && parseResult.legacy) {
        legacyChecklist = parseResult.legacy;
        logInfo('[OpenAI][Checklist] Received legacy format (backward compatibility)', {
          country,
          visaType,
          itemCount: legacyChecklist.checklist.length,
        });
        brainOutput = mapLegacyToBrainOutput(legacyChecklist, applicantProfile);
      }

      // If we still don't have parsed data, use existing validator as fallback
      if (!legacyChecklist) {
        logWarn('[OpenAI][Checklist] Unknown response format, using existing validator', {
          country,
          visaType,
        });
        const { parseAndValidateChecklistResponse } = await import('../utils/json-validator');
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

      // Phase 2: Enforce core required documents from template
      if (brainOutput && visaTemplate) {
        const beforeCount = brainOutput.requiredDocuments.length;
        brainOutput = this.ensureCoreDocumentsPresent(brainOutput, visaTemplate);
        const afterCount = brainOutput.requiredDocuments.length;
        
        if (afterCount > beforeCount) {
          logWarn('[VisaTemplate] Auto-adding missing core documents to ChecklistBrainOutput', {
            countryCode: normalizedCountryCode,
            visaTypeCode: normalizedVisaTypeCode,
            missingCount: afterCount - beforeCount,
            addedDocs: brainOutput.requiredDocuments
              .slice(beforeCount)
              .map((d) => d.id),
          });
          // Re-map to legacy format after enforcement
          legacyChecklist = mapBrainOutputToLegacy(brainOutput, visaType);
        }
      }
```

---

## STEP 7: Update Retry Logic (Around line ~1654)

**FIND the retry block:**
```typescript
      // Retry if needed
      if (needsRetry && attempt < 2) {
        // ... retry logic ...
        parsed = retryAttempt.parsed;
        validationResult = retryAttempt.validation;
        needsRetry = retryAttempt.needsRetry;
      }
```

**REPLACE WITH:**
```typescript
      // Retry if needed (only if we fell back to old validator)
      if (needsRetry && attempt < 2 && !legacyChecklist) {
        logWarn('[OpenAI][Checklist] First attempt failed, retrying with stricter instructions', {
          country,
          visaType,
          errors: validationResult?.errors || [],
        });

        attempt = 2;
        const retryPrompt = `${userPrompt}\n\nCRITICAL: Your previous response was invalid. You MUST return ONLY valid JSON with:
- Exactly 8-15 items
- ALL THREE categories (required, highly_recommended, optional)
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
        
        if (retryParseResult.format === 'brain' && retryParseResult.brainOutput) {
          const retryBrainOutput = retryParseResult.brainOutput;
          if (isChecklistBrainOutput(retryBrainOutput)) {
            legacyChecklist = mapBrainOutputToLegacy(retryBrainOutput, visaType);
            brainOutput = retryBrainOutput;
          }
        } else if (retryParseResult.format === 'legacy' && retryParseResult.legacy) {
          legacyChecklist = retryParseResult.legacy;
          brainOutput = mapLegacyToBrainOutput(legacyChecklist, applicantProfile);
        } else {
          // Fallback to old validator
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

        // Re-enforce templates after retry
        if (brainOutput && visaTemplate) {
          brainOutput = this.ensureCoreDocumentsPresent(brainOutput, visaTemplate);
          legacyChecklist = mapBrainOutputToLegacy(brainOutput, visaType);
        }
      }
```

---

## STEP 8: Update Fallback/Validation Block (Around line ~1720)

**FIND:**
```typescript
      // If still invalid after retry, use fallback
      if (!parsed || !validationResult.isValid) {
        // ... fallback logic using parsed ...
      } else {
        // ... validation logic using parsed ...
      }
```

**REPLACE WITH:**
```typescript
      // If we still don't have a valid checklist after retry, use fallback
      if (!legacyChecklist || !legacyChecklist.checklist || legacyChecklist.checklist.length === 0) {
        logError(
          '[OpenAI][Checklist] Both attempts failed, using fallback checklist',
          new Error('GPT-4 validation failed'),
          {
            country,
            visaType,
            errors: validationResult?.errors || ['Unknown error'],
            warnings: validationResult?.warnings || [],
          }
        );

        const { getFallbackChecklist } = await import('../data/fallback-checklists');

        // Get country code from country name
        const countryCodeMap: Record<string, string> = {
          'united states': 'US',
          usa: 'US',
          'united kingdom': 'GB',
          uk: 'GB',
          canada: 'CA',
          australia: 'AU',
          germany: 'DE',
          spain: 'ES',
          japan: 'JP',
          uae: 'AE',
          'united arab emirates': 'AE',
        };

        const countryCode =
          countryCodeMap[country.toLowerCase()] || country.substring(0, 2).toUpperCase();
        const normalizedVisaType = visaType.toLowerCase().includes('student')
          ? 'student'
          : 'tourist';

        const fallbackItems = getFallbackChecklist(
          countryCode,
          normalizedVisaType as 'student' | 'tourist'
        );

        legacyChecklist = {
          type: visaType,
          country: country,
          checklist: fallbackItems,
          aiFallbackUsed: true,
        };

        logInfo('[OpenAI][Checklist] Using fallback checklist', {
          country,
          visaType,
          itemCount: fallbackItems.length,
        });
      } else {
        // Auto-translate missing translations if needed
        const { autoTranslateChecklistItems } = await import('../utils/translation-helper');
        if (validationResult?.warnings?.some((w: string) => w.includes('Missing'))) {
          logInfo('[OpenAI][Checklist] Auto-translating missing translations');
          await autoTranslateChecklistItems(legacyChecklist.checklist);
        }

        // Auto-correct any remaining issues
        const { autoCorrectChecklist } = await import('../utils/json-validator');
        legacyChecklist = autoCorrectChecklist(legacyChecklist, country, visaType);

        logInfo('[OpenAI][Checklist] Validation passed after corrections', {
          country,
          visaType,
          itemCount: legacyChecklist.checklist.length,
          warnings: validationResult?.warnings?.length || 0,
        });
      }
```

---

## STEP 9: Update Final Return Logic (Around line ~1763)

**FIND all references to `parsed.checklist` and `parsed.type` and replace with `legacyChecklist.checklist` and `legacyChecklist.type`:**

**FIND:**
```typescript
        itemCount: parsed.checklist?.length || 0,
      });

      // Ensure the response has the correct structure
      if (!parsed.checklist || !Array.isArray(parsed.checklist)) {
        throw new Error('Invalid checklist format from AI: missing or invalid checklist array');
      }

      // Validate that checklist is not empty
      if (parsed.checklist.length === 0) {
        throw new Error('AI returned empty checklist array');
      }

      // STEP 3: Handle "too few items" gracefully - warn but don't fail
      const MIN_ITEMS = 10; // Stricter minimum: 10 items required
      const MAX_ITEMS = 16; // Increased maximum: 16 items allowed
      const itemCount = parsed.checklist.length;
```

**REPLACE WITH:**
```typescript
        itemCount: legacyChecklist?.checklist?.length || 0,
      });

      // Ensure the response has the correct structure
      if (!legacyChecklist || !legacyChecklist.checklist || !Array.isArray(legacyChecklist.checklist)) {
        throw new Error('Invalid checklist format from AI: missing or invalid checklist array');
      }

      // Validate that checklist is not empty
      if (legacyChecklist.checklist.length === 0) {
        throw new Error('AI returned empty checklist array');
      }

      // STEP 3: Handle "too few items" gracefully - warn but don't fail
      const MIN_ITEMS = 10; // Stricter minimum: 10 items required
      const MAX_ITEMS = 16; // Increased maximum: 16 items allowed
      const itemCount = legacyChecklist.checklist.length;
```

**FIND:**
```typescript
      // Validate required fields for each item
      for (const item of parsed.checklist) {
        // ...
      }

      // ... enrichment logic ...
      const enrichedChecklist = parsed.checklist.map((item: any) => {
        // ...
      });

      return {
        type: parsed.type || visaType,
        checklist: enrichedChecklist,
      };
```

**REPLACE WITH:**
```typescript
      // Validate required fields for each item
      for (const item of legacyChecklist.checklist) {
        // ...
      }

      // ... enrichment logic ...
      const enrichedChecklist = legacyChecklist.checklist.map((item: any) => {
        // ...
      });

      return {
        type: legacyChecklist.type || visaType,
        checklist: enrichedChecklist,
      };
```

---

## Verification Checklist

After applying all steps:

- [ ] All imports added at top
- [ ] Helper functions added before `isHybridChecklistEnabled`
- [ ] ApplicantProfile built and template fetched in legacy mode
- [ ] System prompt replaced with `CHECKLIST_SYSTEM_PROMPT`
- [ ] User prompt uses ApplicantProfile + VisaTemplate JSON
- [ ] Parsing uses `parseChecklistResponse` and maps to `legacyChecklist`
- [ ] Core documents enforced via `ensureCoreDocumentsPresent`
- [ ] All `parsed` references changed to `legacyChecklist`
- [ ] TypeScript builds successfully
- [ ] No lint errors

---

## Notes

- The file is large (~2000 lines), so apply changes incrementally
- Test after each major step if possible
- Keep backups before making changes
- If TypeScript errors occur, check that all imports are correct and types match



