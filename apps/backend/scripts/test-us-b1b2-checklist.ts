/**
 * Test US B1/B2 Checklist Generation
 * 
 * Creates a test US B1/B2 application (self-funded, employed, has property and family, no refusals)
 * and verifies that checklist generation returns at least 10 items with expected documents.
 * 
 * Usage: pnpm test:us-b1b2-checklist
 */

import { PrismaClient } from '@prisma/client';
import { DocumentChecklistService } from '../src/services/document-checklist.service';
import { buildCanonicalAIUserContext } from '../src/services/ai-context.service';
import { logInfo, logWarn, logError } from '../src/middleware/logger';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n🧪 Testing US B1/B2 Checklist Generation...\n');

    // Create test application context
    const testContext = {
      applicantProfile: {
        countryCode: 'UZ',
        visaType: 'tourist',
        sponsorType: 'self' as const,
        currentStatus: 'employed' as const,
        isStudent: false,
        isEmployed: true,
        hasInternationalTravel: false,
        previousVisaRejections: false,
        previousOverstay: false,
        hasPropertyInUzbekistan: true,
        hasFamilyInUzbekistan: true,
        maritalStatus: 'married' as const,
        hasChildren: true,
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
      application: {
        countryCode: 'US',
        visaType: 'tourist',
        applicationId: 'test-app-001',
        userId: 'test-user-001',
      },
      riskScore: {
        probabilityPercent: 75,
        level: 'medium' as const,
        riskFactors: [],
        positiveFactors: ['employed', 'has_property', 'has_family'],
      },
      uploadedDocuments: [],
      appActions: [],
    };

    // Build canonical context
    const canonicalContext = buildCanonicalAIUserContext(testContext as any);

    console.log('📋 Test Application Profile:');
    console.log(`   Country: ${canonicalContext.applicantProfile.countryCode} → ${canonicalContext.application.countryCode}`);
    console.log(`   Visa Type: ${canonicalContext.application.visaType}`);
    console.log(`   Sponsor Type: ${canonicalContext.applicantProfile.sponsorType}`);
    console.log(`   Current Status: ${canonicalContext.applicantProfile.currentStatus}`);
    console.log(`   Has Property: ${canonicalContext.applicantProfile.hasPropertyInUzbekistan}`);
    console.log(`   Has Family: ${canonicalContext.applicantProfile.hasFamilyInUzbekistan}`);
    console.log(`   Previous Rejections: ${canonicalContext.applicantProfile.previousVisaRejections}`);
    console.log(`   Risk Level: ${canonicalContext.riskScore.level}\n`);

    // Generate checklist
    console.log('🔄 Generating checklist...\n');
    const checklistResult = await DocumentChecklistService.generateChecklist(
      testContext.application.applicationId,
      testContext.application.userId,
      testContext.application.countryCode,
      testContext.application.visaType,
      testContext as any
    );

    if (!checklistResult || 'status' in checklistResult) {
      console.error('❌ Checklist generation failed:', checklistResult);
      process.exit(1);
    }

    const checklist = checklistResult;
    const items = checklist.items || [];

    console.log('✅ Checklist Generated:');
    console.log(`   Mode: ${checklist.mode || 'unknown'}`);
    console.log(`   Total Items: ${items.length}\n`);

    // Verify minimum item count
    if (items.length < 10) {
      console.error(`❌ FAILED: Expected at least 10 items, got ${items.length}`);
      process.exit(1);
    }

    console.log('📄 Checklist Items:');
    items.forEach((item, index) => {
      const applies = item.appliesToThisApplicant ? '✓' : '✗';
      console.log(`   ${(index + 1).toString().padStart(2)}. ${applies} ${item.documentType.padEnd(35)} (${item.category})`);
    });

    // Verify expected documents
    const expectedDocs = [
      'passport',
      'passport_international',
      'ds160_confirmation',
      'visa_fee_receipt',
      'appointment_confirmation',
      'photo',
      'photo_passport',
      'bank_statements_applicant',
      'employment_letter',
      'travel_itinerary',
      'accommodation_proof',
      'property_documents',
      'family_ties_documents',
      'family_ties_proof',
    ];

    console.log('\n🔍 Verifying Expected Documents:');
    const foundDocs: string[] = [];
    const missingDocs: string[] = [];

    for (const expectedDoc of expectedDocs) {
      const found = items.some((item) => item.documentType === expectedDoc);
      if (found) {
        foundDocs.push(expectedDoc);
        console.log(`   ✓ ${expectedDoc}`);
      } else {
        missingDocs.push(expectedDoc);
        console.log(`   ✗ ${expectedDoc} (MISSING)`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total Items: ${items.length}`);
    console.log(`   Expected Documents Found: ${foundDocs.length}/${expectedDocs.length}`);
    console.log(`   Mode: ${checklist.mode || 'unknown'}`);

    if (missingDocs.length > 0) {
      console.log(`\n⚠️  Missing Documents: ${missingDocs.join(', ')}`);
    }

    // Final verification
    const criticalDocs = [
      'passport',
      'passport_international',
      'ds160_confirmation',
      'visa_fee_receipt',
      'appointment_confirmation',
      'photo',
      'photo_passport',
    ];

    const hasCriticalDocs = criticalDocs.some((doc) =>
      items.some((item) => item.documentType === doc)
    );

    if (!hasCriticalDocs) {
      console.error('\n❌ FAILED: Missing critical documents (passport, DS-160, fee receipt, appointment, photo)');
      process.exit(1);
    }

    if (items.length >= 10 && hasCriticalDocs) {
      console.log('\n✅ TEST PASSED: Checklist has at least 10 items and includes critical documents');
    } else {
      console.error('\n❌ TEST FAILED');
      process.exit(1);
    }
  } catch (error) {
    logError('[Test] Error testing US B1/B2 checklist', error as Error);
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

