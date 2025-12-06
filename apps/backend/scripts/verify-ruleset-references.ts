/**
 * Verify RuleSet References
 * 
 * Compares embedded documents in a VisaRuleSet with VisaRuleReference links
 * to ensure consistency.
 * 
 * Usage:
 *   pnpm verify:ruleset-references --countryCode=US --visaType=tourist
 */

import { PrismaClient } from '@prisma/client';
import { VisaRuleSetData } from '../src/services/visa-rules.service';
import { logInfo, logWarn, logError } from '../src/middleware/logger';

const prisma = new PrismaClient();

/**
 * Parse CLI arguments
 */
function parseArgs(): { countryCode: string; visaType: string } {
  const args = process.argv.slice(2);
  let countryCode = '';
  let visaType = '';

  for (const arg of args) {
    if (arg.startsWith('--countryCode=')) {
      countryCode = arg.split('=')[1]?.toUpperCase() || '';
    } else if (arg.startsWith('--visaType=')) {
      visaType = arg.split('=')[1]?.toLowerCase() || '';
    }
  }

  if (!countryCode || !visaType) {
    console.error('Usage: pnpm verify:ruleset-references --countryCode=US --visaType=tourist');
    process.exit(1);
  }

  return { countryCode, visaType };
}

/**
 * Verify rule set references
 */
async function verifyRuleSetReferences(countryCode: string, visaType: string) {
  try {
    logInfo(`Verifying references for ${countryCode} / ${visaType}...`);

    // Find the approved rule set
    const ruleSet = await prisma.visaRuleSet.findFirst({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
        isApproved: true,
      },
      orderBy: { version: 'desc' },
      include: {
        documentReferences: {
          include: {
            document: true,
          },
        },
      },
    });

    if (!ruleSet) {
      logError(`No approved rule set found for ${countryCode} / ${visaType}`, new Error('Rule set not found'));
      console.error(`❌ No approved rule set found for ${countryCode} / ${visaType}`);
      console.error('   Make sure you have run: pnpm seed:us-b1b2-rules (or equivalent)');
      process.exit(1);
    }

    // Parse rule set data
    const data = typeof ruleSet.data === 'string'
      ? JSON.parse(ruleSet.data) as VisaRuleSetData
      : (ruleSet.data as unknown) as VisaRuleSetData;

    if (!data.requiredDocuments || !Array.isArray(data.requiredDocuments)) {
      logError('Invalid rule set data: missing requiredDocuments', new Error('Invalid data'));
      console.error('❌ Rule set data is invalid: missing requiredDocuments');
      process.exit(1);
    }

    // Build maps for comparison
    const embeddedMap = new Map<string, {
      documentType: string;
      category: string;
      condition?: string;
    }>();

    for (const doc of data.requiredDocuments) {
      if (doc.documentType) {
        embeddedMap.set(doc.documentType, {
          documentType: doc.documentType,
          category: doc.category || 'highly_recommended',
          condition: doc.condition,
        });
      }
    }

    const referenceMap = new Map<string, {
      documentType: string;
      category: string;
      condition?: string;
      categoryOverride?: string | null;
    }>();

    for (const ref of ruleSet.documentReferences) {
      const docType = ref.document.documentType;
      const effectiveCategory = ref.categoryOverride || ref.document.defaultCategory;
      referenceMap.set(docType, {
        documentType: docType,
        category: effectiveCategory,
        condition: ref.condition || undefined,
        categoryOverride: ref.categoryOverride,
      });
    }

    // Compare
    const embeddedCount = embeddedMap.size;
    const referenceCount = referenceMap.size;

    const missingInReferences: string[] = [];
    const extraInReferences: string[] = [];

    for (const [docType] of embeddedMap) {
      if (!referenceMap.has(docType)) {
        missingInReferences.push(docType);
      }
    }

    for (const [docType] of referenceMap) {
      if (!embeddedMap.has(docType)) {
        extraInReferences.push(docType);
      }
    }

    // Check category and condition mismatches
    const categoryMismatches: string[] = [];
    const conditionMismatches: string[] = [];

    for (const [docType, embedded] of embeddedMap) {
      const reference = referenceMap.get(docType);
      if (reference) {
        if (embedded.category !== reference.category) {
          categoryMismatches.push(`${docType} (embedded: ${embedded.category}, reference: ${reference.category})`);
        }

        const embeddedCondition = embedded.condition || '';
        const referenceCondition = reference.condition || '';
        if (embeddedCondition !== referenceCondition) {
          conditionMismatches.push(`${docType} (embedded: "${embeddedCondition}", reference: "${referenceCondition}")`);
        }
      }
    }

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`RuleSet: ${countryCode} / ${visaType}`);
    console.log(`RuleSet ID: ${ruleSet.id}`);
    console.log(`Version: ${ruleSet.version}`);
    console.log(`Embedded docs: ${embeddedCount}`);
    console.log(`Reference docs: ${referenceCount}`);
    console.log(`Missing in references: ${missingInReferences.length}`);
    console.log(`Extra in references: ${extraInReferences.length}`);
    console.log(`Category mismatches: ${categoryMismatches.length}`);
    console.log(`Condition mismatches: ${conditionMismatches.length}`);

    if (missingInReferences.length > 0) {
      console.log('\n⚠️  Documents in embedded but missing in references:');
      for (const docType of missingInReferences) {
        console.log(`   - ${docType}`);
      }
    }

    if (extraInReferences.length > 0) {
      console.log('\n⚠️  Documents in references but not in embedded:');
      for (const docType of extraInReferences) {
        console.log(`   - ${docType}`);
      }
    }

    if (categoryMismatches.length > 0) {
      console.log('\n⚠️  Category mismatches:');
      for (const mismatch of categoryMismatches.slice(0, 10)) {
        console.log(`   - ${mismatch}`);
      }
      if (categoryMismatches.length > 10) {
        console.log(`   ... and ${categoryMismatches.length - 10} more`);
      }
    }

    if (conditionMismatches.length > 0) {
      console.log('\n⚠️  Condition mismatches:');
      for (const mismatch of conditionMismatches.slice(0, 10)) {
        console.log(`   - ${mismatch}`);
      }
      if (conditionMismatches.length > 10) {
        console.log(`   ... and ${conditionMismatches.length - 10} more`);
      }
    }

    // Final verdict
    const isConsistent =
      missingInReferences.length === 0 &&
      extraInReferences.length === 0 &&
      categoryMismatches.length === 0 &&
      conditionMismatches.length === 0;

    console.log('\n' + '='.repeat(60));
    if (isConsistent) {
      console.log('✅ References are consistent with embedded documents.');
    } else {
      console.log('⚠️  References have inconsistencies. Review the details above.');
    }
    console.log('='.repeat(60) + '\n');

    logInfo('Verification completed', {
      countryCode,
      visaType,
      ruleSetId: ruleSet.id,
      embeddedCount,
      referenceCount,
      missingCount: missingInReferences.length,
      extraCount: extraInReferences.length,
      categoryMismatchCount: categoryMismatches.length,
      conditionMismatchCount: conditionMismatches.length,
      isConsistent,
    });

    if (!isConsistent) {
      process.exit(1);
    }
  } catch (error) {
    logError('Error during verification', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const { countryCode, visaType } = parseArgs();

verifyRuleSetReferences(countryCode, visaType)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logError('Verification failed', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  });

