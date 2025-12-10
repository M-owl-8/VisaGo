/**
 * VisaRuleSet Debug Tool
 *
 * Investigates why VisaRuleSet was NOT used for applications.
 * Checks for mismatches in country codes, visa types, approval status, and versions.
 */

import { PrismaClient } from '@prisma/client';
import { normalizeCountryCode } from '../config/country-registry';
import { normalizeVisaTypeForRules } from '../utils/visa-type-aliases';

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set.');
  console.error('\nTo run this script:');
  console.error('1. Set DATABASE_URL in your .env file, or');
  console.error(
    '2. Run: DATABASE_URL="postgresql://..." npx tsx src/services/visa-ruleset-debug.ts'
  );
  console.error('\nExample:');
  console.error(
    '  DATABASE_URL="postgresql://user:pass@host:5432/dbname" npx tsx src/services/visa-ruleset-debug.ts'
  );
  process.exit(1);
}

const prisma = new PrismaClient();

interface RuleSetRow {
  id: string;
  countryCode: string;
  visaType: string;
  isApproved: boolean;
  version: number;
  createdAt: Date;
  sourceSummary?: string | null;
}

interface Mismatch {
  issue: string;
  ruleId: string;
  countryCode: string;
  visaType: string;
  actualValue: string;
  expectedValue: string;
  details?: string;
}

interface MissingRuleSet {
  countryCode: string;
  visaType: string;
  normalizedVisaType: string;
  reason: string;
}

async function debugVisaRuleSets() {
  console.log('\n===== VISA RULESET DEBUG START =====\n');

  // 1. Print all stored rule sets
  const allRules: RuleSetRow[] = await prisma.visaRuleSet.findMany({
    select: {
      id: true,
      countryCode: true,
      visaType: true,
      isApproved: true,
      version: true,
      createdAt: true,
      sourceSummary: true,
    },
    orderBy: [{ countryCode: 'asc' }, { visaType: 'asc' }, { version: 'desc' }],
  });

  console.log('-- EXISTING RULES IN DATABASE --');
  if (allRules.length === 0) {
    console.log('⚠️  NO RULES FOUND IN DATABASE\n');
  } else {
    console.table(
      allRules.map((r) => ({
        id: r.id.substring(0, 8) + '...',
        countryCode: r.countryCode,
        visaType: r.visaType,
        isApproved: r.isApproved ? '✅' : '❌',
        version: r.version,
        createdAt: r.createdAt.toISOString().split('T')[0],
      }))
    );
    console.log(`\nTotal rules: ${allRules.length}\n`);
  }

  // 2. Expected country codes (from COUNTRY_REGISTRY)
  const expectedCountries = ['US', 'CA', 'GB', 'AU', 'AE', 'DE', 'ES', 'FR', 'JP', 'KR'];
  console.log('-- EXPECTED COUNTRY CODES (from COUNTRY_REGISTRY) --');
  console.table(expectedCountries.map((c) => ({ countryCode: c })));
  console.log();

  // 3. Normalized visa types system uses (from visa-type-aliases.ts)
  const normalizedVisaTypes = ['tourist', 'student', 'work', 'business'];
  console.log('-- NORMALIZED VISA TYPES (system expects) --');
  console.table(normalizedVisaTypes.map((t) => ({ visaType: t })));
  console.log();

  // 4. Test scenarios: What the system searches for
  console.log('-- SYSTEM SEARCH SCENARIOS --');
  const testScenarios = [
    { countryCodeRaw: 'CA', visaTypeRaw: 'visitor' },
    { countryCodeRaw: 'CA', visaTypeRaw: 'tourist' },
    { countryCodeRaw: 'US', visaTypeRaw: 'b1/b2 visitor' },
    { countryCodeRaw: 'US', visaTypeRaw: 'tourist' },
    { countryCodeRaw: 'GB', visaTypeRaw: 'visitor' },
    { countryCodeRaw: 'GB', visaTypeRaw: 'tourist' },
    { countryCodeRaw: 'ES', visaTypeRaw: 'tourist' },
    { countryCodeRaw: 'DE', visaTypeRaw: 'tourist' },
    { countryCodeRaw: 'JP', visaTypeRaw: 'tourist' },
    { countryCodeRaw: 'AU', visaTypeRaw: 'visitor' },
    { countryCodeRaw: 'AU', visaTypeRaw: 'tourist' },
  ];

  const searchResults = testScenarios.map((scenario) => {
    const normalizedCountry =
      normalizeCountryCode(scenario.countryCodeRaw) || scenario.countryCodeRaw.toUpperCase();
    const normalizedVisaType = normalizeVisaTypeForRules(normalizedCountry, scenario.visaTypeRaw);

    // Find matching rule
    const matchingRule = allRules.find(
      (r) =>
        r.countryCode === normalizedCountry &&
        r.visaType.toLowerCase() === normalizedVisaType.toLowerCase() &&
        r.isApproved === true
    );

    // Find latest version (even if not approved)
    const latestVersion = allRules
      .filter(
        (r) =>
          r.countryCode === normalizedCountry &&
          r.visaType.toLowerCase() === normalizedVisaType.toLowerCase()
      )
      .sort((a, b) => b.version - a.version)[0];

    return {
      'Input Country': scenario.countryCodeRaw,
      'Input VisaType': scenario.visaTypeRaw,
      'Normalized Country': normalizedCountry,
      'Normalized VisaType': normalizedVisaType,
      'Rule Found': matchingRule ? '✅' : '❌',
      'Latest Version': latestVersion
        ? `${latestVersion.version} (${latestVersion.isApproved ? 'approved' : 'draft'})`
        : 'N/A',
      Issue: matchingRule
        ? 'OK'
        : latestVersion
          ? latestVersion.isApproved
            ? 'Version mismatch?'
            : 'NOT APPROVED'
          : 'MISSING',
    };
  });

  console.table(searchResults);
  console.log();

  // 5. Identify mismatches
  console.log('-- CHECKING FOR MISMATCHES --\n');
  const mismatches: Mismatch[] = [];

  for (const rule of allRules) {
    // Check country code
    const normalizedCountry = normalizeCountryCode(rule.countryCode);
    if (!normalizedCountry || !expectedCountries.includes(normalizedCountry)) {
      mismatches.push({
        issue: 'Country code not in expected list',
        ruleId: rule.id,
        countryCode: rule.countryCode,
        visaType: rule.visaType,
        actualValue: rule.countryCode,
        expectedValue: expectedCountries.join(', '),
        details: `Country code "${rule.countryCode}" is not in priority countries list`,
      });
    }

    // Check visa type normalization
    const normalizedVisaType = normalizeVisaTypeForRules(rule.countryCode, rule.visaType);
    if (!normalizedVisaTypes.includes(normalizedVisaType.toLowerCase())) {
      mismatches.push({
        issue: 'Visa type not normalized',
        ruleId: rule.id,
        countryCode: rule.countryCode,
        visaType: rule.visaType,
        actualValue: rule.visaType,
        expectedValue: normalizedVisaType,
        details: `Visa type "${rule.visaType}" should normalize to "${normalizedVisaType}"`,
      });
    }

    // Check approval status
    if (!rule.isApproved) {
      mismatches.push({
        issue: 'Rule not approved',
        ruleId: rule.id,
        countryCode: rule.countryCode,
        visaType: rule.visaType,
        actualValue: 'false',
        expectedValue: 'true',
        details: `Rule exists but isApproved=false. System only uses approved rules.`,
      });
    }
  }

  // 6. Check for duplicate approved rules (multiple versions approved)
  const approvedRules = allRules.filter((r) => r.isApproved);
  const ruleKeys = new Map<string, RuleSetRow[]>();
  for (const rule of approvedRules) {
    const key = `${rule.countryCode}:${rule.visaType.toLowerCase()}`;
    if (!ruleKeys.has(key)) {
      ruleKeys.set(key, []);
    }
    ruleKeys.get(key)!.push(rule);
  }

  for (const [key, rules] of ruleKeys.entries()) {
    if (rules.length > 1) {
      const latest = rules.sort((a, b) => b.version - a.version)[0];
      const others = rules.filter((r) => r.id !== latest.id);
      for (const other of others) {
        mismatches.push({
          issue: 'Multiple approved versions',
          ruleId: other.id,
          countryCode: other.countryCode,
          visaType: other.visaType,
          actualValue: `version ${other.version} (approved)`,
          expectedValue: `version ${latest.version} (should be only approved)`,
          details: `Multiple approved versions exist. System uses latest (${latest.version}), but version ${other.version} is also approved.`,
        });
      }
    }
  }

  // 7. Identify missing rule sets
  console.log('-- MISSING RULE SETS --\n');
  const missingRuleSets: MissingRuleSet[] = [];

  for (const countryCode of expectedCountries) {
    for (const visaType of ['tourist', 'student']) {
      // Test what the system would search for
      const normalizedVisaType = normalizeVisaTypeForRules(countryCode, visaType);

      // Check if approved rule exists
      const approvedRule = allRules.find(
        (r) =>
          r.countryCode === countryCode &&
          r.visaType.toLowerCase() === normalizedVisaType.toLowerCase() &&
          r.isApproved === true
      );

      if (!approvedRule) {
        // Check if any rule exists (even draft)
        const anyRule = allRules.find(
          (r) =>
            r.countryCode === countryCode &&
            r.visaType.toLowerCase() === normalizedVisaType.toLowerCase()
        );

        missingRuleSets.push({
          countryCode,
          visaType,
          normalizedVisaType,
          reason: anyRule
            ? `Rule exists but isApproved=false (version ${anyRule.version})`
            : 'No rule set found in database',
        });
      }
    }
  }

  if (missingRuleSets.length === 0) {
    console.log('✅ All expected rule sets are present and approved.\n');
  } else {
    console.table(missingRuleSets);
    console.log();
  }

  // 8. Print mismatches
  if (mismatches.length === 0) {
    console.log('✅ NO MISMATCHES FOUND. ALL RULES LOOK CORRECT.\n');
  } else {
    console.log(`\n❌ ${mismatches.length} MISMATCHES FOUND:\n`);
    console.table(
      mismatches.map((m) => ({
        Issue: m.issue,
        Country: m.countryCode,
        'Visa Type': m.visaType,
        Actual: m.actualValue,
        Expected: m.expectedValue,
        Details: m.details || '',
      }))
    );
    console.log();
  }

  // 9. Generate fix commands
  if (mismatches.length > 0 || missingRuleSets.length > 0) {
    console.log('-- SUGGESTED FIX COMMANDS --\n');

    // Group fixes by type
    const unapprovedRules = allRules.filter((r) => !r.isApproved);
    const duplicateApproved = mismatches.filter((m) => m.issue === 'Multiple approved versions');

    if (unapprovedRules.length > 0) {
      console.log('// Fix 1: Approve draft rules (if they are correct)\n');
      for (const rule of unapprovedRules) {
        console.log(
          `await prisma.visaRuleSet.update({\n  where: { id: '${rule.id}' },\n  data: { isApproved: true, approvedAt: new Date(), approvedBy: 'admin' }\n});\n`
        );
      }
      console.log();
    }

    if (duplicateApproved.length > 0) {
      console.log('// Fix 2: Unapprove old versions (keep only latest)\n');
      for (const mismatch of duplicateApproved) {
        console.log(
          `await prisma.visaRuleSet.update({\n  where: { id: '${mismatch.ruleId}' },\n  data: { isApproved: false }\n});\n`
        );
      }
      console.log();
    }

    // Visa type fixes
    const visaTypeMismatches = mismatches.filter((m) => m.issue === 'Visa type not normalized');
    if (visaTypeMismatches.length > 0) {
      console.log('// Fix 3: Normalize visa types\n');
      for (const mismatch of visaTypeMismatches) {
        const normalized = normalizeVisaTypeForRules(mismatch.countryCode, mismatch.visaType);
        console.log(
          `await prisma.visaRuleSet.update({\n  where: { id: '${mismatch.ruleId}' },\n  data: { visaType: '${normalized}' }\n});\n`
        );
      }
      console.log();
    }

    // Missing rule sets
    const trulyMissing = missingRuleSets.filter(
      (m) => m.reason === 'No rule set found in database'
    );
    if (trulyMissing.length > 0) {
      console.log('// Fix 4: Create missing rule sets (requires manual data entry)\n');
      for (const missing of trulyMissing) {
        console.log(
          `// TODO: Create rule set for ${missing.countryCode} ${missing.normalizedVisaType}\n` +
            `await prisma.visaRuleSet.create({\n` +
            `  data: {\n` +
            `    countryCode: '${missing.countryCode}',\n` +
            `    visaType: '${missing.normalizedVisaType}',\n` +
            `    data: { /* ... rule set data ... */ },\n` +
            `    version: 1,\n` +
            `    isApproved: true,\n` +
            `    approvedAt: new Date(),\n` +
            `    approvedBy: 'admin',\n` +
            `    createdBy: 'system',\n` +
            `  }\n` +
            `});\n`
        );
      }
      console.log();
    }
  }

  // 10. Canada-specific analysis
  console.log('-- CANADA TOURIST/VISITOR SPECIFIC ANALYSIS --\n');
  const canadaRules = allRules.filter((r) => r.countryCode === 'CA');
  console.log(`Found ${canadaRules.length} rule(s) for Canada:\n`);
  if (canadaRules.length > 0) {
    console.table(
      canadaRules.map((r) => ({
        id: r.id.substring(0, 8) + '...',
        visaType: r.visaType,
        isApproved: r.isApproved ? '✅' : '❌',
        version: r.version,
      }))
    );
  }

  // Test Canada visitor -> tourist normalization
  const caVisitorNormalized = normalizeVisaTypeForRules('CA', 'visitor');
  const caTouristNormalized = normalizeVisaTypeForRules('CA', 'tourist');
  console.log(`\nNormalization test:`);
  console.log(`  "visitor" -> "${caVisitorNormalized}"`);
  console.log(`  "tourist" -> "${caTouristNormalized}"`);

  const caApprovedRule = canadaRules.find(
    (r) => r.isApproved && r.visaType.toLowerCase() === 'tourist'
  );
  if (!caApprovedRule) {
    console.log(`\n❌ PROBLEM: No approved rule for Canada with visaType="tourist"`);
    console.log(
      `   System searches for: countryCode="CA", visaType="${caVisitorNormalized}" (from "visitor")`
    );
    console.log(`   OR: countryCode="CA", visaType="${caTouristNormalized}" (from "tourist")`);
    if (canadaRules.length > 0) {
      console.log(
        `   But found: ${canadaRules.map((r) => `visaType="${r.visaType}" (approved=${r.isApproved})`).join(', ')}`
      );
    }
  } else {
    console.log(
      `\n✅ Found approved rule: version ${caApprovedRule.version}, visaType="${caApprovedRule.visaType}"`
    );
  }

  console.log('\n===== VISA RULESET DEBUG FINISHED =====\n');
}

// Run the debug
debugVisaRuleSets()
  .catch((e) => {
    console.error('Error running debug:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
