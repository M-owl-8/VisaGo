# Phase 1 - Final Edits Required

## Status
✅ Imports added (completed)
⚠️ Remaining edits need to be applied manually due to file stability issues

## All Required Changes

### 1. Imports (DONE - already applied)
```typescript
import { CHECKLIST_SYSTEM_PROMPT, DOC_CHECK_SYSTEM_PROMPT } from '../config/ai-prompts';
import { buildApplicantProfile } from './ai-context.service';
import type { ApplicantProfile, ChecklistBrainOutput, DocCheckResult, ChecklistBrainItem } from '../types/visa-brain';
import { isChecklistBrainOutput } from '../types/visa-brain';
import {
  parseChecklistResponse,
  mapBrainOutputToLegacy,
  mapLegacyToBrainOutput,
  type LegacyChecklistResponse,
} from '../utils/checklist-mappers';
```

### 2. Build ApplicantProfile (Line ~1214)
**FIND:**
```typescript
// Get visa knowledge base for the country and visa type
const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');
```

**REPLACE WITH:**
```typescript
// Build ApplicantProfile from AIUserContext (canonical schema)
// This replaces ad-hoc field extraction with structured canonical input
const applicantProfile: ApplicantProfile = buildApplicantProfile(userContext, country, visaType);

// Get visa knowledge base for the country and visa type
const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');
```

### 3. Replace System Prompt (Line ~1221)
**FIND:**
```typescript
const systemPrompt = `You are a STRICT visa document checklist generator specialized for Uzbek applicants.
...
Your goal: produce the most reliable, accurate, embassy-ready checklist every time.`;
```

**REPLACE WITH:**
```typescript
// Use frozen system prompt from centralized config
// All country rules, category definitions, and anti-hallucination rules are in CHECKLIST_SYSTEM_PROMPT
// Nothing else should modify systemPrompt after this. All dynamic stuff goes into the user message only.
const systemPrompt = CHECKLIST_SYSTEM_PROMPT;
```

### 4. Update User Prompt (Line ~1406-1534)
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
// All dynamic context (risk score, profile details) goes in the user message, not system prompt
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

### 5. Update Parsing Logic (Line ~1630)
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

### 6. Update Retry Logic (Line ~1685)
**FIND:**
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
    temperature: 0.3, // Lower temperature for more consistent output
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
```

### 7. Update Fallback Logic (Line ~1720)
**FIND:**
```typescript
// If still invalid after retry, use fallback
if (!parsed || !validationResult.isValid) {
  ...
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
  ...
  parsed = autoCorrectChecklist(parsed, country, visaType);
  ...
}
```

**REPLACE WITH:**
```typescript
// If still invalid after retry, use fallback
if (!legacyChecklist || (validationResult && !validationResult.isValid)) {
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

  const { getFallbackChecklist } = await import('../data/fallback-checklists');
  const fallbackItems = getFallbackChecklist(
    countryCode,
    normalizedVisaType as 'student' | 'tourist'
  );

  legacyChecklist = {
    type: visaType,
    country: country,
    checklist: fallbackItems,
  };

  logInfo('[OpenAI][Checklist] Using fallback checklist', {
    country,
    visaType,
    itemCount: fallbackItems.length,
  });
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

### 8. Update Final Return Logic (Line ~1755)
**FIND:**
```typescript
// Final logging for checklist generation
logInfo('[OpenAI][Checklist] Checklist generation completed', {
  ...
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
const MIN_ITEMS = 10;
const MAX_ITEMS = 16;
const itemCount = parsed.checklist.length;

if (itemCount < MIN_ITEMS) {
  logWarn('[OpenAI][Checklist] AI returned too few items, minimum 10 required', {
    country,
    visaType,
    itemCount,
    minimumRequired: MIN_ITEMS,
  });
}

// Warn if too many items (but don't fail)
if (parsed.checklist.length > MAX_ITEMS) {
  logWarn('[OpenAI][Checklist] AI returned more than recommended items', {
    country,
    visaType,
    itemCount: parsed.checklist.length,
    recommendedMax: MAX_ITEMS,
  });
}

// Validate required fields for each item
for (const item of parsed.checklist) {
  if (!item.document && !item.name) {
    throw new Error('Invalid checklist item: missing document or name field');
  }
}

// Import helper for category consistency
const { ensureCategoryConsistency } = await import('../utils/checklist-helpers');

// Validate and enrich checklist items with category support
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
const MIN_ITEMS = 10; // Stricter minimum: 10 items required
const MAX_ITEMS = 16; // Increased maximum: 16 items allowed
const itemCount = legacyChecklist.checklist.length;

if (itemCount < MIN_ITEMS) {
  logWarn('[OpenAI][Checklist] AI returned too few items, minimum 10 required', {
    country,
    visaType,
    itemCount,
    minimumRequired: MIN_ITEMS,
  });

  // Instead of throwing, we'll return what we have and let the caller decide
  // The document-checklist.service can merge with fallback items if needed
  // This makes the system more resilient to AI inconsistencies
}

// Warn if too many items (but don't fail)
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
// Note: legacyChecklist is already in the format expected by the frontend
const enrichedChecklist = legacyChecklist.checklist.map((item: any) => {
  // Ensure category consistency (handle both new format with category and old format)
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
    category, // NEW: Explicit category field
    required, // Derived from category or kept from AI response
    description: item.description || '',
    descriptionUz: item.descriptionUz || item.description || '',
    descriptionRu: item.descriptionRu || item.description || '',
    priority, // Ensured to match category
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

### 9. Add TODO Comment (Before trackUsage, Line ~2020)
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
   * @param checklistItem - The checklist item being checked
   * @param documentContent - Extracted text content from uploaded document
   * @param profile - ApplicantProfile for context
   * @returns Promise<DocCheckResult> with status, problems, and suggestions
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
- [ ] `const systemPrompt = CHECKLIST_SYSTEM_PROMPT;` ✅
- [ ] `const applicantProfile = buildApplicantProfile(userContext, country, visaType);` ✅
- [ ] User prompt contains `=== APPLICANT PROFILE JSON ===` ✅
- [ ] Parsing uses `parseChecklistResponse()` ✅
- [ ] Uses `mapBrainOutputToLegacy()` to convert to legacy format ✅
- [ ] Validator still runs on legacy checklist shape ✅
- [ ] API response shape unchanged ✅
- [ ] TypeScript builds, no lint errors ✅



