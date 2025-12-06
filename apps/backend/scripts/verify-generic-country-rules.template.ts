/**
 * Verify [COUNTRY] [VISA_TYPE] Visa Rule Set - TEMPLATE
 * 
 * This is a template for verifying country/visa type rule sets.
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to: verify-[countrycode]-[visatype]-rules.ts
 *    Example: verify-ca-tourist-rules.ts or verify-gb-student-rules.ts
 * 
 * 2. Replace all [COUNTRY], [VISA_TYPE], [COUNTRY_CODE] placeholders below
 * 
 * 3. Update the test context to match realistic applicant profile for this country/visa type
 * 
 * 4. Update core document checks to match country-specific required documents
 * 
 * 5. Add npm script in package.json:
 *    "verify:[countrycode]-[visatype]-rules": "ts-node --project scripts/tsconfig.json scripts/verify-[countrycode]-[visatype]-rules.ts"
 * 
 * 6. Run: pnpm verify:[countrycode]-[visatype]-rules
 * 
 * Usage: pnpm verify:[countrycode]-[visatype]-rules
 */

import { PrismaClient } from '@prisma/client';
import { VisaRulesService, VisaRuleSetData } from '../src/services/visa-rules.service';
import { buildBaseChecklistFromRules } from '../src/services/checklist-rules.service';
import { CanonicalAIUserContext } from '../src/types/ai-context';
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
 * Verify [COUNTRY] [VISA_TYPE] Visa Rule Set
 */
async function verifyRuleSet() {
  try {
    console.log(`🔍 Verifying ${COUNTRY_NAME} ${VISA_TYPE_NAME} Visa Rule Set...\n`);

    // Step 1: Verify getActiveRuleSet returns the rule set
    console.log('Step 1: Checking getActiveRuleSet...');
    const ruleSet = await VisaRulesService.getActiveRuleSet(COUNTRY_CODE, VISA_TYPE);

    if (!ruleSet) {
      console.error('❌ FAILED: getActiveRuleSet returned null');
      console.error(`   Make sure you have run: pnpm seed:[countrycode]-[visatype]-rules`);
      process.exit(1);
    }

    console.log('✅ getActiveRuleSet returned rule set');

    // Step 2: Verify version >= 2
    console.log('\nStep 2: Checking version...');
    const version = ruleSet.version || 1;
    if (version < 2) {
      console.error(`❌ FAILED: Version is ${version}, expected >= 2`);
      process.exit(1);
    }
    console.log(`✅ Version: ${version}`);

    // Step 3: Verify at least 15 documents
    console.log('\nStep 3: Checking document count...');
    const documentCount = ruleSet.requiredDocuments?.length || 0;
    if (documentCount < 15) {
      console.error(`❌ FAILED: Only ${documentCount} documents, expected >= 15`);
      process.exit(1);
    }
    console.log(`✅ Document count: ${documentCount}`);

    // Count by category
    const required = ruleSet.requiredDocuments.filter((d) => d.category === 'required').length;
    const highlyRecommended = ruleSet.requiredDocuments.filter(
      (d) => d.category === 'highly_recommended'
    ).length;
    const optional = ruleSet.requiredDocuments.filter((d) => d.category === 'optional').length;
    const withConditions = ruleSet.requiredDocuments.filter((d) => d.condition).length;

    console.log(`   - Required: ${required}`);
    console.log(`   - Highly Recommended: ${highlyRecommended}`);
    console.log(`   - Optional: ${optional}`);
    console.log(`   - With Conditions: ${withConditions}`);

    // Step 4: Verify core documents are present
    console.log('\nStep 4: Checking core documents...');
    const documentTypes = ruleSet.requiredDocuments.map((d) => d.documentType);
    
    // TODO: Update these to match country-specific required documents
    const coreDocuments = [
      'passport_international',
      'photo_passport',
      // TODO: Add country-specific core documents
      // Examples:
      // 'visa_application_form', // For countries with specific forms
      // 'visa_fee_receipt', // If applicable
      // 'travel_insurance', // For Schengen countries
    ];

    const missingCoreDocs = coreDocuments.filter((doc) => !documentTypes.includes(doc));
    if (missingCoreDocs.length > 0) {
      console.error(`❌ FAILED: Missing core documents: ${missingCoreDocs.join(', ')}`);
      process.exit(1);
    }
    console.log(`✅ All core documents present`);

    // Step 5: Test checklist generation
    console.log('\nStep 5: Testing checklist generation...');

    // TODO: Update test context to match realistic applicant profile for this country/visa type
    const testContext: CanonicalAIUserContext = {
      userProfile: {
        userId: 'test-user-123',
        appLanguage: 'en' as const,
        citizenship: 'UZ',
        age: 30,
      },
      application: {
        applicationId: 'test-app-123',
        visaType: VISA_TYPE,
        country: COUNTRY_NAME,
        status: 'draft',
      },
      applicantProfile: {
        citizenship: 'UZ',
        age: 30,
        visaType: VISA_TYPE,
        targetCountry: COUNTRY_CODE,
        duration: '1_3_months',
        sponsorType: 'self', // TODO: Adjust based on visa type
        bankBalanceUSD: 5000,
        monthlyIncomeUSD: 1500,
        currentStatus: 'employed', // TODO: Adjust based on visa type (e.g., 'student' for student visas)
        isStudent: false, // TODO: Set to true for student visas
        isEmployed: true, // TODO: Adjust based on visa type
        hasInternationalTravel: false,
        previousVisaRejections: false,
        previousOverstay: false,
        hasPropertyInUzbekistan: true,
        hasFamilyInUzbekistan: true,
        maritalStatus: 'married',
        hasChildren: false,
        hasUniversityInvitation: false, // TODO: Set to true for student visas
        hasOtherInvitation: false,
        documents: {
          hasPassport: true,
          hasBankStatement: true,
          hasEmploymentOrStudyProof: true,
          hasInsurance: false,
          hasFlightBooking: false,
          hasHotelBookingOrAccommodation: false,
        },
      },
      riskScore: {
        probabilityPercent: 75,
        level: 'medium',
        riskFactors: [],
        positiveFactors: ['Has property', 'Has family ties', 'Employed'],
      },
      uploadedDocuments: [],
      appActions: [],
    };

    // Build base checklist from rules
    const baseChecklist = await buildBaseChecklistFromRules(testContext, ruleSet);

    console.log(`✅ Checklist generated with ${baseChecklist.length} items`);

    // Verify key documents are present
    const checklistDocTypes = baseChecklist.map((item) => item.documentType);
    const foundCoreDocs = coreDocuments.filter((doc) => checklistDocTypes.includes(doc));

    if (foundCoreDocs.length === coreDocuments.length) {
      console.log(`✅ All core documents in generated checklist`);
    } else {
      const missing = coreDocuments.filter((doc) => !checklistDocTypes.includes(doc));
      console.warn(`⚠️  Missing core documents in checklist: ${missing.join(', ')}`);
      console.warn(`   (This may be expected if conditions filtered them out)`);
    }

    // Step 6: Summary
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Country: ${COUNTRY_NAME} (${COUNTRY_CODE})`);
    console.log(`Visa Type: ${VISA_TYPE_NAME} (${VISA_TYPE})`);
    console.log(`Version: ${version}`);
    console.log(`Document Count: ${documentCount}`);
    console.log(`Checklist Items Generated: ${baseChecklist.length}`);
    console.log('='.repeat(60));
    console.log('\n✅ All verification checks passed!\n');

    logInfo(`[Verify] ${COUNTRY_NAME} ${VISA_TYPE_NAME} Visa Rule Set verification completed`, {
      countryCode: COUNTRY_CODE,
      visaType: VISA_TYPE,
      version,
      documentCount,
      checklistItems: baseChecklist.length,
    });
  } catch (error) {
    logError(`[Verify] Error verifying ${COUNTRY_NAME} ${VISA_TYPE_NAME} Visa Rule Set`, error as Error);
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  verifyRuleSet();
}

export { verifyRuleSet };

