# Ketdik Personalization Exploration Report

**Date:** December 2024  
**Purpose:** Explore codebase to understand current data flow and identify integration points for personalized, rules-based checklist generation

---

## 1. Questionnaire / Application Data

### Storage Location

**Prisma Schema:**

- **`User.bio`** (String, nullable): JSON string containing questionnaire data
- **`User.questionnaireCompleted`** (Boolean): Flag indicating if questionnaire is done
- **`Application`** model: Links user to country/visaType via `countryId` and `visaTypeId`

**Location:** `apps/backend/prisma/schema.prisma` (lines 26-27, 493-515)

### Questionnaire Structure

**Current Fields Stored (from `QuestionnaireData` interface):**

- `purpose`: study, work, tourism, business, immigration, other
- `country`: country ID or code
- `duration`: less_than_1, 1_3_months, 3_6_months, 6_12_months, more_than_1_year
- `traveledBefore`: boolean
- `currentStatus`: student, employee, entrepreneur, unemployed, other
- `hasInvitation`: boolean
- `financialSituation`: stable_income, sponsor, savings, preparing
- `maritalStatus`: single, married, divorced
- `hasChildren`: no, one, two_plus
- `englishLevel`: beginner, intermediate, advanced, native

**Location:** `apps/backend/src/services/ai-application.service.ts` (lines 10-25)

### Application Creation Flow

**Endpoint:** `POST /api/applications/ai-generate`

**Files:**

- Route: `apps/backend/src/routes/applications.ts` (lines 188-380)
- Service: `apps/backend/src/services/ai-application.service.ts` (lines 38-585)

**Flow:**

1. User completes 10-step questionnaire (frontend)
2. Frontend calls `/api/applications/ai-generate` with `questionnaireData`
3. `AIApplicationService.generateApplicationFromQuestionnaire()`:
   - Determines country (with AI suggestion if not specified)
   - Finds visa type based on purpose
   - Creates `Application` record with `countryId`, `visaTypeId`
   - Stores questionnaire data in `User.bio` (JSON string)

**Connection to Application:**

- `Application.countryId` → `Country.code` (e.g., "DE", "US")
- `Application.visaTypeId` → `VisaType.name` (e.g., "Tourist Visa", "Student Visa")
- Questionnaire data stored in `User.bio`, linked via `Application.userId`

---

## 2. Checklist Generation Path

### Entry Point

**Function:** `DocumentChecklistService.generateChecklist(applicationId, userId)`

**Location:** `apps/backend/src/services/document-checklist.service.ts` (lines 77-279)

**Flow:**

1. Fetches `Application` with related `country`, `visaType`, `user`, `documents`
2. Checks for existing `DocumentChecklist` in DB
3. If not found or invalid, calls `generateChecklistAsync()` in background

### Main Generation Function

**Function:** `generateChecklistAsync(applicationId, userId, application)`

**Location:** `apps/backend/src/services/document-checklist.service.ts` (lines 285-800)

**Key Steps:**

1. **Extract country/visa info** (lines 340-343):

   ```typescript
   const countryCode = application.country.code.toUpperCase(); // e.g., "DE"
   const visaType = application.visaType.name.toLowerCase(); // e.g., "tourist"
   const countryName = application.country.name; // e.g., "Germany"
   ```

2. **DB Lookup for VisaRules** (lines 345-376):

   ```typescript
   const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
   let mode: 'RULES' | 'LEGACY' = approvedRuleSet ? 'RULES' : 'LEGACY';
   ```

3. **Build AI User Context** (line 380):

   ```typescript
   const userContext = await buildAIUserContext(userId, applicationId);
   ```

   - This extracts questionnaire from `User.bio`
   - Builds `AIUserContext` with questionnaire summary

4. **RULES Mode Path** (lines 396-421):
   - Calls `generateChecklistFromRules()` if approved rules exist
   - Falls back to LEGACY if rules mode fails

5. **LEGACY Mode Path** (lines 425-500):
   - Uses `VisaChecklistEngineService` or `AIOpenAIService.generateChecklist()`

### Rules-Based Helper

**Function:** `generateChecklistFromRules(ruleSet, userContext, countryCode, visaType, countryName, application)`

**Location:** `apps/backend/src/services/document-checklist.service.ts` (lines 902-1115)

**What it does:**

1. Extracts embassy URLs from multiple sources (line 935)
2. Builds system prompt with rules + URLs (line 938)
3. Builds user prompt with application context (line 947)
4. Calls GPT-4 with explicit JSON schema
5. Validates and maps response to expected format

### Prompts

**System Prompt:** `buildRulesModeSystemPrompt()`

**Location:** `apps/backend/src/services/document-checklist.service.ts` (lines 1191-1269)

**Current Content:**

- Official visa rules (requiredDocuments, financialRequirements, additionalRequirements)
- Official embassy URLs with cross-check instructions
- Explicit JSON schema with all required fields
- Strict instructions to follow rules only

**User Prompt:** `buildRulesModeUserPrompt()`

**Location:** `apps/backend/src/services/document-checklist.service.ts` (lines 1274-1315)

**Current Content:**

- `APPLICANT CONTEXT: ${JSON.stringify(userContext, null, 2)}`
- Country and visa type
- Conditional documents from rules
- Strict requirements for personalization

**What's Currently Passed to GPT-4:**

- `userContext` (from `buildAIUserContext()`) - contains questionnaire summary
- `ruleSet` - structured visa rules from database
- `embassyUrls` - official embassy/consulate URLs
- Country code, visa type, country name

**Where to Inject Applicant Profile:**

- **Line 1300**: `APPLICANT CONTEXT: ${JSON.stringify(userContext, null, 2)}`
  - Currently passes `AIUserContext` which includes questionnaire summary
  - **Can enhance here** with structured applicant profile object

---

## 3. VisaRules / Embassy URLs

### Prisma Models

**VisaRuleSet:**

- `id`, `countryCode`, `visaType`, `data` (JSON), `version`
- `isApproved` (Boolean) - only approved rules are used
- `sourceId` → links to `EmbassySource`
- `sourceSummary` - e.g., "US Embassy Tashkent, VFS Global"

**Location:** `apps/backend/prisma/schema.prisma` (lines 595-620)

**EmbassySource:**

- `id`, `countryCode`, `visaType`, `url`, `name`
- `isActive` (Boolean)
- `lastFetchedAt`, `lastStatus`, `lastError`
- Links to `VisaRuleSet` via `sourceId`

**Location:** `apps/backend/prisma/schema.prisma` (lines 569-593)

**VisaRuleVersion:**

- Version history of rule sets
- `ruleSetId`, `version`, `data` (JSON snapshot), `changeLog`

**Location:** `apps/backend/prisma/schema.prisma` (lines 622-635)

### Rules Storage Structure

**VisaRuleSetData Interface:**

**Location:** `apps/backend/src/services/visa-rules.service.ts` (lines 15-75)

**Structure:**

```typescript
{
  requiredDocuments: Array<{
    documentType: string; // "passport", "bank_statement", "i20_form"
    category: 'required' | 'highly_recommended' | 'optional';
    description?: string;
    validityRequirements?: string; // "6 months validity remaining"
    formatRequirements?: string; // "Original + 2 copies"
  }>;
  financialRequirements?: {
    minimumBalance?: number;
    currency?: string;
    bankStatementMonths?: number;
    sponsorRequirements?: { allowed: boolean; requiredDocuments?: string[]; };
  };
  additionalRequirements?: {
    travelInsurance?: { required: boolean; minimumCoverage?: number; };
    accommodationProof?: { required: boolean; types?: string[]; };
    returnTicket?: { required: boolean; refundable?: boolean; };
  };
  sourceInfo?: {
    extractedFrom?: string; // URL
    extractedAt?: string; // ISO date
    confidence?: number; // 0-1
  };
}
```

### Official URLs Attachment

**How URLs are stored:**

1. **In ruleSet.sourceInfo.extractedFrom** - URL from extraction
2. **Via VisaRuleSet.sourceId** → `EmbassySource.url` - Related embassy source
3. **From active EmbassySource records** - All active sources for country/visaType

**Extraction Function:** `extractEmbassyUrls()`

**Location:** `apps/backend/src/services/document-checklist.service.ts` (lines 1120-1186)

**Process:**

1. Extracts from `ruleSet.sourceInfo.extractedFrom`
2. Gets URL from `VisaRuleSet.source.url` (via `sourceId` relation)
3. Fetches all active `EmbassySource` records for country/visaType
4. Returns unique array of URLs

### getActiveRuleSet() Function

**Location:** `apps/backend/src/services/visa-rules.service.ts` (lines 84-118)

**How it works:**

1. Queries `VisaRuleSet` with:
   - `countryCode` (uppercase)
   - `visaType` (lowercase)
   - `isApproved: true`
2. Orders by `version: 'desc'` (gets latest)
3. Returns `VisaRuleSetData` (parsed JSON from `data` field)
4. Returns `null` if no approved rules found

---

## 4. DocumentChecklist Model + Mapping

### Prisma Model

**DocumentChecklist:**

- `id`, `applicationId` (unique)
- `status`: "processing" | "ready" | "failed"
- `checklistData`: JSON string with checklist items
- `aiGenerated`: Boolean
- `generatedAt`: DateTime
- `errorMessage`: String (nullable)

**Location:** `apps/backend/prisma/schema.prisma` (lines 517-532)

### Checklist Data Structure

**Stored Format:**

```json
{
  "items": [
    {
      "id": "checklist-item-0",
      "documentType": "passport",
      "name": "Valid Passport",
      "nameUz": "Yaroqli Pasport",
      "nameRu": "Действительный Паспорт",
      "category": "required",
      "required": true,
      "priority": "high",
      "description": "...",
      "descriptionUz": "...",
      "descriptionRu": "...",
      "whereToObtain": "...",
      "whereToObtainUz": "...",
      "whereToObtainRu": "...",
      "status": "missing" | "pending" | "verified" | "rejected",
      "userDocumentId": "...",
      "fileUrl": "...",
      ...
    }
  ],
  "aiGenerated": true,
  "aiFallbackUsed": false,
  "aiErrorOccurred": false
}
```

**Storage Location:** `apps/backend/src/services/document-checklist.service.ts` (lines 704-710, 798-803)

### Mapping from GPT JSON

**GPT Response Format:**

```json
{
  "type": "tourist",
  "country": "Germany",
  "checklist": [
    {
      "document": "passport",
      "name": "Valid Passport",
      "nameUz": "...",
      "nameRu": "...",
      "category": "required",
      "required": true,
      "description": "...",
      "descriptionUz": "...",
      "descriptionRu": "...",
      "priority": "high",
      "whereToObtain": "...",
      "whereToObtainUz": "...",
      "whereToObtainRu": "..."
    }
  ]
}
```

**Mapping Process:**

1. GPT returns JSON with `checklist` array
2. `generateChecklistFromRules()` maps items (lines 1083-1101):
   - Maps `document` → `documentType`
   - Ensures `category` is always present
   - Maps all multilingual fields
3. Items are merged with existing documents (via `mergeChecklistItemsWithDocuments()`)
4. Final items stored in `DocumentChecklist.checklistData` as JSON string

**documentType Determination:**

- From GPT: `item.document` field (e.g., "passport", "bank_statement")
- Normalized to lowercase, trimmed
- Matched against existing `UserDocument.documentType` for status

---

## 5. High-Level Data Flow Summary

### Current Flow

```
1. USER COMPLETES QUESTIONNAIRE
   ↓
   Frontend: 10-step questionnaire (purpose, duration, sponsor, job/student, etc.)
   ↓
   POST /api/applications/ai-generate
   ↓
   AIApplicationService.generateApplicationFromQuestionnaire()
   - Determines country/visaType
   - Creates Application record
   - Stores questionnaire in User.bio (JSON string)
   ↓

2. APPLICATION CREATED
   Application {
     userId → User.bio (questionnaire data)
     countryId → Country.code
     visaTypeId → VisaType.name
   }
   ↓

3. CHECKLIST GENERATION TRIGGERED
   GET /api/document-checklist/:applicationId
   ↓
   DocumentChecklistService.generateChecklist()
   - Fetches Application with country, visaType, user, documents
   - Checks for existing DocumentChecklist
   - If not found: calls generateChecklistAsync() in background
   ↓

4. ASYNC CHECKLIST GENERATION
   generateChecklistAsync()
   - Extracts countryCode, visaType from Application
   - Looks up approved VisaRuleSet (getActiveRuleSet)
   - Determines mode: RULES or LEGACY
   - Builds AIUserContext from User.bio (questionnaire)
   ↓

5. RULES MODE (if approved rules exist)
   generateChecklistFromRules()
   - Extracts embassy URLs
   - Builds system prompt: rules + URLs + schema
   - Builds user prompt: userContext (questionnaire summary) + country/visaType
   - Calls GPT-4 with prompts
   - Validates JSON response
   - Maps to checklist items
   ↓

6. STORAGE
   DocumentChecklist {
     applicationId
     checklistData: JSON.stringify(items)
     status: "ready"
     aiGenerated: true
   }
   ↓

7. RESPONSE
   buildChecklistResponse()
   - Merges checklist items with uploaded documents
   - Returns DocumentChecklist with items array
```

### Where to Construct Applicant Profile

**Location 1: In `buildAIUserContext()`**

**File:** `apps/backend/src/services/ai-context.service.ts` (lines 140-483)

**Current:**

- Extracts questionnaire from `User.bio`
- Builds `AIUserContext` with questionnaire summary
- Includes risk factors, probability score

**Enhancement Point:**

- After line 183: `extractQuestionnaireSummary(application.user.bio)`
- Can build structured `ApplicantProfile` object here
- Include: employment status, sponsor info, property, previous travel, etc.

**Location 2: In `generateChecklistFromRules()`**

**File:** `apps/backend/src/services/document-checklist.service.ts` (line 947)

**Current:**

- Receives `userContext` from `buildAIUserContext()`
- Passes to `buildRulesModeUserPrompt()` as JSON

**Enhancement Point:**

- Can construct richer applicant profile before building prompt
- Use questionnaire data + application metadata
- Format as structured object for GPT-4

### Where to Inject Applicant Profile in Prompt

**Location:** `buildRulesModeUserPrompt()`

**File:** `apps/backend/src/services/document-checklist.service.ts` (lines 1274-1315)

**Current Line 1300:**

```typescript
APPLICANT CONTEXT:
${JSON.stringify(userContext, null, 2)}
```

**Enhancement:**

- Replace or enhance `userContext` with structured `applicantProfile`
- Include:
  - Employment/student status
  - Sponsor information (if applicable)
  - Financial situation
  - Property ownership
  - Previous travel history
  - Family ties
  - Duration of stay
  - Purpose of travel

**Example Structure:**

```typescript
APPLICANT PROFILE:
{
  "employment": {
    "status": "employee",
    "hasStableIncome": true,
    "hasEmploymentLetter": false
  },
  "sponsor": {
    "hasSponsor": true,
    "sponsorType": "family",
    "sponsorDocumentsAvailable": false
  },
  "financial": {
    "situation": "sponsor",
    "hasBankStatement": true,
    "bankStatementMonths": 6
  },
  "ties": {
    "hasProperty": true,
    "hasFamilyInUzbekistan": true,
    "maritalStatus": "married",
    "hasChildren": "one"
  },
  "travel": {
    "previousTravels": true,
    "previousVisas": ["Schengen", "Turkey"],
    "duration": "1_3_months",
    "purpose": "tourism"
  }
}
```

---

## 6. Integration Points Summary

### ✅ What's Already There

1. **Questionnaire Data:** Stored in `User.bio`, extracted via `buildAIUserContext()`
2. **Rules Lookup:** `VisaRulesService.getActiveRuleSet()` finds approved rules
3. **Embassy URLs:** Extracted from multiple sources
4. **Rules Mode:** `generateChecklistFromRules()` uses rules + userContext
5. **User Prompt:** Already includes `APPLICANT CONTEXT` with questionnaire summary

### 🎯 What Needs Enhancement

1. **Applicant Profile Construction:**
   - Build structured profile from questionnaire + application
   - Include all relevant fields (employment, sponsor, property, travel history)
   - Location: In `generateChecklistFromRules()` before building prompt

2. **Enhanced User Prompt:**
   - Replace generic `userContext` JSON with structured `applicantProfile`
   - Add clear instructions for GPT-4 to use profile for personalization
   - Location: `buildRulesModeUserPrompt()` (line 1300)

3. **System Prompt Enhancement:**
   - Add instructions on how to use applicant profile
   - Explain conditional documents based on profile
   - Location: `buildRulesModeSystemPrompt()` (can add section)

### 📍 Exact Code Locations

**For Applicant Profile Construction:**

- `apps/backend/src/services/document-checklist.service.ts`
- Line 398: Inside `generateChecklistFromRules()` call
- Before line 947: Before `buildRulesModeUserPrompt()`

**For Prompt Injection:**

- `apps/backend/src/services/document-checklist.service.ts`
- Line 1300: Replace `APPLICANT CONTEXT: ${JSON.stringify(userContext, null, 2)}`
- Add structured applicant profile with clear formatting

**For Profile Building Helper:**

- Can create new function: `buildApplicantProfileFromQuestionnaire(questionnaireData, application)`
- Location: Same file or `ai-context.service.ts`

---

## 7. Next Steps (When Ready to Implement)

1. **Create `buildApplicantProfile()` helper:**
   - Input: questionnaire data + application metadata
   - Output: Structured applicant profile object
   - Include all relevant fields for personalization

2. **Enhance `generateChecklistFromRules()`:**
   - Build applicant profile before calling prompts
   - Pass profile to `buildRulesModeUserPrompt()`

3. **Update `buildRulesModeUserPrompt()`:**
   - Replace generic userContext with structured applicantProfile
   - Add instructions for GPT-4 to use profile for conditional documents

4. **Test with real questionnaire data:**
   - Verify profile construction
   - Check GPT-4 response includes personalized items
   - Ensure conditional documents (sponsor, property, etc.) appear when applicable

---

**End of Exploration Report**
