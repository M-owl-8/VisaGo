/**
 * Test Catalog Mode
 * 
 * Tests that catalog mode works when USE_GLOBAL_DOCUMENT_CATALOG=true
 * 
 * Usage:
 *   USE_GLOBAL_DOCUMENT_CATALOG=true pnpm test:catalog-mode
 */

import { PrismaClient } from '@prisma/client';
import { VisaRulesService } from '../src/services/visa-rules.service';
import { buildBaseChecklistFromRules } from '../src/services/checklist-rules.service';
import { logInfo, logWarn } from '../src/middleware/logger';

const prisma = new PrismaClient();

async function testCatalogMode() {
  try {
    console.log('🧪 Testing Catalog Mode for US/tourist...\n');

    // Check feature flag
    const useCatalog = process.env.USE_GLOBAL_DOCUMENT_CATALOG === 'true';
    console.log(`Feature flag USE_GLOBAL_DOCUMENT_CATALOG: ${useCatalog ? '✅ ENABLED' : '❌ DISABLED'}\n`);

    // Get rule set with references
    const ruleSetWithRefs = await VisaRulesService.getActiveRuleSetWithReferences('US', 'tourist');
    
    if (!ruleSetWithRefs) {
      console.error('❌ No approved rule set found for US/tourist');
      console.error('   Run: pnpm seed:us-b1b2-rules');
      process.exit(1);
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

    // Test with catalog mode (if flag is on)
    if (useCatalog) {
      console.log('📋 Testing catalog mode...\n');
      
      const baseChecklist = await buildBaseChecklistFromRules(testContext, ruleSetWithRefs.data, {
        ruleSetId: ruleSetWithRefs.id,
        countryCode: ruleSetWithRefs.countryCode,
        visaType: ruleSetWithRefs.visaType,
      });

      console.log(`✅ Catalog mode checklist generated: ${baseChecklist.length} items`);
      console.log(`   Required: ${baseChecklist.filter((item) => item.required).length}`);
      console.log(`   Highly Recommended: ${baseChecklist.filter((item) => item.category === 'highly_recommended').length}`);
      console.log(`   Optional: ${baseChecklist.filter((item) => item.category === 'optional').length}\n`);

      // Verify US-specific documents are present
      const documentTypes = baseChecklist.map((item) => item.documentType);
      const usSpecificDocs = ['ds160_confirmation', 'appointment_confirmation', 'visa_fee_receipt'];
      const foundUsDocs = usSpecificDocs.filter((doc) => documentTypes.includes(doc));
      
      console.log(`✅ US-specific documents found: ${foundUsDocs.length}/${usSpecificDocs.length}`);
      for (const doc of foundUsDocs) {
        console.log(`   - ${doc}`);
      }

      if (baseChecklist.length < 4) {
        console.error('❌ Checklist too small (< 4 items)');
        process.exit(1);
      }

      if (baseChecklist.length > 30) {
        console.warn('⚠️  Checklist very large (> 30 items)');
      }

      console.log('\n✅ Catalog mode test passed!');
    } else {
      console.log('📋 Testing embedded mode (feature flag disabled)...\n');
      
      const baseChecklist = await buildBaseChecklistFromRules(testContext, ruleSetWithRefs.data);

      console.log(`✅ Embedded mode checklist generated: ${baseChecklist.length} items`);
      console.log(`   Required: ${baseChecklist.filter((item) => item.required).length}`);
      console.log(`   Highly Recommended: ${baseChecklist.filter((item) => item.category === 'highly_recommended').length}`);
      console.log(`   Optional: ${baseChecklist.filter((item) => item.category === 'optional').length}\n`);

      console.log('ℹ️  To test catalog mode, set: USE_GLOBAL_DOCUMENT_CATALOG=true');
    }

    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testCatalogMode();

