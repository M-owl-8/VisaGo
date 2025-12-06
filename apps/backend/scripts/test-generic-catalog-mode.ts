/**
 * Test Generic Catalog Mode
 * 
 * Tests that catalog mode works for any country/visa type with references
 * 
 * Usage:
 *   USE_GLOBAL_DOCUMENT_CATALOG=true npx ts-node --project scripts/tsconfig.json scripts/test-generic-catalog-mode.ts
 */

import { PrismaClient } from '@prisma/client';
import { VisaRulesService } from '../src/services/visa-rules.service';
import { buildBaseChecklistFromRules } from '../src/services/checklist-rules.service';
import { logInfo } from '../src/middleware/logger';

const prisma = new PrismaClient();

async function testCatalogMode(countryCode: string, visaType: string) {
  console.log(`\n🧪 Testing Catalog Mode for ${countryCode}/${visaType}...\n`);

  // Get rule set with references
  const ruleSetWithRefs = await VisaRulesService.getActiveRuleSetWithReferences(countryCode, visaType);
  
  if (!ruleSetWithRefs) {
    console.error(`❌ No approved rule set found for ${countryCode}/${visaType}`);
    return false;
  }

  if (ruleSetWithRefs.documentReferences.length === 0) {
    console.error(`❌ No document references found for ${countryCode}/${visaType}`);
    return false;
  }

  console.log(`✅ Found rule set: ${ruleSetWithRefs.id} (version ${ruleSetWithRefs.data.version || 1})`);
  console.log(`   Document references: ${ruleSetWithRefs.documentReferences.length}\n`);

  // Create test context
  const testContext = {
    userProfile: {
      userId: 'test-user',
      appLanguage: 'en' as const,
      citizenship: 'UZ',
      age: 30,
    },
    application: {
      applicationId: 'test-app',
      visaType: visaType as any,
      country: countryCode,
      status: 'draft' as const,
    },
    applicantProfile: {
      citizenship: 'UZ',
      age: 30,
      visaType: visaType,
      targetCountry: countryCode,
      duration: '1_3_months',
      sponsorType: 'self',
      bankBalanceUSD: 5000,
      monthlyIncomeUSD: 1500,
      currentStatus: 'employed',
      isStudent: false,
      isEmployed: true,
      hasInternationalTravel: false,
      previousVisaRejections: false,
      previousOverstay: false,
      hasPropertyInUzbekistan: true,
      hasFamilyInUzbekistan: true,
      maritalStatus: 'married',
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

  // Test with catalog mode enabled
  process.env.USE_GLOBAL_DOCUMENT_CATALOG = 'true';
  const catalogChecklist = await buildBaseChecklistFromRules(testContext, ruleSetWithRefs.data, {
    ruleSetId: ruleSetWithRefs.id,
    countryCode: ruleSetWithRefs.countryCode,
    visaType: ruleSetWithRefs.visaType,
    documentReferences: ruleSetWithRefs.documentReferences.map(ref => ({
      id: ref.id,
      documentId: ref.documentId,
      condition: ref.condition,
      categoryOverride: ref.categoryOverride,
    })),
  });

  console.log(`✅ Catalog mode checklist generated: ${catalogChecklist.length} items`);
  console.log(`   Required: ${catalogChecklist.filter(d => d.category === 'required').length}`);
  console.log(`   Highly Recommended: ${catalogChecklist.filter(d => d.category === 'highly_recommended').length}`);
  console.log(`   Optional: ${catalogChecklist.filter(d => d.category === 'optional').length}\n`);

  if (catalogChecklist.length < 4) {
    console.error(`❌ FAILED: Checklist too small (${catalogChecklist.length} items)`);
    return false;
  }

  return true;
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('GENERIC CATALOG MODE TEST');
  console.log('='.repeat(60));

  const testCases = [
    { countryCode: 'US', visaType: 'tourist' },
    { countryCode: 'DE', visaType: 'tourist' },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = await testCatalogMode(testCase.countryCode, testCase.visaType);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Passed: ${passed}/${testCases.length}`);
  console.log(`Failed: ${failed}/${testCases.length}`);
  console.log('='.repeat(60) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests()
    .then(() => {
      console.log('✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

