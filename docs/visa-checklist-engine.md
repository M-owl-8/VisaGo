# Visa Checklist Engine & Document Checker

## Overview

This document describes the new **Visa Checklist Engine** and **Document Checker** services that use `VisaRuleSet` from the database as the source of truth for visa document requirements.

## Architecture

### 1. Visa Checklist Engine (`visa-checklist-engine.service.ts`)

**Purpose**: Generate personalized visa document checklists using:

- `VisaRuleSet` from database (official embassy rules)
- `AIUserContext` (user profile + questionnaire)
- GPT-4 for personalization and enrichment

**Key Features**:

- Uses approved `VisaRuleSet` as the ONLY source of official rules
- Personalizes checklist based on user context (sponsor type, employment status, risk score, etc.)
- Generates multilingual names and descriptions
- Preserves stable IDs from previous checklists when available
- Returns structured JSON matching `ChecklistResponseSchema`

**Integration**:

- Called from `document-checklist.service.ts` when generating checklists
- Falls back to legacy `AIOpenAIService.generateChecklist` if no `VisaRuleSet` exists or engine fails

**Output Schema**:

```typescript
{
  checklist: [
    {
      id: string,
      documentType: string,
      category: "required" | "highly_recommended" | "optional",
      required: boolean,
      name: string,
      nameUz: string,
      nameRu: string,
      description: string,
      appliesToThisApplicant: boolean,
      reasonIfApplies?: string,
      extraRecommended: boolean,
      group: "identity" | "financial" | "travel" | "education" | "employment" | "ties" | "other",
      priority: number,
      dependsOn?: string[]
    }
  ]
}
```

### 2. Visa Document Checker (`visa-doc-checker.service.ts`)

**Purpose**: Compare uploaded documents against `VisaRuleSet` requirements using GPT-4.

**Key Features**:

- Compares ONE uploaded document against ONE official requirement
- Uses OCR text when available (via `DocumentClassifierService.extractTextForDocument`)
- Returns strict evaluation: `APPROVED`, `NEED_FIX`, or `REJECTED`
- Provides embassy risk level: `LOW`, `MEDIUM`, `HIGH`
- Includes practical, user-friendly reasons

**Integration**:

- Called from `document-validation.service.ts` when validating uploaded documents
- Only used if an approved `VisaRuleSet` exists and a matching requirement is found
- Falls back to legacy validation if checker is unavailable

**Output Schema**:

```typescript
{
  status: "APPROVED" | "NEED_FIX" | "REJECTED",
  short_reason: string,
  embassy_risk_level: "LOW" | "MEDIUM" | "HIGH",
  technical_notes?: string | null
}
```

## Workflow

### Checklist Generation Flow

1. User requests checklist for an application
2. `DocumentChecklistService.generateChecklistAsync()` is called
3. Service tries `VisaChecklistEngineService.generateChecklist()`:
   - Fetches approved `VisaRuleSet` from database
   - Builds `AIUserContext` from user profile and questionnaire
   - Calls GPT-4 with system prompt + rule set + user context
   - Validates response against `ChecklistResponseSchema`
   - Converts to legacy format for compatibility
4. If engine fails or no rule set exists, falls back to `AIOpenAIService.generateChecklist()`
5. Checklist is stored in `DocumentChecklist` table

### Document Validation Flow

1. User uploads a document
2. `validateDocumentWithAI()` is called
3. Service tries new `VisaDocCheckerService`:
   - Fetches approved `VisaRuleSet` from database
   - Finds matching requirement for document type
   - Extracts OCR text if available
   - Calls GPT-4 to compare document against requirement
   - Returns structured check result
4. If checker unavailable, falls back to legacy validation
5. Result is stored in `UserDocument` record

## Key Rules

### Checklist Engine Rules

1. **Source of Truth**: `VisaRuleSet.requiredDocuments` is the ONLY canonical list
2. **No Invention**: Cannot invent new mandatory documents
3. **Personalization**: Documents apply based on `AIUserContext`:
   - Sponsor docs only if `sponsorType !== "self"`
   - Employer letter only if `employmentStatus === "employed"`
   - Student docs only if student/admission status exists
4. **Conservatism**: When ambiguous, prefer `highly_recommended` over `required`
5. **Stable IDs**: Preserve IDs from previous checklist when possible

### Document Checker Rules

1. **Strict Alignment**: Judgment must align with `REQUIRED_DOCUMENT_RULE`, not generic knowledge
2. **Status Logic**:
   - `APPROVED`: Clearly satisfies requirements
   - `NEED_FIX`: Correctable issues (missing months, wrong language, etc.)
   - `REJECTED`: Unusable (wrong type, expired, fake, etc.)
3. **Risk Levels**:
   - `LOW`: Solid and compliant
   - `MEDIUM`: Weaknesses but might be accepted
   - `HIGH`: Likely to cause refusal
4. **Conservatism**: When in doubt, prefer `NEED_FIX` with `MEDIUM`/`HIGH` risk

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Required for GPT-4 calls
- `DATABASE_URL`: Required for `VisaRuleSet` queries
- `REDIS_URL`: Required for Bull queue (used by embassy sync pipeline)

### Model Settings

- **Model**: `gpt-4o-mini` (via `AIOpenAIService.MODEL`)
- **Temperature**: 0.3 for checklist generation, 0.2 for document checking
- **Max Tokens**: 3000 for checklists, 500 for document checks
- **Response Format**: `json_object` (structured output)

## Error Handling

### Checklist Engine Errors

- **No Rule Set**: Falls back to legacy `AIOpenAIService.generateChecklist()`
- **Schema Validation Failure**: Attempts to fix common issues, then throws error
- **GPT-4 API Error**: Falls back to legacy service
- **Parse Error**: Logs error and falls back

### Document Checker Errors

- **No Rule Set**: Falls back to legacy validation
- **No Matching Requirement**: Falls back to legacy validation
- **OCR Extraction Failure**: Continues without text (uses document name as fallback)
- **Schema Validation Failure**: Returns conservative `NEED_FIX` result
- **GPT-4 API Error**: Returns conservative `NEED_FIX` result

## Future Enhancements

1. **OCR Integration**: Implement real OCR/PDF text extraction in `DocumentClassifierService.extractTextForDocument()`
2. **Caching**: Cache `VisaRuleSet` queries to reduce database load
3. **Batch Processing**: Support batch document checking
4. **Confidence Scoring**: Add more sophisticated confidence calculation
5. **Translation Quality**: Improve multilingual name/description generation
6. **Rule Versioning**: Support comparing documents against historical rule versions

## Testing

### Manual Testing

1. **Checklist Generation**:

   ```bash
   # Ensure approved VisaRuleSet exists for country/visa type
   # Create application
   # Request checklist via API
   # Verify checklist uses VisaRuleSet rules
   ```

2. **Document Validation**:
   ```bash
   # Upload document
   # Verify validation uses VisaDocChecker if rule set exists
   # Check result format matches schema
   ```

### Integration Testing

- Test fallback behavior when no rule set exists
- Test error handling for GPT-4 failures
- Test schema validation edge cases
- Test OCR text extraction (when implemented)

## Related Documentation

- [Embassy Rules Sync Pipeline](./embassy-rules-pipeline.md) - How `VisaRuleSet` is populated
- [AI Services](./ai-services.md) - General AI service architecture
- [Document Checklist Service](../apps/backend/src/services/document-checklist.service.ts) - Main checklist service
