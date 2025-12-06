/**
 * Seed US B1/B2 (Tourist) Visa Rule Set
 * 
 * Creates a professional VisaRuleSet for US tourist visas (B1/B2 visitor)
 * with version 2 and proper conditional documents.
 * 
 * Usage: pnpm seed:us-b1b2-rules
 */

import { PrismaClient } from '@prisma/client';
import { VisaRuleSetData } from '../src/services/visa-rules.service';
import { logInfo, logWarn, logError } from '../src/middleware/logger';

const prisma = new PrismaClient();

/**
 * Create comprehensive US B1/B2 Tourist Visa Rule Set
 * 
 * IMPORTANT DESIGN DECISION: Core documents intentionally have NO conditions to avoid 
 * under-generation. We rely on GPT's appliesToThisApplicant field to filter appropriately.
 * 
 * Core documents with NO conditions (always included):
 * - passport_international
 * - ds160_confirmation
 * - visa_fee_receipt
 * - appointment_confirmation
 * - photo_passport
 * - travel_itinerary
 * - accommodation_proof
 * - return_ticket
 * - bank_statements_applicant (always include, even if sponsored - applicant may still need to show own funds)
 * - employment_letter (always include - GPT will determine if it applies based on currentStatus)
 * 
 * Documents with conditions (only truly conditional):
 * - Sponsor docs: bank_statements_sponsor, sponsor_affidavit, sponsor_employment_letter, sponsor_tax_returns
 * - Student docs: student_enrollment_letter, student_transcript
 * - Invitation docs: invitation_letter, host_passport_copy, host_status_documents
 * - Ties docs: property_documents, family_ties_documents, travel_history_evidence
 * - Risk docs: refusal_explanation, additional_financial_docs
 * - Business docs: business_registration, business_bank_statements (for self-employed only)
 * 
 * This ensures we don't over-filter and miss essential documents due to condition evaluation failures.
 */
function createUSTouristRuleSet(): VisaRuleSetData {
  return {
    version: 3, // Version 3: Core documents have NO conditions to avoid under-generation

    requiredDocuments: [
      // ============================================================================
      // CORE REQUIRED DOCUMENTS (NO CONDITIONS - Always included)
      // These are always required for US B1/B2 visas, regardless of applicant profile.
      // GPT will set appliesToThisApplicant based on context.
      // ============================================================================
      {
        documentType: 'passport_international',
        category: 'required',
        description: 'Passport must be valid for at least 6 months beyond intended stay in the US',
        validityRequirements: 'Minimum 6 months validity remaining from date of entry',
        formatRequirements: 'Original passport with at least 2 blank pages',
        // NO CONDITION - Always required
      },
      {
        documentType: 'ds160_confirmation',
        category: 'required',
        description: 'Completed and submitted DS-160 nonimmigrant visa application form',
        validityRequirements: 'Must be submitted online before appointment',
        formatRequirements: 'Print confirmation page with barcode',
        // NO CONDITION - Always required
      },
      {
        documentType: 'visa_fee_receipt',
        category: 'required',
        description: 'Proof of payment for visa application fee (MRV fee)',
        validityRequirements: 'Valid receipt from authorized payment location',
        formatRequirements: 'Original receipt or printed confirmation',
        // NO CONDITION - Always required
      },
      {
        documentType: 'appointment_confirmation',
        category: 'required',
        description: 'Confirmation of scheduled visa interview appointment',
        validityRequirements: 'Must match scheduled appointment date and time',
        formatRequirements: 'Print confirmation email or appointment letter',
        // NO CONDITION - Always required
      },
      {
        documentType: 'photo_passport',
        category: 'required',
        description: 'Recent color photograph meeting US visa photo requirements',
        validityRequirements: 'Taken within last 6 months',
        formatRequirements: '2x2 inches, white background, no glasses, neutral expression',
        // NO CONDITION - Always required
      },
      {
        documentType: 'travel_itinerary',
        category: 'highly_recommended',
        description: 'Detailed travel itinerary including flight reservations, accommodation bookings, and planned activities',
        validityRequirements: 'Tentative itinerary (can be refundable bookings)',
        formatRequirements: 'Print or digital itinerary with dates and locations',
        // NO CONDITION - Always recommended
      },
      {
        documentType: 'accommodation_proof',
        category: 'highly_recommended',
        description: 'Hotel bookings, Airbnb reservations, or host accommodation confirmation',
        validityRequirements: 'Valid accommodation bookings for intended stay',
        formatRequirements: 'Booking confirmations with dates and addresses',
        // NO CONDITION - Always recommended
      },
      {
        documentType: 'return_ticket',
        category: 'optional',
        description: 'Round-trip or return flight ticket showing intent to return',
        validityRequirements: 'Valid flight booking (can be refundable)',
        formatRequirements: 'Flight reservation or booking confirmation',
        // NO CONDITION - Always optional (GPT can decide if needed)
      },

      // ============================================================================
      // FINANCIAL DOCUMENTS - Less strict conditions
      // ============================================================================
      {
        documentType: 'bank_statements_applicant',
        category: 'required',
        description: 'Personal bank statements showing sufficient funds for trip',
        validityRequirements: 'Last 3 months of statements',
        formatRequirements: 'Original statements from bank, stamped and signed',
        // NO CONDITION - Always include applicant bank statements (even if sponsored, applicant may still need to show own funds)
        // GPT will determine if this applies based on sponsorType context
      },
      {
        documentType: 'bank_statements_sponsor',
        category: 'required',
        description: 'Sponsor bank statements showing ability to support applicant',
        validityRequirements: 'Last 3 months of statements',
        formatRequirements: 'Original statements from bank, stamped and signed',
        condition: "sponsorType !== 'self'",
      },
      {
        documentType: 'sponsor_affidavit',
        category: 'required',
        description: 'Form I-134 Affidavit of Support from sponsor (if applicable)',
        validityRequirements: 'Must be notarized and signed by sponsor',
        formatRequirements: 'Original notarized form with supporting documents',
        condition: "sponsorType !== 'self'",
      },
      {
        documentType: 'sponsor_employment_letter',
        category: 'highly_recommended',
        description: 'Letter from sponsor employer confirming employment and income',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'On company letterhead, signed by authorized person',
        condition: "sponsorType !== 'self'",
      },
      {
        documentType: 'sponsor_tax_returns',
        category: 'highly_recommended',
        description: 'Most recent tax returns from sponsor (if available)',
        validityRequirements: 'Most recent year tax return',
        formatRequirements: 'Copy of filed tax return with W-2 forms',
        condition: "sponsorType !== 'self'",
      },

      // ============================================================================
      // EMPLOYMENT/STATUS DOCUMENTS - Less strict conditions
      // ============================================================================
      {
        documentType: 'employment_letter',
        category: 'required',
        description: 'Letter from current employer confirming employment, position, salary, and leave approval',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'On company letterhead, signed by HR or supervisor',
        // NO CONDITION - Always include for employed/self-employed applicants
        // GPT will determine if this applies based on currentStatus context
        // We use OR condition but make it less strict by including it always
      },
      {
        documentType: 'business_registration',
        category: 'required',
        description: 'Business license, registration certificate, and tax documents for self-employed applicants',
        validityRequirements: 'Current and valid registration',
        formatRequirements: 'Original or certified copies of business documents',
        condition: "currentStatus === 'self_employed'",
      },
      {
        documentType: 'business_bank_statements',
        category: 'required',
        description: 'Business bank statements showing business activity and income',
        validityRequirements: 'Last 3 months of business account statements',
        formatRequirements: 'Original statements from bank, stamped and signed',
        condition: "currentStatus === 'self_employed'",
      },
      {
        documentType: 'student_enrollment_letter',
        category: 'required',
        description: 'Letter from educational institution confirming enrollment and leave approval',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'On institution letterhead, signed by registrar or dean',
        condition: "currentStatus === 'student'",
      },
      {
        documentType: 'student_transcript',
        category: 'highly_recommended',
        description: 'Official academic transcript showing current enrollment status',
        validityRequirements: 'Most recent transcript',
        formatRequirements: 'Official transcript from educational institution',
        condition: "currentStatus === 'student'",
      },

      // ============================================================================
      // INVITATION DOCUMENTS - Conditional (only if has invitation)
      // ============================================================================
      {
        documentType: 'invitation_letter',
        category: 'highly_recommended',
        description: 'Letter from US host inviting applicant, including purpose of visit and accommodation details',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'Signed letter with host contact information and address',
        condition: "hasOtherInvitation === true",
      },
      {
        documentType: 'host_passport_copy',
        category: 'highly_recommended',
        description: 'Copy of US host passport or US ID (if US citizen/permanent resident)',
        validityRequirements: 'Valid passport or ID',
        formatRequirements: 'Clear copy of passport bio page or US ID',
        condition: "hasOtherInvitation === true",
      },
      {
        documentType: 'host_status_documents',
        category: 'highly_recommended',
        description: 'Documents proving host legal status in US (visa, green card, etc.)',
        validityRequirements: 'Valid and current status documents',
        formatRequirements: 'Copy of visa, green card, or other status documents',
        condition: "hasOtherInvitation === true",
      },

      // ============================================================================
      // TIES TO HOME COUNTRY - Conditional (only if applicant has ties)
      // ============================================================================
      {
        documentType: 'property_documents',
        category: 'highly_recommended',
        description: 'Documents proving property ownership in Uzbekistan (deed, registration, etc.)',
        validityRequirements: 'Current property ownership documents',
        formatRequirements: 'Original or certified copies of property documents',
        condition: "hasPropertyInUzbekistan === true",
      },
      {
        documentType: 'family_ties_documents',
        category: 'highly_recommended',
        description: 'Documents showing family relationships and ties to Uzbekistan (marriage certificate, birth certificates of children, etc.)',
        validityRequirements: 'Current and valid family documents',
        formatRequirements: 'Original or certified copies of family documents',
        condition: "hasFamilyInUzbekistan === true",
      },
      {
        documentType: 'travel_history_evidence',
        category: 'highly_recommended',
        description: 'Previous passport pages showing travel history, visas, and entry/exit stamps',
        validityRequirements: 'Previous passport or travel documents',
        formatRequirements: 'Copy of passport pages with travel history',
        condition: "hasInternationalTravel === true",
      },

      // ============================================================================
      // RISK-BASED DOCUMENTS - Conditional (only if applicable)
      // ============================================================================
      {
        documentType: 'refusal_explanation',
        category: 'required',
        description: 'Detailed explanation letter addressing previous visa refusal reasons',
        validityRequirements: 'Recent letter addressing refusal',
        formatRequirements: 'Written explanation with supporting documents if applicable',
        condition: "previousVisaRejections === true",
      },
      {
        documentType: 'additional_financial_docs',
        category: 'highly_recommended',
        description: 'Extra financial documents such as property valuation, investment statements, or additional bank accounts',
        validityRequirements: 'Recent financial documents',
        formatRequirements: 'Original or certified copies',
        condition: "riskScore.level === 'high'",
      },

      // ============================================================================
      // MINOR-SPECIFIC DOCUMENTS - Optional (no condition, GPT will decide)
      // ============================================================================
      {
        documentType: 'parental_consent',
        category: 'optional',
        description: 'Notarized consent letter from both parents for minor applicant traveling alone or with one parent',
        validityRequirements: 'Recent notarized consent (within 3 months)',
        formatRequirements: 'Original notarized letter with both parents signatures',
        // NO CONDITION - Condition evaluator doesn't support isMinor, so GPT will decide based on age
      },
      {
        documentType: 'birth_certificate',
        category: 'optional',
        description: 'Original birth certificate for minor applicant',
        validityRequirements: 'Valid birth certificate',
        formatRequirements: 'Original or certified copy of birth certificate',
        // NO CONDITION - Condition evaluator doesn't support isMinor, so GPT will decide based on age
      },
    ],

    financialRequirements: {
      minimumBalance: 3000,
      currency: 'USD',
      bankStatementMonths: 3,
      sponsorRequirements: {
        allowed: true,
        requiredDocuments: [
          'sponsor_affidavit',
          'sponsor_employment_letter',
          'sponsor_bank_statements',
          'sponsor_tax_returns',
        ],
      },
    },

    processingInfo: {
      processingDays: 7,
      appointmentRequired: true,
      interviewRequired: true,
      biometricsRequired: true,
    },

    fees: {
      visaFee: 185,
      currency: 'USD',
      paymentMethods: ['Bank transfer', 'Credit card', 'Debit card', 'Cash at authorized location'],
    },

    additionalRequirements: {
      travelInsurance: {
        required: false,
        minimumCoverage: 50000,
        currency: 'USD',
      },
      accommodationProof: {
        required: false,
        types: ['hotel_booking', 'invitation_letter', 'airbnb_reservation'],
      },
      returnTicket: {
        required: false,
        refundable: true,
      },
    },

    sourceInfo: {
      extractedFrom: 'US Department of State B1/B2 Visitor Visa Requirements',
      extractedAt: new Date().toISOString(),
      confidence: 0.95,
    },
  };
}

/**
 * Main seeding function
 */
async function seedUSB1B2Rules() {
  try {
    logInfo('[Seed] Starting US B1/B2 Tourist Visa Rule Set seeding...');

    const countryCode = 'US';
    const visaType = 'tourist';
    const targetVersion = 2;

    // Check for existing rule sets
    const existingRuleSets = await prisma.visaRuleSet.findMany({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
      },
      orderBy: {
        version: 'desc',
      },
    });

    // Unapprove existing approved rule sets
    for (const existing of existingRuleSets) {
      if (existing.isApproved) {
        await prisma.visaRuleSet.update({
          where: { id: existing.id },
          data: { isApproved: false },
        });
        logInfo('[Seed] Unapproved existing rule set', {
          id: existing.id,
          version: existing.version,
        });
      }
    }

    // Determine next version
    const latestVersion = existingRuleSets.length > 0 ? existingRuleSets[0].version : 0;
    const nextVersion = Math.max(targetVersion, latestVersion + 1);

    // Create new rule set
    const ruleSetData = createUSTouristRuleSet();
    const dataSerialized = JSON.stringify(ruleSetData);

    const ruleSet = await prisma.visaRuleSet.create({
      data: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
        data: dataSerialized as any,
        version: nextVersion,
        createdBy: 'system',
        sourceSummary: 'US Department of State B1/B2 Visitor Visa Requirements - Professional rule set v2',
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
        changeLog: `Professional US B1/B2 Tourist Visa Rule Set - Version ${nextVersion} with conditional documents`,
      },
    });

    // Create change log entry if there was a previous version
    const changeLogDescription = existingRuleSets.length > 0
      ? `Created version ${nextVersion} with comprehensive conditional documents. Previous version ${latestVersion} unapproved.`
      : `Initial professional US B1/B2 Tourist Visa Rule Set - Version ${nextVersion}`;

    await prisma.visaRuleSetChangeLog.create({
      data: {
        ruleSetId: ruleSet.id,
        changeType: existingRuleSets.length > 0 ? 'updated' : 'created',
        changedBy: 'system',
        changeDetails: JSON.stringify({
          previousVersion: existingRuleSets.length > 0 ? latestVersion : null,
          newVersion: nextVersion,
          documentCount: ruleSetData.requiredDocuments.length,
        }) as any, // Will be Json in PostgreSQL, String in SQLite
        description: changeLogDescription,
      },
    });

    logInfo('[Seed] US B1/B2 Tourist Visa Rule Set seeded successfully', {
      id: ruleSet.id,
      countryCode,
      visaType,
      version: nextVersion,
      documentCount: ruleSetData.requiredDocuments.length,
    });

    console.log('\n✅ Successfully seeded US B1/B2 Tourist Visa Rule Set');
    console.log(`   Rule Set ID: ${ruleSet.id}`);
    console.log(`   Version: ${nextVersion}`);
    console.log(`   Documents: ${ruleSetData.requiredDocuments.length} total (expected: 28)`);
    console.log(`   Required: ${ruleSetData.requiredDocuments.filter((d) => d.category === 'required').length}`);
    console.log(`   Highly Recommended: ${ruleSetData.requiredDocuments.filter((d) => d.category === 'highly_recommended').length}`);
    console.log(`   Optional: ${ruleSetData.requiredDocuments.filter((d) => d.category === 'optional').length}`);
    console.log(`   With Conditions: ${ruleSetData.requiredDocuments.filter((d) => d.condition).length}`);
    console.log(`   Status: APPROVED\n`);
  } catch (error) {
    logError('[Seed] Error seeding US B1/B2 Tourist Visa Rule Set', error as Error);
    console.error('❌ Error seeding rule set:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedUSB1B2Rules();
}

export { seedUSB1B2Rules, createUSTouristRuleSet };

