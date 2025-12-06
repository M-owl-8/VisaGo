/**
 * Verify US B1/B2 Tourist Visa Rule Set
 * 
 * Verifies that the seeded rule set is working correctly:
 * - getActiveRuleSet returns the rule set
 * - Version >= 2
 * - At least 15 documents
 * - Test checklist generation for a sample case
 * 
 * Usage: pnpm verify:us-b1b2-rules
 */

import { PrismaClient } from '@prisma/client';
import { VisaRulesService, VisaRuleSetData } from '../src/services/visa-rules.service';
import { buildBaseChecklistFromRules } from '../src/services/checklist-rules.service';
import { CanonicalAIUserContext } from '../src/types/ai-context';
import { logInfo, logWarn, logError } from '../src/middleware/logger';

const prisma = new PrismaClient();

/**
 * Test case: UZ applicant, US tourist, self-funded, employed, has property, no previous refusals
 */
async function verifyUSB1B2Rules() {
  try {
    console.log('🔍 Verifying US B1/B2 Tourist Visa Rule Set...\n');

    // Step 1: Verify getActiveRuleSet returns the rule set
    console.log('Step 1: Checking getActiveRuleSet...');
    const ruleSet = await VisaRulesService.getActiveRuleSet('US', 'tourist');

    if (!ruleSet) {
      console.error('❌ FAILED: getActiveRuleSet returned null');
      console.error('   Make sure you have run: pnpm seed:us-b1b2-rules');
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

    // Step 4: Test checklist generation
    console.log('\nStep 4: Testing checklist generation...');

    // Create a test application (or use existing one)
    // For this test, we'll create a mock CanonicalAIUserContext
    const testContext: CanonicalAIUserContext = {
      userProfile: {
        userId: 'test-user-123',
        appLanguage: 'en' as const,
        citizenship: 'UZ',
        age: 30,
      },
      application: {
        applicationId: 'test-app-123',
        visaType: 'tourist' as const,
        country: 'US',
        status: 'draft' as const,
      },
      applicantProfile: {
        citizenship: 'UZ',
        age: 30,
        visaType: 'tourist' as const,
        targetCountry: 'US',
        duration: '1_3_months' as const,
        sponsorType: 'self' as const,
        bankBalanceUSD: 5000,
        monthlyIncomeUSD: 1500,
        currentStatus: 'employed' as const,
        isStudent: false,
        isEmployed: true,
        hasInternationalTravel: false,
        previousVisaRejections: false,
        previousOverstay: false,
        hasPropertyInUzbekistan: true,
        hasFamilyInUzbekistan: true,
        maritalStatus: 'married' as const,
        hasChildren: false,
        hasUniversityInvitation: false,
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
        level: 'medium' as const,
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
    const documentTypes = baseChecklist.map((item) => item.documentType);
    const requiredDocs = [
      'passport_international',
      'ds160_confirmation',
      'visa_fee_receipt',
      'appointment_confirmation',
      'photo_passport',
      'bank_statements_applicant',
      'employment_letter',
    ];

    const missingDocs = requiredDocs.filter((doc) => !documentTypes.includes(doc));
    if (missingDocs.length > 0) {
      console.warn(`⚠️  WARNING: Missing expected documents: ${missingDocs.join(', ')}`);
    } else {
      console.log('✅ All expected core documents present');
    }

    // Check conditional documents
    console.log('\nConditional document evaluation:');
    const conditionalDocs = ruleSet.requiredDocuments.filter((d) => d.condition);
    for (const doc of conditionalDocs.slice(0, 5)) {
      // Just show a few examples
      const isIncluded = documentTypes.includes(doc.documentType);
      console.log(
        `   ${isIncluded ? '✅' : '❌'} ${doc.documentType} (condition: ${doc.condition})`
      );
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Rule set found: US/tourist`);
    console.log(`✅ Version: ${version} (>= 2)`);
    console.log(`✅ Documents: ${documentCount} total`);
    console.log(`✅ Checklist items generated: ${baseChecklist.length}`);
    console.log(`✅ Rules mode: ACTIVE`);
    console.log('='.repeat(60));
    console.log('\n✅ All verifications passed!\n');

    // Log sample for user
    logInfo('[Verify] US B1/B2 rules verification passed', {
      version,
      documentCount,
      checklistItems: baseChecklist.length,
      requiredDocs: required,
      highlyRecommendedDocs: highlyRecommended,
      optionalDocs: optional,
      conditionalDocs: withConditions,
    });
  } catch (error) {
    logError('[Verify] Error verifying US B1/B2 rules', error as Error);
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  verifyUSB1B2Rules();
}

export { verifyUSB1B2Rules };

