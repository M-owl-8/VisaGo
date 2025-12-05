/**
 * Analyze Supported Countries and Visa Types
 * 
 * This script provides a comprehensive map of:
 * - All country/visaType combinations in the system
 * - Which have approved VisaRuleSet entries
 * - Which have EmbassySource entries
 * - How UI-visible visa types map to internal visaType values
 * - Which combinations are actually used in applications
 * 
 * Usage: pnpm analyze:visas
 */

import { PrismaClient } from '@prisma/client';
import { normalizeVisaTypeForRules } from '../src/utils/visa-type-aliases';

const prisma = new PrismaClient();

interface CountryVisaTypeInfo {
  countryCode: string;
  countryName: string;
  visaTypeName: string; // UI name from VisaType table (e.g., "B1/B2 Visitor Visa")
  normalizedVisaType: string; // Internal type for rules (e.g., "tourist")
  hasApprovedRules: boolean;
  rulesVersion?: number;
  rulesCount: number;
  hasEmbassySource: boolean;
  embassySourceStatus?: string;
  embassySourceCount: number;
  hasApplications: boolean;
  applicationCount: number;
}

interface AnalysisResult {
  byCountry: Map<string, CountryVisaTypeInfo[]>;
  summary: {
    totalCountries: number;
    totalVisaTypes: number;
    countriesWithRules: number;
    countriesWithEmbassySources: number;
    visaTypesWithRules: number;
    visaTypesWithEmbassySources: number;
  };
}

/**
 * Normalize visa type name from UI to internal format
 * Handles cases like "Tourist Visa" -> "tourist", "B1/B2 Visitor Visa" -> "tourist" (via alias)
 */
function normalizeVisaTypeName(countryCode: string, visaTypeName: string): string {
  // Remove common suffixes
  let normalized = visaTypeName.toLowerCase().trim();
  normalized = normalized.replace(/\s+visa\s*$/i, '');
  normalized = normalized.replace(/\s+$/, '');
  
  // Apply alias mapping (e.g., "b1/b2 visitor" -> "tourist" for US)
  return normalizeVisaTypeForRules(countryCode, normalized);
}

/**
 * Main analysis function
 */
async function analyzeSupportedVisas(): Promise<AnalysisResult> {
  console.log('🔍 Analyzing supported countries and visa types...\n');

  // Step 1: Get all countries with their visa types
  const countries = await prisma.country.findMany({
    include: {
      visaTypes: {
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { code: 'asc' },
  });

  // Step 2: Get all approved VisaRuleSet entries
  const approvedRuleSets = await prisma.visaRuleSet.findMany({
    where: {
      isApproved: true,
    },
    orderBy: [
      { countryCode: 'asc' },
      { visaType: 'asc' },
      { version: 'desc' },
    ],
  });

  // Group rule sets by countryCode + visaType, keeping only latest version
  const ruleSetMap = new Map<string, { version: number; count: number }>();
  for (const ruleSet of approvedRuleSets) {
    const key = `${ruleSet.countryCode.toUpperCase()}:${ruleSet.visaType.toLowerCase()}`;
    const existing = ruleSetMap.get(key);
    if (!existing || ruleSet.version > existing.version) {
      ruleSetMap.set(key, { version: ruleSet.version, count: 1 });
    } else if (ruleSet.version === existing.version) {
      existing.count++;
    }
  }

  // Step 3: Get all EmbassySource entries
  const embassySources = await prisma.embassySource.findMany({
    orderBy: [
      { countryCode: 'asc' },
      { visaType: 'asc' },
    ],
  });

  // Group embassy sources by countryCode + visaType
  const embassySourceMap = new Map<string, { isActive: boolean; lastStatus: string | null; count: number }>();
  for (const source of embassySources) {
    const key = `${source.countryCode.toUpperCase()}:${source.visaType.toLowerCase()}`;
    const existing = embassySourceMap.get(key);
    if (existing) {
      existing.count++;
      // Prefer active sources with success status
      if (source.isActive && source.lastStatus === 'success') {
        existing.isActive = true;
        existing.lastStatus = 'success';
      } else if (!existing.isActive && source.isActive) {
        existing.isActive = true;
        existing.lastStatus = source.lastStatus;
      } else if (existing.lastStatus !== 'success' && source.lastStatus) {
        existing.lastStatus = source.lastStatus;
      }
    } else {
      embassySourceMap.set(key, {
        isActive: source.isActive,
        lastStatus: source.lastStatus,
        count: 1,
      });
    }
  }

  // Step 4: Get all applications to see which combinations are actually used
  const applications = await prisma.visaApplication.findMany({
    include: {
      country: true,
      visaType: true,
    },
  });

  const applicationMap = new Map<string, number>();
  for (const app of applications) {
    const countryCode = app.country.code.toUpperCase();
    const normalizedVisaType = normalizeVisaTypeName(countryCode, app.visaType.name);
    const key = `${countryCode}:${normalizedVisaType}`;
    applicationMap.set(key, (applicationMap.get(key) || 0) + 1);
  }

  // Also check Application model (newer model)
  const newApplications = await prisma.application.findMany({
    include: {
      country: true,
      visaType: true,
    },
  });

  for (const app of newApplications) {
    const countryCode = app.country.code.toUpperCase();
    const normalizedVisaType = normalizeVisaTypeName(countryCode, app.visaType.name);
    const key = `${countryCode}:${normalizedVisaType}`;
    applicationMap.set(key, (applicationMap.get(key) || 0) + 1);
  }

  // Step 5: Build comprehensive map
  const resultMap = new Map<string, CountryVisaTypeInfo[]>();

  for (const country of countries) {
    const countryCode = country.code.toUpperCase();
    const visaTypeInfos: CountryVisaTypeInfo[] = [];

    for (const visaType of country.visaTypes) {
      const normalizedVisaType = normalizeVisaTypeName(countryCode, visaType.name);
      const key = `${countryCode}:${normalizedVisaType}`;

      const ruleSetInfo = ruleSetMap.get(key);
      const embassySourceInfo = embassySourceMap.get(key);
      const applicationCount = applicationMap.get(key) || 0;

      visaTypeInfos.push({
        countryCode,
        countryName: country.name,
        visaTypeName: visaType.name,
        normalizedVisaType,
        hasApprovedRules: !!ruleSetInfo,
        rulesVersion: ruleSetInfo?.version,
        rulesCount: ruleSetInfo?.count || 0,
        hasEmbassySource: !!embassySourceInfo,
        embassySourceStatus: embassySourceInfo?.lastStatus || undefined,
        embassySourceCount: embassySourceInfo?.count || 0,
        hasApplications: applicationCount > 0,
        applicationCount,
      });
    }

    if (visaTypeInfos.length > 0) {
      resultMap.set(countryCode, visaTypeInfos);
    }
  }

  // Step 6: Calculate summary
  const allVisaTypes = Array.from(resultMap.values()).flat();
  const countriesWithRules = new Set(
    allVisaTypes.filter((v) => v.hasApprovedRules).map((v) => v.countryCode)
  ).size;
  const countriesWithEmbassySources = new Set(
    allVisaTypes.filter((v) => v.hasEmbassySource).map((v) => v.countryCode)
  ).size;

  return {
    byCountry: resultMap,
    summary: {
      totalCountries: resultMap.size,
      totalVisaTypes: allVisaTypes.length,
      countriesWithRules,
      countriesWithEmbassySources,
      visaTypesWithRules: allVisaTypes.filter((v) => v.hasApprovedRules).length,
      visaTypesWithEmbassySources: allVisaTypes.filter((v) => v.hasEmbassySource).length,
    },
  };
}

/**
 * Print formatted report
 */
function printReport(result: AnalysisResult): void {
  console.log('='.repeat(100));
  console.log('SUPPORTED COUNTRIES & VISA TYPES ANALYSIS');
  console.log('='.repeat(100));
  console.log('');

  // Summary
  console.log('SUMMARY:');
  console.log(`  Total Countries: ${result.summary.totalCountries}`);
  console.log(`  Total Visa Types: ${result.summary.totalVisaTypes}`);
  console.log(`  Countries with Approved Rules: ${result.summary.countriesWithRules}`);
  console.log(`  Countries with Embassy Sources: ${result.summary.countriesWithEmbassySources}`);
  console.log(`  Visa Types with Approved Rules: ${result.summary.visaTypesWithRules}`);
  console.log(`  Visa Types with Embassy Sources: ${result.summary.visaTypesWithEmbassySources}`);
  console.log('');

  // Detailed by country
  console.log('DETAILED BY COUNTRY:');
  console.log('-'.repeat(100));

  for (const [countryCode, visaTypes] of Array.from(result.byCountry.entries()).sort()) {
    const countryName = visaTypes[0]?.countryName || countryCode;
    console.log(`\n${countryCode} (${countryName}):`);

    for (const visaType of visaTypes) {
      const rulesInfo = visaType.hasApprovedRules
        ? `approved v${visaType.rulesVersion}`
        : 'NONE';
      
      let embassyInfo = 'NONE';
      if (visaType.hasEmbassySource) {
        const status = visaType.embassySourceStatus || 'unknown';
        const active = visaType.embassySourceCount > 0 ? 'active' : 'inactive';
        embassyInfo = `${active}/${status}`;
      }

      const appInfo = visaType.hasApplications
        ? ` (${visaType.applicationCount} application${visaType.applicationCount !== 1 ? 's' : ''})`
        : '';

      console.log(
        `  - visaType: "${visaType.visaTypeName}" → "${visaType.normalizedVisaType}" (rules: ${rulesInfo}, embassySource: ${embassyInfo})${appInfo}`
      );
    }
  }

  console.log('');
  console.log('='.repeat(100));
  console.log('');

  // US-specific analysis
  const usVisaTypes = result.byCountry.get('US') || [];
  if (usVisaTypes.length > 0) {
    console.log('US-SPECIFIC ANALYSIS:');
    console.log('-'.repeat(100));
    console.log('');

    const withRules = usVisaTypes.filter((v) => v.hasApprovedRules);
    const withoutRules = usVisaTypes.filter((v) => !v.hasApprovedRules);

    console.log(`Total US Visa Types: ${usVisaTypes.length}`);
    console.log(`With Approved Rules: ${withRules.length}`);
    console.log(`Without Rules: ${withoutRules.length}`);
    console.log('');

    if (withRules.length > 0) {
      console.log('Visa Types WITH Approved Rules:');
      for (const visaType of withRules) {
        console.log(
          `  - "${visaType.visaTypeName}" → "${visaType.normalizedVisaType}" (v${visaType.rulesVersion})`
        );
      }
      console.log('');
    }

    if (withoutRules.length > 0) {
      console.log('Visa Types WITHOUT Rules:');
      for (const visaType of withoutRules) {
        const embassyInfo = visaType.hasEmbassySource
          ? ` (embassySource: ${visaType.embassySourceStatus || 'unknown'})`
          : '';
        console.log(
          `  - "${visaType.visaTypeName}" → "${visaType.normalizedVisaType}"${embassyInfo}`
        );
      }
      console.log('');
    }

    console.log('UI Name → Internal Type Mapping for US:');
    for (const visaType of usVisaTypes) {
      const aliasNote =
        visaType.visaTypeName.toLowerCase() !== visaType.normalizedVisaType
          ? ' (via alias)'
          : '';
      console.log(
        `  "${visaType.visaTypeName}" → "${visaType.normalizedVisaType}"${aliasNote}`
      );
    }
    console.log('');
  }

  // Countries with approved rules
  console.log('COUNTRIES WITH APPROVED RULES:');
  console.log('-'.repeat(100));
  const countriesWithRules = Array.from(result.byCountry.entries())
    .filter(([_, visaTypes]) => visaTypes.some((v) => v.hasApprovedRules))
    .map(([code, visaTypes]) => {
      const countryName = visaTypes[0]?.countryName || code;
      const ruleCombos = visaTypes
        .filter((v) => v.hasApprovedRules)
        .map((v) => `${v.normalizedVisaType} (v${v.rulesVersion})`)
        .join(', ');
      return { code, name: countryName, combos: ruleCombos };
    });

  if (countriesWithRules.length === 0) {
    console.log('  None');
  } else {
    for (const country of countriesWithRules) {
      console.log(`  ${country.code} (${country.name}): ${country.combos}`);
    }
  }
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  try {
    const result = await analyzeSupportedVisas();
    printReport(result);

    // Also output as JSON for programmatic use
    const jsonOutput = {
      summary: result.summary,
      byCountry: Object.fromEntries(
        Array.from(result.byCountry.entries()).map(([code, visaTypes]) => [
          code,
          visaTypes.map((v) => ({
            visaTypeName: v.visaTypeName,
            normalizedVisaType: v.normalizedVisaType,
            hasApprovedRules: v.hasApprovedRules,
            rulesVersion: v.rulesVersion,
            hasEmbassySource: v.hasEmbassySource,
            embassySourceStatus: v.embassySourceStatus,
            hasApplications: v.hasApplications,
            applicationCount: v.applicationCount,
          })),
        ])
      ),
    };

    console.log('JSON Output (for programmatic use):');
    console.log(JSON.stringify(jsonOutput, null, 2));
  } catch (error) {
    console.error('Error analyzing supported visas:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { analyzeSupportedVisas, printReport };

