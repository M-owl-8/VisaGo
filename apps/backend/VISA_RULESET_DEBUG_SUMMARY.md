# VisaRuleSet Debug - Quick Summary

## ✅ What Was Created

1. **Debug Script**: `src/services/visa-ruleset-debug.ts`
   - Analyzes all VisaRuleSet rows in database
   - Tests system search scenarios
   - Identifies mismatches
   - Generates fix commands

2. **Documentation**:
   - `src/services/visa-ruleset-debug-README.md` - How to use
   - `docs/visa-ruleset-debug-summary.md` - Known issues
   - `docs/visa-ruleset-debug-analysis.md` - Detailed code analysis

## 🔴 Root Cause: Canada Tourist Issue

**Problem**: Canada uses "Visitor" visa type, but system expects "tourist"

**Why it fails**:

- Application: `countryCode="CA"`, `visaType="visitor"`
- System normalizes: `normalizeVisaTypeForRules("CA", "visitor")` → returns `"visitor"` (no alias for CA)
- System searches: `countryCode="CA"`, `visaType="visitor"`, `isApproved=true`
- Rule stored as: `countryCode="CA"`, `visaType="tourist"`, `isApproved=true`
- **Result**: ❌ NO MATCH → Falls back to GPT-4

## 🔧 Quick Fix

### Step 1: Add Canada to Visa Type Aliases

**File**: `apps/backend/src/utils/visa-type-aliases.ts`

Add after US section (around line 34):

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

### Step 2: Run Debug Script to Find Other Issues

```bash
cd apps/backend

# Set DATABASE_URL
$env:DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Run script
npx tsx src/services/visa-ruleset-debug.ts
```

### Step 3: Apply Fixes from Script Output

The script will generate Prisma commands like:

- Approve draft rules
- Normalize visa types
- Unapprove old versions
- Create missing rules

## 📊 What the Script Will Show

1. **All rules in database** (country, visaType, approved status, version)
2. **System search scenarios** (what it looks for vs what exists)
3. **Mismatches found** (with specific issues)
4. **Missing rule sets** (countries without rules)
5. **Fix commands** (ready to copy/paste)

## 🎯 Expected Issues

Based on code analysis, likely issues:

1. ❌ **Canada**: No alias mapping → `visitor` doesn't normalize to `tourist`
2. ❌ **Australia**: Same issue (uses "Visitor")
3. ❌ **UK**: Same issue (uses "Standard Visitor")
4. ⚠️ **Approval status**: Rules may exist but `isApproved = false`
5. ⚠️ **Version conflicts**: Multiple approved versions (system uses latest)

## 📝 Next Steps

1. **Add visa type aliases** for CA, AU, GB (see Quick Fix above)
2. **Run debug script** to see exact database state
3. **Apply fixes** from script output
4. **Re-run script** to verify
5. **Test application** - Canada tourist should now work

## 📚 Full Documentation

- **Usage**: `src/services/visa-ruleset-debug-README.md`
- **Analysis**: `docs/visa-ruleset-debug-analysis.md`
- **Summary**: `docs/visa-ruleset-debug-summary.md`

---

**Status**: ✅ Debug script ready. Add aliases + run script to fix issues.
