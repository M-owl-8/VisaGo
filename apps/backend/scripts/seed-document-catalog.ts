/**
 * Seed Document Catalog
 * 
 * Populates the global DocumentCatalog from existing VisaRuleSet data and translations.
 * 
 * Usage:
 *   pnpm seed:document-catalog          # Run seeding
 *   pnpm seed:document-catalog --dry-run  # Dry run (no DB writes)
 */

import { PrismaClient } from '@prisma/client';
import { VisaRuleSetData } from '../src/services/visa-rules.service';
import { documentTranslations, getDocumentTranslation } from '../src/data/document-translations';
import { logInfo, logWarn, logError } from '../src/middleware/logger';

const prisma = new PrismaClient();

interface DocumentInfo {
  documentType: string;
  category?: 'required' | 'highly_recommended' | 'optional';
  validityRequirements?: string;
  formatRequirements?: string;
  source: 'us_rules' | 'de_rules' | 'translations';
}

/**
 * Guess document group from documentType
 */
function guessDocumentGroup(documentType: string): string {
  const type = documentType.toLowerCase();
  
  if (type.includes('passport') || type.includes('id') || type.includes('birth') || type.includes('marriage')) {
    return 'identity';
  }
  if (type.includes('bank') || type.includes('financial') || type.includes('statement') || type.includes('income') || type.includes('tax') || type.includes('sponsor')) {
    return 'financial';
  }
  if (type.includes('travel') || type.includes('itinerary') || type.includes('ticket') || type.includes('accommodation') || type.includes('hotel') || type.includes('insurance')) {
    return 'travel';
  }
  if (type.includes('student') || type.includes('academic') || type.includes('transcript') || type.includes('degree') || type.includes('i20') || type.includes('enrollment') || type.includes('university')) {
    return 'education';
  }
  if (type.includes('employment') || type.includes('job') || type.includes('work') || type.includes('contract') || type.includes('business')) {
    return 'employment';
  }
  if (type.includes('family') || type.includes('ties') || type.includes('property') || type.includes('invitation') || type.includes('host')) {
    return 'ties';
  }
  
  return 'other';
}

/**
 * Convert string to title case
 */
function toTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Collect all unique documentTypes from rule sets and translations
 */
async function collectDocumentTypes(): Promise<Map<string, DocumentInfo>> {
  const documentMap = new Map<string, DocumentInfo>();

  // Collect from US B1/B2 rule set
  const usRuleSet = await prisma.visaRuleSet.findFirst({
    where: {
      countryCode: 'US',
      visaType: 'tourist',
      isApproved: true,
    },
    orderBy: { version: 'desc' },
  });

  if (usRuleSet) {
    const data = typeof usRuleSet.data === 'string' 
      ? JSON.parse(usRuleSet.data) as VisaRuleSetData
      : (usRuleSet.data as unknown) as VisaRuleSetData;

    if (data.requiredDocuments && Array.isArray(data.requiredDocuments)) {
      for (const doc of data.requiredDocuments) {
        if (doc.documentType) {
          const existing = documentMap.get(doc.documentType);
          if (!existing || existing.category === 'optional') {
            documentMap.set(doc.documentType, {
              documentType: doc.documentType,
              category: doc.category || 'highly_recommended',
              validityRequirements: doc.validityRequirements,
              formatRequirements: doc.formatRequirements,
              source: 'us_rules',
            });
          }
        }
      }
    }
    logInfo(`Collected ${documentMap.size} documents from US B1/B2 rules`);
  } else {
    logWarn('US B1/B2 rule set not found (isApproved=true)');
  }

  // Collect from DE tourist rule set
  const deRuleSet = await prisma.visaRuleSet.findFirst({
    where: {
      countryCode: 'DE',
      visaType: 'tourist',
      isApproved: true,
    },
    orderBy: { version: 'desc' },
  });

  if (deRuleSet) {
    const data = typeof deRuleSet.data === 'string'
      ? JSON.parse(deRuleSet.data) as VisaRuleSetData
      : (deRuleSet.data as unknown) as VisaRuleSetData;

    if (data.requiredDocuments && Array.isArray(data.requiredDocuments)) {
      for (const doc of data.requiredDocuments) {
        if (doc.documentType) {
          const existing = documentMap.get(doc.documentType);
          // Prefer US category if exists, otherwise use DE category
          if (!existing) {
            documentMap.set(doc.documentType, {
              documentType: doc.documentType,
              category: doc.category || 'highly_recommended',
              validityRequirements: doc.validityRequirements,
              formatRequirements: doc.formatRequirements,
              source: 'de_rules',
            });
          } else if (existing.category === 'optional' && doc.category && doc.category !== 'optional') {
            // Upgrade category if DE has better category
            existing.category = doc.category;
            existing.validityRequirements = existing.validityRequirements || doc.validityRequirements;
            existing.formatRequirements = existing.formatRequirements || doc.formatRequirements;
          }
        }
      }
    }
    logInfo(`Collected ${documentMap.size} documents from DE tourist rules`);
  } else {
    logWarn('DE tourist rule set not found (isApproved=true)');
  }

  // Collect from translations (for documents not in rules)
  for (const [key, translation] of Object.entries(documentTranslations)) {
    if (!documentMap.has(translation.type)) {
      documentMap.set(translation.type, {
        documentType: translation.type,
        category: 'highly_recommended', // Default for translations
        source: 'translations',
      });
    }
  }
  logInfo(`Collected ${documentMap.size} total unique documents`);

  return documentMap;
}

/**
 * Seed document catalog
 */
async function seedDocumentCatalog(dryRun: boolean = false) {
  try {
    logInfo('Starting DocumentCatalog seed...');
    if (dryRun) {
      logInfo('DRY RUN MODE - No database writes will be performed');
    }

    const documentMap = await collectDocumentTypes();
    
    let created = 0;
    let updated = 0;

    for (const [documentType, info] of documentMap.entries()) {
      // Get translation if available
      const translation = getDocumentTranslation(documentType);
      
      // Determine group
      const group = guessDocumentGroup(documentType);
      
      // Determine default category
      const defaultCategory = info.category || 'highly_recommended';
      
      // Prepare data
      const catalogData = {
        documentType,
        nameEn: translation.nameEn || toTitleCase(documentType),
        nameUz: translation.nameUz || translation.nameEn || toTitleCase(documentType),
        nameRu: translation.nameRu || translation.nameEn || toTitleCase(documentType),
        descriptionEn: translation.descriptionEn || `Document: ${translation.nameEn || toTitleCase(documentType)}`,
        descriptionUz: translation.descriptionUz || translation.descriptionEn || `Hujjat: ${translation.nameEn || toTitleCase(documentType)}`,
        descriptionRu: translation.descriptionRu || translation.descriptionEn || `Документ: ${translation.nameEn || toTitleCase(documentType)}`,
        defaultCategory,
        group,
        validityRequirements: info.validityRequirements || null,
        formatRequirements: info.formatRequirements || null,
        isActive: true,
      };

      if (dryRun) {
        logInfo(`[DRY RUN] Would upsert: ${documentType} (${group}, ${defaultCategory})`);
      } else {
        const result = await prisma.documentCatalog.upsert({
          where: { documentType },
          update: {
            nameEn: catalogData.nameEn,
            nameUz: catalogData.nameUz,
            nameRu: catalogData.nameRu,
            descriptionEn: catalogData.descriptionEn,
            descriptionUz: catalogData.descriptionUz,
            descriptionRu: catalogData.descriptionRu,
            defaultCategory: catalogData.defaultCategory,
            group: catalogData.group,
            validityRequirements: catalogData.validityRequirements,
            formatRequirements: catalogData.formatRequirements,
            isActive: catalogData.isActive,
            updatedAt: new Date(),
          },
          create: catalogData,
        });

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          created++;
        } else {
          updated++;
        }
      }
    }

    if (dryRun) {
      logInfo(`[DRY RUN] Would create: ${documentMap.size} documents`);
      
      // Group breakdown for dry run
      const groupCounts = new Map<string, number>();
      for (const [docType, info] of documentMap.entries()) {
        const group = guessDocumentGroup(docType);
        groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
      }
      
      logInfo(`[DRY RUN] Group breakdown:`);
      for (const [group, count] of Array.from(groupCounts.entries()).sort()) {
        logInfo(`   ${group}: ${count} documents`);
      }
      
      logInfo(`✅ DocumentCatalog seed dry run completed`);
    } else {
      const totalActive = await prisma.documentCatalog.count({
        where: { isActive: true },
      });

      // Get group breakdown
      const groupBreakdown = await prisma.documentCatalog.groupBy({
        by: ['group'],
        where: { isActive: true },
        _count: { id: true },
      });

      // Get source breakdown (approximate - based on documentType patterns)
      const usSpecificDocs = await prisma.documentCatalog.count({
        where: {
          isActive: true,
          documentType: { in: ['ds160_confirmation', 'appointment_confirmation', 'visa_fee_receipt'] },
        },
      });

      logInfo(`✅ DocumentCatalog seed completed`);
      logInfo(`   Created: ${created}`);
      logInfo(`   Updated: ${updated}`);
      logInfo(`   Total active: ${totalActive}`);
      logInfo(`   Group breakdown:`);
      for (const group of groupBreakdown.sort((a, b) => a.group.localeCompare(b.group))) {
        logInfo(`     ${group.group}: ${group._count.id} documents`);
      }
      if (usSpecificDocs > 0) {
        logInfo(`   US-specific documents detected: ${usSpecificDocs} (ds160_confirmation, appointment_confirmation, visa_fee_receipt)`);
      }
    }
  } catch (error) {
    logError('Error seeding DocumentCatalog:', error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

seedDocumentCatalog(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logError('Seed failed:', error);
    process.exit(1);
  });

