# Migration Notes: All-country / All-visa support & Generic RuleSets

## Scope

- Remove hardcoded country/visa enums; allow any country/visa type.
- Auto-provision generic `VisaRuleSet` for unknown combinations.
- Normalize via ISO country dataset and slugified visa types.
- Keep existing rules-first behavior for the 8 seeded tourist/student combinations.

## Backend Changes

- Country/visa enums removed from validation/types; inputs are free-form strings.
- Added ISO dataset (`apps/backend/src/data/countries-iso2.ts`) and `/api/meta/countries`.
- `CountriesService.getOrCreateCountry` resolves or creates countries via ISO mapping.
- `VisaRulesService.ensureRuleSetExists` auto-creates approved generic rulesets (versioned, editable).
- `DocumentChecklistService` uses Application model; shadow Application rows are created with `legacyVisaApplicationId` when only `VisaApplication` exists.
- Watchdog repairs “processing/pending” checklists older than 2 minutes by writing fallback ready checklists.
- `Application.legacyVisaApplicationId` (nullable, unique) maps legacy IDs to canonical Application rows.
- Status consistency: uses `processing` (accepts legacy `pending`), marks `failed` with `errorMessage`, then writes fallback.
- Document types map expanded; unknown doc types now slugify instead of null.

## Frontend Changes

- Country and visa type inputs are free-text with datalist suggestions.
- Questionnaire types now use strings for country/visa.
- Mapper maps arbitrary visa types to legacy payload purpose (best-effort).

## Data/Schema Notes

- Schema updated with `Application.legacyVisaApplicationId` (nullable, unique) to safely map legacy IDs.
- Generic rulesets stored in `VisaRuleSet` with `isApproved=true` (auto-provisioned, versioned).
- `DocumentChecklist.checklistData` remains STRING JSON; parsing still handles array or object-with-items.

## Compatibility

- Existing 8 priority countries + tourist/student rule sets remain preferred.
- New combinations get a generic approved ruleset, editable via DB (Railway).

## Recommended Manual Checks (no automatic migration run)

- Validate foreign keys Application/Country/VisaType exist for legacy rows.
- Consider backfilling Application rows if only VisaApplication exists for older data.
