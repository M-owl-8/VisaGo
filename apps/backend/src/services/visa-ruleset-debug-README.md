# VisaRuleSet Debug Tool

## Purpose

This tool investigates why `VisaRuleSet` was NOT used for applications (e.g., Canada tourist). It checks for mismatches in:

- Country codes (CA vs CAN, etc.)
- Visa types (visitor vs tourist, etc.)
- Approval status (isApproved = false)
- Version conflicts (multiple approved versions)

## Usage

### Prerequisites

1. Set `DATABASE_URL` environment variable to your PostgreSQL connection string
2. Ensure you have read access to the `VisaRuleSet` table

### Run the Script

```bash
cd apps/backend

# Option 1: Use .env file (if DATABASE_URL is set there)
npx tsx src/services/visa-ruleset-debug.ts

# Option 2: Set DATABASE_URL inline
DATABASE_URL="postgresql://user:password@host:5432/dbname" npx tsx src/services/visa-ruleset-debug.ts
```

### For Production (Railway/Remote)

```bash
# Via Railway CLI
railway run --service backend npx tsx src/services/visa-ruleset-debug.ts

# Or SSH into server and run
ssh user@server
cd /path/to/apps/backend
DATABASE_URL="..." npx tsx src/services/visa-ruleset-debug.ts
```

## Output Sections

The script produces:

1. **Existing Rules in Database**: All VisaRuleSet rows with country, visaType, approval status, version
2. **Expected Country Codes**: Priority countries (US, CA, GB, AU, AE, DE, ES, FR, JP, KR)
3. **Normalized Visa Types**: What the system expects (tourist, student, work, business)
4. **System Search Scenarios**: Shows what the system searches for when given various inputs
5. **Mismatches Found**: Lists all issues (not approved, wrong visa type, etc.)
6. **Missing Rule Sets**: Countries/visa types that have no approved rules
7. **Suggested Fix Commands**: Prisma commands to fix the issues
8. **Canada-Specific Analysis**: Detailed breakdown for Canada tourist/visitor

## Example Output

```
===== VISA RULESET DEBUG START =====

-- EXISTING RULES IN DATABASE --
┌─────────┬─────────────┬───────────┬────────────┬─────────┐
│ id      │ countryCode │ visaType  │ isApproved │ version │
├─────────┼─────────────┼───────────┼────────────┼─────────┤
│ abc123  │ CA          │ visitor   │ ❌         │ 1       │
│ def456  │ CA          │ tourist   │ ✅         │ 2       │
└─────────┴─────────────┴───────────┴────────────┴─────────┘

-- SYSTEM SEARCH SCENARIOS --
┌──────────────┬───────────────┬──────────────────┬─────────────────┬────────────┬──────────────┬──────────┐
│ Input Country│ Input VisaType│ Normalized Country│ Normalized VisaType│ Rule Found│ Latest Version│ Issue   │
├──────────────┼───────────────┼──────────────────┼─────────────────┼────────────┼──────────────┼──────────┤
│ CA           │ visitor       │ CA                │ tourist         │ ✅         │ 2 (approved) │ OK       │
└──────────────┴───────────────┴──────────────────┴─────────────────┴────────────┴──────────────┴──────────┘

❌ 1 MISMATCHES FOUND:
┌──────────────────────┬─────────┬───────────┬─────────┬──────────┬────────────────────────────┐
│ Issue                │ Country │ Visa Type │ Actual  │ Expected │ Details                     │
├──────────────────────┼─────────┼───────────┼─────────┼──────────┼────────────────────────────┤
│ Rule not approved    │ CA      │ visitor   │ false   │ true     │ Rule exists but isApproved │
└──────────────────────┴─────────┴───────────┴─────────┴──────────┴────────────────────────────┘

-- SUGGESTED FIX COMMANDS --
// Fix 1: Approve draft rules (if they are correct)
await prisma.visaRuleSet.update({
  where: { id: 'abc123' },
  data: { isApproved: true, approvedAt: new Date(), approvedBy: 'admin' }
});
```

## Common Issues

### Issue 1: Rule Not Approved

**Symptom**: Rule exists but `isApproved = false`  
**Fix**: Approve the rule if it's correct:

```typescript
await prisma.visaRuleSet.update({
  where: { id: 'rule-id' },
  data: { isApproved: true, approvedAt: new Date(), approvedBy: 'admin' },
});
```

### Issue 2: Visa Type Mismatch

**Symptom**: Rule stored as "visitor" but system expects "tourist"  
**Fix**: Update visa type to normalized value:

```typescript
await prisma.visaRuleSet.update({
  where: { id: 'rule-id' },
  data: { visaType: 'tourist' },
});
```

### Issue 3: Multiple Approved Versions

**Symptom**: Multiple versions approved, system uses latest  
**Fix**: Unapprove old versions:

```typescript
await prisma.visaRuleSet.update({
  where: { id: 'old-version-id' },
  data: { isApproved: false },
});
```

### Issue 4: Missing Rule Set

**Symptom**: No rule found for country/visa type  
**Fix**: Create new rule set (requires manual data entry or seed script)

## Canada Tourist/Visitor Specific

The script includes special analysis for Canada because:

- Canada's default visa type name is "Visitor" (not "Tourist")
- System normalizes "visitor" → "tourist" for rule lookup
- Rule must be stored as `visaType = "tourist"` to be found

**Expected behavior:**

- Application uses: `countryCode = "CA"`, `visaType = "visitor"`
- System searches for: `countryCode = "CA"`, `visaType = "tourist"` (normalized)
- Rule must exist as: `countryCode = "CA"`, `visaType = "tourist"`, `isApproved = true`

## Next Steps

After running the debug tool:

1. **Review the output** to identify all mismatches
2. **Copy the suggested fix commands** from the output
3. **Review each fix** before applying (especially approval changes)
4. **Apply fixes** using Prisma Studio, a migration script, or direct SQL
5. **Re-run the debug tool** to verify fixes

## Safety Notes

- This tool is **read-only** - it does not modify the database
- Fix commands are **suggestions only** - review before applying
- Always backup database before making bulk changes
- Test fixes on staging environment first
