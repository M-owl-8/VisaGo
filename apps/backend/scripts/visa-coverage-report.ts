/**
 * Visa Coverage Report Script
 * 
 * Checks coverage for 10 countries × 2 visa types (tourist, student)
 * 
 * Usage: ts-node --project scripts/tsconfig.json scripts/visa-coverage-report.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// 10 target countries (FINAL - locked for launch)
const TARGET_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'AE', name: 'UAE' },
];

const VISA_TYPES = ['tourist', 'student'] as const;

interface CoverageResult {
  countryCode: string;
  countryName: string;
  visaType: string;
  visaTypeExists: boolean;
  visaTypeName?: string;
  visaRuleSetExists: boolean;
  visaRuleSetVersion?: number;
  isApproved: boolean;
  requiredDocumentsCount?: number;
  embassySourceExists: boolean;
  embassySourceUrl?: string;
  embassySourceName?: string;
  needsManualReview: boolean;
  issues: string[];
}

/**
 * Normalize visa type name (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

/**
 * Check if VisaType exists for country
 */
async function checkVisaType(countryCode: string, visaType: string): Promise<{
  exists: boolean;
  name?: string;
}> {
  const country = await prisma.country.findFirst({
    where: { code: countryCode },
    include: {
      visaTypes: true,
    },
  });

  if (!country) {
    return { exists: false };
  }

  // Try to find matching visa type
  const matchingVisaType = country.visaTypes.find((vt) => {
    const normalized = normalizeVisaType(vt.name);
    return normalized === visaType || normalized.includes(visaType);
  });

  return {
    exists: !!matchingVisaType,
    name: matchingVisaType?.name,
  };
}

/**
 * Check if VisaRuleSet exists and is approved
 */
async function checkVisaRuleSet(
  countryCode: string,
  visaType: string
): Promise<{
  exists: boolean;
  version?: number;
  isApproved: boolean;
  requiredDocumentsCount?: number;
}> {
  const ruleSet = await prisma.visaRuleSet.findFirst({
    where: {
      countryCode: countryCode.toUpperCase(),
      visaType: visaType.toLowerCase(),
    },
    orderBy: {
      version: 'desc',
    },
  });

  if (!ruleSet) {
    return { exists: false, isApproved: false };
  }

  // Parse data to count required documents
  let requiredDocumentsCount = 0;
  try {
    const data = typeof ruleSet.data === 'string' ? JSON.parse(ruleSet.data) : ruleSet.data;
    requiredDocumentsCount = data?.requiredDocuments?.length || 0;
  } catch (e) {
    // Ignore parse errors
  }

  return {
    exists: true,
    version: ruleSet.version,
    isApproved: ruleSet.isApproved,
    requiredDocumentsCount,
  };
}

/**
 * Check if EmbassySource exists
 */
async function checkEmbassySource(
  countryCode: string,
  visaType: string
): Promise<{
  exists: boolean;
  url?: string;
  name?: string;
}> {
  const source = await prisma.embassySource.findFirst({
    where: {
      countryCode: countryCode.toUpperCase(),
      visaType: visaType.toLowerCase(),
      isActive: true,
    },
    orderBy: {
      priority: 'desc',
    },
  });

  return {
    exists: !!source,
    url: source?.url || undefined,
    name: source?.name || undefined,
  };
}

/**
 * Validate VisaRuleSet structure
 */
function validateRuleSetStructure(ruleSet: any): string[] {
  const issues: string[] = [];

  if (!ruleSet.data) {
    issues.push('Missing data field');
    return issues;
  }

  const data = typeof ruleSet.data === 'string' ? JSON.parse(ruleSet.data) : ruleSet.data;

  if (!data.requiredDocuments || !Array.isArray(data.requiredDocuments)) {
    issues.push('Missing or invalid requiredDocuments array');
  } else {
    if (data.requiredDocuments.length === 0) {
      issues.push('requiredDocuments array is empty');
    }

    // Check for reasonable document types
    const documentTypes = data.requiredDocuments.map((doc: any) => doc.documentType).filter(Boolean);
    const commonTypes = ['passport', 'bank_statement', 'visa_application_form'];
    const hasCommonTypes = commonTypes.some((type) =>
      documentTypes.some((dt: string) => dt.toLowerCase().includes(type))
    );

    if (!hasCommonTypes && documentTypes.length < 3) {
      issues.push('Missing common document types (passport, bank_statement, etc.)');
    }
  }

  return issues;
}

/**
 * Generate coverage report
 */
async function generateCoverageReport(): Promise<CoverageResult[]> {
  const results: CoverageResult[] = [];

  for (const country of TARGET_COUNTRIES) {
    for (const visaType of VISA_TYPES) {
      const result: CoverageResult = {
        countryCode: country.code,
        countryName: country.name,
        visaType,
        visaTypeExists: false,
        visaRuleSetExists: false,
        isApproved: false,
        embassySourceExists: false,
        needsManualReview: false,
        issues: [],
      };

      // Check VisaType
      const visaTypeCheck = await checkVisaType(country.code, visaType);
      result.visaTypeExists = visaTypeCheck.exists;
      result.visaTypeName = visaTypeCheck.name;

      if (!visaTypeCheck.exists) {
        result.issues.push(`VisaType "${visaType}" not found for ${country.name}`);
      }

      // Check VisaRuleSet
      const ruleSetCheck = await checkVisaRuleSet(country.code, visaType);
      result.visaRuleSetExists = ruleSetCheck.exists;
      result.visaRuleSetVersion = ruleSetCheck.version;
      result.isApproved = ruleSetCheck.isApproved;
      result.requiredDocumentsCount = ruleSetCheck.requiredDocumentsCount;

      if (!ruleSetCheck.exists) {
        result.issues.push(`No VisaRuleSet found for ${country.code} ${visaType}`);
        result.needsManualReview = true;
      } else if (!ruleSetCheck.isApproved) {
        result.issues.push(`VisaRuleSet exists but is not approved (version ${ruleSetCheck.version})`);
        result.needsManualReview = true;
      } else {
        // Validate structure
        const ruleSet = await prisma.visaRuleSet.findFirst({
          where: {
            countryCode: country.code.toUpperCase(),
            visaType: visaType.toLowerCase(),
            isApproved: true,
          },
          orderBy: { version: 'desc' },
        });

        if (ruleSet) {
          const validationIssues = validateRuleSetStructure(ruleSet);
          result.issues.push(...validationIssues);
          if (validationIssues.length > 0) {
            result.needsManualReview = true;
          }
        }
      }

      // Check EmbassySource
      const embassyCheck = await checkEmbassySource(country.code, visaType);
      result.embassySourceExists = embassyCheck.exists;
      result.embassySourceUrl = embassyCheck.url;
      result.embassySourceName = embassyCheck.name;

      if (!embassyCheck.exists) {
        result.issues.push(`No EmbassySource found for ${country.code} ${visaType}`);
        result.needsManualReview = true;
      } else if (embassyCheck.url?.includes('TODO') || embassyCheck.url?.includes('placeholder')) {
        result.issues.push(`EmbassySource URL is a placeholder: ${embassyCheck.url}`);
        result.needsManualReview = true;
      }

      results.push(result);
    }
  }

  return results;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(results: CoverageResult[]): string {
  let markdown = `# Visa Rules Coverage Report\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `## Summary\n\n`;

  const total = results.length;
  const visaTypeExists = results.filter((r) => r.visaTypeExists).length;
  const ruleSetExists = results.filter((r) => r.visaRuleSetExists).length;
  const isApproved = results.filter((r) => r.isApproved).length;
  const embassyExists = results.filter((r) => r.embassySourceExists).length;
  const needsReview = results.filter((r) => r.needsManualReview).length;

  markdown += `- **Total Combinations:** ${total} (10 countries × 2 visa types)\n`;
  markdown += `- **VisaType Exists:** ${visaTypeExists}/${total} (${Math.round((visaTypeExists / total) * 100)}%)\n`;
  markdown += `- **VisaRuleSet Exists:** ${ruleSetExists}/${total} (${Math.round((ruleSetExists / total) * 100)}%)\n`;
  markdown += `- **VisaRuleSet Approved:** ${isApproved}/${total} (${Math.round((isApproved / total) * 100)}%)\n`;
  markdown += `- **EmbassySource Exists:** ${embassyExists}/${total} (${Math.round((embassyExists / total) * 100)}%)\n`;
  markdown += `- **Needs Manual Review:** ${needsReview}/${total}\n\n`;

  markdown += `## Coverage Table\n\n`;
  markdown += `| Country | Visa Type | VisaType | RuleSet | Approved | Docs | Embassy | Issues |\n`;
  markdown += `|---------|-----------|----------|---------|----------|------|---------|--------|\n`;

  for (const result of results) {
    const visaTypeStatus = result.visaTypeExists ? '✅' : '❌';
    const ruleSetStatus = result.visaRuleSetExists ? '✅' : '❌';
    const approvedStatus = result.isApproved ? '✅' : '❌';
    const docsCount = result.requiredDocumentsCount || 0;
    const embassyStatus = result.embassySourceExists ? '✅' : '❌';
    const issuesCount = result.issues.length;
    const issuesBadge = issuesCount > 0 ? `⚠️ ${issuesCount}` : '✅';

    markdown += `| ${result.countryName} (${result.countryCode}) | ${result.visaType} | ${visaTypeStatus} | ${ruleSetStatus} | ${approvedStatus} | ${docsCount} | ${embassyStatus} | ${issuesBadge} |\n`;
  }

  markdown += `\n## Detailed Results\n\n`;

  // Group by country
  const byCountry = new Map<string, CoverageResult[]>();
  for (const result of results) {
    if (!byCountry.has(result.countryCode)) {
      byCountry.set(result.countryCode, []);
    }
    byCountry.get(result.countryCode)!.push(result);
  }

  for (const [countryCode, countryResults] of byCountry.entries()) {
    const country = countryResults[0];
    markdown += `### ${country.countryName} (${countryCode})\n\n`;

    for (const result of countryResults) {
      markdown += `#### ${result.visaType.toUpperCase()} Visa\n\n`;

      markdown += `- **VisaType:** ${result.visaTypeExists ? `✅ ${result.visaTypeName}` : '❌ Not found'}\n`;
      markdown += `- **VisaRuleSet:** ${result.visaRuleSetExists ? `✅ Version ${result.visaRuleSetVersion}` : '❌ Not found'}\n`;
      markdown += `- **Approved:** ${result.isApproved ? '✅ Yes' : '❌ No'}\n`;
      markdown += `- **Required Documents:** ${result.requiredDocumentsCount || 0}\n`;
      markdown += `- **EmbassySource:** ${result.embassySourceExists ? `✅ ${result.embassySourceName}` : '❌ Not found'}\n`;
      if (result.embassySourceUrl) {
        markdown += `  - URL: ${result.embassySourceUrl}\n`;
      }

      if (result.issues.length > 0) {
        markdown += `\n**Issues:**\n`;
        for (const issue of result.issues) {
          markdown += `- ⚠️ ${issue}\n`;
        }
      }

      if (result.needsManualReview) {
        markdown += `\n**⚠️ REQUIRES MANUAL REVIEW**\n`;
      }

      markdown += `\n`;
    }
  }

  markdown += `## Recommendations\n\n`;

  const missingRuleSets = results.filter((r) => !r.visaRuleSetExists);
  if (missingRuleSets.length > 0) {
    markdown += `### Missing VisaRuleSets (${missingRuleSets.length})\n\n`;
    for (const result of missingRuleSets) {
      markdown += `- ${result.countryName} ${result.visaType}: Use EmbassySource + sync pipeline to extract rules\n`;
    }
    markdown += `\n`;
  }

  const unapprovedRuleSets = results.filter((r) => r.visaRuleSetExists && !r.isApproved);
  if (unapprovedRuleSets.length > 0) {
    markdown += `### Unapproved VisaRuleSets (${unapprovedRuleSets.length})\n\n`;
    for (const result of unapprovedRuleSets) {
      markdown += `- ${result.countryName} ${result.visaType}: Review and approve version ${result.visaRuleSetVersion}\n`;
    }
    markdown += `\n`;
  }

  const missingEmbassySources = results.filter((r) => !r.embassySourceExists);
  if (missingEmbassySources.length > 0) {
    markdown += `### Missing EmbassySources (${missingEmbassySources.length})\n\n`;
    for (const result of missingEmbassySources) {
      markdown += `- ${result.countryName} ${result.visaType}: **YOU MUST PROVIDE OFFICIAL URL HERE**\n`;
    }
    markdown += `\n`;
  }

  return markdown;
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Generating Visa Coverage Report...\n');

  try {
    const results = await generateCoverageReport();
    const markdown = generateMarkdownReport(results);

    // Write to file
    const reportPath = path.join(process.cwd(), 'VISA_RULES_COVERAGE.md');
    fs.writeFileSync(reportPath, markdown, 'utf-8');

    console.log(`✅ Report generated: ${reportPath}\n`);

    // Print summary to console
    const approved = results.filter((r) => r.isApproved).length;
    const needsReview = results.filter((r) => r.needsManualReview).length;

    console.log(`Summary:`);
    console.log(`- Total: ${results.length} combinations`);
    console.log(`- Approved: ${approved}`);
    console.log(`- Needs Review: ${needsReview}`);
    console.log(`\nSee ${reportPath} for full details.`);
  } catch (error) {
    console.error('❌ Error generating report:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('Script error:', e);
    process.exit(1);
  });

