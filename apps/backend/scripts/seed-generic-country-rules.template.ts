/**
 * Seed [COUNTRY] [VISA_TYPE] Visa Rule Set - TEMPLATE
 * 
 * This is a template for creating new country/visa type rule sets.
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to: seed-[countrycode]-[visatype]-rules.ts
 *    Example: seed-ca-tourist-rules.ts or seed-gb-student-rules.ts
 * 
 * 2. Replace all [COUNTRY], [VISA_TYPE], [COUNTRY_CODE] placeholders below
 * 
 * 3. Fill in the requiredDocuments array with documents specific to this country/visa type
 * 
 * 4. Add npm script in package.json:
 *    "seed:[countrycode]-[visatype]-rules": "ts-node --project scripts/tsconfig.json scripts/seed-[countrycode]-[visatype]-rules.ts"
 * 
 * 5. Run: pnpm seed:[countrycode]-[visatype]-rules
 * 
 * 6. Then migrate to references: pnpm migrate:ruleset-to-references --countryCode=[COUNTRY_CODE] --visaType=[VISA_TYPE]
 * 
 * 7. Verify: pnpm verify:[countrycode]-[visatype]-rules
 * 
 * 8. Verify references: pnpm verify:ruleset-references --countryCode=[COUNTRY_CODE] --visaType=[VISA_TYPE]
 */

import { PrismaClient } from '@prisma/client';
import { VisaRuleSetData } from '../src/services/visa-rules.service';
import { logInfo, logWarn, logError } from '../src/middleware/logger';

const prisma = new PrismaClient();

// TODO: Replace [COUNTRY] with actual country name (e.g., "Canada", "United Kingdom")
// TODO: Replace [VISA_TYPE] with visa type (e.g., "Tourist", "Student")
// TODO: Replace [COUNTRY_CODE] with ISO country code (e.g., "CA", "GB")

const COUNTRY_NAME = '[COUNTRY]'; // e.g., "Canada"
const VISA_TYPE_NAME = '[VISA_TYPE]'; // e.g., "Tourist"
const COUNTRY_CODE = '[COUNTRY_CODE]'; // e.g., "CA"
const VISA_TYPE = '[VISA_TYPE_LOWERCASE]'; // e.g., "tourist" or "student"

/**
 * Create comprehensive [COUNTRY] [VISA_TYPE] Visa Rule Set
 * 
 * TODO: Research embassy requirements for this country/visa type
 * TODO: Add all required documents with proper categories
 * TODO: Add conditions where appropriate (sponsorType, currentStatus, etc.)
 */
function createRuleSet(): VisaRuleSetData {
  return {
    version: 2, // Start with version 2 (supports conditional documents)

    requiredDocuments: [
      // ============================================================================
      // CORE REQUIRED DOCUMENTS (Always required)
      // ============================================================================
      {
        documentType: 'passport_international',
        category: 'required',
        description: 'TODO: Add passport validity requirements for [COUNTRY]',
        validityRequirements: 'TODO: Add validity requirements',
        formatRequirements: 'TODO: Add format requirements',
        // NO CONDITION - Always required
      },
      {
        documentType: 'photo_passport',
        category: 'required',
        description: 'TODO: Add photo requirements for [COUNTRY]',
        validityRequirements: 'TODO: Add validity requirements',
        formatRequirements: 'TODO: Add format requirements (size, background, etc.)',
        // NO CONDITION - Always required
      },
      // TODO: Add country-specific required documents (visa form, fee receipt, etc.)
      // Example:
      // {
      //   documentType: 'visa_application_form',
      //   category: 'required',
      //   description: 'Completed visa application form',
      //   validityRequirements: 'Must be completed before appointment',
      //   formatRequirements: 'Original signed form',
      // },

      // ============================================================================
      // FINANCIAL DOCUMENTS
      // ============================================================================
      {
        documentType: 'bank_statements_applicant',
        category: 'required',
        description: 'TODO: Add bank statement requirements',
        validityRequirements: 'TODO: Add validity period (e.g., last 3 months)',
        formatRequirements: 'TODO: Add format requirements',
        condition: "sponsorType === 'self'", // Only if self-funded
      },
      {
        documentType: 'bank_statements_sponsor',
        category: 'required',
        description: 'TODO: Add sponsor bank statement requirements',
        validityRequirements: 'TODO: Add validity period',
        formatRequirements: 'TODO: Add format requirements',
        condition: "sponsorType !== 'self'", // Only if sponsored
      },
      // TODO: Add more financial documents as needed

      // ============================================================================
      // EMPLOYMENT/EDUCATION DOCUMENTS
      // ============================================================================
      {
        documentType: 'employment_letter',
        category: 'highly_recommended',
        description: 'TODO: Add employment letter requirements',
        validityRequirements: 'TODO: Add validity period',
        formatRequirements: 'TODO: Add format requirements',
        condition: "currentStatus === 'employed'", // Only if employed
      },
      // TODO: Add student documents if visa type is student
      // {
      //   documentType: 'student_enrollment_letter',
      //   category: 'required',
      //   description: 'TODO: Add student enrollment requirements',
      //   condition: "currentStatus === 'student'",
      // },

      // ============================================================================
      // TRAVEL DOCUMENTS
      // ============================================================================
      {
        documentType: 'travel_itinerary',
        category: 'highly_recommended',
        description: 'TODO: Add travel itinerary requirements',
        validityRequirements: 'TODO: Add validity requirements',
        formatRequirements: 'TODO: Add format requirements',
        // NO CONDITION - Always recommended
      },
      {
        documentType: 'accommodation_proof',
        category: 'highly_recommended',
        description: 'TODO: Add accommodation proof requirements',
        validityRequirements: 'TODO: Add validity requirements',
        formatRequirements: 'TODO: Add format requirements',
        // NO CONDITION - Always recommended
      },
      // TODO: Add more travel documents as needed

      // ============================================================================
      // TIES TO HOME COUNTRY
      // ============================================================================
      {
        documentType: 'property_documents',
        category: 'optional',
        description: 'TODO: Add property document requirements',
        validityRequirements: 'TODO: Add validity requirements',
        formatRequirements: 'TODO: Add format requirements',
        condition: "hasPropertyInUzbekistan === true", // Only if has property
      },
      // TODO: Add more ties documents as needed

      // ============================================================================
      // ADDITIONAL COUNTRY-SPECIFIC DOCUMENTS
      // ============================================================================
      // TODO: Research and add any country-specific documents
      // Examples:
      // - Travel insurance (required for Schengen)
      // - Invitation letter (if applicable)
      // - Host documents (if applicable)
      // - Country-specific forms or certificates
    ],
  };
}

/**
 * Seed [COUNTRY] [VISA_TYPE] Visa Rule Set
 */
async function seedRuleSet() {
  try {
    const countryCode = COUNTRY_CODE.toUpperCase();
    const visaType = VISA_TYPE.toLowerCase();

    console.log(`\n🌱 Seeding ${COUNTRY_NAME} ${VISA_TYPE_NAME} Visa Rule Set...\n`);

    // Check for existing rule sets
    const existingRuleSets = await prisma.visaRuleSet.findMany({
      where: {
        countryCode,
        visaType,
      },
      orderBy: {
        version: 'desc',
      },
    });

    const latestVersion = existingRuleSets.length > 0
      ? existingRuleSets[0].version
      : 0;

    const nextVersion = latestVersion + 1;

    // Unapprove existing rule sets
    if (existingRuleSets.length > 0) {
      await prisma.visaRuleSet.updateMany({
        where: {
          countryCode,
          visaType,
          isApproved: true,
        },
        data: {
          isApproved: false,
        },
      });
      logInfo(`Unapproved ${existingRuleSets.length} existing rule set(s)`);
    }

    // Create new rule set
    const ruleSetData = createRuleSet();
    const dataSerialized = JSON.stringify(ruleSetData);

    const ruleSet = await prisma.visaRuleSet.create({
      data: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
        data: dataSerialized as any,
        version: nextVersion,
        createdBy: 'system',
        sourceSummary: `${COUNTRY_NAME} ${VISA_TYPE_NAME} Visa Requirements - Professional rule set v${nextVersion}`,
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: 'system',
      },
    });

    // Create version history entry
    await prisma.visaRuleVersion.create({
      data: {
        ruleSetId: ruleSet.id,
        version: nextVersion,
        data: dataSerialized as any,
        changeLog: `Professional ${COUNTRY_NAME} ${VISA_TYPE_NAME} Visa Rule Set - Version ${nextVersion}`,
      },
    });

    // Create change log entry
    const changeLogDescription = existingRuleSets.length > 0
      ? `Created version ${nextVersion}. Previous version ${latestVersion} unapproved.`
      : `Initial professional ${COUNTRY_NAME} ${VISA_TYPE_NAME} Visa Rule Set - Version ${nextVersion}`;

    await prisma.visaRuleSetChangeLog.create({
      data: {
        ruleSetId: ruleSet.id,
        changeType: existingRuleSets.length > 0 ? 'updated' : 'created',
        changedBy: 'system',
        changeDetails: JSON.stringify({
          previousVersion: existingRuleSets.length > 0 ? latestVersion : null,
          newVersion: nextVersion,
          documentCount: ruleSetData.requiredDocuments.length,
        }) as any,
        description: changeLogDescription,
      },
    });

    logInfo(`[Seed] ${COUNTRY_NAME} ${VISA_TYPE_NAME} Visa Rule Set seeded successfully`, {
      id: ruleSet.id,
      countryCode,
      visaType,
      version: nextVersion,
      documentCount: ruleSetData.requiredDocuments.length,
    });

    console.log(`\n✅ Successfully seeded ${COUNTRY_NAME} ${VISA_TYPE_NAME} Visa Rule Set`);
    console.log(`   Rule Set ID: ${ruleSet.id}`);
    console.log(`   Version: ${nextVersion}`);
    console.log(`   Documents: ${ruleSetData.requiredDocuments.length} total`);
    console.log(`   Required: ${ruleSetData.requiredDocuments.filter((d) => d.category === 'required').length}`);
    console.log(`   Highly Recommended: ${ruleSetData.requiredDocuments.filter((d) => d.category === 'highly_recommended').length}`);
    console.log(`   Optional: ${ruleSetData.requiredDocuments.filter((d) => d.category === 'optional').length}`);
    console.log(`   With Conditions: ${ruleSetData.requiredDocuments.filter((d) => d.condition).length}`);
    console.log(`   Status: APPROVED\n`);
  } catch (error) {
    logError(`[Seed] Error seeding ${COUNTRY_NAME} ${VISA_TYPE_NAME} Visa Rule Set`, error as Error);
    console.error('❌ Error seeding rule set:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedRuleSet();
}

export { seedRuleSet, createRuleSet };

