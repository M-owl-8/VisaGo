# RADICAL DIAGNOSIS: Personalized Checklist Not Reflecting Profile

## Executive Summary

After deep exploration of the codebase, I've identified **4 root causes** why the Germany Schengen tourist checklist appears generic instead of personalized for a self-employed, married applicant traveling >1 month:

1. **Profile Mapping Issues**: Minor inconsistencies in employment status values
2. **Prompt Restrictiveness**: GPT-4 is explicitly told NOT to add documents not in rules, and prompts don't mention self-employment or marital status
3. **Rules Data Gap**: If VisaRuleSet for DE tourist doesn't include self-employment/marital docs, GPT can't add them
4. **Pipeline Integrity**: No filtering detected - GPT output is preserved, but may be constrained by rules

---

## 1. ApplicantProfile Content Verification

### Current Status Values

**Frontend** (`frontend_new/src/data/questionnaireQuestions.ts`):
- Uses: `'self_employed'` (line 330)

**Backend Mapping** (`apps/backend/src/services/ai-context.service.ts`):
- Interface comment says: `'student' | 'employee' | 'entrepreneur' | 'unemployed' | 'other'` (line 27)
- Actual code checks: `'self_employed'` OR `'entrepreneur'` (lines 512-513)
- Mapping function accepts: `'self_employed'` (line 486, default 'employee')

**Verdict**: ✅ **WORKS** - Frontend sends `'self_employed'`, backend accepts it. However, the interface comment is misleading (says `'entrepreneur'` but code handles `'self_employed'`).

### Duration Values

**Frontend** (`frontend_new/src/types/questionnaire.ts`):
- Values: `'less_than_1_month' | '1_3_months' | '3_6_months' | '6_12_months' | 'more_than_1_year'` (lines 15-20)

**Backend** (`apps/backend/src/services/ai-context.service.ts`):
- Interface: `'less_than_1' | '1_3_months' | '3_6_months' | '6_12_months' | 'more_than_1_year'` (line 23)
- Mapping: Accepts `duration` from questionnaire (line 471-475, default `'1_3_months'`)

**Verdict**: ⚠️ **MINOR MISMATCH** - Frontend has `'less_than_1_month'`, backend expects `'less_than_1'`. For "more than 1 month", frontend would send `'3_6_months'` or `'6_12_months'`, which backend accepts.

### Simulated ApplicantProfile for Your Scenario

```typescript
const profile: ApplicantProfile = {
  travel: {
    purpose: 'tourism',
    duration: '3_6_months', // or '6_12_months' if user selected that
    previousTravel: true // or false
  },
  employment: {
    currentStatus: 'self_employed', // ✅ Correctly mapped
    hasStableIncome: true // ✅ Derived correctly (line 512-514)
  },
  financial: {
    financialSituation: 'stable_income', // or 'savings'
    isSponsored: false // ✅ Correctly derived (line 503-507)
  },
  familyAndTies: {
    maritalStatus: 'married', // ✅ Correctly mapped (line 493)
    hasChildren: 'no', // ✅ Correctly mapped (line 495)
    hasStrongTies: true // ✅ Correctly derived (line 517-523: married = true)
  },
  language: {
    englishLevel: 'intermediate' // default
  },
  meta: {
    countryCode: 'DE',
    visaType: 'tourist'
  }
}
```

**Issues Found**:
- ✅ Profile structure is correct
- ✅ `currentStatus: 'self_employed'` is properly mapped
- ✅ `hasStrongTies: true` is correctly derived from `maritalStatus: 'married'`
- ✅ `isSponsored: false` is correctly derived
- ⚠️ **Minor**: Interface comment says `'entrepreneur'` but code uses `'self_employed'` (cosmetic only)

---

## 2. GPT Prompts Inspection (RULES Mode)

### System Prompt Analysis

**File**: `apps/backend/src/services/document-checklist.service.ts`  
**Function**: `buildRulesModeSystemPrompt()` (lines 1227-1322)

**Key Instructions**:
1. ✅ "You MUST use ONLY the official visa rules provided below. Do NOT invent or add documents that are not in the rules." (line 1262)
2. ✅ "Do not invent extra categories that are not supported by rules unless clearly standard practice" (line 1263)
3. ✅ "If a document is NOT in the rules, do NOT add it unless it's a universally standard document" (line 1266)

**ApplicantProfile Usage Section** (lines 1269-1284):
- ✅ Mentions sponsor documents (if `isSponsored = true`)
- ✅ Mentions student documents (if `currentStatus = 'student'`)
- ✅ Mentions tie documents (if `hasStrongTies = true`)
- ✅ Mentions previous visa copies (if `previousTravel = true`)
- ✅ Mentions employment verification (if `hasStableIncome = true`)
- ❌ **MISSING**: No mention of self-employment documents
- ❌ **MISSING**: No mention of marital status documents (marriage certificate)
- ❌ **MISSING**: No mention of longer duration requirements

### User Prompt Analysis

**File**: `apps/backend/src/services/document-checklist.service.ts`  
**Function**: `buildRulesModeUserPrompt()` (lines 1327-1382)

**ApplicantProfile Display** (lines 1353-1354):
```typescript
APPLICANT PROFILE:
${JSON.stringify(applicantProfile, null, 2)}
```
✅ Profile is included as JSON

**Personalization Instructions** (lines 1359-1371):
1. ✅ Sponsor documents (if `isSponsored = true`)
2. ✅ Student documents (if `currentStatus = 'student'`)
3. ✅ Tie documents (if `hasStrongTies = true`)
4. ✅ Previous visa copies (if `previousTravel = true`)
5. ✅ Employment verification (if `hasStableIncome = true`)
6. ❌ **MISSING**: Self-employment documents
7. ❌ **MISSING**: Marital status documents
8. ❌ **MISSING**: Longer duration requirements

**Strict Requirements** (lines 1372-1380):
- "Include ALL required documents from the official rules"
- "Include conditional documents ONLY if they apply to this applicant based on APPLICANT PROFILE"
- "Do NOT add documents that are not in the official rules" ← **THIS IS THE PROBLEM**

### Root Cause: Prompt Restrictiveness

**The Issue**:
- GPT-4 is explicitly told: "Do NOT add documents that are not in the official rules"
- If VisaRuleSet for DE tourist doesn't include `self_employment_proof`, `business_registration`, `tax_return`, or `marriage_certificate`, GPT **cannot** add them
- Even though the ApplicantProfile shows `currentStatus: 'self_employed'` and `maritalStatus: 'married'`, GPT has no instruction to add these documents

**The Missing Instructions**:
```typescript
// NOT PRESENT IN CURRENT PROMPTS:
"If ApplicantProfile.employment.currentStatus = 'self_employed' or 'entrepreneur', 
 include self-employment proof documents (business registration, tax returns, 
 invoices, business license) as required if these exist in the rules or are 
 standard practice for this country/visa type."

"If ApplicantProfile.familyAndTies.maritalStatus = 'married' and the applicant 
 is traveling alone, include marriage certificate as highly_recommended to 
 demonstrate ties to home country."

"If ApplicantProfile.travel.duration indicates a longer stay (3_6_months or 
 more), ensure financial proof documents reflect the extended duration 
 requirements from the rules."
```

---

## 3. VisaRules Data for DE Tourist

### Database Structure

**Model**: `VisaRuleSet` (Prisma schema, lines 595-620)
- `countryCode`: String (e.g., "DE")
- `visaType`: String (e.g., "tourist")
- `data`: Json (VisaRuleSetData structure)
- `isApproved`: Boolean (only approved rules are used)

**VisaRuleSetData Structure** (`apps/backend/src/services/visa-rules.service.ts`, lines 15-75):
```typescript
{
  requiredDocuments: Array<{
    documentType: string; // e.g., "passport", "bank_statement"
    category: 'required' | 'highly_recommended' | 'optional';
    description?: string;
    validityRequirements?: string;
    formatRequirements?: string;
  }>;
  financialRequirements?: { ... };
  additionalRequirements?: { ... };
  sourceInfo?: { extractedFrom?: string; ... };
}
```

### Critical Question: What's in DE Tourist Rules?

**I cannot verify this without database access**, but based on the code flow:

1. **If DE tourist rules include**:
   - `self_employment_proof`, `business_registration`, `tax_return` → GPT can use them
   - `marriage_certificate` → GPT can use it

2. **If DE tourist rules DON'T include**:
   - These document types → GPT **cannot** add them (due to prompt restriction)
   - Result: Generic checklist regardless of ApplicantProfile

### Evidence from Code

**System Prompt** (line 1241-1249):
```typescript
REQUIRED DOCUMENTS (from official rules):
${ruleSet.requiredDocuments.map((doc: any, i: number) =>
  `${i + 1}. ${doc.documentType} (${doc.category})\n   ${doc.description || 'No description'}`
).join('\n\n')}
```

This means GPT only sees documents that are **already in the rules**. If self-employment docs aren't in the rules, GPT never sees them.

**Verdict**: 
- ⚠️ **LIKELY ISSUE**: If VisaRuleSet for DE tourist is generic (only standard Schengen docs), GPT cannot personalize beyond what's in the rules
- 🔍 **NEEDS VERIFICATION**: Check actual database content for DE tourist VisaRuleSet

---

## 4. GPT Output Pipeline Check

### Flow Analysis

**Step 1: GPT Response** (`generateChecklistFromRules`, lines 1006-1015)
- ✅ Calls GPT-4 with system + user prompts
- ✅ Uses `response_format: { type: 'json_object' }` for structured output

**Step 2: Validation** (lines 1020-1105)
- ✅ Parses JSON response
- ✅ Validates structure (10-16 items, all categories present, required fields)
- ✅ Retries once if validation fails
- ✅ Throws error if retry fails → triggers fallback

**Step 3: Mapping** (lines 1118-1138)
```typescript
const mappedChecklist = parsed.checklist.map((item: any) => ({
  document: item.document, // ✅ Preserved
  name: item.name, // ✅ Preserved
  category: item.category || ..., // ✅ Preserved (with fallback)
  required: item.required ?? ..., // ✅ Preserved
  description: item.description, // ✅ Preserved
  // ... all fields preserved
}));
```
✅ **NO FILTERING** - All GPT items are preserved

**Step 4: Conversion to Stored Format** (lines 524-561)
```typescript
items = aiChecklist.checklist.map((aiItem: any, index: number) => {
  const docType = aiItem.document || ...; // ✅ Uses GPT's document field
  return {
    documentType: docType, // ✅ Preserved
    name: aiItem.name, // ✅ Preserved
    category: aiItem.category ?? inferCategory(item), // ✅ Preserved
    // ... all fields preserved
  };
});
```
✅ **NO FILTERING** - All items are converted and stored

**Step 5: Storage** (lines 696-715)
```typescript
checklistData: JSON.stringify({
  items: sanitizedItems, // ✅ All items stored
  aiGenerated: true,
  aiFallbackUsed: false,
  aiErrorOccurred: false,
})
```
✅ **NO FILTERING** - All items stored in database

### Verdict: Pipeline Integrity

✅ **NO ISSUES FOUND**:
- GPT output is not filtered or dropped
- All document types from GPT are preserved
- Mapping preserves all fields
- Storage preserves all items

**However**, if GPT doesn't generate self-employment docs in the first place (due to prompt restrictions or missing rules), they won't appear in the stored checklist.

---

## 5. Root Cause Summary

### Issue Classification

#### 1. Profile Issues (MINOR)
- ✅ Profile structure is correct
- ✅ `self_employed` is properly mapped
- ✅ `hasStrongTies` is correctly derived
- ⚠️ Interface comment mismatch (cosmetic only)

**Impact**: **LOW** - Profile data is correct, but GPT doesn't know how to use it for self-employment

#### 2. Rules Issues (CRITICAL - NEEDS VERIFICATION)
- ❓ Unknown: Does DE tourist VisaRuleSet include self-employment/marital docs?
- ❓ If rules are generic (only standard Schengen docs), GPT cannot personalize

**Impact**: **HIGH** - If rules don't include these docs, GPT cannot add them

#### 3. Prompt Issues (CRITICAL)
- ❌ No instruction for self-employment documents
- ❌ No instruction for marital status documents
- ❌ No instruction for longer duration requirements
- ❌ Explicit restriction: "Do NOT add documents that are not in the official rules"

**Impact**: **HIGH** - Even if rules include these docs, GPT doesn't know to prioritize them based on profile

#### 4. Pipeline Issues (NONE)
- ✅ No filtering detected
- ✅ GPT output is preserved
- ✅ All items are stored correctly

**Impact**: **NONE** - Pipeline is working correctly

---

## 6. Proposed Targeted Fixes

### Fix 1: Enhance System Prompt with Self-Employment Instructions (HIGH PRIORITY)

**Location**: `buildRulesModeSystemPrompt()` in `document-checklist.service.ts`

**Add to "APPLICANT PROFILE USAGE" section** (after line 1282):
```typescript
- If ApplicantProfile.employment.currentStatus = 'self_employed' or 'entrepreneur', 
  include self-employment proof documents (business_registration, tax_return, 
  business_license, invoices) as required if these exist in the rules or are 
  standard practice for this country/visa type. For self-employed applicants, 
  employment_verification should be replaced or supplemented with business 
  registration and tax documents.
```

**Impact**: GPT will know to look for and prioritize self-employment docs when profile indicates self-employment

---

### Fix 2: Enhance User Prompt with Explicit Self-Employment Instructions (HIGH PRIORITY)

**Location**: `buildRulesModeUserPrompt()` in `document-checklist.service.ts`

**Add to "PERSONALIZATION INSTRUCTIONS" section** (after line 1370):
```typescript
6. If the applicant is self-employed (applicantProfile.employment.currentStatus = 'self_employed' or 'entrepreneur'), 
   include self-employment proof documents as required (e.g., business_registration, 
   tax_return, business_license, invoices). Replace generic "employment_verification" 
   with specific self-employment documents if available in the rules.

7. If the applicant is married but traveling alone (applicantProfile.familyAndTies.maritalStatus = 'married' 
   and applicantProfile.familyAndTies.hasChildren = 'no'), include marriage certificate 
   as highly_recommended to demonstrate strong ties to home country, if supported by rules.

8. If the applicant is traveling for an extended duration (applicantProfile.travel.duration = '3_6_months' 
   or '6_12_months'), ensure financial proof documents reflect the extended duration 
   requirements (e.g., bank statements covering the full period, proof of sufficient 
   funds for the entire stay).
```

**Impact**: GPT receives explicit instructions to personalize based on self-employment, marital status, and duration

---

### Fix 3: Relax Prompt Restrictiveness for Standard Practice Documents (MEDIUM PRIORITY)

**Location**: `buildRulesModeSystemPrompt()` in `document-checklist.service.ts`

**Modify line 1266**:
```typescript
// BEFORE:
"If a document is NOT in the rules, do NOT add it unless it's a universally standard document (e.g., passport, passport photo)."

// AFTER:
"If a document is NOT in the rules, you may still add it if:
1. It is a universally standard document (e.g., passport, passport photo), OR
2. It is standard practice for this specific applicant profile (e.g., business_registration 
   for self-employed applicants, marriage_certificate for married applicants traveling alone, 
   extended financial proof for longer stays) AND it is consistent with the country's visa 
   requirements for similar profiles."
```

**Impact**: GPT can add standard practice documents even if not explicitly in rules, as long as they're consistent with the profile

---

### Fix 4: Add Conditional Document Hints Based on Profile (OPTIONAL - ADVANCED)

**Location**: `generateChecklistFromRules()` in `document-checklist.service.ts`

**Add before calling GPT** (after line 982):
```typescript
// Build profile-based document hints
const profileHints: string[] = [];
if (profileToUse.employment.currentStatus === 'self_employed' || 
    profileToUse.employment.currentStatus === 'entrepreneur') {
  profileHints.push('business_registration', 'tax_return', 'business_license');
}
if (profileToUse.familyAndTies.maritalStatus === 'married' && 
    profileToUse.familyAndTies.hasChildren === 'no') {
  profileHints.push('marriage_certificate');
}
if (profileToUse.travel.duration === '3_6_months' || 
    profileToUse.travel.duration === '6_12_months') {
  profileHints.push('extended_bank_statement', 'proof_of_extended_funds');
}

// Add hints to user prompt
if (profileHints.length > 0) {
  userPrompt += `\n\nPROFILE-BASED DOCUMENT HINTS:\nBased on the applicant profile, 
  consider including these document types if they exist in the rules:\n${profileHints.join(', ')}`;
}
```

**Impact**: Provides explicit hints to GPT about which document types to look for based on profile

---

### Fix 5: Verify and Enhance DE Tourist VisaRuleSet (REQUIRES DATABASE ACCESS)

**Action**: Query database for DE tourist VisaRuleSet and verify:
1. Does it include `self_employment_proof`, `business_registration`, `tax_return`?
2. Does it include `marriage_certificate` or `family_ties_proof`?
3. If not, consider adding them via embassy sync or manual approval

**Impact**: Ensures rules data supports personalization

---

## 7. Recommended Implementation Order

1. **Fix 2** (User Prompt) - **IMMEDIATE** - Easiest, highest impact
2. **Fix 1** (System Prompt) - **IMMEDIATE** - Complements Fix 2
3. **Fix 3** (Relax Restrictiveness) - **SHORT TERM** - Allows GPT more flexibility
4. **Fix 4** (Profile Hints) - **OPTIONAL** - Advanced enhancement
5. **Fix 5** (Verify Rules) - **ONGOING** - Requires database access and rule updates

---

## 8. Testing Plan

After implementing fixes:

1. **Test Case**: Self-employed, married, >1 month duration, DE tourist
2. **Expected Result**: Checklist includes:
   - ✅ Business registration / tax returns (required)
   - ✅ Marriage certificate (highly_recommended)
   - ✅ Extended financial proof (required)
   - ✅ Standard Schengen docs (passport, insurance, etc.)
3. **Verify Logs**:
   - `[Checklist][ApplicantProfile]` shows correct profile
   - `[OpenAI][Checklist] Using RULES mode (DE, tourist)`
   - GPT response includes self-employment and marital docs
   - Stored checklist has `aiGenerated: true` and 12+ items

---

## Conclusion

**Primary Root Cause**: GPT-4 is not receiving explicit instructions to personalize for self-employment, marital status, or longer duration. The prompt restriction ("Do NOT add documents not in rules") combined with missing instructions means GPT defaults to generic Schengen checklist.

**Secondary Root Cause**: Unknown whether DE tourist VisaRuleSet includes self-employment/marital docs. If not, GPT cannot use them even with better prompts.

**Recommended Action**: Implement Fixes 1, 2, and 3 immediately. This will enable GPT to personalize checklists based on ApplicantProfile even if rules are generic, as long as the documents are "standard practice" for the profile type.


