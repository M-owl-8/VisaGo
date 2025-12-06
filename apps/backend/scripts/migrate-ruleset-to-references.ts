/**
 * Migrate RuleSet to VisaRuleReference
 * 
 * Converts embedded documents in a VisaRuleSet to VisaRuleReference links
 * pointing to the global DocumentCatalog.
 * 
 * Usage:
 *   pnpm migrate:ruleset-to-references --countryCode=US --visaType=tourist
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
    console.error('Usage: pnpm migrate:ruleset-to-references --countryCode=US --visaType=tourist');
    process.exit(1);
  }

  return { countryCode, visaType };
}

/**
 * Migrate a rule set to use VisaRuleReference
 */
async function migrateRuleSetToReferences(countryCode: string, visaType: string) {
  try {
    logInfo(`Starting migration for ${countryCode} / ${visaType}...`);

    // Find the approved rule set
    const ruleSet = await prisma.visaRuleSet.findFirst({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
        isApproved: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!ruleSet) {
      logError(`No approved rule set found for ${countryCode} / ${visaType}`, new Error('Rule set not found'));
      console.error(`❌ No approved rule set found for ${countryCode} / ${visaType}`);
      console.error('   Make sure you have run: pnpm seed:us-b1b2-rules (or equivalent)');
      process.exit(1);
    }

    logInfo(`Found rule set: ${ruleSet.id} (version ${ruleSet.version})`);

    // Parse rule set data
    const data = typeof ruleSet.data === 'string'
      ? JSON.parse(ruleSet.data) as VisaRuleSetData
      : (ruleSet.data as unknown) as VisaRuleSetData;

    if (!data.requiredDocuments || !Array.isArray(data.requiredDocuments)) {
      logError('Invalid rule set data: missing requiredDocuments', new Error('Invalid data'));
      console.error('❌ Rule set data is invalid: missing requiredDocuments');
      process.exit(1);
    }

    const totalDocs = data.requiredDocuments.length;
    logInfo(`Processing ${totalDocs} documents from rule set...`);

    // Backup current data to data_legacy if not already set
    if (!ruleSet.data_legacy) {
      await prisma.visaRuleSet.update({
        where: { id: ruleSet.id },
        data: {
          data_legacy: ruleSet.data as any,
        },
      });
      logInfo('Backed up current data to data_legacy');
    }

    // Process each document
    let created = 0;
    let updated = 0;
    const missingDocumentTypes: string[] = [];

    for (const doc of data.requiredDocuments) {
      if (!doc.documentType) {
        logWarn('Skipping document without documentType');
        continue;
      }

      // Find document in catalog
      const catalogDoc = await prisma.documentCatalog.findUnique({
        where: { documentType: doc.documentType },
      });

      if (!catalogDoc) {
        logWarn(`Document not found in catalog: ${doc.documentType}`);
        missingDocumentTypes.push(doc.documentType);
        continue;
      }

      // Determine category override
      const categoryOverride = doc.category !== catalogDoc.defaultCategory
        ? doc.category
        : null;

      // Determine description override (optional - only if rule set has country-specific description)
      const descriptionOverride = doc.description && doc.description !== catalogDoc.descriptionEn
        ? doc.description
        : null;

      // Create or update VisaRuleReference
      const existingRef = await prisma.visaRuleReference.findUnique({
        where: {
          ruleSetId_documentId: {
            ruleSetId: ruleSet.id,
            documentId: catalogDoc.id,
          },
        },
      });

      if (existingRef) {
        // Update existing reference
        await prisma.visaRuleReference.update({
          where: { id: existingRef.id },
          data: {
            condition: doc.condition || null,
            categoryOverride,
            descriptionOverride,
          },
        });
        updated++;
      } else {
        // Create new reference
        await prisma.visaRuleReference.create({
          data: {
            ruleSetId: ruleSet.id,
            documentId: catalogDoc.id,
            condition: doc.condition || null,
            categoryOverride,
            descriptionOverride,
          },
        });
        created++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`RuleSet: ${countryCode} / ${visaType}`);
    console.log(`RuleSet ID: ${ruleSet.id}`);
    console.log(`Version: ${ruleSet.version}`);
    console.log(`Total documents in ruleSet: ${totalDocs}`);
    console.log(`VisaRuleReference created: ${created}`);
    console.log(`VisaRuleReference updated: ${updated}`);
    console.log(`Total references: ${created + updated}`);

    if (missingDocumentTypes.length > 0) {
      console.log(`\n⚠️  Missing documentTypes in catalog (${missingDocumentTypes.length}):`);
      for (const docType of missingDocumentTypes) {
        console.log(`   - ${docType}`);
      }
      console.log('\n   Run: pnpm seed:document-catalog to add missing documents');
    } else {
      console.log('\n✅ All documents found in catalog');
    }

    console.log('='.repeat(60));
    console.log('\n✅ Migration completed successfully!\n');

    logInfo('Migration completed', {
      countryCode,
      visaType,
      ruleSetId: ruleSet.id,
      totalDocs,
      created,
      updated,
      missingCount: missingDocumentTypes.length,
    });
  } catch (error) {
    logError('Error during migration', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const { countryCode, visaType } = parseArgs();

migrateRuleSetToReferences(countryCode, visaType)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logError('Migration failed', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  });

