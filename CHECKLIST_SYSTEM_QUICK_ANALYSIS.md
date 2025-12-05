# VisaBuddy Checklist System - Quick Analysis

## ✅ PHASE 1: SYSTEM MAPPING (20 Bullets)

### Questionnaire Structure

- **32 questions total** across 6 groups (A: Basic, B: Personal, C: Work/Study, D: Finance, E: Travel History, F: Ties)
- **Types**: dropdown, single-select, boolean, text
- **Conditional logic**: Questions C2-C10, D5-D7, E2, E4 shown based on previous answers
- **Final answer object**: Stored in `User.bio` as JSON string, includes both legacy format + V2 format + summary
- **Submission**: `POST /api/applications/ai-generate` with `questionnaireData` object

### Checklist Generation Flow

- **Entry point**: `DocumentChecklistService.generateChecklist()` → async `generateChecklistAsync()`
- **Mode 1 (Rules)**: If `VisaRuleSet` exists → `VisaChecklistEngineService.generateChecklist()` → GPT-4 with rules
- **Mode 2 (Legacy)**: If no rules or rules fail → `AIOpenAIService.generateChecklistLegacy()` → GPT-4 decides everything
- **Mode 3 (Fallback)**: If GPT-4 fails → `buildFallbackChecklistFromStaticConfig()` → static country/visa-type list
- **Storage**: Results cached in `DocumentChecklist` table with status: 'pending' | 'ready' | 'failed'

### Data Sources

- **VisaRuleSet**: DB table with `countryCode`, `visaType`, `data` (JSON), `isApproved` flag
- **EmbassySource**: DB table with `url`, `lastStatus` ('success' | 'failed' | 'pending'), `lastError`
- **Rule matching**: `VisaRulesService.getActiveRuleSet()` → normalizes visa type aliases (e.g., "b1/b2 visitor" → "tourist")
- **Embassy fetching**: `EmbassyCrawlerService` → retries 3x, sets `lastStatus='failed'` on 4xx/5xx errors

### What We Have

- ✅ Three-tier fallback system (rules → GPT-4 → static)
- ✅ Questionnaire V2 with summary extraction
- ✅ Risk score calculation from questionnaire
- ✅ Document merge logic (matches uploaded docs to checklist items)
- ✅ JSON validation with auto-correction

### What Is Missing

- ❌ EmbassySource content NOT passed to GPT-4 prompts (only VisaRuleSet is used)
- ❌ No RAG retrieval from EmbassySource pages
- ❌ Rules engine doesn't fetch EmbassySource when generating checklist
- ❌ Fallback checklist is generic (7-10 items, not personalized)
- ❌ No conditional document logic in VisaRuleSet (all documents treated as always required)

### System Fragility Points

- ⚠️ **Mode switching logic**: Rules mode fails silently → falls back to legacy → no error tracking
- ⚠️ **Questionnaire mapping**: Multiple format versions (legacy, V2, summary) → extraction can return null
- ⚠️ **GPT-4 prompts**: Legacy mode has 2000+ line prompt → prone to hallucinations
- ⚠️ **EmbassySource**: 403 errors stored but never used in checklist generation
- ⚠️ **Rule completeness**: No validation that VisaRuleSet covers all required documents

---

## ✅ PHASE 2: PROBLEM DIAGNOSIS (Top 10 Technical Problems)

### 1. **EmbassySource is orphaned**

- EmbassySource URLs are fetched and stored, but content is NEVER passed to GPT-4
- `VisaChecklistEngineService.buildSystemPrompt()` only uses `VisaRuleSet.data`, ignores EmbassySource
- **Impact**: GPT-4 cannot see latest embassy requirements, must rely on stale rules

### 2. **VisaRuleSet lacks conditional logic**

- Rule structure: `requiredDocuments[]` with `documentType`, `category`, but NO `condition` field
- **Impact**: Rules engine cannot say "sponsor_bank_statement only if sponsorType !== 'self'"
- **Result**: GPT-4 must guess which documents apply → inconsistent checklists

### 3. **Legacy GPT-4 prompt is bloated**

- `AIOpenAIService.generateChecklist()` has 1500+ line system prompt with redundant instructions
- **Impact**: High token cost, GPT-4 gets confused by conflicting rules
- **Result**: Validation failures, retries, fallback triggers

### 4. **Questionnaire → Context mapping is lossy**

- `buildAIUserContext()` extracts summary, but many fields are optional/nullable
- **Impact**: GPT-4 receives incomplete applicant profile
- **Result**: Generic checklists, missing personalized documents

### 5. **Rules engine prompt doesn't enforce structure**

- `VisaChecklistEngineService.buildSystemPrompt()` allows GPT-4 to add "extraRecommended" documents
- **Impact**: GPT-4 can hallucinate documents not in VisaRuleSet
- **Result**: Inconsistent checklists, validation warnings

### 6. **Fallback is too generic**

- `buildFallbackChecklistFromStaticConfig()` returns same 7-10 items regardless of applicant
- **Impact**: No personalization when GPT-4 fails
- **Result**: Poor user experience, missing country-specific documents

### 7. **EmbassySource 403 errors are ignored**

- Crawler sets `lastStatus='failed'` on 403, but checklist generation never checks this
- **Impact**: System tries to use broken sources
- **Result**: Wasted API calls, no error recovery

### 8. **No RAG retrieval from EmbassySource**

- System has `EmbassySource` table with URLs, but no vector search or semantic retrieval
- **Impact**: Cannot find relevant embassy pages for specific visa types
- **Result**: GPT-4 relies only on static VisaRuleSet

### 9. **Rule matching is fragile**

- `normalizeVisaTypeForRules()` handles aliases, but if alias mapping fails → no rules found
- **Impact**: Rules mode silently fails → falls back to legacy
- **Result**: Inconsistent behavior across visa types

### 10. **Document merge uses fuzzy matching**

- `findMatchingDocument()` uses Levenshtein distance → can match wrong documents
- **Impact**: Uploaded documents attached to wrong checklist items
- **Result**: User confusion, progress calculation errors

### **Bottleneck Analysis**

- **Primary bottleneck**: **GPT-4 prompt design** (legacy mode is too complex, rules mode lacks EmbassySource context)
- **Secondary bottleneck**: **VisaRuleSet completeness** (missing conditional logic, no EmbassySource integration)
- **Tertiary bottleneck**: **Questionnaire extraction** (lossy mapping, nullable fields)

### **What Must Be Fixed for Professional Level**

1. **Integrate EmbassySource into GPT-4 prompts** (RAG or direct text injection)
2. **Add conditional logic to VisaRuleSet** (conditions based on questionnaire answers)
3. **Simplify GPT-4 prompts** (remove redundancy, enforce structure)
4. **Improve questionnaire → context mapping** (fill all fields, validate completeness)
5. **Add RAG retrieval** (semantic search over EmbassySource pages)

---

## ✅ PHASE 3: ARCHITECTURE + PROMPTS

### Minimal Professional Architecture (10 Steps)

```
1. Questionnaire → Extract VisaQuestionnaireSummary
   └─> buildAIUserContext() (already exists, improve field extraction)

2. Check VisaRuleSet for countryCode + visaType
   └─> VisaRulesService.getActiveRuleSet() (already exists)

3. If rules exist → Filter by applicant conditions
   └─> NEW: applyConditionalRules(ruleSet, questionnaireSummary)
       └─> Returns: baseDocuments[] (documents that apply to this applicant)

4. Fetch EmbassySource pages (if available, not failed)
   └─> EmbassySourceService.listSources({ countryCode, visaType, isActive: true, lastStatus: 'success' })
   └─> EmbassyCrawlerService.crawlSource() → Get cleaned text

5. Extract requirements from EmbassySource (RAG or direct)
   └─> NEW: extractRequirementsFromEmbassyPages(embassyPages, visaType)
       └─> Returns: additionalRequirements[] (country-specific, not in rules)

6. Merge: baseDocuments + additionalRequirements
   └─> NEW: mergeDocumentLists(baseDocuments, additionalRequirements)
       └─> Returns: finalDocumentList[]

7. Build GPT-4 prompt with:
   - VisaRuleSet (filtered)
   - EmbassySource requirements (extracted)
   - Applicant profile (complete)
   - Clear instructions (no hallucinations)

8. Call GPT-4 with structured output
   └─> GPT-4 enriches documents with names, descriptions, whereToObtain (EN/UZ/RU)

9. Validate JSON response
   └─> json-validator.ts (already exists)

10. Store in DocumentChecklist table
    └─> Already exists
```

### Optimized Prompts

#### **Prompt 1: Checklist Generation (Rules + EmbassySource)**

```typescript
const systemPrompt = `You are a visa document checklist generator for Uzbek applicants.

INPUT DATA:
1. VISA_RULE_SET: Official embassy rules (JSON)
2. EMBASSY_REQUIREMENTS: Additional requirements from embassy pages (text)
3. APPLICANT_PROFILE: User questionnaire answers (JSON)

YOUR TASK:
- Generate a personalized checklist using ONLY documents from VISA_RULE_SET + EMBASSY_REQUIREMENTS
- Do NOT invent new documents
- For each document, decide if it applies to THIS applicant based on APPLICANT_PROFILE
- Output valid JSON matching the schema below

OUTPUT SCHEMA:
{
  "checklist": [
    {
      "documentType": "string",  // MUST match VISA_RULE_SET or EMBASSY_REQUIREMENTS
      "category": "required" | "highly_recommended" | "optional",
      "required": boolean,  // true only if category="required" AND applies to applicant
      "name": "string",  // English name
      "nameUz": "string",  // Uzbek translation
      "nameRu": "string",  // Russian translation
      "description": "string",  // 1-2 sentences, practical
      "whereToObtain": "string",  // Instructions for Uzbekistan
      "whereToObtainUz": "string",
      "whereToObtainRu": "string",
      "appliesToThisApplicant": boolean,  // Does THIS user need it?
      "reasonIfApplies": "string"  // Why it applies (if conditional)
    }
  ]
}

RULES:
- If sponsorType === "self" → skip sponsor documents
- If employmentStatus !== "employed" → skip employment letter
- If visaType === "student" AND hasUniversityAcceptance === false → mark acceptance_letter as "highly_recommended" (not required)
- If riskScore.level === "high" → add extra financial documents to "highly_recommended"
- Use country-specific terminology (I-20 for USA, LOA for Canada, CAS for UK)

Return ONLY valid JSON, no markdown, no comments.`;

const userPrompt = `VISA_RULE_SET:
${JSON.stringify(filteredRuleSet, null, 2)}

EMBASSY_REQUIREMENTS:
${embassyRequirementsText}

APPLICANT_PROFILE:
${JSON.stringify(applicantProfile, null, 2)}

Generate checklist. Return ONLY valid JSON.`;
```

#### **Prompt 2: Document Verification**

```typescript
const systemPrompt = `You are a document verification assistant for visa applications.

TASK:
- Analyze uploaded document image/PDF
- Verify it matches the required document type
- Check completeness, validity, and quality
- Provide feedback in Uzbek, Russian, and English

OUTPUT SCHEMA:
{
  "isValid": boolean,
  "confidence": number,  // 0-1
  "matchesDocumentType": boolean,
  "issues": string[],  // List of problems found
  "notesUz": "string",  // Feedback in Uzbek
  "notesRu": "string",  // Feedback in Russian
  "notesEn": "string"  // Feedback in English
}

RULES:
- If document is blurry/unreadable → isValid = false, confidence < 0.5
- If document type doesn't match → matchesDocumentType = false
- If document is expired → add to issues: "Document expired"
- If document is missing required fields → add to issues: "Missing field: [field name]"

Return ONLY valid JSON.`;

const userPrompt = `Document Type Required: ${documentType}
Document Name: ${fileName}
Document Preview: [OCR text or image description]

Verify this document. Return ONLY valid JSON.`;
```

---

## Summary

**Current State**: Three-tier system (rules → GPT-4 → fallback) with good structure but missing EmbassySource integration and conditional rule logic.

**Critical Fixes**:

1. Pass EmbassySource content to GPT-4
2. Add conditional logic to VisaRuleSet
3. Simplify GPT-4 prompts
4. Improve questionnaire → context mapping

**Professional Level**: Requires RAG retrieval from EmbassySource + conditional rule engine + streamlined prompts.
