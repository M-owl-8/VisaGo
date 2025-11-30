# Questionnaire V2 Implementation Summary

## Overview

Replaced the 32-question questionnaire with a new **10-question, fully multiple-choice, branching questionnaire** that maintains compatibility with the existing AI checklist generation pipeline.

## Key Changes

### 1. New Questionnaire Structure (`QuestionnaireV2`)

**Location**: `apps/backend/src/types/questionnaire-v2.ts`

The new questionnaire has exactly 10 parent sections, all with predefined options (no free text):

1. **Personal & Passport** - Age range, marital status, nationality, passport status
2. **Travel Purpose & Duration** - Duration category, planned timing, exact dates known
3. **Current Status & Education** - Employment/student status, highest education, minor status
4. **Financial Situation** - Payer type, income range, bank statement availability
5. **Invitation/Admission** - Branching based on visa type (student vs tourist)
6. **Accommodation & Tickets** - Accommodation type, round-trip ticket
7. **Travel History** - Previous travel, regions visited, visa refusals
8. **Ties to Uzbekistan** - Property ownership, family ties
9. **Documents Available** - What documents user already has
10. **Special Conditions** - Traveling with children, medical reasons, criminal record

### 2. Mapping Function

**Location**: `apps/backend/src/services/questionnaire-v2-mapper.ts`

**Function**: `buildSummaryFromQuestionnaireV2(q: QuestionnaireV2, appLanguage: 'uz' | 'ru' | 'en'): VisaQuestionnaireSummary`

This function maps the new QuestionnaireV2 structure to the existing `VisaQuestionnaireSummary` format that the AI checklist generation pipeline expects. Key mappings:

- `visaType` → `summary.visaType`
- `targetCountry` → `summary.targetCountry`
- `travel.durationCategory` → `summary.duration` (with visa-type-specific logic)
- `finance.payer` → `summary.sponsorType`
- `invitation.studentInvitationType` → `summary.hasUniversityInvitation`
- `history.hasTraveledBefore` → `summary.hasInternationalTravel`
- `history.hasVisaRefusals` → `summary.previousVisaRejections`
- `ties.hasProperty` → `summary.hasPropertyInUzbekistan`
- `ties.hasCloseFamilyInUzbekistan` → `summary.hasFamilyInUzbekistan`
- And many more...

### 3. Backend Integration

#### Updated Files:

1. **`apps/backend/src/services/ai-context.service.ts`**
   - Updated `extractQuestionnaireSummary()` to detect and process QuestionnaireV2 format
   - Automatically converts V2 to summary when extracting from user bio

2. **`apps/backend/src/routes/users.ts`**
   - Updated PATCH `/api/users/:userId` endpoint
   - Validates QuestionnaireV2 structure when bio is submitted
   - Automatically builds and stores summary alongside V2 data
   - Maintains backward compatibility with legacy formats

3. **`apps/backend/src/services/ai-application.service.ts`**
   - Updated to handle QuestionnaireV2 format in `generateApplicationFromQuestionnaire()`
   - Supports both country ID and country code (for V2's `targetCountry`)

### 4. Backward Compatibility

The implementation maintains full backward compatibility:

- **Legacy questionnaire data** continues to work
- **Old summary format** is still supported
- **V2 questionnaire** is automatically converted to summary format
- **AI checklist generation** works with both old and new formats

### 5. Validation

**Function**: `validateQuestionnaireV2(q: any): q is QuestionnaireV2`

Validates that:

- Version is '2.0'
- Visa type is 'tourist' or 'student'
- Target country is one of the 8 supported countries
- All 10 required sections are present
- Visa-type-specific fields are present (e.g., `studentInvitationType` for students)

## TypeScript Types

### QuestionnaireV2 Interface

```typescript
export interface QuestionnaireV2 {
  version: '2.0';
  targetCountry: 'US' | 'GB' | 'ES' | 'DE' | 'JP' | 'AE' | 'CA' | 'AU';
  visaType: 'tourist' | 'student';

  personal: { ... };
  travel: { ... };
  status: { ... };
  finance: { ... };
  invitation: { ... };
  stay: { ... };
  history: { ... };
  ties: { ... };
  documents: { ... };
  special: { ... };
}
```

## Storage Format

When a QuestionnaireV2 is submitted, it's stored in `User.bio` as:

```json
{
  "version": "2.0",
  "targetCountry": "CA",
  "visaType": "student",
  "personal": { ... },
  "travel": { ... },
  ...
  "_hasSummary": true,
  "summary": {
    "version": "2.0",
    "visaType": "student",
    "targetCountry": "CA",
    ...
  }
}
```

This dual storage ensures:

- V2 structure is preserved for future use
- Summary is immediately available for AI services
- Backward compatibility is maintained

## Files Changed

1. **New Files**:
   - `apps/backend/src/types/questionnaire-v2.ts` - V2 type definitions
   - `apps/backend/src/services/questionnaire-v2-mapper.ts` - Mapping and validation logic

2. **Modified Files**:
   - `apps/backend/src/services/ai-context.service.ts` - V2 extraction support
   - `apps/backend/src/routes/users.ts` - V2 validation and processing
   - `apps/backend/src/services/ai-application.service.ts` - V2 support in application generation

## Testing Scenarios

The implementation should be tested with:

1. **Tourist visa → Germany** - Adult, employed, self-funded
2. **Tourist visa → UAE** - Visiting family
3. **Student visa → Canada** - Has LOA, parents as sponsors
4. **Student visa → US** - Has I-20, own funding
5. **Student visa → Spain/Germany** - Schengen logic verification

## Next Steps (Frontend)

The frontend needs to be updated to:

1. Replace the 32-question UI with a 10-step wizard
2. Implement branching logic (show/hide fields based on visa type)
3. Use only predefined options (no text inputs)
4. Submit QuestionnaireV2 format to `/api/users/:userId` with `bio` field
5. Handle both V2 and legacy formats when loading existing data

## API Usage

### Submitting QuestionnaireV2

```typescript
PATCH /api/users/:userId
{
  "bio": JSON.stringify(questionnaireV2),
  "questionnaireCompleted": true
}
```

The backend will:

1. Validate QuestionnaireV2 structure
2. Build summary automatically
3. Store both V2 and summary in bio field
4. Set questionnaireCompleted flag

### Reading Questionnaire

The existing flow continues to work:

- `extractQuestionnaireSummary()` automatically handles V2
- AI checklist generation uses the summary
- No changes needed to existing application generation endpoints




