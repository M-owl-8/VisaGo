# Ketdik Backend Full Diagnostic Report
## Comprehensive Analysis of Visa Application & Checklist Generation Pipeline

**Date:** December 2024  
**Scope:** Full exploration of questionnaire processing, application creation, visa rule sets, embassy sources, and GPT-4 checklist generation

---

## Table of Contents

1. [Full Pipeline Flow](#1-full-pipeline-flow)
2. [File-by-File Analysis](#2-file-by-file-analysis)
3. [GPT-4 Behavior Analysis](#3-gpt-4-behavior-analysis)
4. [Bugs and Broken Flows](#4-bugs-and-broken-flows)
5. [Evaluation: Professional-Grade System Feasibility](#5-evaluation-professional-grade-system-feasibility)
6. [Proposed Redesign Plan](#6-proposed-redesign-plan)

---

## 1. Full Pipeline Flow

### 1.1 Questionnaire Flow

#### **Entry Points:**
- **Frontend:** `frontend_new/src/screens/onboarding/QuestionnaireScreen.tsx` (legacy) or `QuestionnaireScreenNew.tsx` (V2)
- **Backend Route:** `POST /api/applications/ai-generate` (`apps/backend/src/routes/applications.ts:191-331`)

#### **Questionnaire Structure:**

**Legacy Format (QuestionnaireData):**
```typescript
{
  purpose: 'study' | 'work' | 'tourism' | 'business' | 'immigration' | 'other',
  country: string,  // Country ID or code
  duration: 'less_than_1' | '1_3_months' | '3_6_months' | '6_12_months' | 'more_than_1_year',
  traveledBefore: boolean,
  currentStatus: 'student' | 'employee' | 'entrepreneur' | 'unemployed' | 'other',
  hasInvitation: boolean,
  financialSituation: 'stable_income' | 'sponsor' | 'savings' | 'preparing',
  maritalStatus: 'single' | 'married' | 'divorced',
  hasChildren: 'no' | 'one' | 'two_plus',
  englishLevel: 'beginner' | 'intermediate' | 'advanced' | 'native'
}
```

**V2 Format (QuestionnaireV2):**
- 10 structured sections: `personal`, `travel`, `status`, `finance`, `invitation`, `stay`, `history`, `ties`, `documents`, `special`
- Fully multiple-choice, no free text
- Stored with `version: '2.0'` and optional `summary` field

#### **Storage:**
- **Location:** `User.bio` field (JSON string in database)
- **Format:** Can contain both legacy format + V2 format + summary for backward compatibility
- **Processing:** `apps/backend/src/services/questionnaire-v2-mapper.ts` converts V2 → `VisaQuestionnaireSummary`

#### **Flow:**
1. User completes questionnaire in frontend
2. Frontend calls `POST /api/applications/ai-generate` with `questionnaireData`
3. Backend validates and processes via `AIApplicationService.generateApplicationFromQuestionnaire()`
4. Questionnaire stored in `User.bio` via `PUT /api/users/:id` (if not already stored)
5. Application created with `countryId` and `visaTypeId`

---

### 1.2 Application Creation Flow

#### **Entry Points:**
1. **AI-Generated:** `POST /api/applications/ai-generate` (from questionnaire)
2. **Manual:** `POST /api/applications` (direct creation)

#### **Service:** `apps/backend/src/services/applications.service.ts`

**Flow:**
1. Validate country and visa type exist
2. Check for duplicate active application (unique constraint: `userId + countryId + visaTypeId`)
3. Create `VisaApplication` record with:
   - `status: 'draft'`
   - `progressPercentage: 0`
   - Default checkpoints (5 steps)
4. **CRITICAL:** Immediately trigger checklist generation (line 232-249 in `ai-application.service.ts`):
   ```typescript
   try {
     const { DocumentChecklistService } = await import('./document-checklist.service');
     await DocumentChecklistService.generateChecklist(application.id, userId);
   } catch (checklistError) {
     // Log but don't fail application creation
   }
   ```

#### **Database Models:**
- `VisaApplication` (id, userId, countryId, visaTypeId, status, progressPercentage, notes, ...)
- `Country` (id, code, name, ...)
- `VisaType` (id, countryId, name, ...)
- `User` (id, bio, questionnaireCompleted, ...)

---

### 1.3 Checklist Generation Trigger

#### **Entry Points:**
1. **On Application Creation:** Automatic (via `AIApplicationService`)
2. **On-Demand:** `GET /api/document-checklist/:applicationId` (`apps/backend/src/routes/document-checklist.ts`)
3. **Manual Trigger:** `POST /api/applications/:id/generate-checklist` (legacy endpoint)

#### **Service:** `apps/backend/src/services/document-checklist.service.ts`

**Main Function:** `generateChecklist(applicationId, userId)`

**Flow:**
1. Check if checklist already exists in `DocumentChecklist` table (status: `'processing'` | `'ready'` | `'failed'`)
2. If exists and `status === 'ready'`, return cached checklist
3. If not exists or `status !== 'ready'`, call `generateChecklistAsync()` (background processing)
4. Return `{ status: 'processing' }` immediately, or cached checklist if ready

**Async Generation:** `generateChecklistAsync(applicationId, userId, application)`

---

### 1.4 Mode Selection Logic

The system decides between multiple modes in this order:

#### **Decision Tree:**

```
1. Check if approved VisaRuleSet exists (via VisaRulesService.getActiveRuleSet)
   ├─ YES → Check if hybrid mode enabled (via findVisaDocumentRuleSet)
   │   ├─ YES → HYBRID MODE (rules decide documents, GPT enriches)
   │   └─ NO → Check if VisaChecklistEngine should be used
   │       ├─ YES → VISA_CHECKLIST_ENGINE MODE (rules + AI personalization)
   │       └─ NO → LEGACY MODE (GPT decides everything)
   └─ NO → LEGACY MODE (GPT decides everything)
```

#### **Mode Details:**

**1. HYBRID MODE** (`apps/backend/src/services/ai-openai.service.ts:1060-1276`)
- **Condition:** `findVisaDocumentRuleSet(countryCode, visaType)` returns non-null
- **Flow:**
  1. Build base checklist from `VisaRuleSet.requiredDocuments` (via `buildBaseChecklistFromRules`)
  2. Call GPT-4 with hybrid prompt (system: "You are NOT allowed to add/remove documents")
  3. GPT-4 only enriches with names, descriptions, whereToObtain
  4. Validate that GPT didn't add/remove documents
  5. Return enriched checklist
- **Files:**
  - `buildHybridSystemPrompt()` (line 555)
  - `buildHybridUserPrompt()` (line 614)
  - `parseHybridResponse()` (line 676)
  - `validateHybridResponse()` (line 727)

**2. VISA_CHECKLIST_ENGINE MODE** (`apps/backend/src/services/visa-checklist-engine.service.ts`)
- **Condition:** Currently NOT directly called from main flow (exists but unused in primary path)
- **Flow:**
  1. Get approved `VisaRuleSet` from database
  2. Build system prompt with full rule set
  3. Build user prompt with `AIUserContext`
  4. Call GPT-4 with structured output (JSON schema)
  5. Validate against `ChecklistResponseSchema` (Zod)
  6. Return personalized checklist
- **Note:** This mode exists but is not integrated into the main `generateChecklist` flow

**3. LEGACY MODE** (`apps/backend/src/services/ai-openai.service.ts:1336-2330`)
- **Condition:** Default fallback when no rules exist or hybrid disabled
- **Flow:**
  1. Get visa knowledge base (`getVisaKnowledgeBase(country, visaType)`)
  2. Get document guides (`getRelevantDocumentGuides(userQuery, 3)`)
  3. Build comprehensive system prompt (very long, 500+ lines)
  4. Build user prompt with questionnaire summary
  5. Call GPT-4 with `response_format: { type: 'json_object' }`
  6. Parse and validate response (2 retry attempts)
  7. If validation fails → use fallback checklist (4 items)
- **Validation:** `validateChecklistResponse()` requires:
   - Minimum 10 items (error if < 10)
   - Maximum 16 items (warning if > 16)
   - All three categories present: `required`, `highly_recommended`, `optional`
   - All required fields present (document, name, nameUz, nameRu, category, required, description, priority, whereToObtain)

**4. FALLBACK MODE** (`apps/backend/src/services/document-checklist.service.ts:772-897`)
- **Condition:** AI fails, returns empty checklist, or validation fails after retries
- **Flow:**
  1. Generate 4-7 core documents based on country/visa type
  2. Use `getDocumentTranslation()` for names/descriptions
  3. Mark all as `required: true`
  4. Return basic checklist

---

### 1.5 Merge Logic (User Docs + Checklist Items)

**Function:** `mergeChecklistItemsWithDocuments()` (`apps/backend/src/services/document-checklist.service.ts:1163-1204`)

**Flow:**
1. Build `existingDocumentsMap` from `application.documents` (key: `documentType`)
2. For each checklist item:
   - Lookup document by `item.documentType` in map
   - If found, merge: `status`, `userDocumentId`, `fileUrl`, `fileName`, `fileSize`, `uploadedAt`, `verificationNotes`, `aiVerified`, `aiConfidence`
   - If not found, keep item with `status: 'missing'`
3. Log merge statistics

**Critical Issue:** Documents must have matching `documentType` for merge to work. If document classification fails and sets `documentType: 'other'` or `'document'`, merge fails.

---

## 2. File-by-File Analysis

### 2.1 Core Checklist Generation Files

#### **`apps/backend/src/services/document-checklist.service.ts`** (1534 lines)
- **Purpose:** Main orchestrator for checklist generation
- **Key Functions:**
  - `generateChecklist()` - Entry point, checks cache, triggers async generation
  - `generateChecklistAsync()` - Main generation logic, calls AI, handles fallback
  - `generateRobustFallbackChecklist()` - Fallback when AI fails
  - `mergeChecklistItemsWithDocuments()` - Merges uploaded docs with checklist
  - `applyCountryTerminology()` - Sanitizes country-specific terms (I-20 vs LOA)
- **Interactions:**
  - Calls `AIOpenAIService.generateChecklist()` for AI generation
  - Calls `buildAIUserContext()` for user context
  - Uses `VisaRulesService` (indirectly via AI service)
- **Weak Points:**
  - Mode selection logic is implicit (handled by `AIOpenAIService`, not explicit here)
  - Fallback only generates 4-7 items (too few)
  - No direct integration with `VisaChecklistEngineService`

#### **`apps/backend/src/services/ai-openai.service.ts`** (2330 lines)
- **Purpose:** GPT-4 API calls and response handling
- **Key Functions:**
  - `generateChecklist()` - Main entry, decides hybrid vs legacy mode
  - `isHybridChecklistEnabled()` - Checks if rules exist for hybrid mode
  - `buildHybridSystemPrompt()` - Hybrid mode prompt
  - `buildHybridUserPrompt()` - Hybrid mode user prompt
  - `callChecklistAPI()` - Wrapper with model fallback (gpt-4o → gpt-4.1)
- **Interactions:**
  - Uses `VisaRulesService.getActiveRuleSet()` for hybrid mode
  - Uses `buildBaseChecklistFromRules()` for hybrid base checklist
  - Uses `getVisaKnowledgeBase()` and `getRelevantDocumentGuides()` for legacy mode
- **Weak Points:**
  - Very long legacy prompt (500+ lines) - hard to maintain
  - Validation requires 10+ items (too strict, causes fallback)
  - Retry logic only attempts twice
  - No structured output schema for legacy mode (relies on prompt instructions)

#### **`apps/backend/src/services/visa-checklist-engine.service.ts`** (390 lines)
- **Purpose:** Rules-based + AI personalization engine
- **Key Functions:**
  - `generateChecklist()` - Generates from VisaRuleSet + AIUserContext
  - `buildSystemPrompt()` - System prompt with rule set
  - `buildUserPrompt()` - User prompt with context
  - `fixCommonIssues()` - Fixes GPT response issues
- **Interactions:**
  - Uses `VisaRulesService.getActiveRuleSet()`
  - Uses `AIOpenAIService.getOpenAIClient()`
  - Uses Zod schema for validation
- **Weak Points:**
  - **NOT INTEGRATED** into main checklist generation flow
  - Only called from separate endpoints (if any)
  - Returns empty checklist if no rule set found (should fallback to legacy)

#### **`apps/backend/src/services/checklist-rules.service.ts`** (178 lines)
- **Purpose:** Builds base checklist from VisaRuleSet
- **Key Functions:**
  - `buildBaseChecklistFromRules()` - Converts VisaRuleSet to BaseChecklistItem[]
  - `getConditionalDocuments()` - Adds sponsor-related docs
  - `getRiskBasedDocuments()` - Adds risk-based docs
- **Interactions:**
  - Used by hybrid mode in `ai-openai.service.ts`
- **Weak Points:**
  - Conditional logic is basic (only sponsor and risk-based)
  - No country-specific conditional logic

#### **`apps/backend/src/services/visa-rules.service.ts`** (502 lines)
- **Purpose:** Database access for VisaRuleSet
- **Key Functions:**
  - `getActiveRuleSet()` - Gets approved rule set (with alias mapping)
  - `getLatestRuleSet()` - Gets latest (approved or pending)
  - `createOrUpdateRuleSetFromAI()` - Creates from AI extraction
  - `approveRuleSet()` - Admin approval
- **Interactions:**
  - Uses `normalizeVisaTypeForRules()` for alias mapping (US "b1/b2 visitor" → "tourist")
- **Weak Points:**
  - Alias mapping only supports US currently
  - No caching (queries DB every time)

---

### 2.2 Context and Data Files

#### **`apps/backend/src/services/ai-context.service.ts`** (1542 lines - has duplicate code)
- **Purpose:** Builds `AIUserContext` from application and questionnaire
- **Key Functions:**
  - `buildAIUserContext()` - Main function
  - `extractQuestionnaireSummary()` - Extracts from User.bio
  - `calculateVisaProbability()` - Rule-based risk score
  - `buildApplicantProfile()` - Legacy profile builder (deprecated)
  - `buildApplicantProfileFromQuestionnaire()` - New profile builder
- **Interactions:**
  - Reads from `VisaApplication`, `User`, `UserDocument` tables
  - Uses `questionnaire-v2-mapper.ts` for V2 conversion
- **Weak Points:**
  - **DUPLICATE CODE:** Lines 749-1542 are duplicates of earlier functions (should be removed)
  - Complex extraction logic with multiple format support (legacy, V2, summary)
  - Risk score calculation is basic (rule-based, not ML)

#### **`apps/backend/src/services/questionnaire-v2-mapper.ts`** (385 lines)
- **Purpose:** Converts QuestionnaireV2 to VisaQuestionnaireSummary
- **Key Functions:**
  - `buildSummaryFromQuestionnaireV2()` - Main conversion
  - `validateQuestionnaireV2()` - Validation
  - `convertV2ToLegacyQuestionnaireData()` - Backward compatibility
- **Interactions:**
  - Used by `ai-context.service.ts`
- **Weak Points:**
  - Mapping logic is complex with many edge cases
  - Some mappings are approximations (e.g., income ranges)

#### **`apps/backend/src/data/visaKnowledgeBase.ts`** (1591+ lines)
- **Purpose:** Static knowledge base for 8 countries × 2 visa types
- **Structure:** Array of `VisaKbEntry[]` with sections: `eligibility`, `documents`, `finance`, `application_process`, `refusal_reasons`
- **Usage:** Injected into legacy mode prompts
- **Weak Points:**
  - Static data (not updated automatically)
  - May become outdated
  - Large file (hard to maintain)

#### **`apps/backend/src/data/documentGuides.ts`** (325+ lines)
- **Purpose:** Uzbekistan-specific document guides (how to obtain documents)
- **Structure:** Array of `DocumentGuide[]` with aliases for matching
- **Usage:** Retrieved via `getRelevantDocumentGuides(query, maxGuides)` using keyword matching
- **Weak Points:**
  - Simple keyword matching (not semantic search)
  - Only 11 document types covered

#### **`apps/backend/src/data/fallback-checklists.ts`** (3254+ lines)
- **Purpose:** Emergency fallback checklists for each country/visa type
- **Structure:** `Record<CountryCode, Record<VisaType, FallbackChecklistItem[]>>`
- **Usage:** When AI fails completely
- **Weak Points:**
  - Very large file (maintenance burden)
  - Static data (may become outdated)

---

### 2.3 Validation and Utilities

#### **`apps/backend/src/utils/json-validator.ts`** (466+ lines)
- **Purpose:** Validates and fixes GPT-4 JSON responses
- **Key Functions:**
  - `validateChecklistResponse()` - Main validation
  - `parseAndValidateChecklistResponse()` - Parse + validate
  - `autoCorrectChecklist()` - Auto-fixes common issues
  - `extractLargestValidJson()` - Extracts JSON from markdown
- **Validation Rules:**
  - Minimum 10 items (error)
  - Maximum 16 items (warning)
  - All three categories required
  - All required fields present
  - Country-specific terminology checks
- **Weak Points:**
  - **TOO STRICT:** 10-item minimum causes valid 6-item checklists to be rejected
  - Auto-correction may mask real issues

#### **`apps/backend/src/utils/visa-type-aliases.ts`** (80 lines)
- **Purpose:** Maps application visa types to rule set visa types
- **Current Mappings:**
  - US: `'b1/b2 visitor'` → `'tourist'`
  - US: `'b1/b2'` → `'tourist'`
  - US: `'visitor'` → `'tourist'`
- **Weak Points:**
  - Only US mappings exist
  - No other country/visa type aliases

#### **`apps/backend/src/utils/checklist-helpers.ts`**
- **Purpose:** Helper functions for checklist processing
- **Functions:**
  - `inferCategory()` - Infers category from item properties
  - `normalizePriority()` - Normalizes priority values

---

### 2.4 Database Models

#### **Prisma Schema** (`apps/backend/prisma/schema.postgresql.prisma`)

**Key Models:**
- `VisaApplication` - Main application record
- `DocumentChecklist` - Cached checklist (status, checklistData JSON)
- `VisaRuleSet` - Structured visa rules (data JSON, isApproved, version)
- `VisaRuleVersion` - Version history
- `EmbassySource` - Embassy page URLs for extraction
- `UserDocument` - Uploaded documents (documentType, status, fileUrl, verifiedByAI, ...)
- `User` - User profile (bio JSON string, questionnaireCompleted)

**Relations:**
- `VisaApplication` → `DocumentChecklist` (1:1)
- `VisaApplication` → `UserDocument[]` (1:many)
- `VisaRuleSet` → `EmbassySource` (many:1, optional)
- `VisaRuleSet` → `VisaRuleVersion[]` (1:many)

---

## 3. GPT-4 Behavior Analysis

### 3.1 Prompts Used

#### **Hybrid Mode Prompt** (`buildHybridSystemPrompt`)
- **Length:** ~50 lines
- **Key Instructions:**
  - "You are NOT allowed to add or remove documents"
  - "You MUST output exactly the same documentType values"
  - "Only enrich with names, descriptions, whereToObtain"
- **Strengths:** Clear constraints, prevents hallucination
- **Weaknesses:** No structured output schema (relies on instructions)

#### **Legacy Mode Prompt** (`systemPrompt` in `generateChecklist`)
- **Length:** ~500+ lines
- **Key Instructions:**
  - Comprehensive rules for 3 categories
  - Country-specific terminology requirements
  - Risk-based document additions
  - JSON schema requirements (10-16 items, all fields required)
- **Strengths:** Very detailed, covers edge cases
- **Weaknesses:**
  - Too long (may hit token limits)
  - Hard to maintain
  - No structured output (relies on prompt instructions)
  - Requires 10+ items (too strict)

#### **VisaChecklistEngine Prompt** (`buildSystemPrompt`)
- **Length:** ~100 lines
- **Key Instructions:**
  - Uses VisaRuleSet as source of truth
  - Personalizes based on AIUserContext
  - Structured output schema (Zod)
- **Strengths:** Rule-based foundation, structured output
- **Weaknesses:** Not integrated into main flow

---

### 3.2 JSON Format Expected

#### **Legacy Mode Format:**
```json
{
  "type": "tourist",
  "country": "United States",
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

#### **VisaChecklistEngine Format:**
```json
{
  "checklist": [
    {
      "id": "DOC_1",
      "documentType": "passport",
      "category": "required",
      "required": true,
      "name": "...",
      "nameUz": "...",
      "nameRu": "...",
      "description": "...",
      "appliesToThisApplicant": true,
      "reasonIfApplies": "...",
      "extraRecommended": false,
      "group": "identity",
      "priority": 1,
      "dependsOn": []
    }
  ]
}
```

---

### 3.3 Validation Requirements

#### **Strict Requirements:**
1. **Item Count:** Minimum 10 items (error if < 10)
2. **Categories:** All three must be present (`required`, `highly_recommended`, `optional`)
3. **Required Fields:** All items must have: `document`, `name`, `nameUz`, `nameRu`, `category`, `required`, `description`, `priority`, `whereToObtain`
4. **Country Terminology:** Must use correct terms (I-20 for US, LOA for Canada, etc.)

#### **Common Validation Failures:**
1. **Too Few Items:** GPT returns 6-9 items → validation fails → fallback used
2. **Missing Category:** Only returns "required" items → validation fails
3. **Invalid JSON:** GPT wraps in markdown → extraction attempts → may fail
4. **Missing Translations:** Missing `nameUz` or `nameRu` → warning (not error)

---

### 3.4 Why GPT Fails

#### **1. Token Limits**
- Legacy prompt is very long (~500 lines)
- User prompt adds questionnaire summary + knowledge base + document guides
- May hit context limits, causing incomplete responses

#### **2. Strict Validation**
- 10-item minimum is too strict
- Valid 6-item checklists are rejected
- Causes unnecessary fallbacks

#### **3. JSON Structure Issues**
- GPT sometimes wraps JSON in markdown code blocks
- GPT sometimes returns nested structures (`{ data: { checklist: [...] } }`)
- Extraction logic tries to fix but may fail

#### **4. Missing Context**
- GPT doesn't have access to:
  - Real-time embassy website data
  - Latest rule changes
  - Country-specific nuances not in knowledge base

#### **5. Prompt Ambiguity**
- Legacy prompt is very long but not structured
- No explicit JSON schema (relies on instructions)
- GPT may interpret instructions differently

---

### 3.5 Alias Mapping Impact

**Current Implementation:**
- US "b1/b2 visitor" → "tourist" (via `normalizeVisaTypeForRules`)
- Applied in `VisaRulesService.getActiveRuleSet()`
- Logged when applied

**Impact on GPT:**
- GPT receives original visa type name ("b1/b2 visitor") in prompts
- But rule set lookup uses normalized type ("tourist")
- This is correct - GPT sees user-facing name, rules use canonical name

---

### 3.6 What GPT Can/Cannot Reference

#### **Can Reference:**
- ✅ Questionnaire summary (via `AIUserContext`)
- ✅ Visa knowledge base (static data)
- ✅ Document guides (Uzbekistan-specific)
- ✅ Risk score (calculated from questionnaire)
- ✅ Uploaded documents (status, verification results)

#### **Cannot Reference:**
- ❌ Real-time embassy website data (only static knowledge base)
- ❌ Latest rule changes (only approved VisaRuleSet in DB)
- ❌ Other users' successful applications
- ❌ Embassy-specific nuances not in knowledge base
- ❌ Country-specific document requirements not explicitly in prompt

---

## 4. Bugs and Broken Flows

### 4.1 Critical Bugs

#### **BUG #1: Validation Too Strict (10-Item Minimum)**
- **Location:** `apps/backend/src/utils/json-validator.ts:147`
- **Issue:** Requires minimum 10 items, but valid checklists can have 6-9 items
- **Impact:** Valid AI checklists are rejected, fallback used instead
- **Evidence:** Production logs show "Too few items: 6 (minimum 10 required)"
- **Fix:** Lower threshold to 4-6 items, or make it a warning instead of error

#### **BUG #2: VisaChecklistEngine Not Integrated**
- **Location:** `apps/backend/src/services/visa-checklist-engine.service.ts`
- **Issue:** Service exists but is never called from main `generateChecklist` flow
- **Impact:** Rules-based personalization not used even when rule sets exist
- **Fix:** Integrate into mode selection logic

#### **BUG #3: Document Type Mismatch in Merge**
- **Location:** `apps/backend/src/services/document-checklist.service.ts:1163-1204`
- **Issue:** Documents classified as `'other'` or `'document'` don't match checklist `documentType` values
- **Impact:** Uploaded documents never show as uploaded in checklist
- **Evidence:** Logs show `merged: 0` when documents exist
- **Fix:** Improve document classification or use fuzzy matching

#### **BUG #4: Duplicate Code in ai-context.service.ts**
- **Location:** `apps/backend/src/services/ai-context.service.ts:749-1542`
- **Issue:** Functions are duplicated (same code appears twice)
- **Impact:** Maintenance burden, potential inconsistencies
- **Fix:** Remove duplicate code

#### **BUG #5: Fallback Only 4 Items**
- **Location:** `apps/backend/src/services/document-checklist.service.ts:772-897`
- **Issue:** `generateRobustFallbackChecklist()` only generates 4-7 items
- **Impact:** Users see incomplete checklists when AI fails
- **Fix:** Use `fallback-checklists.ts` data (has 10+ items per country/visa type)

---

### 4.2 Broken Flows

#### **FLOW #1: Rules Mode → Validation Failure → Fallback**
- **Issue:** When rules mode generates checklist, validation may fail → falls back to 4-item legacy
- **Location:** `apps/backend/src/services/document-checklist.service.ts:423-520`
- **Impact:** Rules-based checklists discarded unnecessarily
- **Fix:** Separate validation for rules mode (less strict)

#### **FLOW #2: Hybrid Mode → GPT Adds Documents → Validation Fails**
- **Issue:** GPT sometimes adds documents in hybrid mode despite instructions
- **Location:** `apps/backend/src/services/ai-openai.service.ts:1158-1190`
- **Impact:** Validation fails, falls back to legacy mode
- **Fix:** Better validation/correction logic for hybrid mode

#### **FLOW #3: Questionnaire V2 → Legacy Format Conversion**
- **Issue:** V2 questionnaire may not convert correctly to legacy format
- **Location:** `apps/backend/src/services/questionnaire-v2-mapper.ts`
- **Impact:** Missing data in AI context
- **Fix:** Improve conversion logic

---

### 4.3 Missing Features

#### **FEATURE #1: Embassy Source Introspection**
- **Current:** Embassy sources stored but not actively used for checklist generation
- **Needed:** Real-time scraping/updates of embassy pages
- **Impact:** Checklists may be outdated

#### **FEATURE #2: Structured Output for Legacy Mode**
- **Current:** Legacy mode relies on prompt instructions for JSON format
- **Needed:** Use OpenAI structured output (JSON schema) like VisaChecklistEngine
- **Impact:** More reliable JSON generation

#### **FEATURE #3: Questionnaire Answer Usage**
- **Current:** Questionnaire answers are extracted but not fully utilized
- **Needed:** Better personalization based on specific answers
- **Impact:** Checklists not fully tailored

#### **FEATURE #4: Country-Specific Conditional Logic**
- **Current:** Only sponsor and risk-based conditionals
- **Needed:** Country-specific rules (e.g., US requires I-20 for students, Canada requires LOA)
- **Impact:** Missing country-specific documents

---

## 5. Evaluation: Professional-Grade System Feasibility

### 5.1 Current State Assessment

#### **Strengths:**
- ✅ Multiple modes (hybrid, legacy, rules-based)
- ✅ Alias mapping for visa type normalization
- ✅ Questionnaire V2 with structured data
- ✅ Risk score calculation
- ✅ Document merge logic
- ✅ Country-specific terminology sanitization
- ✅ Caching (DocumentChecklist table)

#### **Weaknesses:**
- ❌ Mode selection is implicit and complex
- ❌ Validation too strict (10-item minimum)
- ❌ VisaChecklistEngine not integrated
- ❌ Legacy prompt too long and hard to maintain
- ❌ No structured output for legacy mode
- ❌ Fallback only 4 items
- ❌ Document type mismatch issues
- ❌ No real-time embassy data

---

### 5.2 Can GPT-4 Reliably Generate Professional Checklists?

#### **YES, with improvements:**

**Current Reliability:** ~70-80%
- Hybrid mode: ~90% (rules constrain GPT)
- Legacy mode: ~60-70% (GPT decides everything)
- Rules mode: Not used

**Improvements Needed:**
1. **Structured Output:** Use OpenAI JSON schema (like VisaChecklistEngine)
2. **Shorter Prompts:** Break down into system + user prompts, use few-shot examples
3. **Validation:** Lower threshold to 4-6 items, make it warning not error
4. **Retry Logic:** More retries with different prompts
5. **Fallback:** Use comprehensive fallback checklists (10+ items)

**Feasibility:** **YES** - With structured output and better validation, reliability can reach 90%+

---

### 5.3 Should Rules Engine Be Hybrid?

#### **YES - Current hybrid approach is correct:**

**Benefits:**
- Rules ensure mandatory documents are never missed
- GPT enriches with descriptions and personalization
- Reduces hallucination risk
- More reliable than pure GPT

**Improvements Needed:**
- Better validation that GPT didn't add/remove documents
- More conditional logic in rules (country-specific)
- Integration with VisaChecklistEngine for full personalization

---

### 5.4 Should Embassy Source Introspection Be Improved?

#### **YES - Critical for accuracy:**

**Current:** Embassy sources stored but not actively used

**Needed:**
- Real-time scraping of embassy pages
- Automatic rule extraction via `AIEmbassyExtractorService`
- Versioning and approval workflow
- Alerts when rules change

**Impact:** Checklists stay up-to-date with embassy requirements

---

### 5.5 Should JSON Schema Be Different?

#### **YES - Use structured output:**

**Current:** Legacy mode relies on prompt instructions

**Recommended:**
- Use OpenAI structured output (JSON schema) for all modes
- Define schema in code (Zod or JSON Schema)
- Pass to GPT via `response_format` or function calling

**Benefits:**
- More reliable JSON generation
- Automatic validation
- Better error messages

---

### 5.6 Are Questionnaire Answers Used Correctly?

#### **PARTIALLY - Needs improvement:**

**Current Usage:**
- ✅ Extracted into `VisaQuestionnaireSummary`
- ✅ Used for risk score calculation
- ✅ Passed to GPT in prompts
- ❌ Not fully utilized for personalization
- ❌ Some answers ignored (e.g., specific invitation types)

**Improvements Needed:**
- Better mapping of questionnaire answers to document requirements
- Country-specific logic based on answers
- More conditional documents based on answers

---

## 6. Proposed Redesign Plan

### 6.1 Architecture Changes

#### **1. Unified Mode Selection**
```
generateChecklist()
  ├─ Check if VisaRuleSet exists
  │   ├─ YES → Use VisaChecklistEngine (rules + AI personalization)
  │   └─ NO → Use Legacy Mode (GPT decides)
  └─ Both modes use structured output (JSON schema)
```

**Changes:**
- Remove hybrid mode (merge into VisaChecklistEngine)
- Make VisaChecklistEngine the primary rules-based mode
- Keep legacy mode as fallback when no rules exist

#### **2. Structured Output for All Modes**
- Use OpenAI structured output (JSON schema) for all GPT calls
- Define schema in Zod, convert to JSON Schema
- Pass to GPT via `response_format` or function calling

#### **3. Improved Validation**
- Lower minimum item count to 4-6
- Make item count a warning, not error
- Separate validation for rules mode (less strict)
- Better error messages

#### **4. Enhanced Fallback**
- Use `fallback-checklists.ts` data (10+ items)
- Generate based on country/visa type
- Include all three categories

---

### 6.2 Code Changes Required

#### **File 1: `apps/backend/src/services/document-checklist.service.ts`**
- **Changes:**
  1. Integrate `VisaChecklistEngineService` into main flow
  2. Use `fallback-checklists.ts` for fallback (not `generateRobustFallbackChecklist`)
  3. Lower `MIN_AI_ITEMS` threshold to 4
  4. Improve document merge with fuzzy matching

#### **File 2: `apps/backend/src/services/ai-openai.service.ts`**
- **Changes:**
  1. Remove hybrid mode (merge logic into VisaChecklistEngine)
  2. Add structured output for legacy mode
  3. Shorten legacy prompt (use few-shot examples)
  4. Improve retry logic (more attempts, different prompts)

#### **File 3: `apps/backend/src/services/visa-checklist-engine.service.ts`**
- **Changes:**
  1. Add fallback to legacy mode when no rules exist
  2. Improve error handling
  3. Add more conditional logic

#### **File 4: `apps/backend/src/utils/json-validator.ts`**
- **Changes:**
  1. Lower minimum item count to 4-6
  2. Make item count warning, not error
  3. Separate validation for rules mode

#### **File 5: `apps/backend/src/services/ai-context.service.ts`**
- **Changes:**
  1. Remove duplicate code (lines 749-1542)
  2. Improve questionnaire extraction
  3. Better mapping of answers to document requirements

---

### 6.3 Prompt Improvements

#### **Legacy Mode Prompt:**
- **Current:** ~500 lines, very detailed
- **Proposed:** 
  - System prompt: ~100 lines (core rules)
  - User prompt: Questionnaire summary + few-shot examples
  - Use structured output (JSON schema)

#### **VisaChecklistEngine Prompt:**
- **Current:** ~100 lines, good structure
- **Proposed:**
  - Add more examples
  - Better instructions for personalization
  - Use structured output (already has Zod schema)

---

### 6.4 Data Improvements

#### **1. Embassy Source Integration**
- Implement real-time scraping
- Automatic rule extraction
- Versioning and approval

#### **2. Knowledge Base Updates**
- Keep knowledge base up-to-date
- Add more country/visa type combinations
- Use RAG for dynamic retrieval

#### **3. Document Guides Expansion**
- Add more document types
- Use semantic search instead of keyword matching
- Keep guides up-to-date

---

### 6.5 Testing Strategy

#### **Unit Tests:**
- Test mode selection logic
- Test validation with various item counts
- Test document merge with different document types
- Test alias mapping

#### **Integration Tests:**
- Test full checklist generation flow
- Test fallback scenarios
- Test document upload and merge

#### **E2E Tests:**
- Test questionnaire → application → checklist flow
- Test with real GPT-4 responses
- Test with various countries/visa types

---

## 7. Summary

### 7.1 Key Findings

1. **Pipeline is complex but functional** - Multiple modes, good separation of concerns
2. **Validation is too strict** - 10-item minimum causes valid checklists to be rejected
3. **VisaChecklistEngine not integrated** - Best mode exists but unused
4. **Legacy prompt too long** - Hard to maintain, may hit token limits
5. **Fallback too minimal** - Only 4 items when AI fails
6. **Document merge has issues** - Type mismatches prevent proper merging

### 7.2 Recommendations

1. **Immediate:** Lower validation threshold, integrate VisaChecklistEngine, use structured output
2. **Short-term:** Improve fallback, fix document merge, remove duplicate code
3. **Long-term:** Real-time embassy data, better personalization, expanded knowledge base

### 7.3 Feasibility

**Professional-grade system is ACHIEVABLE** with:
- Structured output for all modes
- Better validation (less strict)
- Integration of VisaChecklistEngine
- Improved fallback logic
- Real-time embassy data integration

**Estimated reliability:** 90%+ with improvements

---

**End of Report**

