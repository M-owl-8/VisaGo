# Manual Steps (Optional / Post-Deploy)

These steps are optional and can be run in Railway after deploy to align data with the new all-country/all-visa support.

## 1) Verify Country/VisaType Existence for Existing Applications

```sql
-- Orphaned applications (no Country)
SELECT a.id, a."countryId" FROM "Application" a LEFT JOIN "Country" c ON a."countryId" = c.id WHERE c.id IS NULL;

-- Orphaned applications (no VisaType)
SELECT a.id, a."visaTypeId" FROM "Application" a LEFT JOIN "VisaType" v ON a."visaTypeId" = v.id WHERE v.id IS NULL;
```

For any orphaned records, create the missing Country/VisaType (using ISO codes where possible) and update the Application row.

## 2) Backfill Application Rows (if only VisaApplication exists)

```sql
-- Find VisaApplication rows missing in Application
SELECT va.id FROM "VisaApplication" va LEFT JOIN "Application" a ON a.id = va.id WHERE a.id IS NULL;
```

For each missing row, insert into `Application` mirroring `VisaApplication` fields (`userId`, `countryId`, `visaTypeId`, `status`, timestamps) and set `legacyVisaApplicationId = va.id`.

## 3) Generic RuleSet Backfill (Optional Bulk)

If you want pre-created generic rules for all existing Application combos (countryCode + visaType slug):

1. Extract distinct pairs:

```sql
SELECT c.code AS country_code, LOWER(v.name) AS visa_type
FROM "Application" a
JOIN "Country" c ON a."countryId" = c.id
JOIN "VisaType" v ON a."visaTypeId" = v.id
GROUP BY c.code, LOWER(v.name);
```

2. For each pair lacking an approved `VisaRuleSet`, insert a row with:
   - `countryCode` (ISO upper)
   - `visaType` (slugified)
   - `data` = JSON of generic ruleset (see `apps/backend/src/data/generic-ruleset.ts`)
   - `isApproved` = true, `version` = 1 (or max+1), `createdBy` = 'system', `sourceSummary` = 'Generic default (editable)'

## 4) Checklist Status Cleanup

```sql
-- Move legacy 'pending' to 'processing'
UPDATE "DocumentChecklist" SET status = 'processing' WHERE status = 'pending';

-- Inspect stuck processing (>10 minutes)
SELECT id, "applicationId", status, "updatedAt" FROM "DocumentChecklist" WHERE status = 'processing' AND "updatedAt" < NOW() - INTERVAL '10 minutes';
```

Optionally regenerate those by deleting the checklist row; service will recreate with generic rules if no approved ruleset exists.

## 5) Country Codes Normalization

Ensure Country.code values are uppercase ISO. For any non-ISO codes, decide a mapping and update both Country.code and related VisaRuleSet.countryCode to match.

```sql
SELECT code, name FROM "Country" ORDER BY code;
```

## 6) Re-run Checklist Generation (Optional)

For applications missing checklists:

```sql
SELECT a.id FROM "Application" a LEFT JOIN "DocumentChecklist" dc ON dc."applicationId" = a.id WHERE dc.id IS NULL;
```

Trigger GET /api/document-checklist/:id for those IDs to generate using generic or existing rules.
