# Visa Support Analysis - Implementation Report

## Summary

Created an analysis script to map all supported countries and visa types, their relationship to `VisaRuleSet` and `EmbassySource`, and how UI-visible visa types map to internal normalized values.

## Files Created/Modified

### 1. `apps/backend/scripts/analyze-supported-visas.ts` (NEW)

- Comprehensive analysis script that:
  - Queries all countries and their visa types
  - Queries all approved `VisaRuleSet` entries grouped by countryCode + visaType
  - Queries all `EmbassySource` entries grouped by countryCode + visaType
  - Queries `VisaApplication` and `Application` tables to see which combinations are actually used
  - Maps UI visa type names (e.g., "B1/B2 Visitor Visa") to normalized internal types (e.g., "tourist")
  - Produces a detailed report with summary statistics

### 2. `apps/backend/package.json` (MODIFIED)

- Added npm script: `analyze:visas`
- Usage: `pnpm analyze:visas` or `npm run analyze:visas`

### 3. `apps/backend/prisma/schema.sqlite.prisma` (MODIFIED)

- Fixed schema bug: Changed `Real?` to `Float?` for `VisaRuleSetCandidate.confidence` field
- `Real` is not a valid Prisma type; `Float` is the correct type

### 4. `apps/backend/prisma/schema.prisma` (MODIFIED)

- Fixed schema bug: Changed `Real?` to `Float?` for `VisaRuleSetCandidate.confidence` field

## Script Output Format

The script produces:

1. **Summary Statistics:**
   - Total countries
   - Total visa types
   - Countries/visa types with approved rules
   - Countries/visa types with embassy sources

2. **Detailed By Country:**
   - For each country, lists all visa types with:
     - UI name (e.g., "B1/B2 Visitor Visa")
     - Normalized internal type (e.g., "tourist")
     - Whether approved rules exist (version if yes)
     - Whether embassy source exists (status if yes)
     - Application count if used

3. **US-Specific Analysis:**
   - All US visa types
   - Which have rules vs. which don't
   - UI name → internal type mapping

4. **Countries with Approved Rules:**
   - List of all countryCode + visaType combinations that have approved rules

5. **JSON Output:**
   - Machine-readable format for programmatic use

## Key Features

### Visa Type Normalization

The script uses `normalizeVisaTypeForRules()` from `apps/backend/src/utils/visa-type-aliases.ts` to:

- Map UI names like "B1/B2 Visitor Visa" → "tourist" (for US)
- Handle alias mappings defined in `VISA_TYPE_RULE_ALIASES`
- Strip common suffixes like " Visa"

### Data Sources Analyzed

1. **Countries & VisaTypes** (from Prisma `Country` and `VisaType` models)
2. **VisaRuleSet** (approved entries only, grouped by countryCode + visaType, latest version)
3. **EmbassySource** (all entries, grouped by countryCode + visaType, showing active status and lastStatus)
4. **Applications** (both `VisaApplication` and `Application` models to see actual usage)

## Current Output

The script ran successfully but found:

- **Total Countries: 0**
- **Total Visa Types: 0**

This indicates the database is currently empty (no seed data or production data loaded).

## How to Use

1. **Run the analysis:**

   ```bash
   cd apps/backend
   npm run analyze:visas
   ```

2. **Expected output when data exists:**

   ```
   ====================================================================================================
   SUPPORTED COUNTRIES & VISA TYPES ANALYSIS
   ====================================================================================================

   SUMMARY:
     Total Countries: X
     Total Visa Types: Y
     ...

   DETAILED BY COUNTRY:
   US (United States):
     - visaType: "B1/B2 Visitor Visa" → "tourist" (rules: approved v2, embassySource: active/success)
     - visaType: "F-1 Student Visa" → "student" (rules: approved v1, embassySource: missing)
     ...
   ```

## Answers to Key Questions

### Which countryCode + visaType pairs currently have approved rules?

**Answer:** Run the script to see the "COUNTRIES WITH APPROVED RULES" section. Currently: None (database is empty).

### For US specifically: all visa types used and which ones currently have no rules?

**Answer:** Run the script to see the "US-SPECIFIC ANALYSIS" section. It will show:

- All US visa types
- Which have approved rules (with version)
- Which don't have rules (with embassy source status if available)
- UI name → internal type mapping

## UI Name → Internal Type Mapping

The mapping is handled by:

- **File:** `apps/backend/src/utils/visa-type-aliases.ts`
- **Function:** `normalizeVisaTypeForRules(countryCode, visaType)`
- **Current aliases:**
  - US: "b1/b2 visitor" → "tourist"
  - US: "b1/b2" → "tourist"
  - US: "visitor" → "tourist"

## Next Steps

1. **Seed the database** with countries and visa types to see actual analysis
2. **Add more visa type aliases** in `visa-type-aliases.ts` as needed
3. **Run the script regularly** to track which combinations have rules vs. which need rules
4. **Use the JSON output** for programmatic analysis or reporting

## Notes

- The script is **read-only** - it does not mutate any data
- It handles both legacy `VisaApplication` and newer `Application` models
- It groups rule sets by countryCode + visaType, showing only the latest approved version
- It shows embassy source status (active/inactive, success/failed/pending)
- It counts actual application usage to identify which combinations are in demand
