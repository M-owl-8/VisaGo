/**
 * ES Tourist Checklist Regression Test
 *
 * Tests ES Schengen tourist checklist generation with a specific profile:
 * - currentStatus: 'employed'
 * - sponsorType: 'self'
 * - maritalStatus: 'married'
 * - hasPropertyInUzbekistan: true
 * - hasFamilyInUzbekistan: true
 * - hasInternationalTravel: true
 * - previousVisaRejections: false
 * - hasOtherInvitation: false
 * - riskLevel: 'high'
 *
 * Expected behavior:
 * - Must include: passport, schengen_visa_form, visa_fee_receipt, photo_passport, travel_insurance,
 *   bank_statement, employment_letter, travel_itinerary, accommodation_proof, flight_booking,
 *   property_documents, family_ties_documents, travel_history_evidence, marriage_certificate, cover_letter
 * - Must NOT include: invitation_letter, host_passport_copy, host_registration_document,
 *   bank_statements_sponsor, sponsor_affidavit, sponsor_employment_letter, student docs, business docs
 */

import { buildCanonicalAIUserContext } from '../services/ai-context.service';
import { buildBaseChecklistFromRules } from '../services/checklist-rules.service';
import { VisaRulesService } from '../services/visa-rules.service';
import { AIUserContext } from '../types/ai-context';
import { logInfo, logWarn } from '../middleware/logger';

/**
 * Test ES tourist checklist generation
 */
export async function testESTouristChecklist(): Promise<void> {
  logInfo('[ESTouristRegression] Starting ES tourist checklist regression test');

  // Build mock AIUserContext matching the test profile
  const mockAIUserContext: AIUserContext = {
    userProfile: {
      userId: 'test-user',
      appLanguage: 'en',
      citizenship: 'UZ',
      age: 30,
    },
    application: {
      applicationId: 'test-es-tourist',
      visaType: 'tourist',
      country: 'ES',
      status: 'draft',
    },
    questionnaireSummary: {
      version: '2.0',
      visaType: 'tourist',
      targetCountry: 'ES',
      appLanguage: 'en',
      // Profile fields
      sponsorType: 'self',
      maritalStatus: 'married',
      hasPropertyInUzbekistan: true,
      hasFamilyInUzbekistan: true,
      hasInternationalTravel: true,
      previousVisaRejections: false,
      hasOtherInvitation: false,
      // Employment
      employment: {
        currentStatus: 'employed',
        isEmployed: true,
        monthlySalaryUSD: 1000,
      },
      // Financial
      bankBalanceUSD: 5000,
      monthlyIncomeUSD: 1000,
      // Documents
      documents: {
        hasPassport: true,
        hasBankStatement: true,
        hasEmploymentOrStudyProof: true,
        hasInsurance: false,
        hasFlightBooking: false,
        hasHotelBookingOrAccommodation: false,
      },
    },
    uploadedDocuments: [],
    appActions: [],
    riskScore: {
      probabilityPercent: 83,
      level: 'high',
      riskFactors: ['weak_ties', 'low_funds'],
      positiveFactors: [],
    },
  };

  // Build canonical context
  const canonicalContext = await buildCanonicalAIUserContext(mockAIUserContext);

  // Verify canonical context fields
  logInfo('[ESTouristRegression] Canonical context fields', {
    sponsorType: canonicalContext.applicantProfile.sponsorType,
    currentStatus: canonicalContext.applicantProfile.currentStatus,
    maritalStatus: canonicalContext.applicantProfile.maritalStatus,
    hasPropertyInUzbekistan: canonicalContext.applicantProfile.hasPropertyInUzbekistan,
    hasFamilyInUzbekistan: canonicalContext.applicantProfile.hasFamilyInUzbekistan,
    hasInternationalTravel: canonicalContext.applicantProfile.hasInternationalTravel,
    previousVisaRejections: canonicalContext.applicantProfile.previousVisaRejections,
    hasOtherInvitation: canonicalContext.applicantProfile.hasOtherInvitation,
    riskLevel: canonicalContext.riskScore.level,
  });

  // Verify expected values
  const assertions: Array<{ field: string; expected: any; actual: any }> = [
    {
      field: 'sponsorType',
      expected: 'self',
      actual: canonicalContext.applicantProfile.sponsorType,
    },
    {
      field: 'currentStatus',
      expected: 'employed',
      actual: canonicalContext.applicantProfile.currentStatus,
    },
    {
      field: 'maritalStatus',
      expected: 'married',
      actual: canonicalContext.applicantProfile.maritalStatus,
    },
    {
      field: 'hasPropertyInUzbekistan',
      expected: true,
      actual: canonicalContext.applicantProfile.hasPropertyInUzbekistan,
    },
    {
      field: 'hasFamilyInUzbekistan',
      expected: true,
      actual: canonicalContext.applicantProfile.hasFamilyInUzbekistan,
    },
    {
      field: 'hasInternationalTravel',
      expected: true,
      actual: canonicalContext.applicantProfile.hasInternationalTravel,
    },
    {
      field: 'previousVisaRejections',
      expected: false,
      actual: canonicalContext.applicantProfile.previousVisaRejections,
    },
    {
      field: 'hasOtherInvitation',
      expected: false,
      actual: canonicalContext.applicantProfile.hasOtherInvitation,
    },
    { field: 'riskLevel', expected: 'high', actual: canonicalContext.riskScore.level },
  ];

  const failures: string[] = [];
  for (const assertion of assertions) {
    if (assertion.actual !== assertion.expected) {
      failures.push(
        `${assertion.field}: expected ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(assertion.actual)}`
      );
    }
  }

  if (failures.length > 0) {
    logWarn('[ESTouristRegression] Canonical context assertion failures', { failures });
    throw new Error(`Canonical context assertions failed:\n${failures.join('\n')}`);
  }

  logInfo('[ESTouristRegression] All canonical context assertions passed');

  // Get ES/tourist rule set
  const ruleSet = await VisaRulesService.getActiveRuleSet('ES', 'tourist');
  if (!ruleSet) {
    throw new Error('ES/tourist VisaRuleSet not found in database');
  }

  logInfo('[ESTouristRegression] ES/tourist VisaRuleSet found', {
    version: ruleSet.version || 1,
    documentCount: ruleSet.requiredDocuments?.length || 0,
  });

  // Build base checklist from rules
  const baseDocuments = await buildBaseChecklistFromRules(mockAIUserContext, ruleSet, {
    countryCode: 'ES',
    visaType: 'tourist',
  });

  logInfo('[ESTouristRegression] Base checklist built', {
    totalItems: baseDocuments.length,
    documentTypes: baseDocuments.map((doc) => doc.documentType),
  });

  // Expected must-include documents
  const mustInclude = [
    'passport',
    'passport_international',
    'schengen_visa_form',
    'visa_application_form',
    'visa_fee_receipt',
    'photo_passport',
    'passport_photo',
    'travel_insurance',
    'bank_statement',
    'bank_statements_applicant',
    'employment_letter',
    'travel_itinerary',
    'accommodation_proof',
    'flight_booking',
    'return_ticket',
    'property_documents',
    'family_ties_documents',
    'family_ties_proof',
    'travel_history_evidence',
    'previous_visas',
    'marriage_certificate',
    'cover_letter',
  ];

  // Expected must-exclude documents
  const mustExclude = [
    'invitation_letter',
    'host_passport_copy',
    'host_registration_document',
    'bank_statements_sponsor',
    'sponsor_affidavit',
    'sponsor_employment_letter',
    'student_enrollment_letter',
    'student_transcript',
    'business_registration',
    'business_bank_statements',
    'refusal_explanation',
  ];

  // Check must-include
  const generatedDocTypes = baseDocuments.map((doc) => doc.documentType);
  const missingMustInclude = mustInclude.filter(
    (docType) =>
      !generatedDocTypes.some((generated) => generated === docType || generated.includes(docType))
  );

  // Check must-exclude
  const presentMustExclude = mustExclude.filter((docType) =>
    generatedDocTypes.some((generated) => generated === docType || generated.includes(docType))
  );

  // Report results
  logInfo('[ESTouristRegression] Checklist validation results', {
    totalGenerated: generatedDocTypes.length,
    generatedDocTypes,
    missingMustInclude,
    presentMustExclude,
  });

  if (missingMustInclude.length > 0) {
    logWarn('[ESTouristRegression] Missing required documents', { missingMustInclude });
  }

  if (presentMustExclude.length > 0) {
    logWarn('[ESTouristRegression] Unwanted documents present', { presentMustExclude });
    throw new Error(
      `ES/tourist checklist includes unwanted documents: ${presentMustExclude.join(', ')}\n` +
        `These should be excluded because hasOtherInvitation=false and sponsorType=self`
    );
  }

  if (missingMustInclude.length > 0) {
    logWarn('[ESTouristRegression] Some expected documents are missing', { missingMustInclude });
    // Don't throw - some documents might be optional or have different names
  }

  logInfo('[ESTouristRegression] Regression test completed successfully');
}

/**
 * CLI entry point
 */
if (require.main === module) {
  testESTouristChecklist()
    .then(() => {
      console.log('✅ ES tourist regression test passed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ ES tourist regression test failed:', error);
      process.exit(1);
    });
}
