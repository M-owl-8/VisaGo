# Task Group 4 - Update GPT-4 Checklist Pipeline to Use Canonical Schemas

**Status:** Mapper functions created, service updates pending

## Completed

✅ **`apps/backend/src/utils/checklist-mappers.ts`** - Created
- `mapBrainOutputToLegacy()` - Converts ChecklistBrainOutput to legacy format
- `mapLegacyToBrainOutput()` - Converts legacy format to ChecklistBrainOutput
- `parseChecklistResponse()` - Parses GPT-4 response in either format
- Full backward compatibility maintained

## Required Changes to `apps/backend/src/services/ai-openai.service.ts`

### 1. Add Imports (after line 3)

```typescript
import { CHECKLIST_SYSTEM_PROMPT } from '../config/ai-prompts';
import { buildApplicantProfile } from './ai-context.service';
import type { ApplicantProfile, ChecklistBrainOutput } from '../types/visa-brain';
import {
  mapBrainOutputToLegacy,
  mapLegacyToBrainOutput,
  parseChecklistResponse,
  type LegacyChecklistResponse,
} from '../utils/checklist-mappers';
```

### 2. Build ApplicantProfile (around line 1214, before visaKb)

Find this section:
```typescript
// Get visa knowledge base for the country and visa type
const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');
```

Add BEFORE it:
```typescript
// Build ApplicantProfile from AIUserContext (canonical schema)
const profile: ApplicantProfile = buildApplicantProfile(userContext, country, visaType);

// Get visa knowledge base for the country and visa type
const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');
```

### 3. Replace System Prompt (around line 1221)

Find:
```typescript
const systemPrompt = `You are a STRICT visa document checklist generator specialized for Uzbek applicants.
...
Your goal: produce the most reliable, accurate, embassy-ready checklist every time.`;
```

Replace with:
```typescript
// Use frozen system prompt from centralized config
// Dynamic context (risk score, profile details) goes in user message, not system prompt
const systemPrompt = CHECKLIST_SYSTEM_PROMPT;
```

### 4. Update User Prompt (around line 1534)

Find the `userPrompt` variable that starts with:
```typescript
const userPrompt = `Generate the document checklist following the schema and rules above.

Key Applicant Information:
- Destination Country: ${country}
- Visa Type: ${visaType}
...
```

Replace the ENTIRE userPrompt with:
```typescript
const userPrompt = `Generate the document checklist following the schema and rules above.

================================================================================
APPLICANT PROFILE (Canonical Schema)
================================================================================

Here is the ApplicantProfile JSON:
${JSON.stringify(profile, null, 2)}

================================================================================
KNOWLEDGE BASE CONTEXT
================================================================================

${visaKb || 'No specific knowledge base available - use general requirements for this country/visa type.'}

${documentGuidesText ? `\nDocument Guides:\n${documentGuidesText}` : ''}

================================================================================
RISK FACTORS
================================================================================

${userContext.riskScore ? `Risk Score: ${userContext.riskScore.probabilityPercent}% (${userContext.riskScore.level})` : 'Risk Score: Not calculated'}

Risk Factors to Consider:
${userContext.riskScore?.riskFactors?.length > 0 
  ? userContext.riskScore.riskFactors.map((f: string) => `- ${f}`).join('\n')
  : '- Standard application profile'}

================================================================================
OUTPUT REQUIREMENTS
================================================================================

You MUST generate a checklist that matches the ChecklistBrainOutput schema:

{
  "countryCode": "${profile.destinationCountryCode}",
  "countryName": "${profile.destinationCountryName}",
  "visaTypeCode": "${profile.visaTypeCode}",
  "visaTypeLabel": "${profile.visaTypeLabel}",
  "profileSummary": "Short summary of applicant context",
  "requiredDocuments": [
    {
      "id": "document_slug",
      "status": "REQUIRED" | "HIGHLY_RECOMMENDED" | "OPTIONAL" | "CONDITIONAL",
      "whoNeedsIt": "applicant" | "sponsor" | "family_member" | "employer" | "other",
      "name": "English name",
      "nameUz": "Uzbek name",
      "nameRu": "Russian name",
      "description": "English description",
      "descriptionUz": "Uzbek description",
      "descriptionRu": "Russian description",
      "whereToObtain": "English instructions",
      "whereToObtainUz": "Uzbek instructions",
      "whereToObtainRu": "Russian instructions",
      "priority": "high" | "medium" | "low",
      "isCoreRequired": true | false,
      "isConditional": true | false (optional),
      "conditionDescription": "When needed" (optional)
    }
  ],
  "financialRequirements": [] (optional),
  "warnings": [] (optional),
  "disclaimer": "Standard disclaimer text"
}

CRITICAL REMINDERS:
- ALWAYS output 10-16 documents total (aim for 12-14 for optimal coverage)
- ALWAYS include ALL THREE statuses (REQUIRED, HIGHLY_RECOMMENDED, OPTIONAL)
- NEVER output fewer than 10 items
- NEVER output only REQUIRED items
- Use correct country-specific terminology (I-20 for USA, LOA for Canada, CAS for UK, etc.)
- All whereToObtain fields must be realistic for Uzbekistan
- All items MUST have complete UZ and RU translations

Return ONLY valid JSON matching the ChecklistBrainOutput schema, no other text, no markdown, no comments.`;
```

### 5. Update Parsing Logic (around line 1600-1700)

Find the section where `rawContent` is parsed, typically:
```typescript
const rawContent = response.choices[0]?.message?.content || '{}';
// ... parsing logic ...
```

Replace the parsing section with:
```typescript
const rawContent = response.choices[0]?.message?.content || '{}';

// Parse response - may be in ChecklistBrainOutput or legacy format
const parseResult = parseChecklistResponse(rawContent, profile);

let parsed: any = null;
let brainOutput: ChecklistBrainOutput | null = null;
let legacyResponse: LegacyChecklistResponse | null = null;

if (parseResult.format === 'brain' && parseResult.brainOutput) {
  // GPT-4 returned the new canonical format
  brainOutput = parseResult.brainOutput;
  logInfo('[OpenAI][Checklist] Received ChecklistBrainOutput format', {
    country,
    visaType,
    itemCount: brainOutput.requiredDocuments.length,
  });
  
  // Convert to legacy format for backward compatibility
  legacyResponse = mapBrainOutputToLegacy(brainOutput, visaType);
  parsed = legacyResponse;
} else if (parseResult.format === 'legacy' && parseResult.legacy) {
  // GPT-4 returned the old format (backward compatibility)
  legacyResponse = parseResult.legacy;
  parsed = legacyResponse;
  
  logInfo('[OpenAI][Checklist] Received legacy format (backward compatibility)', {
    country,
    visaType,
    itemCount: legacyResponse.checklist.length,
  });
  
  // Optionally convert to brain output for internal processing
  brainOutput = mapLegacyToBrainOutput(legacyResponse, profile);
} else {
  // Unknown format - try existing validator as fallback
  logWarn('[OpenAI][Checklist] Unknown response format, using existing validator', {
    country,
    visaType,
  });
  
  // Fall back to existing validation logic
  const { parseAndValidateChecklistResponse } = await import('../utils/json-validator');
  const firstAttempt = parseAndValidateChecklistResponse(
    rawContent,
    country,
    visaType,
    1
  );
  
  parsed = firstAttempt.parsed;
  if (parsed && parsed.checklist) {
    legacyResponse = parsed as LegacyChecklistResponse;
    brainOutput = mapLegacyToBrainOutput(legacyResponse, profile);
  }
}
```

### 6. Update Validation (if needed)

The existing `json-validator.ts` should continue to work with legacy format. The new parsing logic above handles both formats and converts between them as needed.

## Summary

After these changes:
1. ✅ System prompt is frozen and centralized
2. ✅ ApplicantProfile is built and used
3. ✅ GPT-4 receives structured ApplicantProfile JSON
4. ✅ GPT-4 can return either ChecklistBrainOutput or legacy format
5. ✅ Backward compatibility maintained via mappers
6. ✅ Frontend continues to receive legacy format (no breaking changes)

## Testing

After applying changes, verify:
- Checklist generation still works
- Both new and old GPT-4 response formats are handled
- Frontend receives expected format (no breaking changes)
- ApplicantProfile is correctly built from userContext
- Mapper functions work correctly



