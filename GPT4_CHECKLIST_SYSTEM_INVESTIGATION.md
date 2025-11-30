# GPT-4 Document Checklist System - Complete Investigation Report

**Date:** 2025-01-27  
**Scope:** Full investigation of GPT-4-based document checklist generation system  
**Status:** READ-ONLY INVESTIGATION (No code modifications)

---

## EXECUTIVE SUMMARY

This report provides a comprehensive investigation of the GPT-4-based document checklist generation system in the Ketdik/VisaBuddy project. The system uses GPT-4 to generate personalized document checklists for visa applications based on questionnaire data, user context, and a knowledge base.

**Key Findings:**
- ✅ GPT-4 checklist generation is **fully implemented** in backend (Node/Express)
- ✅ System uses **direct OpenAI API calls** (not the separate AI service for checklists)
- ✅ Questionnaire V2 (10-step) data is **extracted and used** for personalization
- ✅ **RAG/knowledge base** is available but **NOT used for checklist generation** (only for chat)
- ⚠️ **Output validation** exists but GPT-4 can still hallucinate document requirements
- ⚠️ **Fallback system** is robust with country-specific templates

---

## STAGE 1: ALL GPT-4 / CHECKLIST RELATED CODE FILES

### Backend Files (Node/Express + Prisma)

1. **`apps/backend/src/services/ai-openai.service.ts`** (1,283 lines)
   - **Purpose:** Direct OpenAI GPT-4 API wrapper for checklist generation
   - **Key Function:** `generateChecklist(userContext, country, visaType)`
   - **Model:** `gpt-4o-mini` (configurable via `OPENAI_MODEL` env var)
   - **Features:**
     - Builds comprehensive system + user prompts with questionnaire context
     - Uses `response_format: { type: 'json_object' }` for structured output
     - Implements retry logic with stricter instructions on failure
     - Validates JSON response and auto-corrects issues
     - Falls back to country-specific templates if validation fails

2. **`apps/backend/src/services/document-checklist.service.ts`** (1,501 lines)
   - **Purpose:** Orchestrates checklist generation, storage, and retrieval
   - **Key Functions:**
     - `generateChecklist(applicationId, userId)` - Main entry point
     - `generateChecklistAsync()` - Background AI generation
     - `generateRobustFallbackChecklist()` - Fallback when AI fails
   - **Features:**
     - One-time generation (stores in DB, avoids re-calling OpenAI)
     - Status tracking: `pending` → `ready` → `failed`
     - Merges AI-generated items with uploaded documents
     - Applies country-specific terminology corrections

3. **`apps/backend/src/routes/document-checklist.ts`** (187 lines)
   - **Purpose:** Express routes for checklist API endpoints
   - **Endpoints:**
     - `GET /api/document-checklist/:applicationId` - Get or generate checklist
     - `PUT /api/document-checklist/:applicationId/items/:itemId` - Update item status
   - **Features:**
     - Returns `{ status: 'processing' }` if generation in progress
     - Handles both checklist objects and status responses

4. **`apps/backend/src/services/ai-context.service.ts`** (314 lines)
   - **Purpose:** Builds `AIUserContext` from questionnaire and application data
   - **Key Function:** `buildAIUserContext(userId, applicationId)`
   - **Extracts:**
     - Questionnaire summary from `User.bio` (supports V2 and legacy formats)
     - Risk score calculation (`calculateVisaProbability()`)
     - Application details (country, visa type, documents)
   - **Output:** `AIUserContext` object with questionnaire, risk, and profile data

5. **`apps/backend/src/utils/json-validator.ts`** (425 lines)
   - **Purpose:** Validates and corrects GPT-4 JSON responses
   - **Key Functions:**
     - `parseAndValidateChecklistResponse()` - Main validator with retry logic
     - `validateChecklistResponse()` - Checks structure, categories, translations
     - `autoCorrectChecklist()` - Fixes missing categories, priorities
   - **Validation Rules:**
     - Minimum 10 items, maximum 16 items
     - All three categories must be present: `required`, `highly_recommended`, `optional`
     - All items must have UZ and RU translations
     - Country-specific terminology checks (I-20 for USA, LOA for Canada, etc.)

6. **`apps/backend/src/data/visaKnowledgeBase.ts`** (1,500+ lines)
   - **Purpose:** Static visa knowledge base for 8 countries
   - **Countries Covered:** USA, Canada, UK, Australia, Germany, Spain, Japan, UAE
   - **Visa Types:** `tourist`, `student`
   - **Sections:** eligibility, documents, finance, application_process, refusal_reasons
   - **Usage:** Injected into GPT-4 prompt as context (not RAG)

7. **`apps/backend/src/data/fallback-checklists.ts`** (3,200+ lines)
   - **Purpose:** Emergency fallback checklists when AI fails
   - **Structure:** Country-specific templates with full multilingual support
   - **Coverage:** All 8 countries × 2 visa types = 16 templates
   - **Format:** Categorized items (`required`, `highly_recommended`, `optional`)

8. **`apps/backend/src/utils/checklist-helpers.ts`**
   - **Purpose:** Helper functions for category inference and priority normalization
   - **Functions:**
     - `inferCategory(item)` - Derives category from `required` and `priority`
     - `normalizePriority()` - Ensures valid priority values
     - `ensureCategoryConsistency()` - Validates category/required/priority alignment

### AI Service Files (FastAPI + Python) - **NOT USED FOR CHECKLISTS**

**Note:** The Python AI service (`apps/ai-service/`) has checklist generation code, but the backend **does NOT call it**. The backend uses direct OpenAI API calls instead.

9. **`apps/ai-service/services/checklist.py`** (525 lines)
   - **Purpose:** Python service for checklist generation (unused by backend)
   - **Endpoint:** Would be called via `POST /api/checklist/generate`
   - **Status:** Implemented but not integrated with backend checklist flow

10. **`apps/ai-service/main.py`** (618 lines)
    - **Purpose:** FastAPI app with checklist endpoint
    - **Status:** Endpoint exists but backend doesn't use it

### Supporting Files

11. **`apps/backend/src/types/ai-context.ts`**
    - **Purpose:** TypeScript interfaces for `AIUserContext` and `VisaQuestionnaireSummary`

12. **`apps/backend/src/services/questionnaire-v2-mapper.ts`**
    - **Purpose:** Maps QuestionnaireV2 to `VisaQuestionnaireSummary` format

---

## STAGE 2: QUESTIONNAIRE AND USER CONTEXT

### Questionnaire V2 Structure

**Location:** Stored in `User.bio` field as JSON string

**Total Steps:** 10 main sections (each may have sub-questions)

**Sections:**
1. **Q0: Travel Purpose & Destination**
   - `visaType`: 'tourist' | 'student'
   - `targetCountry`: 'US' | 'GB' | 'ES' | 'DE' | 'JP' | 'AE' | 'CA' | 'AU'

2. **Q1: Personal & Passport**
   - Age range, passport validity, citizenship

3. **Q2: Travel Information**
   - Duration, travel dates, purpose details

4. **Q3: Financial Information**
   - Self-funded vs sponsored, bank balance, income proof

5. **Q4: Invitation/Sponsor**
   - Sponsor relationship, invitation letter details

6. **Q5: Travel History**
   - Previous international travel, visa refusals, overstays

7. **Q6: Ties to Home Country**
   - Property ownership, family ties, employment

8. **Q7: Documents Already Obtained**
   - Pre-existing documents status

9. **Q8: Special Circumstances**
   - Medical conditions, criminal history, etc.

10. **Q9: Additional Information**
    - Any other relevant details

### Storage Format

**Database Field:** `User.bio` (JSON string)

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
    "duration": "more_than_6_months",
    "sponsorType": "self",
    "bankBalanceUSD": 15000,
    "hasTravelHistory": true,
    "hasPropertyInUzbekistan": true,
    // ... all mapped fields
  }
}
```

### Transformation to AI Context

**Function:** `buildAIUserContext(userId, applicationId)` in `ai-context.service.ts`

**Flow:**
1. Fetches `VisaApplication` with related `User`, `Country`, `VisaType`, `Documents`
2. Extracts questionnaire from `user.bio` via `extractQuestionnaireSummary()`
3. If V2 format: uses `buildSummaryFromQuestionnaireV2()` to create `VisaQuestionnaireSummary`
4. Calculates risk score via `calculateVisaProbability(summary)`
5. Builds `AIUserContext` object:
   ```typescript
   {
     userProfile: { userId, appLanguage, citizenship, age },
     application: { applicationId, visaType, country, status },
     questionnaireSummary: VisaQuestionnaireSummary,
     uploadedDocuments: [...],
     riskScore: {
       probabilityPercent: number,
       level: 'low' | 'medium' | 'high',
       riskFactors: string[],
       positiveFactors: string[]
     }
   }
   ```

### What GPT-4 Receives

**Exact Fields Passed to GPT-4:**

1. **From Questionnaire Summary:**
   - `visaType`: 'student' | 'tourist'
   - `targetCountry`: Country code (US, CA, GB, etc.)
   - `duration`: Travel duration category
   - `sponsorType`: 'self' | 'parent' | 'sponsor' | etc.
   - `bankBalanceUSD`: Financial capacity
   - `hasTravelHistory`: boolean
   - `previousVisaRejections`: boolean
   - `hasPropertyInUzbekistan`: boolean
   - `hasFamilyInUzbekistan`: boolean
   - `age`: number
   - `citizenship`: 'UZ' (default)

2. **From Risk Score:**
   - `probabilityPercent`: 0-100
   - `level`: 'low' | 'medium' | 'high'
   - `riskFactors`: Array of risk factor strings
   - `positiveFactors`: Array of positive factor strings

3. **From Application:**
   - `country`: Country name (e.g., "United States")
   - `visaType`: Visa type name (e.g., "Student Visa")

4. **From Knowledge Base:**
   - Static visa requirements text for country/visa type
   - Document guides (Uzbekistan-specific)

5. **From User Profile:**
   - `homeCountry`: 'Uzbekistan' (default)
   - `citizenship`: 'UZ' (default)
   - `isUzbekCitizen`: true (default)
   - `appLanguage`: 'en' | 'ru' | 'uz'

**Summary:** GPT-4 receives comprehensive user context including questionnaire answers, risk assessment, country/visa type, and static knowledge base text. It does **NOT** receive RAG-retrieved chunks (RAG is only used for chat, not checklists).

---

## STAGE 3: END-TO-END CHECKLIST GENERATION FLOW

### Sequence Diagram

```
User → Web/Mobile App
  ↓
GET /api/document-checklist/:applicationId
  ↓
Backend: document-checklist.service.ts::generateChecklist()
  ↓
Check DB: DocumentChecklist.status
  ├─ If 'ready' → Return stored checklist (NO AI CALL)
  ├─ If 'pending' → Return { status: 'processing' }
  └─ If missing/failed → Create entry with status 'pending'
      ↓
      Trigger async: generateChecklistAsync()
        ↓
        Build AIUserContext: buildAIUserContext(userId, applicationId)
          ├─ Fetch application + user + documents
          ├─ Extract questionnaire from User.bio
          ├─ Calculate risk score
          └─ Build AIUserContext object
        ↓
        Call OpenAI: AIOpenAIService.generateChecklist(userContext, country, visaType)
          ├─ Load visaKnowledgeBase for country/visaType
          ├─ Build system prompt (600+ lines of instructions)
          ├─ Build user prompt with questionnaire context
          ├─ Call OpenAI API:
          │   - model: 'gpt-4o-mini'
          │   - temperature: 0.5
          │   - max_completion_tokens: 2000
          │   - response_format: { type: 'json_object' }
          └─ Parse and validate response
        ↓
        Validate Response: json-validator.ts::parseAndValidateChecklistResponse()
          ├─ Extract JSON from response (handles markdown wrapping)
          ├─ Validate structure (10-16 items, 3 categories, translations)
          ├─ Check country-specific terminology
          └─ Auto-correct issues or retry with stricter instructions
        ↓
        If validation fails → Use fallback: getFallbackChecklist(countryCode, visaType)
        ↓
        Merge with uploaded documents: mergeChecklistItemsWithDocuments()
        ↓
        Apply country terminology: applyCountryTerminology() (I-20 vs LOA, etc.)
        ↓
        Store in DB: DocumentChecklist
          - status: 'ready'
          - checklistData: JSON.stringify({ items, aiGenerated, aiFallbackUsed })
          - aiGenerated: boolean
        ↓
        Return checklist to user
```

### Detailed Flow Steps

#### Step 1: User Requests Checklist

**Endpoint:** `GET /api/document-checklist/:applicationId`

**Route Handler:** `apps/backend/src/routes/document-checklist.ts::GET /:applicationId`

**Service Call:** `DocumentChecklistService.generateChecklist(applicationId, userId)`

#### Step 2: Check Existing Checklist

**Location:** `document-checklist.service.ts::generateChecklist()`

**Logic:**
- Query `DocumentChecklist` table by `applicationId`
- If `status === 'ready'` and `checklistData` exists:
  - Parse JSON and return immediately (NO AI CALL)
- If `status === 'pending'`:
  - Return `{ status: 'processing' }`
- If `status === 'failed'`:
  - Generate fallback on-the-fly and return
- If no entry exists:
  - Create entry with `status: 'pending'`
  - Trigger async generation (don't await)
  - Return `{ status: 'processing' }`

#### Step 3: Build User Context

**Location:** `ai-context.service.ts::buildAIUserContext()`

**Process:**
1. Fetch `VisaApplication` with includes:
   - `country`, `visaType`, `user`, `documents`
2. Extract questionnaire from `user.bio`:
   - Parse JSON
   - If V2 format: use `buildSummaryFromQuestionnaireV2()`
   - If legacy with summary: use `summary` field
   - If legacy without summary: return `null`
3. Calculate risk score:
   - `calculateVisaProbability(questionnaireSummary)`
   - Rule-based scoring (bank balance, refusals, ties, etc.)
4. Build `AIUserContext`:
   ```typescript
   {
     userProfile: { userId, appLanguage, citizenship, age },
     application: { applicationId, visaType, country, status },
     questionnaireSummary: VisaQuestionnaireSummary,
     uploadedDocuments: [...],
     riskScore: { probabilityPercent, level, riskFactors, positiveFactors }
   }
   ```

#### Step 4: Call GPT-4

**Location:** `ai-openai.service.ts::generateChecklist()`

**Prompt Building:**

**System Prompt** (600+ lines):
- Instructions for 3-category checklist (required, highly_recommended, optional)
- Country-specific terminology rules (I-20 for USA, LOA for Canada, etc.)
- Uzbekistan context assumptions
- Output format requirements (JSON schema)
- Anti-hallucination instructions ("NO fake documents", "NO fake embassies")
- Category logic and risk influence rules

**User Prompt:**
- Country and visa type
- Questionnaire summary (duration, sponsor, travel history, finances, ties)
- Risk factors array
- Visa knowledge base text (static, not RAG)
- Document guides text
- Instructions: "Generate 10-16 items, all 3 categories, complete translations"

**API Call:**
```typescript
await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.5,
  max_completion_tokens: 2000,
  response_format: { type: 'json_object' }
})
```

#### Step 5: Validate Response

**Location:** `json-validator.ts::parseAndValidateChecklistResponse()`

**Validation Steps:**
1. Extract JSON from response (handles markdown code blocks)
2. Parse JSON
3. Validate structure:
   - `checklist` array exists
   - Item count: 10-16 (errors if <10, warnings if >16)
   - All items have `document`, `name`, `category`
   - All three categories present: `required`, `highly_recommended`, `optional`
   - Category/required/priority consistency
   - All items have UZ and RU translations
   - Country-specific terminology present (I-20 for USA, LOA for Canada, etc.)
4. If validation fails:
   - Retry with stricter instructions (1 retry attempt)
   - If retry fails: use fallback checklist

#### Step 6: Store and Return

**Location:** `document-checklist.service.ts::generateChecklistAsync()`

**Storage:**
```typescript
await prisma.documentChecklist.update({
  where: { applicationId },
  data: {
    status: 'ready',
    checklistData: JSON.stringify({
      items: sanitizedItems,
      aiGenerated: boolean,
      aiFallbackUsed: boolean,
      aiErrorOccurred: boolean
    }),
    aiGenerated: boolean,
    generatedAt: new Date()
  }
})
```

**Response Format:**
```typescript
{
  applicationId: string,
  items: ChecklistItem[],
  summary: { total, uploaded, verified, missing, rejected },
  progress: number, // 0-100
  aiFallbackUsed: boolean,
  aiErrorOccurred: boolean
}
```

---

## STAGE 4: GPT-4 PROMPTS AND OUTPUT FORMAT

### System Prompt Structure

**Location:** `ai-openai.service.ts::generateChecklist()` (lines 466-649)

**Key Sections:**

1. **Role Definition:**
   - "You are a STRICT visa document checklist generator specialized for Uzbek applicants"

2. **Task Definition:**
   - Generate 3-category checklist (required, highly_recommended, optional)
   - 8-15 total documents (later changed to 10-16)
   - All three categories must be present
   - Each item must have complete multilingual fields

3. **General Rules:**
   - NO hallucinations
   - NO fake document names
   - NO fake embassies
   - Uzbekistan context always assumed
   - Documents issued in Uzbekistan

4. **Category Logic:**
   - **REQUIRED:** Must-have documents for embassy acceptance
   - **HIGHLY_RECOMMENDED:** Strongly improves approval chances
   - **OPTIONAL:** Nice-to-have supporting evidence

5. **Risk Influence:**
   - High risk → Add more documents to highly_recommended
   - Low risk → Minimize optional items

6. **Country Specialization:**
   - USA (student): I-20, SEVIS fee
   - Canada: LOA from DLI, GIC
   - UK: CAS (students), 28-day bank statement rule
   - Schengen: €30,000 insurance coverage
   - Australia: OSHC, GTE documents

7. **Terminology Rules (STRICTLY ENFORCED):**
   - Canada: "Letter of Acceptance (LOA) from a Designated Learning Institution (DLI)"
   - USA: "Form I-20" (F-1) or "DS-2019" (J-1)
   - NEVER mention I-20 for Canada
   - NEVER mention LOA for USA

8. **Output Format:**
   - Valid JSON only
   - Exact schema provided
   - No markdown, no extra text

### User Prompt Structure

**Location:** `ai-openai.service.ts::generateChecklist()` (lines 779-811)

**Content:**
- Key applicant information (country, visa type, duration, sponsor, travel history, refusals, finances)
- Risk factors array
- Visa knowledge base text (static)
- Document guides text
- Critical reminders (10-16 items, 3 categories, country terminology, translations)

### GPT-4 API Parameters

**Model:** `gpt-4o-mini` (configurable via `OPENAI_MODEL` env var)

**Parameters:**
- `temperature`: 0.5 (increased from 0.1 for more creative but controlled responses)
- `max_completion_tokens`: 2000 (increased from 1200 to allow 8-15 items with full multilingual fields)
- `response_format`: `{ type: 'json_object' }` (enforces JSON output)

**Retry Parameters (if first attempt fails):**
- `temperature`: 0.3 (lower for more consistent output)
- Same other parameters

### Expected Output Format

**JSON Schema:**
```typescript
{
  type: string, // visa type
  country?: string, // country name
  checklist: Array<{
    document: string, // internal key (e.g., "passport", "i20_form")
    name: string, // English name (2-5 words)
    nameUz: string, // Uzbek translation
    nameRu: string, // Russian translation
    category: 'required' | 'highly_recommended' | 'optional',
    required: boolean, // true only if category === 'required'
    priority: 'high' | 'medium' | 'low',
    description: string, // 1-2 sentences in English
    descriptionUz: string, // Uzbek translation
    descriptionRu: string, // Russian translation
    whereToObtain: string, // English instructions for Uzbekistan
    whereToObtainUz: string, // Uzbek translation
    whereToObtainRu: string // Russian translation
  }>
}
```

### Validation and Guardrails

**Location:** `json-validator.ts`

**Validation Rules:**
1. **Structure:**
   - Must be valid JSON object
   - Must have `checklist` array
   - Each item must have `document`, `name`, `category`

2. **Item Count:**
   - Minimum: 10 items (error if <10)
   - Maximum: 16 items (warning if >16)

3. **Categories:**
   - All three categories must be present: `required`, `highly_recommended`, `optional`
   - Each item must have exactly one category
   - `required` boolean must match category (required=true only if category='required')

4. **Translations:**
   - All items must have `nameUz`, `nameRu`
   - All items must have `descriptionUz`, `descriptionRu`
   - All items must have `whereToObtainUz`, `whereToObtainRu`
   - Warnings if missing (auto-translation attempted)

5. **Country-Specific Terminology:**
   - USA (student): Must mention "I-20" or "SEVIS"
   - Canada (student): Must mention "LOA" or "DLI"
   - UK (student): Must mention "CAS"
   - Australia (student): Must mention "OSHC" or "COE"
   - Schengen: Must mention "€30,000" or "30000" for insurance

**Auto-Correction:**
- Missing categories → inferred from `required` and `priority`
- Missing priorities → set based on category
- Category/required mismatch → corrected to be consistent

**Retry Logic:**
- If validation fails: retry once with stricter instructions
- If retry fails: use fallback checklist from `fallback-checklists.ts`

### Fallback Behavior

**Location:** `document-checklist.service.ts::generateRobustFallbackChecklist()`

**Trigger Conditions:**
1. OpenAI API error (timeout, rate limit, etc.)
2. Invalid JSON response
3. Validation failures after retry
4. Too few items (<10)
5. Empty checklist array

**Fallback Source:** `apps/backend/src/data/fallback-checklists.ts`

**Fallback Structure:**
- Country-specific templates for all 8 countries × 2 visa types
- Pre-categorized items (required, highly_recommended, optional)
- Full multilingual support (EN, UZ, RU)
- Realistic "whereToObtain" instructions for Uzbekistan

**Fallback Items (Example - USA Student):**
- Passport (required)
- Passport Photo (required)
- Form I-20 (required)
- SEVIS Fee Receipt (required)
- DS-160 Confirmation (required)
- Bank Statement (required)
- Acceptance Letter (highly_recommended)
- Academic Transcripts (highly_recommended)
- ... (7-10 items total)

### Strength of Guardrails

**Assessment:**

**Strong Points:**
- ✅ JSON schema enforcement via `response_format: { type: 'json_object' }`
- ✅ Comprehensive validation (structure, count, categories, translations)
- ✅ Retry logic with stricter instructions
- ✅ Auto-correction for minor issues
- ✅ Robust fallback system (never returns empty checklist)
- ✅ Country-specific terminology validation

**Weak Points:**
- ⚠️ GPT-4 can still hallucinate document requirements not in knowledge base
- ⚠️ No explicit hard-coded rules for MUST-have documents (relies on GPT-4)
- ⚠️ Validation happens AFTER generation (can't prevent hallucinations)
- ⚠️ Knowledge base is static text (not RAG), may be outdated
- ⚠️ No verification against official embassy requirements

**Hallucination Risk:**
- **Medium-High:** GPT-4 has freedom to decide which documents to include
- System relies on prompt instructions ("NO hallucinations") but no enforcement
- Fallback only triggers on validation failures, not on incorrect content
- No cross-reference with official embassy websites

---

## STAGE 5: VISA KNOWLEDGE BASE AND COVERAGE

### Knowledge Base Location

**File:** `apps/backend/src/data/visaKnowledgeBase.ts`

**Type:** Static TypeScript file (not database, not RAG)

**Structure:**
```typescript
type VisaKbEntry = {
  country: string,
  visaType: 'tourist' | 'student',
  section: 'eligibility' | 'documents' | 'finance' | 'application_process' | 'refusal_reasons',
  content: string
}
```

### Countries and Visa Types Covered

**Countries (8 total):**
1. **United States (USA)**
   - Tourist visa
   - Student visa (F-1)

2. **Canada**
   - Tourist visa
   - Student visa (Study Permit)

3. **United Kingdom (UK)**
   - Tourist visa
   - Student visa

4. **Australia**
   - Tourist visa
   - Student visa

5. **Germany**
   - Tourist visa (Schengen)
   - Student visa

6. **Spain**
   - Tourist visa (Schengen)
   - Student visa

7. **Japan**
   - Tourist visa
   - Student visa

8. **United Arab Emirates (UAE)**
   - Tourist visa
   - Student visa

**Total Coverage:** 8 countries × 2 visa types = 16 combinations

**Sections per Combination:** 5 sections (eligibility, documents, finance, application_process, refusal_reasons)

**Total KB Entries:** ~80 entries (16 combinations × 5 sections)

### Knowledge Base Content

**Format:** Plain text strings with visa requirements, document lists, financial thresholds, application procedures, and common refusal reasons.

**Example (USA Student - Documents Section):**
```
Typical documents for a USA F-1 student visa may include:
- Valid passport
- Form I-20 from SEVIS-certified school
- SEVIS fee receipt (I-901)
- DS-160 confirmation page
- Bank statements showing sufficient funds
- Academic transcripts
- Proof of English proficiency
...
```

**Usage in GPT-4 Prompt:**
- Injected directly into user prompt as text
- Not retrieved via RAG (static lookup by country/visaType)
- Used as context for GPT-4 to generate checklists

### RAG System (Not Used for Checklists)

**Location:** `apps/ai-service/services/rag.py`

**Purpose:** Used for **chat** responses, NOT for checklist generation

**Implementation:**
- **Storage:** Pinecone vector database (if `PINECONE_API_KEY` set) or local cache fallback
- **Chunking:** 500-token chunks with 100-token overlap
- **Embeddings:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **Query:** Vector similarity search for relevant chunks

**Knowledge Base Source:**
- `apps/ai-service/data/visa_kb.json` (separate from backend KB)
- Ingested via `kb_ingestor.py`
- Chunked via `chunker.py`
- Indexed in Pinecone or cache

**Why Not Used for Checklists:**
- Backend checklist generation uses direct OpenAI API calls
- Backend uses static `visaKnowledgeBase.ts` file
- No RAG retrieval in checklist flow
- RAG is only used in AI service for chat (`/api/chat` endpoint)

### Document Guides

**Location:** Referenced in `ai-openai.service.ts` but source file not found in investigation

**Purpose:** Uzbekistan-specific document guides (how to obtain documents in Uzbekistan)

**Usage:** Injected into GPT-4 prompt as additional context

---

## STAGE 6: CURRENT PROFICIENCY & LIMITATIONS

### Inputs GPT-4 Currently Receives

**Categories of Information:**

1. **User Data:**
   - Age, citizenship (UZ), app language (en/ru/uz)
   - Home country (Uzbekistan, assumed)

2. **Questionnaire Answers:**
   - Visa type (student/tourist)
   - Target country
   - Duration of stay
   - Sponsor type (self/parent/sponsor)
   - Bank balance (USD)
   - Travel history (yes/no, countries visited)
   - Previous visa refusals (yes/no)
   - Property ownership in Uzbekistan (yes/no)
   - Family ties in Uzbekistan (yes/no)

3. **Risk Assessment:**
   - Probability score (0-100%)
   - Risk level (low/medium/high)
   - Risk factors array (e.g., "Low bank balance", "No travel history")
   - Positive factors array (e.g., "Property in Uzbekistan")

4. **Visa Type & Country:**
   - Country name (e.g., "United States")
   - Visa type name (e.g., "Student Visa")

5. **Knowledge Base Context:**
   - Static visa requirements text for country/visa type
   - Document guides (Uzbekistan-specific)

6. **Application Status:**
   - Current application status (draft/in_progress/submitted)
   - Uploaded documents list

**What GPT-4 Does NOT Receive:**
- ❌ RAG-retrieved chunks (RAG only used for chat)
- ❌ Real-time embassy requirements (static KB only)
- ❌ User's uploaded documents content (only metadata)
- ❌ Historical application data
- ❌ Country-specific rule changes

### Strengths

1. **Personalization:**
   - ✅ Uses questionnaire data to tailor checklist
   - ✅ Adjusts based on risk factors (high risk → more documents)
   - ✅ Considers sponsor type, travel history, finances

2. **Multilingual Support:**
   - ✅ Generates complete translations (EN, UZ, RU)
   - ✅ "whereToObtain" instructions in all three languages
   - ✅ Uzbekistan-specific context (documents issued in UZ)

3. **Country Specialization:**
   - ✅ Uses correct terminology (I-20 for USA, LOA for Canada)
   - ✅ Includes country-specific documents (SEVIS for USA, CAS for UK)
   - ✅ Applies country rules (28-day bank statement for UK)

4. **Output Quality:**
   - ✅ Structured JSON format
   - ✅ Three-category system (required, highly_recommended, optional)
   - ✅ Comprehensive descriptions and instructions

5. **Resilience:**
   - ✅ Robust fallback system (never returns empty)
   - ✅ Validation and auto-correction
   - ✅ Retry logic for failed generations

### Weaknesses / Risk Areas

1. **Hallucination Risk:**
   - ⚠️ GPT-4 can invent document requirements not in knowledge base
   - ⚠️ No verification against official embassy websites
   - ⚠️ Relies on prompt instructions ("NO hallucinations") but no enforcement
   - ⚠️ Knowledge base is static and may be outdated

2. **Missing Conditions:**
   - ⚠️ No explicit handling for minors (different requirements)
   - ⚠️ No distinction between married vs single applicants
   - ⚠️ No handling for dependent family members
   - ⚠️ No special cases (diplomatic passports, etc.)

3. **Lack of Hard-Coded Rules:**
   - ⚠️ No explicit rules like "Passport is ALWAYS required"
   - ⚠️ GPT-4 decides all documents (no rule-based foundation)
   - ⚠️ Can't guarantee core documents are always included

4. **Knowledge Base Limitations:**
   - ⚠️ Static text (not updated in real-time)
   - ⚠️ May not cover all edge cases
   - ⚠️ No versioning or update mechanism

5. **No RAG for Checklists:**
   - ⚠️ RAG system exists but not used for checklist generation
   - ⚠️ Missing opportunity to use latest embassy requirements
   - ⚠️ Can't retrieve specific document requirements dynamically

6. **Validation Gaps:**
   - ⚠️ Validates structure but not content accuracy
   - ⚠️ Can't detect if GPT-4 included wrong documents
   - ⚠️ No cross-reference with official sources

### What Parts Are Easiest to Convert to Hybrid System

**High Priority (Easy to Convert):**

1. **Core Documents (Always Required):**
   - Passport, passport photo, application form
   - These can be hard-coded rules per country/visa type
   - GPT-4 only needs to format and explain

2. **Country-Specific Core Documents:**
   - USA Student: I-20, SEVIS fee (always required)
   - Canada Student: LOA from DLI (always required)
   - UK Student: CAS (always required)
   - These can be rule-based with GPT-4 only formatting

3. **Financial Documents:**
   - Bank statement (always required for self-funded)
   - Sponsor documents (always required if sponsored)
   - Can be rule-based based on `sponsorType` from questionnaire

**Medium Priority (Moderate Effort):**

4. **Category Assignment:**
   - Rules can define which documents are "required" vs "highly_recommended"
   - GPT-4 only needs to format and provide descriptions

5. **Risk-Based Additions:**
   - Rules can define: "If riskScore.level === 'high', add property documents to highly_recommended"
   - GPT-4 only needs to format

**Low Priority (Complex):**

6. **Dynamic Documents:**
   - Documents that vary by specific circumstances
   - May still need GPT-4 to decide (e.g., "Additional sponsor documents if sponsor is not immediate family")

**Recommended Hybrid Approach:**

1. **Rule Engine (Backend):**
   - Define core documents per country/visa type (JSON rules)
   - Define category assignments (required/highly_recommended/optional)
   - Define risk-based additions (if risk high, add X to highly_recommended)
   - Define sponsor-based documents (if sponsored, add sponsor documents)

2. **GPT-4 (Formatting Only):**
   - Generate descriptions (EN, UZ, RU)
   - Generate "whereToObtain" instructions
   - Add any additional context-specific documents (if rules allow)
   - Format and structure the output

3. **Validation:**
   - Ensure all rule-based documents are present
   - Validate GPT-4 formatting (translations, descriptions)
   - Cross-reference with knowledge base for accuracy

**Benefits:**
- ✅ Eliminates hallucination risk for core documents
- ✅ Guarantees required documents are always included
- ✅ Reduces GPT-4 token usage (only formatting, not decision-making)
- ✅ Faster generation (fewer tokens = faster response)
- ✅ Lower cost (fewer tokens = lower API costs)
- ✅ More reliable (rules are deterministic)

---

## SUMMARY

### Files Involved

**Backend (Node/Express):**
- `apps/backend/src/services/ai-openai.service.ts` - GPT-4 API wrapper
- `apps/backend/src/services/document-checklist.service.ts` - Orchestration
- `apps/backend/src/routes/document-checklist.ts` - API routes
- `apps/backend/src/services/ai-context.service.ts` - Context building
- `apps/backend/src/utils/json-validator.ts` - Response validation
- `apps/backend/src/data/visaKnowledgeBase.ts` - Static KB
- `apps/backend/src/data/fallback-checklists.ts` - Fallback templates

**AI Service (Python - NOT USED):**
- `apps/ai-service/services/checklist.py` - Unused Python service
- `apps/ai-service/main.py` - FastAPI app (checklist endpoint exists but unused)

### Data Flow

1. User requests checklist → Backend checks DB → If missing, triggers async generation
2. Build AIUserContext → Extract questionnaire → Calculate risk score
3. Call GPT-4 → Build prompts → Generate JSON checklist
4. Validate response → Auto-correct issues → Store in DB
5. Return checklist to user

### Prompt Design

- **System Prompt:** 600+ lines with strict instructions, category logic, country rules, anti-hallucination warnings
- **User Prompt:** Questionnaire context, risk factors, knowledge base text, document guides
- **Model:** `gpt-4o-mini`, temperature 0.5, max_tokens 2000, JSON format enforced

### Output Format

- JSON with 10-16 items
- Three categories: `required`, `highly_recommended`, `optional`
- Complete multilingual support (EN, UZ, RU)
- Country-specific terminology (I-20, LOA, CAS, etc.)

### Strengths

- Personalization based on questionnaire
- Multilingual support
- Country specialization
- Robust fallback system
- Validation and auto-correction

### Limitations

- Hallucination risk (no hard-coded rules)
- Missing conditions (minors, dependents, etc.)
- Static knowledge base (not RAG, not real-time)
- No content accuracy validation
- No verification against official sources

### Hybrid System Recommendation

**Convert to rule-based core + GPT-4 formatting:**
- Rules define which documents are required/highly_recommended/optional
- GPT-4 only formats descriptions and instructions
- Eliminates hallucination risk for core documents
- Reduces token usage and cost
- Faster and more reliable

---

**END OF INVESTIGATION REPORT**



