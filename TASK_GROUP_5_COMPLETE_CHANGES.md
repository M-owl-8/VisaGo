# Task Group 5 - Complete Implementation Guide

## Summary

This document contains all the changes needed to complete Task Group 5: Ruthless Cleanup & Documentation.

## 1. Add Imports to ai-openai.service.ts

**Location:** After line 3

```typescript
import { CHECKLIST_SYSTEM_PROMPT, DOC_CHECK_SYSTEM_PROMPT } from '../config/ai-prompts';
import { buildApplicantProfile } from './ai-context.service';
import type { ApplicantProfile, ChecklistBrainOutput, DocCheckResult } from '../types/visa-brain';
import { isChecklistBrainOutput } from '../types/visa-brain';
import {
  mapBrainOutputToLegacy,
  mapLegacyToBrainOutput,
  parseChecklistResponse,
  type LegacyChecklistResponse,
} from '../utils/checklist-mappers';
```

## 2. Add Type Guard Helper Function

**Location:** After imports, before the class definition

```typescript
/**
 * Type guard helper to safely parse and validate ChecklistBrainOutput from GPT-4 response
 * 
 * @param rawJson - Raw JSON string or parsed object from GPT-4
 * @returns ChecklistBrainOutput if valid, null otherwise
 */
function parseChecklistBrainOutput(rawJson: string | unknown): ChecklistBrainOutput | null {
  try {
    const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    if (isChecklistBrainOutput(parsed)) {
      return parsed as ChecklistBrainOutput;
    }
    return null;
  } catch {
    return null;
  }
}
```

## 3. Add TODO Comment for Doc-Check

**Location:** After the class definition, before generateChecklist method

```typescript
  /**
   * TODO: Phase 2+ - Document Checking (Inspector Mode)
   * 
   * This function will implement document inspection using:
   * - DOC_CHECK_SYSTEM_PROMPT from ai-prompts.ts
   * - DocCheckResult schema from visa-brain.ts
   * - ChecklistBrainItem to identify which document is being checked
   * - ApplicantProfile for context
   * 
   * Implementation will:
   * 1. Extract text content from uploaded document (PDF/image OCR)
   * 2. Call GPT-4 with DOC_CHECK_SYSTEM_PROMPT
   * 3. Parse response as DocCheckResult
   * 4. Return structured check results with problems and suggestions
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
```

## 4. Update generateChecklist JSDoc

**Location:** Replace the existing JSDoc comment (around line 860-890)

The new JSDoc should emphasize:
- Reliance on ApplicantProfile and ChecklistBrainOutput
- Use of frozen CHECKLIST_SYSTEM_PROMPT
- Backward compatibility via mappers

## 5. Remove Inline System Prompt

**Location:** Around line 1221

Find:
```typescript
const systemPrompt = `You are a STRICT visa document checklist generator...
```

Replace with:
```typescript
// Use frozen system prompt from centralized config
// All country rules, category definitions, and anti-hallucination rules are in CHECKLIST_SYSTEM_PROMPT
const systemPrompt = CHECKLIST_SYSTEM_PROMPT;
```

## 6. Add Strong Typing to Parsing

**Location:** Where rawContent is parsed (around line 1600-1700)

Replace parsing logic with:
```typescript
const rawContent = response.choices[0]?.message?.content || '{}';

// Parse response - may be in ChecklistBrainOutput or legacy format
const parseResult = parseChecklistResponse(rawContent, profile);

let parsed: LegacyChecklistResponse | null = null;
let brainOutput: ChecklistBrainOutput | null = null;

if (parseResult.format === 'brain' && parseResult.brainOutput) {
  // GPT-4 returned the new canonical format - use type guard for safety
  brainOutput = parseChecklistBrainOutput(parseResult.brainOutput) as ChecklistBrainOutput;
  if (brainOutput) {
    logInfo('[OpenAI][Checklist] Received ChecklistBrainOutput format', {
      country,
      visaType,
      itemCount: brainOutput.requiredDocuments.length,
    });
    // Convert to legacy format for backward compatibility
    parsed = mapBrainOutputToLegacy(brainOutput, visaType);
  }
} else if (parseResult.format === 'legacy' && parseResult.legacy) {
  // GPT-4 returned the old format (backward compatibility)
  parsed = parseResult.legacy;
  logInfo('[OpenAI][Checklist] Received legacy format (backward compatibility)', {
    country,
    visaType,
    itemCount: parsed.checklist.length,
  });
  // Optionally convert to brain output for internal processing
  brainOutput = mapLegacyToBrainOutput(parsed, profile);
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
  parsed = firstAttempt.parsed as LegacyChecklistResponse | null;
  if (parsed && parsed.checklist) {
    brainOutput = mapLegacyToBrainOutput(parsed, profile);
  }
}
```

## 7. Build ApplicantProfile in generateChecklist

**Location:** After getting visaKb (around line 1215)

Add:
```typescript
// Build ApplicantProfile from AIUserContext (canonical schema)
// This replaces ad-hoc field extraction with structured canonical input
const profile: ApplicantProfile = buildApplicantProfile(userContext, country, visaType);
```

## 8. Update User Prompt to Use ApplicantProfile

**Location:** Around line 1534

The user prompt should include:
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

You MUST generate a checklist that matches the ChecklistBrainOutput schema (see system prompt for details).

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

## Verification Checklist

After applying all changes:
- [ ] Imports added for canonical schemas and mappers
- [ ] Type guard helper function added
- [ ] TODO comment added for doc-check
- [ ] generateChecklist JSDoc updated
- [ ] Inline system prompt removed (using CHECKLIST_SYSTEM_PROMPT)
- [ ] Strong typing added to parsing logic
- [ ] ApplicantProfile built in generateChecklist
- [ ] User prompt uses structured ApplicantProfile JSON
- [ ] No breaking changes to public API
- [ ] TypeScript builds successfully
- [ ] All existing tests pass



