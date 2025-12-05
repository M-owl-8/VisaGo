/**
 * Approve VisaRuleSet Script
 * 
 * Approves the latest VisaRuleSet for a given country/visaType combination
 * 
 * Usage:
 *   npm run approve:visarules -- US tourist              # Preview (dry run)
 *   npm run approve:visarules -- US tourist --approve    # Actually approve
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Normalize visa type (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npm run approve:visarules -- <countryCode> <visaType> [--approve]');
    console.error('Example: npm run approve:visarules -- US tourist');
    console.error('Example: npm run approve:visarules -- US tourist --approve');
    process.exit(1);
  }

  const countryCode = args[0].toUpperCase();
  const visaType = normalizeVisaType(args[1]);
  const shouldApprove = args.includes('--approve');

  try {
    // Get latest ruleset (approved or pending)
    const rulesetRecord = await prisma.visaRuleSet.findFirst({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
      },
      orderBy: {
        version: 'desc',
      },
    });

    if (!rulesetRecord) {
      console.error(`❌ No VisaRuleSet found for ${countryCode} ${visaType}`);
      process.exit(1);
    }

    // Parse the data
    const latest = typeof rulesetRecord.data === 'string' 
      ? JSON.parse(rulesetRecord.data) 
      : rulesetRecord.data;

    // Display summary
    console.log(`\n📋 VisaRuleSet Summary:`);
    console.log(`   Country: ${countryCode}`);
    console.log(`   Visa Type: ${visaType}`);
    console.log(`   Version: ${rulesetRecord.version}`);
    console.log(`   ID: ${rulesetRecord.id}`);
    console.log(`   Is Approved: ${rulesetRecord.isApproved ? '✅ Yes' : '❌ No'}`);
    console.log(`   Created: ${rulesetRecord.createdAt.toISOString()}`);
    if (rulesetRecord.sourceSummary) {
      console.log(`   Source: ${rulesetRecord.sourceSummary}`);
    }

    // Display required documents
    const requiredDocs = latest.requiredDocuments || [];
    console.log(`\n📄 Required Documents (${requiredDocs.length}):`);
    requiredDocs.forEach((doc: any, index: number) => {
      console.log(`   ${index + 1}. ${doc.documentType} (${doc.category})`);
      if (doc.description) {
        console.log(`      ${doc.description.substring(0, 80)}${doc.description.length > 80 ? '...' : ''}`);
      }
    });

    // Display financial requirements if present
    if (latest.financialRequirements) {
      console.log(`\n💰 Financial Requirements:`);
      const fin = latest.financialRequirements;
      if (fin.minimumBalance) {
        console.log(`   Minimum Balance: ${fin.minimumBalance} ${fin.currency || 'USD'}`);
      }
      if (fin.bankStatementMonths) {
        console.log(`   Bank Statement: Last ${fin.bankStatementMonths} months`);
      }
    }

    // If already approved
    if (rulesetRecord.isApproved) {
      console.log(`\n✅ This ruleset is already approved.`);
      if (rulesetRecord.approvedAt && rulesetRecord.approvedBy) {
        console.log(`   Approved at: ${rulesetRecord.approvedAt.toISOString()}`);
        console.log(`   Approved by: ${rulesetRecord.approvedBy}`);
      }
      return;
    }

    // Preview mode
    if (!shouldApprove) {
      console.log(`\n⚠️  DRY RUN - No changes made`);
      console.log(`   To approve, run with --approve flag:`);
      console.log(`   npm run approve:visarules -- ${countryCode} ${visaType} --approve`);
      return;
    }

    // Approval mode
    console.log(`\n⚠️  APPROVING RULESET...`);
    console.log(`   This will unapprove all other versions for ${countryCode} ${visaType}`);

    // Unapprove all other versions
    await prisma.visaRuleSet.updateMany({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
        id: { not: rulesetRecord.id },
      },
      data: {
        isApproved: false,
      },
    });

    // Approve this version
    await prisma.visaRuleSet.update({
      where: { id: rulesetRecord.id },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: 'system',
      },
    });

    console.log(`\n✅ Ruleset approved successfully!`);
    console.log(`   Version ${rulesetRecord.version} is now active for ${countryCode} ${visaType}`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


 * 
 * Approves the latest VisaRuleSet for a given country/visaType combination
 * 
 * Usage:
 *   npm run approve:visarules -- US tourist              # Preview (dry run)
 *   npm run approve:visarules -- US tourist --approve    # Actually approve
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Normalize visa type (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npm run approve:visarules -- <countryCode> <visaType> [--approve]');
    console.error('Example: npm run approve:visarules -- US tourist');
    console.error('Example: npm run approve:visarules -- US tourist --approve');
    process.exit(1);
  }

  const countryCode = args[0].toUpperCase();
  const visaType = normalizeVisaType(args[1]);
  const shouldApprove = args.includes('--approve');

  try {
    // Get latest ruleset (approved or pending)
    const rulesetRecord = await prisma.visaRuleSet.findFirst({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
      },
      orderBy: {
        version: 'desc',
      },
    });

    if (!rulesetRecord) {
      console.error(`❌ No VisaRuleSet found for ${countryCode} ${visaType}`);
      process.exit(1);
    }

    // Parse the data
    const latest = typeof rulesetRecord.data === 'string' 
      ? JSON.parse(rulesetRecord.data) 
      : rulesetRecord.data;

    // Display summary
    console.log(`\n📋 VisaRuleSet Summary:`);
    console.log(`   Country: ${countryCode}`);
    console.log(`   Visa Type: ${visaType}`);
    console.log(`   Version: ${rulesetRecord.version}`);
    console.log(`   ID: ${rulesetRecord.id}`);
    console.log(`   Is Approved: ${rulesetRecord.isApproved ? '✅ Yes' : '❌ No'}`);
    console.log(`   Created: ${rulesetRecord.createdAt.toISOString()}`);
    if (rulesetRecord.sourceSummary) {
      console.log(`   Source: ${rulesetRecord.sourceSummary}`);
    }

    // Display required documents
    const requiredDocs = latest.requiredDocuments || [];
    console.log(`\n📄 Required Documents (${requiredDocs.length}):`);
    requiredDocs.forEach((doc: any, index: number) => {
      console.log(`   ${index + 1}. ${doc.documentType} (${doc.category})`);
      if (doc.description) {
        console.log(`      ${doc.description.substring(0, 80)}${doc.description.length > 80 ? '...' : ''}`);
      }
    });

    // Display financial requirements if present
    if (latest.financialRequirements) {
      console.log(`\n💰 Financial Requirements:`);
      const fin = latest.financialRequirements;
      if (fin.minimumBalance) {
        console.log(`   Minimum Balance: ${fin.minimumBalance} ${fin.currency || 'USD'}`);
      }
      if (fin.bankStatementMonths) {
        console.log(`   Bank Statement: Last ${fin.bankStatementMonths} months`);
      }
    }

    // If already approved
    if (rulesetRecord.isApproved) {
      console.log(`\n✅ This ruleset is already approved.`);
      if (rulesetRecord.approvedAt && rulesetRecord.approvedBy) {
        console.log(`   Approved at: ${rulesetRecord.approvedAt.toISOString()}`);
        console.log(`   Approved by: ${rulesetRecord.approvedBy}`);
      }
      return;
    }

    // Preview mode
    if (!shouldApprove) {
      console.log(`\n⚠️  DRY RUN - No changes made`);
      console.log(`   To approve, run with --approve flag:`);
      console.log(`   npm run approve:visarules -- ${countryCode} ${visaType} --approve`);
      return;
    }

    // Approval mode
    console.log(`\n⚠️  APPROVING RULESET...`);
    console.log(`   This will unapprove all other versions for ${countryCode} ${visaType}`);

    // Unapprove all other versions
    await prisma.visaRuleSet.updateMany({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
        id: { not: rulesetRecord.id },
      },
      data: {
        isApproved: false,
      },
    });

    // Approve this version
    await prisma.visaRuleSet.update({
      where: { id: rulesetRecord.id },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: 'system',
      },
    });

    console.log(`\n✅ Ruleset approved successfully!`);
    console.log(`   Version ${rulesetRecord.version} is now active for ${countryCode} ${visaType}`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


 * 
 * Approves the latest VisaRuleSet for a given country/visaType combination
 * 
 * Usage:
 *   npm run approve:visarules -- US tourist              # Preview (dry run)
 *   npm run approve:visarules -- US tourist --approve    # Actually approve
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Normalize visa type (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npm run approve:visarules -- <countryCode> <visaType> [--approve]');
    console.error('Example: npm run approve:visarules -- US tourist');
    console.error('Example: npm run approve:visarules -- US tourist --approve');
    process.exit(1);
  }

  const countryCode = args[0].toUpperCase();
  const visaType = normalizeVisaType(args[1]);
  const shouldApprove = args.includes('--approve');

  try {
    // Get latest ruleset (approved or pending)
    const rulesetRecord = await prisma.visaRuleSet.findFirst({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
      },
      orderBy: {
        version: 'desc',
      },
    });

    if (!rulesetRecord) {
      console.error(`❌ No VisaRuleSet found for ${countryCode} ${visaType}`);
      process.exit(1);
    }

    // Parse the data
    const latest = typeof rulesetRecord.data === 'string' 
      ? JSON.parse(rulesetRecord.data) 
      : rulesetRecord.data;

    // Display summary
    console.log(`\n📋 VisaRuleSet Summary:`);
    console.log(`   Country: ${countryCode}`);
    console.log(`   Visa Type: ${visaType}`);
    console.log(`   Version: ${rulesetRecord.version}`);
    console.log(`   ID: ${rulesetRecord.id}`);
    console.log(`   Is Approved: ${rulesetRecord.isApproved ? '✅ Yes' : '❌ No'}`);
    console.log(`   Created: ${rulesetRecord.createdAt.toISOString()}`);
    if (rulesetRecord.sourceSummary) {
      console.log(`   Source: ${rulesetRecord.sourceSummary}`);
    }

    // Display required documents
    const requiredDocs = latest.requiredDocuments || [];
    console.log(`\n📄 Required Documents (${requiredDocs.length}):`);
    requiredDocs.forEach((doc: any, index: number) => {
      console.log(`   ${index + 1}. ${doc.documentType} (${doc.category})`);
      if (doc.description) {
        console.log(`      ${doc.description.substring(0, 80)}${doc.description.length > 80 ? '...' : ''}`);
      }
    });

    // Display financial requirements if present
    if (latest.financialRequirements) {
      console.log(`\n💰 Financial Requirements:`);
      const fin = latest.financialRequirements;
      if (fin.minimumBalance) {
        console.log(`   Minimum Balance: ${fin.minimumBalance} ${fin.currency || 'USD'}`);
      }
      if (fin.bankStatementMonths) {
        console.log(`   Bank Statement: Last ${fin.bankStatementMonths} months`);
      }
    }

    // If already approved
    if (rulesetRecord.isApproved) {
      console.log(`\n✅ This ruleset is already approved.`);
      if (rulesetRecord.approvedAt && rulesetRecord.approvedBy) {
        console.log(`   Approved at: ${rulesetRecord.approvedAt.toISOString()}`);
        console.log(`   Approved by: ${rulesetRecord.approvedBy}`);
      }
      return;
    }

    // Preview mode
    if (!shouldApprove) {
      console.log(`\n⚠️  DRY RUN - No changes made`);
      console.log(`   To approve, run with --approve flag:`);
      console.log(`   npm run approve:visarules -- ${countryCode} ${visaType} --approve`);
      return;
    }

    // Approval mode
    console.log(`\n⚠️  APPROVING RULESET...`);
    console.log(`   This will unapprove all other versions for ${countryCode} ${visaType}`);

    // Unapprove all other versions
    await prisma.visaRuleSet.updateMany({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
        id: { not: rulesetRecord.id },
      },
      data: {
        isApproved: false,
      },
    });

    // Approve this version
    await prisma.visaRuleSet.update({
      where: { id: rulesetRecord.id },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: 'system',
      },
    });

    console.log(`\n✅ Ruleset approved successfully!`);
    console.log(`   Version ${rulesetRecord.version} is now active for ${countryCode} ${visaType}`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


 * 
 * Approves the latest VisaRuleSet for a given country/visaType combination
 * 
 * Usage:
 *   npm run approve:visarules -- US tourist              # Preview (dry run)
 *   npm run approve:visarules -- US tourist --approve    # Actually approve
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Normalize visa type (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npm run approve:visarules -- <countryCode> <visaType> [--approve]');
    console.error('Example: npm run approve:visarules -- US tourist');
    console.error('Example: npm run approve:visarules -- US tourist --approve');
    process.exit(1);
  }

  const countryCode = args[0].toUpperCase();
  const visaType = normalizeVisaType(args[1]);
  const shouldApprove = args.includes('--approve');

  try {
    // Get latest ruleset (approved or pending)
    const rulesetRecord = await prisma.visaRuleSet.findFirst({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
      },
      orderBy: {
        version: 'desc',
      },
    });

    if (!rulesetRecord) {
      console.error(`❌ No VisaRuleSet found for ${countryCode} ${visaType}`);
      process.exit(1);
    }

    // Parse the data
    const latest = typeof rulesetRecord.data === 'string' 
      ? JSON.parse(rulesetRecord.data) 
      : rulesetRecord.data;

    // Display summary
    console.log(`\n📋 VisaRuleSet Summary:`);
    console.log(`   Country: ${countryCode}`);
    console.log(`   Visa Type: ${visaType}`);
    console.log(`   Version: ${rulesetRecord.version}`);
    console.log(`   ID: ${rulesetRecord.id}`);
    console.log(`   Is Approved: ${rulesetRecord.isApproved ? '✅ Yes' : '❌ No'}`);
    console.log(`   Created: ${rulesetRecord.createdAt.toISOString()}`);
    if (rulesetRecord.sourceSummary) {
      console.log(`   Source: ${rulesetRecord.sourceSummary}`);
    }

    // Display required documents
    const requiredDocs = latest.requiredDocuments || [];
    console.log(`\n📄 Required Documents (${requiredDocs.length}):`);
    requiredDocs.forEach((doc: any, index: number) => {
      console.log(`   ${index + 1}. ${doc.documentType} (${doc.category})`);
      if (doc.description) {
        console.log(`      ${doc.description.substring(0, 80)}${doc.description.length > 80 ? '...' : ''}`);
      }
    });

    // Display financial requirements if present
    if (latest.financialRequirements) {
      console.log(`\n💰 Financial Requirements:`);
      const fin = latest.financialRequirements;
      if (fin.minimumBalance) {
        console.log(`   Minimum Balance: ${fin.minimumBalance} ${fin.currency || 'USD'}`);
      }
      if (fin.bankStatementMonths) {
        console.log(`   Bank Statement: Last ${fin.bankStatementMonths} months`);
      }
    }

    // If already approved
    if (rulesetRecord.isApproved) {
      console.log(`\n✅ This ruleset is already approved.`);
      if (rulesetRecord.approvedAt && rulesetRecord.approvedBy) {
        console.log(`   Approved at: ${rulesetRecord.approvedAt.toISOString()}`);
        console.log(`   Approved by: ${rulesetRecord.approvedBy}`);
      }
      return;
    }

    // Preview mode
    if (!shouldApprove) {
      console.log(`\n⚠️  DRY RUN - No changes made`);
      console.log(`   To approve, run with --approve flag:`);
      console.log(`   npm run approve:visarules -- ${countryCode} ${visaType} --approve`);
      return;
    }

    // Approval mode
    console.log(`\n⚠️  APPROVING RULESET...`);
    console.log(`   This will unapprove all other versions for ${countryCode} ${visaType}`);

    // Unapprove all other versions
    await prisma.visaRuleSet.updateMany({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
        id: { not: rulesetRecord.id },
      },
      data: {
        isApproved: false,
      },
    });

    // Approve this version
    await prisma.visaRuleSet.update({
      where: { id: rulesetRecord.id },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: 'system',
      },
    });

    console.log(`\n✅ Ruleset approved successfully!`);
    console.log(`   Version ${rulesetRecord.version} is now active for ${countryCode} ${visaType}`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

