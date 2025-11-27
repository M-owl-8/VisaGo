# GPT-4 & Questionnaire System - Complete Investigation Report

**Date:** 2025-01-27  
**Scope:** Complete investigation of GPT-4 usage, questionnaire system, and their integration

---

## EXECUTIVE SUMMARY

This report provides a comprehensive investigation of:

1. **GPT-4/OpenAI Usage** - All AI infrastructure and GPT-4 integration points
2. **Questionnaire System** - Structure, flow, and data storage
3. **Integration Status** - How questionnaire answers connect to GPT-4 checklist generation

**Key Findings:**

- ✅ GPT-4 is **fully implemented** for checklist generation and document validation
- ✅ Questionnaire system is **fully implemented** (10 questions, V2 format)
- ⚠️ **Integration is PARTIAL** - Questionnaire answers ARE used, but categorization (required/highly_recommended/optional) is **NOT fully implemented**
- ⚠️ **Known Issues:** AI sometimes returns <8 items, JSON parsing errors, no explicit categorization

---

## PHASE 1: GPT-4 Usage and AI Infrastructure

### GPT-4 Client & Configuration

**File:** `apps/backend/src/services/ai-openai.service.ts`

**Initialization:**

- **Location:** `AIOpenAIService.initialize(prisma: PrismaClient)`
- **Model:** `gpt-4o-mini` (default, configurable via `OPENAI_MODEL` env var)
- **API Key:** `OPENAI_API_KEY` environment variable (required)
- **Max Tokens:** 2000 (configurable via `OPENAI_MAX_TOKENS`)
- **Timeout:** 30 seconds

**Client Setup:**

```typescript
AIOpenAIService.openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
});
```

**Initialization Flow:**

1. Called in `apps/backend/src/index.ts` during server startup (line 530-535)
2. Checks for `OPENAI_API_KEY` before initializing
3. Logs initialization status and model configuration

---

### GPT-4 Functions and Responsibilities

#### 1. **Checklist Generation** ⭐ PRIMARY FUNCTION

**Function:** `AIOpenAIService.generateChecklist(userContext, country, visaType)`

**File:** `apps/backend/src/services/ai-openai.service.ts` (lines 431-935)

**Purpose:** Generate personalized document checklist based on user questionnaire answers

**Input:**

- `userContext`: `AIUserContext` object containing:
  - `questionnaireSummary`: Full questionnaire data (VisaQuestionnaireSummary)
  - `riskScore`: Calculated visa probability and risk factors
  - `userProfile`: User demographics
  - `application`: Application details
- `country`: Country name (string)
- `visaType`: Visa type name (string)

**Output:**

```typescript
{
  type: string,
  checklist: Array<{
    document: string,
    name: string,
    nameUz: string,
    nameRu: string,
    required: boolean,  // ⚠️ ONLY boolean, no "highly_recommended" category
    description: string,
    descriptionUz: string,
    descriptionRu: string,
    priority: 'high' | 'medium' | 'low',
    whereToObtain: string,
    whereToObtainUz: string,
    whereToObtainRu: string
  }>
}
```

**Key Features:**

- Uses questionnaire summary to extract:
  - Duration, sponsor type, travel history
  - Previous refusals, financial capacity
  - Ties to home country (property, family)
- Incorporates risk factors from `riskScore`
- Country-specific terminology (e.g., LOA for Canada, I-20 for USA)
- Requires 8-15 items (warns if <8, warns if >15)
- Multilingual support (English, Uzbek, Russian)

**Known Issues:**

1. **No explicit categorization:** Only `required: boolean`, no "highly_recommended" or "optional" categories
2. **Item count validation:** Warns if <8 items but doesn't fail (line 780-791)
3. **JSON parsing errors:** Has recovery logic but can still fail (line 699-748)
4. **Log messages:**
   - `[OpenAI][Checklist] Generating checklist` (line 664)
   - `[OpenAI][Checklist] Checklist generated` (line 754)
   - `[OpenAI][Checklist] AI returned too few items, minimum 8 required` (line 781)
   - `Failed to generate AI checklist JSON` (line 744, 747)

**Prompt Structure:**

- **System Prompt:** Detailed instructions for country-specific terminology, document structure, quality requirements
- **User Prompt:** Includes applicant context, risk factors, knowledge base, document guides

---

#### 2. **Document Validation**

**Function:** `validateDocumentWithAI(params)` (in `document-validation.service.ts`)

**File:** `apps/backend/src/services/document-validation.service.ts`

**Purpose:** Validate uploaded documents using GPT-4o-mini

**Model:** `gpt-4o-mini` (same as checklist)

**Input:**

- Document metadata (type, name, file URL)
- Application context (country, visa type)
- Checklist item context (optional)
- User context (optional, built from questionnaire)

**Output:**

```typescript
{
  status: 'verified' | 'rejected' | 'needs_review',
  verifiedByAI: boolean,
  confidence: number (0-1),
  notesUz: string,
  notesRu?: string,
  notesEn?: string
}
```

**Features:**

- Document-specific validation rules (passport, bank statement, acceptance letter, etc.)
- Uses visa knowledge base and document guides
- Country-specific validation (e.g., Canada LOA vs USA I-20)

---

#### 3. **Chat with RAG (Retrieval-Augmented Generation)**

**Function:** `AIOpenAIService.chatWithRAG(messages, userId, applicationId?, systemPrompt?)`

**File:** `apps/backend/src/services/ai-openai.service.ts` (lines 211-300)

**Purpose:** Answer user questions with context from knowledge base

**Features:**

- Searches knowledge base before responding
- Includes RAG sources in response
- Uses same GPT-4o-mini model

---

#### 4. **Direct Chat (without RAG)**

**Function:** `AIOpenAIService.chat(messages, systemPrompt?)`

**File:** `apps/backend/src/services/ai-openai.service.ts` (lines 102-206)

**Purpose:** Direct GPT-4 conversation without knowledge base search

**Used by:**

- Chat service (`chat.service.ts`)
- Form filling service (`form-filling.service.ts`)
- AI application service (for country suggestions)

---

### Endpoints Using GPT-4

#### 1. **POST `/api/applications/ai-generate`**

**File:** `apps/backend/src/routes/applications.ts` (lines 191-306)

**Purpose:** Generate visa application from questionnaire data

**Flow:**

1. Receives `questionnaireData` (V2 or legacy format)
2. Calls `AIApplicationService.generateApplicationFromQuestionnaire()`
3. Creates application in database
4. **Does NOT call GPT-4 checklist generation here** - that happens later

**GPT-4 Usage:** Indirect (via AIApplicationService for country suggestions if needed)

---

#### 2. **POST `/api/applications/:id/generate-checklist`**

**File:** `apps/backend/src/routes/applications.ts` (lines 320-429)

**Purpose:** Generate document checklist for an application

**Flow:**

1. Checks if questionnaire summary exists (via `getQuestionnaireSummary()`)
2. Builds `AIUserContext` (includes questionnaire summary)
3. **Calls `AIOpenAIService.generateChecklist()` directly**
4. Returns checklist JSON

**GPT-4 Usage:** ✅ **DIRECT** - This is the main checklist generation endpoint

**Questionnaire Integration:** ✅ **YES** - Requires questionnaire summary, uses it in context

---

#### 3. **GET `/api/applications/:id/checklist`**

**File:** `apps/backend/src/services/document-checklist.service.ts` (via route handler)

**Purpose:** Get document checklist (generates if not exists)

**Flow:**

1. Checks for stored checklist in database
2. If not exists, triggers async generation via `DocumentChecklistService.generateChecklistAsync()`
3. Async function:
   - Builds `AIUserContext` (includes questionnaire summary)
   - Calls `AIOpenAIService.generateChecklist()`
   - Stores result in database

**GPT-4 Usage:** ✅ **DIRECT** - Via `DocumentChecklistService`

**Questionnaire Integration:** ✅ **YES** - Uses questionnaire summary via `buildAIUserContext()`

---

#### 4. **POST `/api/chat`**

**File:** `apps/backend/src/routes/chat.ts`

**Purpose:** AI chat messages

**GPT-4 Usage:** ✅ **YES** - Uses `AIOpenAIService.chatWithRAG()` or `chat()`

**Questionnaire Integration:** ⚠️ **PARTIAL** - May use application context but not directly questionnaire

---

#### 5. **Document Upload Validation**

**File:** `apps/backend/src/routes/documents.ts` (implied)

**Purpose:** Validate uploaded documents

**GPT-4 Usage:** ✅ **YES** - Uses `validateDocumentWithAI()`

**Questionnaire Integration:** ⚠️ **OPTIONAL** - Tries to build user context but continues without it if fails

---

### Known Issues / Fragile Points

#### 1. **Checklist Item Count Validation**

**Location:** `apps/backend/src/services/ai-openai.service.ts` (lines 775-801)

**Issue:**

- AI sometimes returns <8 items (minimum required)
- Code warns but doesn't fail (line 781)
- `DocumentChecklistService` merges with fallback if <8 items (line 291-342)

**Log Message:**

```
[OpenAI][Checklist] AI returned too few items, minimum 8 required
```

**Impact:** Checklist may be incomplete, requires fallback merge

---

#### 2. **JSON Parsing Errors**

**Location:** `apps/backend/src/services/ai-openai.service.ts` (lines 699-748)

**Issue:**

- AI response may not be valid JSON
- Has recovery logic (tries to extract JSON from markdown, finds largest JSON object)
- Can still fail with error: `Failed to generate AI checklist JSON`

**Recovery Attempts:**

1. Try direct JSON.parse()
2. Extract from markdown code fences (`json ... `)
3. Find largest JSON object in response
4. If all fail, throw error

**Impact:** Checklist generation fails, falls back to basic checklist

---

#### 3. **Missing Categorization**

**Location:** `apps/backend/src/services/ai-openai.service.ts` (line 816)

**Issue:**

- Checklist items only have `required: boolean`
- **NO "highly_recommended" or "optional" categories**
- Only `priority: 'high' | 'medium' | 'low'` exists, but this is not the same as categorization

**Current Schema:**

```typescript
{
  required: boolean,  // Only true/false
  priority: 'high' | 'medium' | 'low'  // Not the same as category
}
```

**Desired Schema:**

```typescript
{
  category: 'required' | 'highly_recommended' | 'optional',
  required: boolean,  // true if category === 'required'
  priority: 'high' | 'medium' | 'low'
}
```

**Impact:** Cannot distinguish between "required", "highly recommended", and "optional" documents

---

#### 4. **Questionnaire Summary Extraction**

**Location:** `apps/backend/src/services/ai-context.service.ts` (lines 82-130)

**Issue:**

- Handles multiple formats (V2, legacy with summary, legacy without summary)
- Legacy format conversion may lose data
- Returns `null` if parsing fails (silent failure)

**Impact:** Checklist generation may proceed without questionnaire data if extraction fails

---

## PHASE 2: Questionnaire System Investigation

### Questionnaire DB Models

**File:** `apps/backend/prisma/schema.prisma`

**User Model Fields:**

```prisma
model User {
  bio               String?   // JSON string containing questionnaire data
  questionnaireCompleted Boolean @default(false)
  // ... other fields
}
```

**Storage:**

- Questionnaire data stored as **JSON string** in `User.bio` field
- `questionnaireCompleted` flag indicates completion status
- **No separate Questionnaire table** - stored in user profile

**Note:** There is an `Application` model, but it's separate from questionnaire storage.

---

### Number and Types of Questions

#### Questionnaire V2 Structure

**File:** `apps/backend/src/types/questionnaire-v2.ts`

**Total Questions:** **10 main sections** (each section may have multiple sub-questions)

**Structure:**

1. **Q0: Travel Purpose & Destination**
   - `visaType`: 'tourist' | 'student'
   - `targetCountry`: 'US' | 'GB' | 'ES' | 'DE' | 'JP' | 'AE' | 'CA' | 'AU'

2. **Q1: Personal & Passport**
   - `ageRange`: 'under_18' | '18_25' | '26_35' | '36_50' | '51_plus'
   - `maritalStatus`: 'single' | 'married' | 'divorced' | 'widowed'
   - `nationality`: 'UZ' | 'other'
   - `passportStatus`: 'valid_6plus_months' | 'valid_less_6_months' | 'no_passport'

3. **Q2: Travel Purpose & Duration**
   - `durationCategory`: 'up_to_30_days' | '31_90_days' | 'more_than_90_days'
   - `plannedWhen`: 'within_3_months' | '3_to_12_months' | 'not_sure'
   - `isExactDatesKnown`: boolean

4. **Q3: Current Status & Education**
   - `currentStatus`: 'student' | 'employed' | 'self_employed' | 'unemployed' | 'business_owner' | 'school_child'
   - `highestEducation`: 'school' | 'college' | 'bachelor' | 'master' | 'phd' | 'other'
   - `isMinor`: boolean

5. **Q4: Financial Situation / Sponsor**
   - `payer`: 'self' | 'parents' | 'other_family' | 'employer' | 'scholarship' | 'other_sponsor'
   - `approxMonthlyIncomeRange`: 'less_500' | '500_1000' | '1000_3000' | '3000_plus' | 'not_applicable'
   - `hasBankStatement`: boolean
   - `hasStableIncome`: boolean

6. **Q5: Invitation / Admission** (branching based on visaType)
   - `hasInvitation`: boolean
   - **For student:** `studentInvitationType`: 'university_acceptance' | 'language_course' | 'exchange_program'
   - **For tourist:** `touristInvitationType`: 'no_invitation' | 'hotel_booking' | 'family_or_friends' | 'tour_agency'

7. **Q6: Accommodation & Tickets**
   - `accommodationType`: 'hotel' | 'host_family' | 'relative' | 'rented_apartment' | 'dormitory' | 'not_decided'
   - `hasRoundTripTicket`: boolean

8. **Q7: Travel History**
   - `hasTraveledBefore`: boolean
   - `regionsVisited`: ('schengen' | 'usa_canada' | 'uk' | 'asia' | 'middle_east')[]
   - `hasVisaRefusals`: boolean

9. **Q8: Ties to Uzbekistan**
   - `hasProperty`: boolean
   - `propertyType`: ('apartment' | 'house' | 'land' | 'business')[]
   - `hasCloseFamilyInUzbekistan`: boolean

10. **Q9: Documents Already Have**
    - `hasEmploymentOrStudyProof`: boolean
    - `hasInsurance`: boolean
    - `hasPassport`: boolean
    - `hasBirthCertificate`: boolean
    - `hasPropertyDocs`: boolean

11. **Q10: Special Conditions**
    - `travelingWithChildren`: boolean
    - `hasMedicalReasonForTrip`: boolean
    - `hasCriminalRecord`: boolean

**Total Field Count:** ~30+ individual fields across 10 sections

**Questionnaire Versions:**

- **V2.0:** Current version (fully multiple-choice, branching)
- **Legacy:** Older format (still supported for backward compatibility)

---

### Web Questionnaire Flow

**File:** `apps/web/app/(dashboard)/questionnaire/page.tsx`

**Flow:**

1. **User Access:**
   - Route: `/questionnaire`
   - Requires authentication (redirects to login if not signed in)

2. **Step-by-Step Flow:**
   - 10 steps (TOTAL_STEPS = 10)
   - Progress bar shows completion percentage
   - Back/Next buttons for navigation
   - Each step renders different form fields

3. **Data Collection:**
   - State managed in React component (`formData` state)
   - Validates required fields before submission
   - Builds complete `QuestionnaireV2` object

4. **Submission:**
   - **Endpoint:** `POST /api/applications/ai-generate`
   - **Payload:**
     ```typescript
     {
       questionnaireData: {
         ...legacyFormat,  // Mapped from V2
         ...questionnaireV2  // Full V2 structure
       }
     }
     ```
   - **Mapping:** Uses `mapQuestionnaireV2ToLegacy()` for backward compatibility

5. **After Submission:**
   - Creates application via AI generation
   - Redirects to `/applications/{applicationId}`
   - Questionnaire data stored in `User.bio` field

**API Client:**

- File: `apps/web/lib/api/client.ts`
- Function: `generateApplicationWithAI(questionnaireData)`
- Sends to: `/applications/ai-generate`

---

### Mobile Questionnaire Flow

**Files:**

- `frontend_new/src/screens/onboarding/QuestionnaireV2Screen.tsx` (current)
- `frontend_new/src/screens/onboarding/QuestionnaireScreenNew.tsx` (alternative)
- `frontend_new/src/screens/onboarding/QuestionnaireScreen.tsx` (legacy)

**Flow:**

- Similar to web: 10-step questionnaire
- Uses React Native components
- Submits to same endpoint: `POST /api/applications/ai-generate`
- Same payload format as web

**Note:** Mobile app uses same API and same payload structure as web app.

---

### API Endpoint(s) for Submitting Answers

#### Primary Endpoint: `POST /api/applications/ai-generate`

**File:** `apps/backend/src/routes/applications.ts` (lines 191-306)

**Request Body:**

```typescript
{
  questionnaireData: {
    // Legacy format (for validation)
    purpose: string,  // 'study' | 'tourism' | 'work' | etc.
    country: string,  // Country ID or code
    duration: string,
    traveledBefore: boolean,
    currentStatus: string,
    hasInvitation: boolean,
    financialSituation: string,
    maritalStatus: string,
    hasChildren: string,
    englishLevel: string,

    // V2 format (full structure)
    version: '2.0',
    visaType: 'tourist' | 'student',
    targetCountry: string,
    personal: { ... },
    travel: { ... },
    status: { ... },
    finance: { ... },
    invitation: { ... },
    stay: { ... },
    history: { ... },
    ties: { ... },
    documents: { ... },
    special: { ... },

    // Optional: pre-computed summary
    summary?: VisaQuestionnaireSummary
  }
}
```

**Response:**

```typescript
{
  success: boolean,
  data: {
    application: {
      id: string,
      country: { name: string, code: string },
      visaType: { name: string },
      // ... other fields
    },
    requiredDocuments: string[],
    aiRecommendations: string
  }
}
```

**Processing:**

1. Validates `questionnaireData.purpose` exists
2. Validates `questionnaireData.country` exists (or suggests one)
3. Calls `AIApplicationService.generateApplicationFromQuestionnaire()`
4. Creates `VisaApplication` in database
5. **Stores questionnaire in `User.bio`** (via user update endpoint, implied)

---

#### Secondary Endpoint: `PUT /api/users/:id` (for storing questionnaire)

**File:** `apps/backend/src/routes/users.ts` (lines 81-162)

**Purpose:** Update user profile, including questionnaire data

**Request Body:**

```typescript
{
  bio: string,  // JSON string of QuestionnaireV2
  questionnaireCompleted: boolean
}
```

**Processing:**

- Validates QuestionnaireV2 structure if `version === '2.0'`
- Builds summary using `buildSummaryFromQuestionnaireV2()`
- Stores both V2 questionnaire and summary in `bio` field

---

### How Answers Are Stored and Structured

#### Storage Format

**Location:** `User.bio` field (JSON string)

**Structure:**

```json
{
  "version": "2.0",
  "visaType": "student",
  "targetCountry": "US",
  "personal": { ... },
  "travel": { ... },
  // ... all 10 sections
  "_hasSummary": true,
  "summary": {
    // VisaQuestionnaireSummary object
    "version": "2.0",
    "visaType": "student",
    "targetCountry": "US",
    "appLanguage": "en",
    "age": 22,
    "citizenship": "UZ",
    // ... all mapped fields
  }
}
```

**Note:** Both the raw V2 questionnaire AND the computed summary are stored for backward compatibility.

---

#### Transformation to AI Context

**File:** `apps/backend/src/services/ai-context.service.ts`

**Function:** `buildAIUserContext(userId, applicationId)`

**Flow:**

1. Fetches application with user data
2. Extracts questionnaire from `user.bio` via `extractQuestionnaireSummary()`
3. If V2 format: uses `buildSummaryFromQuestionnaireV2()` to create `VisaQuestionnaireSummary`
4. Calculates risk score via `calculateVisaProbability()`
5. Builds `AIUserContext`:
   ```typescript
   {
     userProfile: { userId, appLanguage, citizenship, age },
     application: { applicationId, visaType, country, status },
     questionnaireSummary: VisaQuestionnaireSummary,  // ✅ FULL QUESTIONNAIRE DATA
     uploadedDocuments: [...],
     riskScore: { probabilityPercent, level, riskFactors, positiveFactors }
   }
   ```

**This context is then passed to `AIOpenAIService.generateChecklist()`**

---

## PHASE 3: Current Integration Between Questionnaire and GPT-4

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER COMPLETES QUESTIONNAIRE (Web/Mobile)                    │
│    - 10 steps, ~30 fields                                        │
│    - Stores QuestionnaireV2 structure                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. POST /api/applications/ai-generate                           │
│    - Receives questionnaireData (V2 + legacy format)            │
│    - Creates VisaApplication in database                        │
│    - Stores questionnaire in User.bio (JSON string)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. USER REQUESTS CHECKLIST                                       │
│    - GET /api/applications/:id/checklist                        │
│    - OR POST /api/applications/:id/generate-checklist           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. buildAIUserContext(userId, applicationId)                    │
│    - Fetches User.bio (contains questionnaire)                  │
│    - Extracts QuestionnaireV2                                   │
│    - Maps to VisaQuestionnaireSummary                            │
│    - Calculates riskScore                                        │
│    - Returns AIUserContext with questionnaireSummary             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. AIOpenAIService.generateChecklist(userContext, country, type)│
│    - Extracts from userContext.questionnaireSummary:            │
│      • Duration, sponsor type, travel history                   │
│      • Previous refusals, financial capacity                   │
│      • Ties to home country                                     │
│    - Extracts risk factors from userContext.riskScore            │
│    - Builds detailed prompt with all context                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. GPT-4o-mini API Call                                         │
│    - System prompt: Country-specific terminology, structure     │
│    - User prompt: Applicant context + risk factors              │
│    - Response: JSON checklist (8-15 items)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Response Processing                                          │
│    - Parse JSON (with recovery logic)                           │
│    - Validate item count (warn if <8)                           │
│    - Enrich with multilingual fields                            │
│    - Return checklist                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. DocumentChecklistService (if via GET /checklist)             │
│    - Merges AI items with fallback if <8 items                  │
│    - Stores in database                                         │
│    - Returns to user                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### What Is Implemented ✅

1. **Questionnaire Data Collection:**
   - ✅ 10-step questionnaire fully implemented (web + mobile)
   - ✅ V2 format with branching logic
   - ✅ Data stored in `User.bio` field

2. **Questionnaire → GPT-4 Connection:**
   - ✅ Questionnaire data extracted from `User.bio`
   - ✅ Mapped to `VisaQuestionnaireSummary`
   - ✅ Passed to GPT-4 via `AIUserContext`
   - ✅ GPT-4 uses questionnaire data in prompt:
     - Duration, sponsor type, travel history
     - Previous refusals, financial capacity
     - Ties to home country
     - Risk factors

3. **Checklist Generation:**
   - ✅ GPT-4 generates personalized checklist
   - ✅ Uses country-specific terminology
   - ✅ Multilingual support (EN, UZ, RU)
   - ✅ Risk-based document recommendations

4. **Error Handling:**
   - ✅ JSON parsing recovery
   - ✅ Fallback checklist if AI fails
   - ✅ Item count validation (warns if <8)

---

### What Is Missing ❌

1. **Categorization System:**
   - ❌ **NO "highly_recommended" category**
   - ❌ **NO "optional" category**
   - ✅ Only `required: boolean` exists
   - ✅ `priority: 'high' | 'medium' | 'low'` exists but is NOT the same as categorization

2. **Explicit Category Mapping:**
   - Current: `required: true/false`
   - Desired: `category: 'required' | 'highly_recommended' | 'optional'`

3. **Prompt Enhancement:**
   - Current prompt doesn't explicitly ask for categorization
   - Should instruct GPT-4 to categorize each item

4. **Response Schema:**
   - Current schema doesn't include category field
   - Need to add `category` field to checklist item type

---

### Obvious Refactors Needed

1. **Add Category Field to Checklist Schema:**

   ```typescript
   {
     document: string,
     name: string,
     category: 'required' | 'highly_recommended' | 'optional',  // NEW
     required: boolean,  // true if category === 'required'
     priority: 'high' | 'medium' | 'low',
     // ... other fields
   }
   ```

2. **Update GPT-4 Prompt:**
   - Add explicit instruction to categorize documents
   - Provide examples of each category
   - Clarify difference between `priority` and `category`

3. **Update Response Parsing:**
   - Validate `category` field exists
   - Set `required: true` if `category === 'required'`
   - Handle backward compatibility (if category missing, infer from required)

4. **Update Frontend Display:**
   - Show category badges (Required, Highly Recommended, Optional)
   - Filter/sort by category
   - Visual distinction between categories

---

## PHASE 4: Final Comprehensive Report

### GPT-4-Related Files, Functions, and Endpoints

#### Core Service Files

1. **`apps/backend/src/services/ai-openai.service.ts`**
   - `AIOpenAIService` class
   - `initialize()` - Initialize OpenAI client
   - `chat()` - Direct chat without RAG
   - `chatWithRAG()` - Chat with knowledge base search
   - `generateChecklist()` - ⭐ **PRIMARY: Generate document checklist**
   - `generateEmbedding()` - Generate embeddings for vector search
   - `trackUsage()` - Track AI usage metrics

2. **`apps/backend/src/services/document-checklist.service.ts`**
   - `DocumentChecklistService.generateChecklist()` - Main checklist endpoint
   - `DocumentChecklistService.generateChecklistAsync()` - Async generation
   - `DocumentChecklistService.recalculateDocumentProgress()` - Recalculate progress
   - Uses `AIOpenAIService.generateChecklist()` internally

3. **`apps/backend/src/services/document-validation.service.ts`**
   - `validateDocumentWithAI()` - Validate uploaded documents
   - Uses GPT-4o-mini for document validation

4. **`apps/backend/src/services/ai-context.service.ts`**
   - `buildAIUserContext()` - Build context from questionnaire
   - `getQuestionnaireSummary()` - Extract questionnaire from user bio
   - `calculateVisaProbability()` - Calculate risk score

5. **`apps/backend/src/services/ai-application.service.ts`**
   - `generateApplicationFromQuestionnaire()` - Create application from questionnaire
   - Uses GPT-4 for country suggestions (if country not specified)

---

#### API Endpoints

1. **`POST /api/applications/ai-generate`**
   - **File:** `apps/backend/src/routes/applications.ts:191`
   - **Purpose:** Generate application from questionnaire
   - **GPT-4 Usage:** Indirect (for country suggestions)

2. **`POST /api/applications/:id/generate-checklist`**
   - **File:** `apps/backend/src/routes/applications.ts:320`
   - **Purpose:** Generate checklist for application
   - **GPT-4 Usage:** ✅ **DIRECT** - Calls `AIOpenAIService.generateChecklist()`
   - **Questionnaire:** ✅ **YES** - Requires questionnaire summary

3. **`GET /api/applications/:id/checklist`**
   - **File:** `apps/backend/src/services/document-checklist.service.ts:73`
   - **Purpose:** Get checklist (generates if not exists)
   - **GPT-4 Usage:** ✅ **DIRECT** - Via `DocumentChecklistService`
   - **Questionnaire:** ✅ **YES** - Uses questionnaire summary

4. **`POST /api/chat`**
   - **File:** `apps/backend/src/routes/chat.ts`
   - **Purpose:** AI chat messages
   - **GPT-4 Usage:** ✅ **YES** - Uses `AIOpenAIService.chatWithRAG()`

5. **`POST /api/applications/:id/visa-probability`**
   - **File:** `apps/backend/src/routes/applications.ts:436`
   - **Purpose:** Calculate visa probability
   - **GPT-4 Usage:** ⚠️ **EXTERNAL** - Calls AI service (separate Python service)

---

### Questionnaire System Summary

#### Structure

- **Version:** 2.0 (current)
- **Total Steps:** 10 main sections
- **Total Fields:** ~30+ individual fields
- **Format:** Fully multiple-choice with branching logic
- **Storage:** JSON string in `User.bio` field

#### Questions Breakdown

1. **Travel Purpose & Destination** (Q0)
2. **Personal & Passport** (Q1) - 4 fields
3. **Travel Purpose & Duration** (Q2) - 3 fields
4. **Current Status & Education** (Q3) - 3 fields
5. **Financial Situation** (Q4) - 4 fields
6. **Invitation / Admission** (Q5) - 2-3 fields (branching)
7. **Accommodation & Tickets** (Q6) - 2 fields
8. **Travel History** (Q7) - 3 fields
9. **Ties to Uzbekistan** (Q8) - 3 fields
10. **Documents Already Have** (Q9) - 5 fields
11. **Special Conditions** (Q10) - 3 fields

#### Flow

1. **Web:** `/questionnaire` page → 10 steps → Submit → `POST /api/applications/ai-generate`
2. **Mobile:** `QuestionnaireV2Screen` → 10 steps → Submit → `POST /api/applications/ai-generate`
3. **Backend:** Stores in `User.bio`, creates application, ready for checklist generation

#### Data Processing

- **Mapper:** `questionnaire-v2-mapper.ts` - Converts V2 to `VisaQuestionnaireSummary`
- **Extractor:** `ai-context.service.ts` - Extracts from `User.bio`
- **Usage:** Passed to GPT-4 via `AIUserContext.questionnaireSummary`

---

### GPT-4 Implementation Status

#### Checklist Generation: ✅ **FULLY IMPLEMENTED**

- ✅ Uses questionnaire data
- ✅ Uses risk factors
- ✅ Country-specific terminology
- ✅ Multilingual support
- ⚠️ **Missing:** Categorization (required/highly_recommended/optional)

#### Document Validation: ✅ **FULLY IMPLEMENTED**

- ✅ Uses GPT-4o-mini
- ✅ Document-specific rules
- ✅ Country-specific validation
- ⚠️ Optional questionnaire context (tries but continues without it)

#### Chat: ✅ **FULLY IMPLEMENTED**

- ✅ RAG support
- ✅ Knowledge base search
- ⚠️ Questionnaire context used indirectly (via application context)

---

### Main Gaps Between Current and Desired Behavior

#### Desired Behavior

> "After receiving answers to the questionnaire, GPT-4 must analyze them and return a full, reliable, detailed document list categorized into required, highly recommended, and optional."

#### Current Implementation

✅ **What Works:**

- Questionnaire answers ARE received and stored
- GPT-4 DOES analyze questionnaire answers
- GPT-4 DOES return detailed document list
- List IS personalized based on answers

❌ **What's Missing:**

- **NO explicit categorization** into "required", "highly_recommended", "optional"
- Only `required: boolean` exists (true/false)
- `priority` field exists but is NOT the same as category
- Prompt doesn't explicitly ask for categorization

#### Gap Analysis

| Feature                  | Desired         | Current        | Status                       |
| ------------------------ | --------------- | -------------- | ---------------------------- |
| Questionnaire collection | ✅              | ✅             | ✅ Complete                  |
| Questionnaire → GPT-4    | ✅              | ✅             | ✅ Complete                  |
| GPT-4 analysis           | ✅              | ✅             | ✅ Complete                  |
| Detailed document list   | ✅              | ✅             | ✅ Complete                  |
| **Categorization**       | ✅ **Required** | ❌ **Missing** | ❌ **GAP**                   |
| Reliability (8-15 items) | ✅              | ⚠️ Partial     | ⚠️ Warns but doesn't enforce |

---

### Recommendations

1. **Add Category Field:**
   - Update checklist item schema to include `category: 'required' | 'highly_recommended' | 'optional'`
   - Update GPT-4 prompt to explicitly request categorization
   - Update response parsing to validate category

2. **Enhance Prompt:**
   - Add examples of each category
   - Clarify difference between `priority` and `category`
   - Provide guidelines for categorization

3. **Improve Reliability:**
   - Enforce minimum 8 items (fail if <8, don't just warn)
   - Better JSON parsing recovery
   - More robust error handling

4. **Frontend Updates:**
   - Display category badges
   - Filter/sort by category
   - Visual distinction between categories

---

## Conclusion

The GPT-4 and questionnaire integration is **largely complete**, with questionnaire answers being **fully used** in checklist generation. However, the **categorization system** (required/highly_recommended/optional) is **missing** and needs to be implemented to meet the desired behavior.

**Priority Fix:** Add categorization field and update GPT-4 prompt to explicitly categorize documents.

---

**Report Generated:** 2025-01-27  
**Investigation Scope:** Complete codebase analysis  
**Files Analyzed:** 20+ core files across backend, web, and mobile
