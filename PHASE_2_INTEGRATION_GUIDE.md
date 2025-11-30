# Phase 2 Integration Guide - Visa Templates & Rule-Based Core

## Status
✅ Prisma models added (VisaTemplate, VisaTemplateDocument)
✅ VisaTemplateService created
✅ Seed file created with initial templates

## Remaining Integration Steps

Since `ai-openai.service.ts` appears to need Phase 1 integration first, this guide covers both Phase 1 and Phase 2 changes.

### STEP 1: Add Phase 2 Imports to ai-openai.service.ts

**FIND (after existing imports):**
```typescript
import { logInfo, logError, logWarn } from '../middleware/logger';
```

**ADD:**
```typescript
import { CHECKLIST_SYSTEM_PROMPT } from '../config/ai-prompts';
import { buildApplicantProfile } from './ai-context.service';
import type { ApplicantProfile, ChecklistBrainOutput, VisaTemplate as VisaTemplateType, VisaRequiredDocumentTemplate } from '../types/visa-brain';
import { isChecklistBrainOutput } from '../types/visa-brain';
import {
  parseChecklistResponse,
  mapBrainOutputToLegacy,
  mapLegacyToBrainOutput,
  type LegacyChecklistResponse,
} from '../utils/checklist-mappers';
import { VisaTemplateService } from './visa-template.service';
```

### STEP 2: Add Helper Functions (Before generateChecklist)

**ADD these helper functions before the `generateChecklist` method:**

```typescript
/**
 * Normalize visa type to canonical visaTypeCode
 * Maps current visa type strings to Phase 2 canonical codes
 */
function normalizeVisaTypeCode(visaType: string, profile: ApplicantProfile): string {
  // Very simple initial mapping.
  // Later, we can refine based on duration, purpose, questionnaire, etc.
  const lower = visaType.toLowerCase();

  if (lower.includes('student') || lower.includes('study')) {
    return 'student_long_stay';
  }
  if (lower.includes('tourist') || lower.includes('visit') || lower.includes('short')) {
    return 'tourist_short';
  }
  // Fallback
  return 'tourist_short';
}

/**
 * Ensure core required documents from VisaTemplate are present in ChecklistBrainOutput
 * 
 * If template is provided and has core required documents, this function ensures
 * they are all present in the brain output. Missing ones are auto-added with minimal data.
 */
function ensureCoreDocumentsPresent(
  brainOutput: ChecklistBrainOutput,
  visaTemplate: VisaTemplateType | null
): ChecklistBrainOutput {
  if (!visaTemplate) return brainOutput;

  const coreDocs = visaTemplate.requiredDocuments.filter((d) => d.isCoreRequired);
  if (coreDocs.length === 0) return brainOutput;

  const existingIds = new Set(
    brainOutput.requiredDocuments.map((item) => item.id.toLowerCase())
  );

  const missingCoreDocs: VisaRequiredDocumentTemplate[] = coreDocs.filter((doc) => {
    return !existingIds.has(doc.id.toLowerCase());
  });

  if (missingCoreDocs.length === 0) {
    return brainOutput;
  }

  // For now, create minimal ChecklistBrainItem entries for missing core docs.
  // You can later improve by calling GPT-4 or using a translation helper.
  const missingItems = missingCoreDocs.map((doc): ChecklistBrainOutput['requiredDocuments'][number] => ({
    id: doc.id,
    status: 'REQUIRED',
    whoNeedsIt: doc.whoNeedsIt,
    name: doc.name,
    nameUz: doc.name, // TODO: can be translated later
    nameRu: doc.name, // TODO: can be translated later
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

### STEP 3: Update generateChecklist() - Build ApplicantProfile

**FIND (around line ~1214 in LEGACY mode section):**
```typescript
      // Get visa knowledge base for the country and visa type
      const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');
```

**REPLACE WITH:**
```typescript
      // Build ApplicantProfile from AIUserContext (canonical schema) - Phase 1
      const applicantProfile: ApplicantProfile = buildApplicantProfile(userContext, country, visaType);

      // Normalize countryCode and visaTypeCode for template lookup - Phase 2
      const countryCode = applicantProfile.destinationCountryCode || applicantProfile.nationality || 'UZ';
      const normalizedVisaTypeCode = normalizeVisaTypeCode(visaType, applicantProfile);

      // Fetch VisaTemplate (may be null) - Phase 2
      logInfo('[VisaTemplate] Fetching visa template', {
        countryCode,
        visaTypeCode: normalizedVisaTypeCode,
      });
      const visaTemplate: VisaTemplateType | null = await VisaTemplateService.getTemplate(
        countryCode,
        normalizedVisaTypeCode
      );

      if (!visaTemplate) {
        logWarn('[VisaTemplate] No template found, using AI-only mode', {
          countryCode,
          visaTypeCode: normalizedVisaTypeCode,
        });
      } else {
        logInfo('[VisaTemplate] Template loaded', {
          countryCode,
          visaTypeCode: normalizedVisaTypeCode,
          templateId: visaTemplate.id,
          coverageLevel: visaTemplate.coverageLevel,
          coreDocsCount: visaTemplate.requiredDocuments.filter((d) => d.isCoreRequired).length,
        });
      }

      // Get visa knowledge base for the country and visa type
      const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');
```

### STEP 4: Update System Prompt (Phase 1)

**FIND the large inline system prompt (around line ~1221):**
```typescript
      const systemPrompt = `You are a STRICT visa document checklist generator specialized for Uzbek applicants.
...
Your goal: produce the most reliable, accurate, embassy-ready checklist every time.`;
```

**REPLACE WITH:**
```typescript
      // Use frozen system prompt from centralized config - Phase 1
      const systemPrompt = CHECKLIST_SYSTEM_PROMPT;
```

### STEP 5: Update User Prompt (Phase 1 + Phase 2)

**FIND the user prompt construction (around line ~1406-1534):**
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

### STEP 6: Update Parsing Logic (Phase 1)

**FIND (around line ~1630):**
```typescript
      const rawContent = response.choices[0]?.message?.content || '{}';
      ...
      // Use new JSON validator with retry logic
      const { parseAndValidateChecklistResponse } = await import('../utils/json-validator');
      ...
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
        brainOutput = ensureCoreDocumentsPresent(brainOutput, visaTemplate);
        const afterCount = brainOutput.requiredDocuments.length;
        
        if (afterCount > beforeCount) {
          logWarn('[VisaTemplate] Auto-adding missing core documents to ChecklistBrainOutput', {
            countryCode,
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

### STEP 7: Update Retry Logic (Phase 1)

**FIND (around line ~1685):**
```typescript
      // Retry if needed
      if (needsRetry && attempt < 2) {
        ...
        parsed = retryAttempt.parsed;
        validationResult = retryAttempt.validation;
        needsRetry = retryAttempt.needsRetry;
      }
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
          // Phase 2: Enforce template after retry
          if (visaTemplate) {
            brainOutput = ensureCoreDocumentsPresent(brainOutput, visaTemplate);
          }
          legacyChecklist = mapBrainOutputToLegacy(brainOutput, visaType);
        } else if (retryParseResult.format === 'legacy' && retryParseResult.legacy) {
          legacyChecklist = retryParseResult.legacy;
          brainOutput = mapLegacyToBrainOutput(legacyChecklist, applicantProfile);
          // Phase 2: Enforce template after retry
          if (visaTemplate && brainOutput) {
            brainOutput = ensureCoreDocumentsPresent(brainOutput, visaTemplate);
            legacyChecklist = mapBrainOutputToLegacy(brainOutput, visaType);
          }
        } else {
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
            // Phase 2: Enforce template
            if (visaTemplate && brainOutput) {
              brainOutput = ensureCoreDocumentsPresent(brainOutput, visaTemplate);
              legacyChecklist = mapBrainOutputToLegacy(brainOutput, visaType);
            }
          }
        }
      }
```

### STEP 8: Update Final Return Logic (Phase 1)

**FIND all references to `parsed.checklist` and `parsed.type` in the final section, replace with `legacyChecklist.checklist` and `legacyChecklist.type`.**

See PHASE_1_INTEGRATION_COMPLETE.md for detailed replacements.

## Verification Checklist

After applying all changes:
- [ ] Imports added (Phase 1 + Phase 2)
- [ ] Helper functions added (normalizeVisaTypeCode, ensureCoreDocumentsPresent)
- [ ] ApplicantProfile built before template fetch
- [ ] Template fetched and logged
- [ ] Template JSON included in user prompt
- [ ] Core documents enforced after parsing
- [ ] All Phase 1 changes applied
- [ ] TypeScript builds successfully
- [ ] No lint errors

## Notes

- If no template is found, behavior degrades gracefully to Phase 1 (AI-only mode)
- Core document enforcement happens AFTER GPT-4 response, ensuring templates are always respected
- The public API response shape remains unchanged



