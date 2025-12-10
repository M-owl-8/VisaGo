# VisaRuleSet Debug Tool - Summary

## What This Tool Does

The `visa-ruleset-debug.ts` script investigates why `VisaRuleSet` rules are not being used for applications. It identifies:

1. **Country code mismatches** (e.g., CAN vs CA)
2. **Visa type mismatches** (e.g., visitor vs tourist)
3. **Approval status issues** (rules not approved)
4. **Version conflicts** (multiple approved versions)
5. **Missing rule sets** (no rules for expected country/visa combinations)

## Known Issues to Check

### Canada Tourist/Visitor Issue

**Problem**: Canada uses "Visitor" as the visa type name, but the system may expect "tourist"

**Root Cause Analysis**:

- Application may use: `visaType = "visitor"` or `visaType = "Visitor"`
- System normalizes using `normalizeVisaTypeForRules("CA", "visitor")`
- **Issue**: Canada is NOT in `visa-type-aliases.ts`, so "visitor" stays as "visitor"
- System searches for: `countryCode = "CA"`, `visaType = "visitor"`
- But rule might be stored as: `countryCode = "CA"`, `visaType = "tourist"`

**Expected Fix**:

1. Add Canada to visa type aliases: `CA: { visitor: 'tourist', 'visitor visa': 'tourist' }`
2. OR: Store rule as `visaType = "visitor"` (but this breaks consistency)
3. **Recommended**: Add alias mapping + ensure rule is stored as "tourist"

### Other Potential Issues

**UK Tourist/Visitor**:

- UK uses "Standard Visitor" visa
- May need alias: `GB: { visitor: 'tourist', 'standard visitor': 'tourist' }`

**Australia Tourist/Visitor**:

- Similar to Canada, uses "Visitor" visa
- May need alias: `AU: { visitor: 'tourist', 'visitor visa': 'tourist' }`

## How to Use

1. **Set DATABASE_URL**:

   ```bash
   export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
   ```

2. **Run the script**:

   ```bash
   cd apps/backend
   npx tsx src/services/visa-ruleset-debug.ts
   ```

3. **Review output**:
   - Check "SYSTEM SEARCH SCENARIOS" table
   - Look for ❌ in "Rule Found" column
   - Review "MISMATCHES FOUND" section
   - Copy "SUGGESTED FIX COMMANDS"

4. **Apply fixes**:
   - Review each fix command
   - Apply via Prisma Studio, migration script, or SQL
   - Re-run debug tool to verify

## Output Interpretation

### ✅ Rule Found = OK

The system will find and use this rule set.

### ❌ Rule Found = NOT APPROVED

Rule exists but `isApproved = false`. Fix: Approve it.

### ❌ Rule Found = MISSING

No rule exists for this country/visa type. Fix: Create new rule set.

### ❌ Rule Found = Version mismatch?

Multiple approved versions exist. System uses latest, but old versions should be unapproved.

## Fix Commands Generated

The script generates Prisma commands like:

```typescript
// Approve draft rule
await prisma.visaRuleSet.update({
  where: { id: 'rule-id' },
  data: { isApproved: true, approvedAt: new Date(), approvedBy: 'admin' },
});

// Normalize visa type
await prisma.visaRuleSet.update({
  where: { id: 'rule-id' },
  data: { visaType: 'tourist' },
});

// Unapprove old version
await prisma.visaRuleSet.update({
  where: { id: 'old-version-id' },
  data: { isApproved: false },
});
```

## Next Steps After Running

1. **Review all mismatches** - Don't fix blindly
2. **Check alias mappings** - Add missing country aliases if needed
3. **Approve correct rules** - Only approve rules that are verified correct
4. **Normalize visa types** - Ensure all rules use normalized types (tourist, student)
5. **Create missing rules** - Use seed scripts or manual entry for missing combinations
6. **Re-run debug** - Verify all fixes worked

## Safety

- Script is **read-only** - won't modify database
- Fix commands are **suggestions** - review before applying
- Always **backup** before bulk changes
- Test on **staging** first
