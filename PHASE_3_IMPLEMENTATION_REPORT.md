# Phase 3 Implementation Report: Embassy Rules + Country Playbooks

**Date:** 2024  
**Phase:** 3 - Embassy Rules + Country Playbooks  
**Goal:** Make GPT behave like a country-specialized visa expert for 10 priority countries and 2 visa types (tourist + student) by using official embassy/consulate rules as primary ground truth and adding `CountryVisaPlaybook` for typical patterns.

---

## Summary

Phase 3 successfully integrates **official embassy rules** and **country-specific playbooks** into all GPT prompts, making the AI system behave like a specialized visa consultant with deep knowledge of each destination country's requirements and typical patterns.

### Key Achievements

1. ✅ Created `CountryVisaPlaybook` configuration for 10 countries × 2 visa types
2. ✅ Integrated playbooks and embassy rules into checklist generation prompts
3. ✅ Enhanced checklist explanations with playbook and embassy rules context
4. ✅ Enhanced risk explanations with embassy rules and playbook guidance
5. ✅ Extended logging to track playbook and embassy rules usage
6. ✅ All changes backward-compatible (no DB migrations)

---

## 1. CountryVisaPlaybook Configuration

### Created: `apps/backend/src/config/country-visa-playbooks.ts`

**Purpose:** Centralized configuration for country-specific visa patterns, typical refusal reasons, officer focus areas, and document hints for 10 priority countries and 2 visa types.

**Structure:**

- `VisaCategory`: `'tourist' | 'student'`
- `PlaybookDocumentHint`: Document-specific hints with importance, typical use cases, and officer focus guidance
- `CountryVisaPlaybook`: Complete playbook for a country+visaType combination

**Coverage:**

- **10 Countries:** US, GB, CA, AU, DE, ES, JP, KR, AE, FR
- **2 Visa Types:** Tourist, Student
- **Total:** 20 playbooks (10 countries × 2 visa types)

**Key Fields:**

- `typicalRefusalReasonsEn`: High-level officer concerns (e.g., "Lack of strong ties", "Insufficient funds")
- `keyOfficerFocusEn`: What officers care about most (e.g., "Bank statements showing funds held for 28 days" for UK)
- `uzbekContextHintsEn`: Special notes for Uzbek applicants (e.g., "Kadastr documents are strong proof of ties")
- `documentHints`: Array of `PlaybookDocumentHint` with importance, typical use cases, and officer focus hints

**Example (US Tourist):**

```typescript
{
  countryCode: 'US',
  visaCategory: 'tourist',
  typicalRefusalReasonsEn: [
    'Lack of strong ties to home country',
    'Insufficient funds',
    'Unclear travel purpose',
  ],
  keyOfficerFocusEn: [
    'Demonstration of strong ties to Uzbekistan (property, family, stable employment)',
    'Sufficient financial capacity for the entire trip duration',
  ],
  uzbekContextHintsEn: [
    'Uzbek applicants often provide kadastr property documents to show ties.',
    'Bank statements are usually from Uzbek banks; translations may be required.',
  ],
  documentHints: [
    {
      documentType: 'bank_statement',
      importance: 'finance',
      typicalFor: ['self_funded', 'sponsored'],
      officerFocusHintEn: 'Officers check if funds match trip length and are consistent with income.',
    },
    // ... more hints
  ],
}
```

---

## 2. Checklist Generation Integration

### Modified: `apps/backend/src/services/visa-checklist-engine.service.ts`

**Changes:**

1. **Playbook Fetching:**
   - Added logic to derive `visaCategory` from `visaType` (tourist vs student)
   - Fetches `CountryVisaPlaybook` using `getCountryVisaPlaybook(countryCode, visaCategory)`
   - Passes playbook to both `buildSystemPrompt` and `buildSystemPromptLegacy`

2. **System Prompt Updates (`buildSystemPrompt`):**
   - Added `OFFICIAL_RULES` section (from `VisaRuleSet.data`) with clear hierarchy: **"You MUST strictly follow these rules"**
   - Added `COUNTRY_VISA_PLAYBOOK` section with:
     - Typical refusal reasons
     - Key officer focus areas
     - Uzbek context hints
     - Document hints with officer focus guidance
   - Explicit instruction: **"If embassy rules conflict with this playbook, embassy rules win."**
   - Updated `RISK-DRIVEN DOCUMENT SELECTION` section to reference both `OFFICIAL_RULES` and `COUNTRY_VISA_PLAYBOOK`

3. **Legacy Mode Updates (`buildSystemPromptLegacy`):**
   - Includes compact version of playbook if no rules exist
   - Emphasizes "typical practice" nature and lower precision

4. **Logging:**
   - Extended `logChecklistGeneration` to include:
     - `hasVisaRuleSet`: Boolean flag
     - `hasEmbassyContent`: Boolean flag
     - `hasCountryPlaybook`: Boolean flag
     - `rulesConfidence`: Number (0.0-1.0)
     - `playbookCountryCode`: String
     - `playbookVisaCategory`: String

**Example Prompt Structure:**

```
================================================================================
OFFICIAL EMBASSY RULES (Authoritative)
================================================================================

Source: embassy-website (last updated: 2024-01-15, confidence: 85%)

You MUST strictly follow these rules and must not contradict them.
If there is any conflict between these rules and your general knowledge, obey these rules.

{
  "requiredDocuments": [...],
  "financialRequirements": {...},
  ...
}

================================================================================
COUNTRY VISA PLAYBOOK (Typical Patterns & Officer Focus)
================================================================================

These are typical patterns and officer focus areas, not law. If embassy rules conflict with this playbook, embassy rules win.

Typical Refusal Reasons: Lack of strong ties; Insufficient funds; ...
Key Officer Focus: Bank statements showing funds held for 28 days; ...
Uzbek Context Hints: Uzbek bank statements must show 28-day fund holding period; ...

Document Hints:
- bank_statement (Importance: finance, Typical For: self_funded, sponsored): Officers check if funds match trip length...
- property_document (Importance: ties, Typical For: employed, self_employed): Kadastr documents are strong proof...
```

---

## 3. Checklist Explanation Integration

### Modified: `apps/backend/src/services/visa-checklist-explanation.service.ts`

**Changes:**

1. **Playbook Fetching:**
   - Fetches `CountryVisaPlaybook` based on `countryCode` and `visaCategory`
   - Finds relevant `PlaybookDocumentHint` for the specific `documentType`

2. **System Prompt Updates (`buildSystemPrompt`):**
   - Added instructions to reference `OFFICIAL_RULES_SUMMARY` and `COUNTRY_VISA_PLAYBOOK_SUMMARY`
   - Updated task instructions to:
     - Reference embassy rules when available: "According to official rules from [country] embassy..."
     - Reference country patterns: "Officers for [country] usually focus heavily on..."
     - Use `PlaybookDocumentHint.officerFocusHintEn` to explain what officers look for

3. **User Prompt Updates (`buildUserPrompt`):**
   - Added `OFFICIAL_RULES_SUMMARY` section with:
     - Source, last updated, confidence
     - Relevant document requirements from `VisaRuleSet`
     - Financial requirements (if applicable)
   - Added `COUNTRY_VISA_PLAYBOOK_SUMMARY` section with:
     - Typical refusal reasons
     - Key officer focus
     - Uzbek context hints
   - Added `PLAYBOOK_DOCUMENT_HINT` section (if available) with:
     - Document type, importance, typical use cases
     - Officer focus hint

4. **Output Requirements:**
   - Updated `WHY REQUIREMENTS` to explicitly mention:
     - How document addresses specific `riskDrivers`
     - Reference to embassy rules when available
     - Reference to country-specific patterns

**Example User Prompt Addition:**

```
================================================================================
OFFICIAL_RULES_SUMMARY (Phase 3)
================================================================================

Source: embassy-website
Last updated: 2024-01-15
Confidence: 85%

REQUIRED DOCUMENTS (relevant to bank_statement):
- bank_statement (required): Bank statements for last 6 months | Validity: Within 28 days

FINANCIAL REQUIREMENTS:
- Minimum Balance: $5,000 USD
- Bank Statement Months: 6

================================================================================
COUNTRY_VISA_PLAYBOOK (Typical Patterns - Phase 3)
================================================================================

TYPICAL REFUSAL REASONS:
- Funds not held for 28 days
- Lack of strong ties to home country

KEY OFFICER FOCUS:
- Bank statements showing funds held for a continuous 28-day period
- Strong ties to Uzbekistan (employment, property, family)

UZBEK CONTEXT HINTS:
- Uzbek bank statements must clearly show the 28-day fund holding period.

================================================================================
PLAYBOOK_DOCUMENT_HINT (Phase 3)
================================================================================

Document Type: bank_statement
Importance: finance
Typical For: self_funded, sponsored

OFFICER FOCUS HINT:
CRITICAL: Funds must be held for 28 consecutive days. Officers check for sudden large deposits.

Use this hint to explain what embassy officers typically look for in this document.
```

---

## 4. Risk Explanation Integration

### Modified: `apps/backend/src/services/visa-risk-explanation.service.ts`

**Changes:**

1. **Playbook Fetching:**
   - Fetches `CountryVisaPlaybook` based on `countryCode` and `visaCategory`
   - Passes both `ruleSet` and `playbook` to `buildUserPrompt`

2. **System Prompt Updates (`buildSystemPrompt`):**
   - Added `OFFICIAL_RULES_SUMMARY` and `COUNTRY_VISA_PLAYBOOK_SUMMARY` to context
   - Updated `RISK ASSESSMENT LOGIC` to include:
     - Consider `COUNTRY_VISA_PLAYBOOK_SUMMARY`'s "key officer focus" for each risk dimension
   - Added new section: **"EMBASSY RULES & COUNTRY PATTERNS (Phase 3)"**:
     - Use `OFFICIAL_RULES_SUMMARY` to explain "Where you stand vs typical embassy expectations"
     - Compare applicant's finances, ties, travel history to what officers for this country usually expect
     - Reference typical refusal reasons and officer focus areas
     - Connect recommendations to embassy rules: "Strongly recommended by embassy rules" or "Typical best practice for this country"

3. **Output Requirements:**
   - Updated `SUMMARY REQUIREMENTS` to include:
     - "Where applicant stands vs typical embassy expectations" (if `OFFICIAL_RULES_SUMMARY` or `COUNTRY_VISA_PLAYBOOK` available)
   - Updated `RECOMMENDATIONS REQUIREMENTS` to:
     - Explicitly mention if recommendation is "Strongly recommended by embassy rules" or "Typical best practice for this country"
     - Align recommendations with `OFFICIAL_RULES_SUMMARY` and `COUNTRY_VISA_PLAYBOOK_SUMMARY`

4. **User Prompt Updates (`buildUserPrompt`):**
   - Added `OFFICIAL_RULES_SUMMARY` section with:
     - Source, last updated, confidence
     - Financial requirements
     - Required documents count
     - Instruction: "Use this to explain 'Where you stand vs typical embassy expectations'"
   - Added `COUNTRY_VISA_PLAYBOOK_SUMMARY` section with:
     - Typical refusal reasons
     - Key officer focus
     - Uzbek context hints
     - Instruction: "If embassy rules conflict with playbook, embassy rules win."

5. **Final Instructions:**
   - Added three-part risk explanation structure:
     1. "Where you stand vs typical embassy expectations"
     2. "Main risk drivers"
     3. "Concrete improvement recommendations aligned with embassy rules"

**Example User Prompt Addition:**

```
================================================================================
OFFICIAL_RULES_SUMMARY (Phase 3)
================================================================================

Source: embassy-website
Last updated: 2024-01-15
Confidence: 85%

FINANCIAL REQUIREMENTS:
- Minimum Balance: $5,000 USD
- Bank Statement Months: 6
- Sponsor Allowed: Yes

REQUIRED DOCUMENTS COUNT: 12

Use this to explain "Where you stand vs typical embassy expectations" - compare applicant's profile to these official requirements.

================================================================================
COUNTRY_VISA_PLAYBOOK (Typical Patterns - Phase 3)
================================================================================

TYPICAL REFUSAL REASONS:
- Funds not held for 28 days
- Lack of strong ties to home country

KEY OFFICER FOCUS:
- Bank statements showing funds held for a continuous 28-day period
- Strong ties to Uzbekistan (employment, property, family)

UZBEK CONTEXT HINTS:
- Uzbek bank statements must clearly show the 28-day fund holding period.

Use this to understand typical patterns for this country and connect recommendations to country-specific best practices.
If embassy rules conflict with playbook, embassy rules win.
```

---

## 5. Logging Enhancements

### Modified: `apps/backend/src/utils/gpt-logging.ts`

**Changes:**

1. **Extended `ChecklistGenerationLog` Interface:**

   ```typescript
   export interface ChecklistGenerationLog {
     // ... existing fields ...
     // Phase 3: Embassy rules and playbook metadata
     hasVisaRuleSet?: boolean;
     hasEmbassyContent?: boolean;
     hasCountryPlaybook?: boolean;
     rulesConfidence?: number | null;
     playbookCountryCode?: string;
     playbookVisaCategory?: string;
   }
   ```

2. **Updated `logChecklistGeneration` Function:**
   - Includes new fields in log data:
     - `hasVisaRuleSet`: Whether `VisaRuleSet` exists
     - `hasEmbassyContent`: Whether embassy summary is available
     - `hasCountryPlaybook`: Whether playbook is available
     - `rulesConfidence`: Confidence score of embassy rules (0.0-1.0)
     - `playbookCountryCode`: Country code of playbook used
     - `playbookVisaCategory`: Visa category of playbook used

3. **Updated Call Sites:**
   - `visa-checklist-engine.service.ts`: Logs playbook and embassy rules metadata in both rules mode and rules_base_fallback mode

**Example Log Entry:**

```json
{
  "applicationId": "app_123",
  "country": "United Kingdom",
  "countryCode": "GB",
  "visaType": "tourist",
  "mode": "rules",
  "hasVisaRuleSet": true,
  "hasEmbassyContent": true,
  "hasCountryPlaybook": true,
  "rulesConfidence": 0.85,
  "playbookCountryCode": "GB",
  "playbookVisaCategory": "tourist",
  "riskDrivers": ["low_funds", "weak_ties"],
  "riskLevel": "medium"
}
```

---

## 6. Backward Compatibility

### No Breaking Changes

- ✅ **No Database Migrations:** All changes are code-only
- ✅ **No API Changes:** All existing endpoints maintain their contracts
- ✅ **Optional Fields:** All new playbook/embassy rules fields are optional
- ✅ **Graceful Degradation:** Services work correctly even if playbooks or embassy rules are missing
- ✅ **Type Safety:** All TypeScript types updated to handle optional playbook/embassy rules

### Fallback Behavior

- **If no playbook exists:** Services continue without playbook context (same as before)
- **If no embassy rules exist:** Services continue without embassy rules (same as before)
- **If both exist:** Services use both, with embassy rules taking precedence in case of conflict

---

## 7. Testing & Validation

### TypeScript Compilation

✅ **Status:** All TypeScript errors resolved  
✅ **Command:** `npx tsc --noEmit --project tsconfig.json`  
✅ **Result:** No compilation errors

### Key Validations

1. ✅ **Playbook Fetching:** Correctly derives `visaCategory` from `visaType` and fetches appropriate playbook
2. ✅ **Function Signatures:** All function signatures updated to accept optional `playbook` and `ruleSet` parameters
3. ✅ **Null Safety:** All playbook/ruleSet usage handles `null`/`undefined` gracefully
4. ✅ **Logging:** All new logging fields are optional and included only when available

---

## 8. Files Modified

### New Files

- `apps/backend/src/config/country-visa-playbooks.ts` (1,170+ lines)

### Modified Files

- `apps/backend/src/services/visa-checklist-engine.service.ts`
  - Added playbook fetching logic
  - Updated `buildSystemPrompt` to include `OFFICIAL_RULES` and `COUNTRY_VISA_PLAYBOOK`
  - Updated `buildSystemPromptLegacy` to include compact playbook
  - Extended logging with playbook/embassy rules metadata

- `apps/backend/src/services/visa-checklist-explanation.service.ts`
  - Added playbook fetching logic
  - Updated `buildSystemPrompt` to reference embassy rules and playbook
  - Updated `buildUserPrompt` to include `OFFICIAL_RULES_SUMMARY`, `COUNTRY_VISA_PLAYBOOK_SUMMARY`, and `PLAYBOOK_DOCUMENT_HINT`

- `apps/backend/src/services/visa-risk-explanation.service.ts`
  - Added playbook fetching logic
  - Updated `buildSystemPrompt` to include embassy rules and playbook guidance
  - Updated `buildUserPrompt` to include `OFFICIAL_RULES_SUMMARY` and `COUNTRY_VISA_PLAYBOOK_SUMMARY`
  - Updated risk explanation structure to three parts

- `apps/backend/src/utils/gpt-logging.ts`
  - Extended `ChecklistGenerationLog` interface with playbook/embassy rules metadata
  - Updated `logChecklistGeneration` to include new fields

---

## 9. Next Steps (Future Phases)

### Potential Enhancements

1. **Auto-Learning Pipeline (Track C):**
   - Integrate `EmbassySource` content into prompts
   - Use RAG for embassy page content
   - Generate candidate rules from embassy pages

2. **Evaluation Framework (Track E):**
   - Add evaluation scenarios for playbook integration
   - Measure impact of playbook vs no-playbook on checklist quality
   - Track embassy rules confidence impact on recommendations

3. **Playbook Refinement:**
   - Add more document hints based on real-world feedback
   - Refine typical refusal reasons based on embassy data
   - Expand Uzbek context hints

---

## 10. Summary

Phase 3 successfully transforms the AI system into a **country-specialized visa expert** by:

1. **Using official embassy rules as authoritative ground truth** - GPT is explicitly instructed to follow embassy rules strictly
2. **Adding country-specific playbooks** - GPT receives typical patterns, officer focus areas, and Uzbek context hints for each country+visaType
3. **Enhancing all prompts** - Checklist generation, explanations, and risk assessments now reference both embassy rules and playbooks
4. **Improving observability** - Logging tracks which sources (rules, embassy content, playbook) were used for each generation

**Result:** The system now behaves like a professional visa consultant with deep, country-specific knowledge while maintaining backward compatibility and graceful degradation.

---

**Phase 3 Status:** ✅ **COMPLETE**
