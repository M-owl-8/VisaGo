# Phase 2 Implementation Report: Reasoning + Explanations

## Summary of Changes

This report documents the implementation of Phase 2, which introduces explicit risk drivers and improves AI reasoning and explanations to make the system behave like a real visa officer explaining its decisions.

### Files Modified

1. **`apps/backend/src/types/ai-context.ts`**
   - Added `RiskDriver` type definition
   - Added `riskDrivers?: RiskDriver[]` field to `CanonicalAIUserContext`

2. **`apps/backend/src/services/ai-context.service.ts`**
   - Added `computeRiskDrivers()` function to calculate explicit risk factors
   - Added `computeRiskLevel()` centralized function for consistent risk level mapping
   - Updated `buildCanonicalAIUserContext()` to compute and include `riskDrivers`
   - Enhanced logging to include `riskDrivers` in canonical context logs

3. **`apps/backend/src/services/visa-checklist-engine.service.ts`**
   - Updated system prompt to include risk-driven document selection instructions
   - Added explicit risk driver → document mapping guidelines
   - Updated user prompt to include `RISK_DRIVERS` in context
   - Enhanced logging to include `riskDrivers` and `riskLevel` in checklist generation logs

4. **`apps/backend/src/services/visa-risk-explanation.service.ts`**
   - Updated to use centralized `computeRiskLevel()` function
   - Enhanced system prompt to use `riskDrivers` explicitly
   - Updated user prompt to include `RISK_DRIVERS` and stronger country consistency rules
   - Improved risk level consistency enforcement (always use canonical risk level)
   - Enhanced country name mismatch prevention with explicit warnings in prompts

5. **`apps/backend/src/services/visa-checklist-explanation.service.ts`**
   - Updated system prompt to reference `riskDrivers` in document explanations
   - Enhanced user prompt to include `RISK_DRIVERS` section
   - Added instructions to explicitly mention which risk driver(s) each document addresses

6. **`apps/backend/src/utils/gpt-logging.ts`**
   - Extended `ChecklistGenerationLog` interface to include `riskDrivers` and `riskLevel` fields

---

## Risk Drivers

### How Risk Drivers are Computed

Risk drivers are computed in `computeRiskDrivers()` function in `ai-context.service.ts` based on expert fields:

**Financial Risk Drivers:**

- `low_funds`: if `financialSufficiencyRatio < 0.8`
- `borderline_funds`: if `0.8 <= financialSufficiencyRatio < 1.1`

**Ties Risk Drivers:**

- `weak_ties`: if `tiesStrengthScore < 0.5`
- `no_property`: if `hasPropertyInUzbekistan === false`
- `no_employment`: if not employed/student and no stable income

**Travel History Risk Drivers:**

- `limited_travel_history`: if no travel history or `travelHistoryLabel` is 'none'/'limited'
- `previous_visa_refusals`: if `previousVisaRejections > 0` or `hasOverstayHistory === true`

**Other Risk Drivers:**

- `is_minor`: if `age < 18`
- `sponsor_based_finance`: if `sponsorType !== 'self'`
- `self_employed_without_proof`: if self-employed but no income proof
- `big_funds_vs_low_income`: if available funds are > 24 months of income (suspicious pattern)
- `none`: used only when genuinely low risk (no risk drivers present)

### Where Risk Drivers are Used

1. **Checklist Generation (Rules Mode)**:
   - System prompt includes explicit risk driver → document mapping
   - User prompt includes `RISK_DRIVERS` array
   - GPT uses risk drivers to prioritize documents (required/highly_recommended/optional)
   - Documents that address significant risk drivers are marked with high priority

2. **Risk Explanation**:
   - System prompt instructs GPT to list main risk drivers in human language
   - User prompt includes `RISK_DRIVERS` array
   - Recommendations are explicitly connected to specific risk drivers
   - Example: "Because your funds are borderline for a 3-month stay, we strongly recommend..."

3. **Checklist Explanation (Per-Document "Why?")**:
   - System prompt instructs GPT to reference risk drivers when explaining document importance
   - User prompt includes `RISK_DRIVERS` section
   - Explanations explicitly mention which risk driver(s) each document addresses
   - Example: "Because you have limited travel history (limited_travel_history risk driver), this itinerary helps..."

---

## Checklist Behavior

### How Risk Influences Document Selection

**Risk-Driven Document Mapping:**

1. **Financial Risk Drivers (`low_funds`, `borderline_funds`)**:
   - Critical docs: `bank_statement`, `sponsor_financial_documents`, `income_certificate`, `tax_returns`
   - Marked as `required` or `highly_recommended`, priority 1-5
   - `reasonIfApplies` explicitly mentions financial sufficiency concerns

2. **Ties Risk Drivers (`weak_ties`, `no_property`, `no_employment`)**:
   - Critical docs: `property_documents` (kadastr), `employment_letter`, `family_documents`
   - Marked as `required` or `highly_recommended`, priority 1-5
   - `reasonIfApplies` explains how document strengthens ties to home country

3. **Travel History Risk Drivers (`limited_travel_history`, `previous_visa_refusals`)**:
   - Critical docs: `travel_itinerary`, `accommodation_proof`, `invitation_letter`, `cover_letter`
   - Marked as `required` or `highly_recommended`, priority 1-5
   - `reasonIfApplies` explains how document addresses travel history concerns

4. **Minor Risk Driver (`is_minor`)**:
   - Critical docs: `birth_certificate`, `parental_consent`, `guardian_documents`
   - Marked as `required`, priority 1-3

5. **Sponsor Risk Driver (`sponsor_based_finance`)**:
   - Critical docs: `sponsor_financial_documents`, `sponsor_letter`, `sponsor_relationship_proof`
   - Marked as `required`, priority 1-3

### Confirmation: Rules-First Behavior Unchanged

- Phase 1 rules-first behavior is **completely preserved**
- Rules mode still uses `VisaRuleSet` base documents as the source of truth
- GPT only enriches documents (appliesToThisApplicant, reasonIfApplies, descriptions)
- Risk drivers guide **prioritization and reasoning**, not document addition/removal
- Base-rules fallback still works when GPT enrichment fails

---

## Explanations

### How "Why This Document?" Explanations are Tailored

**Structure:**

1. **Why Required (`whyEn`, `whyUz`, `whyRu`)**:
   - 3-5 sentences explaining document purpose
   - Embassy perspective (what officers look for)
   - Applicant-specific relevance (Uzbek context)
   - **Explicit mention of which RISK_DRIVER(s) this document addresses**

2. **Risk Addressed**:
   - Embedded in the "why" explanation
   - Examples:
     - "Because your financial sufficiency is borderline (low_funds risk driver), this bank statement is critical..."
     - "Because your ties score is weak (weak_ties risk driver), property documents help prove you will return..."
     - "Since you have limited travel history (limited_travel_history risk driver), this itinerary helps demonstrate genuine travel purpose..."

3. **How to Get**:
   - Practical guidance in Uzbek context
   - Examples:
     - "Request from your bank branch in Uzbekistan, ask for 6 months of statements in English or with an official translation."
     - "Get property document (kadastr hujjati) from kadastr organlari with official stamp."

4. **Common Mistakes**:
   - 2-3 tips per language (UZ/RU/EN)
   - Examples:
     - "Avoid large deposits right before application - embassy officers look for stable balance"
     - "Ensure property document (kadastr hujjati) has official stamp and matches your passport name"
     - "Employment letter (ish joyidan ma'lumotnoma) must include salary, position, and employment duration"

### Examples of Risk Mentioned in Explanations

**Example 1: Bank Statement for Low Funds**

```
"Because your financial sufficiency is borderline (low_funds risk driver), this bank statement is critical to demonstrate your ability to cover trip expenses. US embassy officers verify financial capacity, income stability, and ability to cover expenses without overstaying."
```

**Example 2: Property Document for Weak Ties**

```
"Because your ties strength is weak (weak_ties, no_property risk drivers), property documents help prove you will return to Uzbekistan. This document (kadastr hujjati) demonstrates your connection to home country and supports your visa application."
```

**Example 3: Travel Itinerary for Limited Travel History**

```
"Since you have limited travel history (limited_travel_history risk driver), this detailed itinerary helps demonstrate genuine travel purpose and reduces immigration intent concerns. Schengen embassy officers use this to verify travel plans and ensure you have realistic plans."
```

---

## Risk Explanation

### How Risk Score/Risk Level is Kept Consistent

**Centralized Risk Level Computation:**

1. **`computeRiskLevel()` Function**:
   - Located in `ai-context.service.ts`
   - Single source of truth for risk level mapping:
     - `riskScore < 40` → `'low'`
     - `40 <= riskScore < 70` → `'medium'`
     - `riskScore >= 70` → `'high'`

2. **Usage in Risk Explanation Service**:
   - `buildCanonicalAIUserContext()` uses `computeRiskLevel()` to set `riskScore.level`
   - Risk explanation service uses `computeRiskLevel()` to compute canonical risk level
   - GPT is instructed: "You MUST use the provided riskScore.level as the source of truth. You MUST NOT contradict the given riskLevel."
   - Post-processing enforces consistency: if GPT's riskLevel differs from canonical, canonical is used

3. **Logging**:
   - Risk level mismatches are logged with warnings
   - Both `gptRiskLevel` and `canonicalRiskLevel` are logged for debugging

### How Country Mismatches are Reduced

**Multi-Layer Protection:**

1. **Prompt-Level Guidance**:
   - System prompt explicitly includes country name and country code
   - User prompt includes "CRITICAL COUNTRY CONSISTENCY RULE" section
   - Explicit warning: "You MUST NOT mention any other destination country such as US, UK, Canada, Australia, etc."
   - Country name is computed from country code and included in prompt

2. **Post-Processing Detection**:
   - Existing country mismatch detection still works
   - Checks summaries and recommendations for incorrect country mentions
   - Automatically replaces incorrect country names with correct ones
   - Logs mismatches for monitoring

3. **Examples of Country Consistency Rules**:
   ```
   CRITICAL COUNTRY CONSISTENCY RULE:
   You are evaluating an application for Australia (AU).
   You MUST NOT mention any other destination country such as US, UK, Canada, etc.
   If you refer to the country, ALWAYS use "Australia".
   ```

---

## Open Limitations

### Things Still Approximate or Intentionally Not Changed

1. **Risk Driver Thresholds**:
   - Current thresholds (e.g., `financialSufficiencyRatio < 0.8` for `low_funds`) are heuristic
   - Could be fine-tuned based on evaluation data
   - Country-specific thresholds not yet implemented

2. **Short Preparation Time Risk Driver**:
   - `short_preparation_time` risk driver is defined but not yet computed
   - Requires travel date information which may not always be available

3. **Risk Driver Weights**:
   - All risk drivers are treated equally in document prioritization
   - Future enhancement: weight risk drivers by severity (e.g., `previous_visa_refusals` > `limited_travel_history`)

4. **Legacy Mode Risk Drivers**:
   - Legacy checklist mode may have incomplete canonical context
   - Risk drivers may be missing or incomplete in legacy mode
   - System is conservative when risk drivers are missing

5. **Document-to-Risk-Driver Mapping**:
   - Current mapping is heuristic and based on document categories
   - Could be enhanced with explicit document-to-risk-driver rules in `VisaRuleSet`

6. **Country-Specific Risk Patterns**:
   - Risk driver computation is generic across all countries
   - Future enhancement: country-specific risk patterns (e.g., US emphasizes ties more than Schengen)

7. **No Schema Changes**:
   - Risk drivers are not persisted in database (in-memory only)
   - Checklist items do not have explicit `riskDrivers` field in JSON schema
   - This is intentional for Phase 2 (no DB migrations)

---

## PHASE 2 IMPLEMENTATION COMPLETED

All Phase 2 objectives have been successfully implemented:

✅ **Risk Drivers**: Explicit risk factors computed and used across all AI tasks  
✅ **Checklist Risk-Driven**: Documents prioritized based on risk drivers  
✅ **Professional Explanations**: "Why this document?" explanations reference risk drivers explicitly  
✅ **Risk Explanation Consistency**: Centralized risk level computation ensures consistency  
✅ **Country Consistency**: Stronger prompt-level and post-processing protection  
✅ **Logging**: Risk drivers and risk level included in structured logs  
✅ **Backward Compatibility**: All changes are backward compatible, no DB migrations  
✅ **TypeScript Compilation**: All code compiles without errors

The system now behaves like a real visa officer explaining its decisions, with explicit risk drivers tying risk → documents → explanations in a clear, structured way.
