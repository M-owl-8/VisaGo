# VisaRuleSet Debug Analysis - Code-Based Investigation

## Executive Summary

Based on code analysis, here are the **likely issues** preventing VisaRuleSet from being used, especially for Canada tourist applications:

### 🔴 Critical Issues Found

1. **Canada Missing from Visa Type Aliases** - `visitor` doesn't normalize to `tourist`
2. **Approval Status** - Rules may exist but `isApproved = false`
3. **Visa Type Mismatch** - Rules stored as `visitor` but system searches for `tourist`
4. **Missing Rule Sets** - Some countries may have no rules at all

---

## Detailed Analysis

### 1. Canada Tourist/Visitor Issue

**Code Evidence:**

**File**: `apps/backend/src/utils/visa-type-aliases.ts`

- ✅ US has aliases: `visitor → tourist`, `b1/b2 visitor → tourist`
- ✅ ES, DE, FR (Schengen) have aliases: `schengen tourist → tourist`
- ❌ **CA (Canada) has NO aliases defined**

**File**: `apps/backend/src/config/country-registry.ts` (lines 64-74)

```typescript
CA: {
  code: 'CA',
  name: 'Canada',
  defaultVisaTypes: {
    tourist: 'Visitor',  // ← Canada uses "Visitor" as the visa type name
    student: 'Study Permit',
  },
}
```

**Problem Flow:**

1. **Application uses**: `countryCode = "CA"`, `visaType = "Visitor"` or `"visitor"`
2. **System normalizes** via `normalizeVisaTypeForRules("CA", "visitor")`:
   - Checks `VISA_TYPE_RULE_ALIASES["CA"]` → **NOT FOUND** (no entry for CA)
   - Removes "visa" suffix → `"visitor"`
   - Returns: `"visitor"` (unchanged)
3. **System searches for**: `countryCode = "CA"`, `visaType = "visitor"`, `isApproved = true`
4. **Rule might be stored as**: `countryCode = "CA"`, `visaType = "tourist"`, `isApproved = true`
5. **Result**: ❌ **NO MATCH** → Falls back to unified GPT-4 validation

**Expected Fix:**

Add Canada to visa type aliases:

```typescript
// In apps/backend/src/utils/visa-type-aliases.ts
CA: {
  'visitor': 'tourist',
  'visitor visa': 'tourist',
  'tourist': 'tourist', // Explicit mapping
},
```

**OR** ensure rule is stored as `visaType = "visitor"` (but breaks consistency with other countries).

---

### 2. System Search Logic

**File**: `apps/backend/src/services/visa-rules.service.ts` (lines 38-78)

The system searches using:

```typescript
// 1. Normalize country code
const normalizedCountryCode = normalizeCountryCode(countryCodeRaw) || countryCodeRaw.toUpperCase();
// Result: "CA", "US", "GB", etc. (ISO alpha-2)

// 2. Normalize visa type
const normalizedVisaType = normalizeVisaTypeForRules(normalizedCountryCode, visaTypeRaw);
// Result: "tourist", "student", etc. (or original if no alias)

// 3. Query database
const ruleSet = await prisma.visaRuleSet.findFirst({
  where: {
    countryCode: normalizedCountryCode, // Must match exactly
    visaType: normalizedVisaType, // Must match exactly (case-insensitive in query)
    isApproved: true, // MUST be true
  },
  orderBy: { version: 'desc' }, // Uses latest version
});
```

**Critical Requirements:**

- ✅ `countryCode` must match (exact, case-sensitive in DB)
- ✅ `visaType` must match (case-insensitive comparison)
- ✅ `isApproved` must be `true`
- ✅ Uses latest `version` if multiple exist

---

### 3. Expected Normalizations

**Country Codes** (from `country-registry.ts`):

- `CAN` → `CA`
- `USA` → `US`
- `UK`, `GBR` → `GB`
- `AUS` → `AU`
- `UAE`, `Emirates` → `AE`
- `DEU` → `DE`
- `ESP` → `ES`
- `JPN` → `JP`
- `KOR` → `KR`

**Visa Types** (from `visa-type-aliases.ts`):

- US: `b1/b2 visitor`, `visitor`, `visitor visa` → `tourist`
- Schengen (ES, DE, FR, etc.): `schengen tourist`, `schengen visa` → `tourist`
- **CA, AU, GB**: ❌ **NO ALIASES** → `visitor` stays as `visitor`

---

### 4. What the Debug Script Will Find

When you run the script with `DATABASE_URL` set, it will show:

#### A. Existing Rules Table

```
┌─────────┬─────────────┬───────────┬────────────┬─────────┐
│ id      │ countryCode │ visaType  │ isApproved │ version │
├─────────┼─────────────┼───────────┼────────────┼─────────┤
│ abc123  │ CA          │ visitor   │ false      │ 1       │ ← NOT APPROVED
│ def456  │ CA          │ tourist   │ true       │ 2       │ ← APPROVED but wrong type
│ ghi789  │ US          │ tourist   │ true       │ 1       │ ← OK
└─────────┴─────────────┴───────────┴────────────┴─────────┘
```

#### B. System Search Scenarios

```
┌──────────┬───────────────┬──────────────────┬─────────────────┬────────────┬──────────────┬──────────────┐
│ Input    │ Input         │ Normalized       │ Normalized      │ Rule       │ Latest       │ Issue        │
│ Country  │ VisaType      │ Country          │ VisaType        │ Found      │ Version      │              │
├──────────┼───────────────┼──────────────────┼─────────────────┼────────────┼──────────────┼──────────────┤
│ CA       │ visitor       │ CA               │ visitor         │ ❌         │ 2 (approved) │ TYPE MISMATCH│
│ CA       │ tourist       │ CA               │ tourist         │ ✅         │ 2 (approved) │ OK           │
│ US       │ b1/b2 visitor │ US               │ tourist         │ ✅         │ 1 (approved) │ OK           │
└──────────┴───────────────┴──────────────────┴─────────────────┴────────────┴──────────────┴──────────────┘
```

#### C. Mismatches Found

```
❌ MISMATCHES FOUND:
┌──────────────────────┬─────────┬───────────┬─────────┬──────────┬────────────────────────────┐
│ Issue                │ Country │ Visa Type │ Actual  │ Expected │ Details                     │
├──────────────────────┼─────────┼───────────┼─────────┼──────────┼────────────────────────────┤
│ Rule not approved    │ CA      │ visitor   │ false   │ true     │ Rule exists but isApproved │
│ Visa type mismatch   │ CA      │ visitor   │ visitor │ tourist  │ Should normalize to tourist│
└──────────────────────┴─────────┴───────────┴─────────┴──────────┴────────────────────────────┘
```

#### D. Missing Rule Sets

```
MISSING RULE SETS:
┌─────────────┬───────────┬──────────────────┬──────────────────────────────┐
│ countryCode │ visaType  │ normalizedVisaType│ reason                       │
├─────────────┼───────────┼──────────────────┼──────────────────────────────┤
│ CA          │ visitor   │ visitor           │ No rule set found            │
│ AU          │ visitor   │ visitor           │ No rule set found            │
│ GB          │ visitor   │ visitor           │ No rule set found            │
└─────────────┴───────────┴──────────────────┴──────────────────────────────┘
```

---

## Recommended Fixes

### Fix 1: Add Canada (and other countries) to Visa Type Aliases

**File**: `apps/backend/src/utils/visa-type-aliases.ts`

Add after line 34 (after US section):

```typescript
CA: {
  'visitor': 'tourist',
  'visitor visa': 'tourist',
  'tourist': 'tourist',
},
AU: {
  'visitor': 'tourist',
  'visitor visa': 'tourist',
  'tourist': 'tourist',
},
GB: {
  'visitor': 'tourist',
  'standard visitor': 'tourist',
  'visitor visa': 'tourist',
  'tourist': 'tourist',
},
```

### Fix 2: Ensure Rules Are Stored with Normalized Types

**Action**: Update existing rules to use `visaType = "tourist"` instead of `"visitor"`

**SQL**:

```sql
UPDATE "VisaRuleSet"
SET "visaType" = 'tourist'
WHERE "countryCode" = 'CA' AND "visaType" = 'visitor';
```

**Prisma**:

```typescript
await prisma.visaRuleSet.updateMany({
  where: {
    countryCode: 'CA',
    visaType: 'visitor',
  },
  data: {
    visaType: 'tourist',
  },
});
```

### Fix 3: Approve Draft Rules (if correct)

**Prisma**:

```typescript
await prisma.visaRuleSet.update({
  where: { id: 'rule-id' },
  data: {
    isApproved: true,
    approvedAt: new Date(),
    approvedBy: 'admin',
  },
});
```

### Fix 4: Unapprove Old Versions

If multiple versions are approved, unapprove old ones:

```typescript
// Find all approved rules for CA tourist
const caRules = await prisma.visaRuleSet.findMany({
  where: {
    countryCode: 'CA',
    visaType: 'tourist',
    isApproved: true,
  },
  orderBy: { version: 'desc' },
});

// Keep only the latest, unapprove others
if (caRules.length > 1) {
  const latest = caRules[0];
  const oldVersions = caRules.slice(1);

  for (const old of oldVersions) {
    await prisma.visaRuleSet.update({
      where: { id: old.id },
      data: { isApproved: false },
    });
  }
}
```

---

## How to Run the Debug Script

### Prerequisites

1. **Set DATABASE_URL**:

   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="postgresql://user:password@host:5432/dbname"

   # Linux/Mac
   export DATABASE_URL="postgresql://user:password@host:5432/dbname"
   ```

2. **Or create `.env` file** in `apps/backend/`:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```

### Run Script

```bash
cd apps/backend
npx tsx src/services/visa-ruleset-debug.ts
```

### For Production (Railway)

```bash
railway run --service backend npx tsx src/services/visa-ruleset-debug.ts
```

---

## Expected Output Summary

The script will produce:

1. ✅ **Table of all rules** in database
2. ✅ **System search scenarios** showing what it looks for
3. ✅ **Mismatches** with specific issues
4. ✅ **Missing rule sets** for expected countries
5. ✅ **Suggested fix commands** (Prisma code)
6. ✅ **Canada-specific analysis** with detailed breakdown

---

## Next Steps

1. **Run the debug script** with your DATABASE_URL
2. **Review the output** - especially "MISMATCHES FOUND" section
3. **Apply fixes**:
   - Add visa type aliases for CA, AU, GB
   - Update rules to use normalized visa types
   - Approve correct rules
   - Unapprove old versions
4. **Re-run debug script** to verify fixes
5. **Test application** - Canada tourist should now use VisaRuleSet

---

## Files Created

1. ✅ `apps/backend/src/services/visa-ruleset-debug.ts` - Debug script
2. ✅ `apps/backend/src/services/visa-ruleset-debug-README.md` - Usage guide
3. ✅ `apps/backend/docs/visa-ruleset-debug-summary.md` - Summary document
4. ✅ `apps/backend/docs/visa-ruleset-debug-analysis.md` - This analysis

---

## Summary

**Root Cause**: Canada (and possibly AU, GB) are missing from visa type aliases, so `"visitor"` doesn't normalize to `"tourist"`. The system searches for `visaType = "visitor"` but rules are likely stored as `visaType = "tourist"`.

**Solution**: Add alias mappings + ensure rules use normalized types (`tourist`).

**Status**: Debug script is ready. Run it with DATABASE_URL to see exact mismatches and get fix commands.
