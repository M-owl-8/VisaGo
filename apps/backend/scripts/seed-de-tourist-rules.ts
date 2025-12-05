/**
 * Seed Germany (DE) Tourist Visa Rule Set
 * 
 * Creates a professional VisaRuleSet for Germany/Schengen tourist visas
 * with version 2 and proper conditional documents.
 * 
 * Usage: pnpm seed:de-tourist-rules
 */

import { PrismaClient } from '@prisma/client';
import { VisaRuleSetData } from '../src/services/visa-rules.service';
import { logInfo, logWarn, logError } from '../src/middleware/logger';

const prisma = new PrismaClient();

/**
 * Create comprehensive Germany/Schengen Tourist Visa Rule Set
 */
function createDETouristRuleSet(): VisaRuleSetData {
  return {
    version: 2,

    requiredDocuments: [
      // Core Required Documents (always required for Schengen)
      {
        documentType: 'passport_international',
        category: 'required',
        description: 'Passport must be valid for at least 3 months beyond intended departure from Schengen area',
        validityRequirements: 'Minimum 3 months validity remaining from date of departure',
        formatRequirements: 'Original passport with at least 2 blank pages, issued within last 10 years',
      },
      {
        documentType: 'schengen_visa_form',
        category: 'required',

        description: 'Completed and signed Schengen visa application form',
        validityRequirements: 'Form must be completed in English or German',
        formatRequirements: 'Original signed form, all fields completed',
      },
      {
        documentType: 'visa_fee_receipt',
        category: 'required',

        description: 'Proof of payment for Schengen visa application fee (€80 for adults)',
        validityRequirements: 'Valid receipt from visa application center or embassy',
        formatRequirements: 'Original receipt or printed confirmation',
      },
      {
        documentType: 'photo_passport',
        category: 'required',

        description: 'Recent color photograph meeting Schengen visa photo requirements',
        validityRequirements: 'Taken within last 6 months',
        formatRequirements: '35x45mm, white background, no glasses, neutral expression, 70-80% face coverage',
      },
      {
        documentType: 'travel_insurance',
        category: 'required',

        description: 'Travel health insurance covering entire Schengen stay with minimum €30,000 coverage',
        validityRequirements: 'Valid for entire duration of stay in Schengen area',
        formatRequirements: 'Original insurance certificate in English or German, showing coverage amount and dates',
      },

      // Financial Documents - Applicant (self-funded)
      {
        documentType: 'bank_statements_applicant',
        category: 'required',

        description: 'Personal bank statements showing sufficient funds for trip (minimum €50-60 per day)',
        validityRequirements: 'Last 3 months of statements',
        formatRequirements: 'Original statements from bank, stamped and signed, showing account holder name',
        condition: "sponsorType === 'self'",
      },
      {
        documentType: 'bank_statements_sponsor',
        category: 'required',

        description: 'Sponsor bank statements showing ability to support applicant during trip',
        validityRequirements: 'Last 3 months of statements',
        formatRequirements: 'Original statements from bank, stamped and signed',
        condition: "sponsorType !== 'self'",
      },
      {
        documentType: 'sponsor_affidavit',
        category: 'required',

        description: 'Signed declaration from sponsor taking financial responsibility for applicant',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'Signed letter with sponsor contact information, passport copy, and proof of income',
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

      // Employment/Status Documents
      {
        documentType: 'employment_letter',
        category: 'required',

        description: 'Letter from current employer confirming employment, position, salary, and leave approval',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'On company letterhead, signed by HR or supervisor, in English or German',
        condition: "currentStatus === 'employed'",
      },
      {
        documentType: 'business_registration',
        category: 'required',

        description: 'Business license, registration certificate, and tax documents for self-employed applicants',
        validityRequirements: 'Current and valid registration',
        formatRequirements: 'Original or certified copies of business documents, translated if needed',
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

      // Travel Documents
      {
        documentType: 'travel_itinerary',
        category: 'required',

        description: 'Detailed travel itinerary including flight reservations, accommodation bookings, and planned activities',
        validityRequirements: 'Tentative itinerary covering entire stay',
        formatRequirements: 'Print or digital itinerary with dates, locations, and activities',
      },
      {
        documentType: 'accommodation_proof',
        category: 'required',

        description: 'Hotel bookings, Airbnb reservations, or host accommodation confirmation for entire stay',
        validityRequirements: 'Valid accommodation bookings for all nights in Schengen area',
        formatRequirements: 'Booking confirmations with dates, addresses, and contact information',
      },
      {
        documentType: 'return_ticket',
        category: 'highly_recommended',

        description: 'Round-trip or return flight ticket showing intent to return',
        validityRequirements: 'Valid flight booking (can be refundable reservation)',
        formatRequirements: 'Flight reservation or booking confirmation showing return date',
      },

      // Invitation Documents (if visiting family/friends)
      {
        documentType: 'invitation_letter',
        category: 'highly_recommended',

        description: 'Letter from German host inviting applicant, including purpose of visit and accommodation details',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'Signed letter with host contact information, address, and proof of host status',
        condition: "hasOtherInvitation === true",
      },
      {
        documentType: 'host_passport_copy',
        category: 'highly_recommended',

        description: 'Copy of German host passport or German ID (if German citizen/permanent resident)',
        validityRequirements: 'Valid passport or ID',
        formatRequirements: 'Clear copy of passport bio page or German ID',
        condition: "hasOtherInvitation === true",
      },
      {
        documentType: 'host_registration_document',
        category: 'highly_recommended',

        description: 'Proof of host registration in Germany (Anmeldungsbescheinigung)',
        validityRequirements: 'Current registration document',
        formatRequirements: 'Copy of registration document from German authorities',
        condition: "hasOtherInvitation === true",
      },

      // Ties to Home Country
      {
        documentType: 'property_documents',
        category: 'highly_recommended',

        description: 'Documents proving property ownership in Uzbekistan (deed, registration, etc.)',
        validityRequirements: 'Current property ownership documents',
        formatRequirements: 'Original or certified copies of property documents, translated if needed',
        condition: "hasPropertyInUzbekistan === true",
      },
      {
        documentType: 'family_ties_documents',
        category: 'highly_recommended',

        description: 'Documents showing family relationships and ties to Uzbekistan (marriage certificate, birth certificates of children, etc.)',
        validityRequirements: 'Current and valid family documents',
        formatRequirements: 'Original or certified copies of family documents, translated if needed',
        condition: "hasFamilyInUzbekistan === true",
      },
      {
        documentType: 'travel_history_evidence',
        category: 'highly_recommended',

        description: 'Previous passport pages showing travel history, visas, and entry/exit stamps (especially Schengen visas)',
        validityRequirements: 'Previous passport or travel documents',
        formatRequirements: 'Copy of passport pages with travel history',
        condition: "hasInternationalTravel === true",
      },

      // Risk-Based Documents
      {
        documentType: 'refusal_explanation',
        category: 'required',

        description: 'Detailed explanation letter addressing previous Schengen visa refusal reasons',
        validityRequirements: 'Recent letter addressing refusal',
        formatRequirements: 'Written explanation in English or German with supporting documents if applicable',
        condition: "previousVisaRejections === true",
      },
      {
        documentType: 'additional_financial_docs',
        category: 'highly_recommended',

        description: 'Extra financial documents such as property valuation, investment statements, or additional bank accounts',
        validityRequirements: 'Recent financial documents',
        formatRequirements: 'Original or certified copies, translated if needed',
        condition: "riskScore.level === 'high'",
      },

      // Additional Schengen-Specific Documents
      {
        documentType: 'cover_letter',
        category: 'highly_recommended',

        description: 'Personal cover letter explaining purpose of visit, itinerary, and ties to home country',
        validityRequirements: 'Recent letter (within 1 month)',
        formatRequirements: 'Written in English or German, signed by applicant',
      },
      {
        documentType: 'marriage_certificate',
        category: 'optional',

        description: 'Marriage certificate if traveling with spouse (if applicable)',
        validityRequirements: 'Valid marriage certificate',
        formatRequirements: 'Original or certified copy, translated if needed',
        condition: "applicantProfile.maritalStatus === 'married'",
      },
    ],

    financialRequirements: {
      minimumBalance: 2000, // Lower than US, but still substantial (€50-60 per day for typical 30-day trip)
      currency: 'EUR',
      bankStatementMonths: 3,
      sponsorRequirements: {
        allowed: true,
        requiredDocuments: [
          'sponsor_affidavit',
          'sponsor_employment_letter',
          'sponsor_bank_statements',
        ],
      },
    },

    processingInfo: {
      processingDays: 10, // Typical Schengen processing time
      appointmentRequired: true,
      interviewRequired: true, // Usually required for first-time applicants
      biometricsRequired: true, // Required for Schengen visas
    },

    fees: {
      visaFee: 80,
      currency: 'EUR',
      paymentMethods: ['cash', 'card', 'bank_transfer'],
    },

    additionalRequirements: {
      travelInsurance: {
        required: true,
        minimumCoverage: 30000,
        currency: 'EUR',
      },
      accommodationProof: {
        required: true,
        types: ['hotel_booking', 'airbnb', 'host_invitation', 'rental_agreement'],
      },
      returnTicket: {
        required: false, // Highly recommended but not always strictly required
        refundable: true, // Recommended to use refundable tickets
      },
    },

    sourceInfo: {
      extractedFrom: 'Manual creation based on Schengen visa requirements',
      extractedAt: new Date().toISOString(),
      confidence: 0.95,
    },
  };
}

/**
 * Main function to seed Germany tourist visa rules
 */
async function main() {
  try {
    logInfo('[SeedDE] Starting Germany tourist visa rule set seeding...');

    const countryCode = 'DE';
    const visaType = 'tourist';

    // Check for existing rule set
    const existingRuleSet = await prisma.visaRuleSet.findFirst({
      where: {
        countryCode,
        visaType,
        isApproved: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    // Create new rule set data
    const ruleSetData = createDETouristRuleSet();

    // Get next version number
    const nextVersion = existingRuleSet ? existingRuleSet.version + 1 : 2;

    // Unapprove old versions
    if (existingRuleSet) {
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

      logInfo('[SeedDE] Unapproved existing rule set', {
        oldVersion: existingRuleSet.version,
        newVersion: nextVersion,
      });

      // Create change log entry
      const changeDetails = {
        reason: 'New version created via seed script',
        documentsAdded: ruleSetData.requiredDocuments?.length || 0,
        documentsRemoved: 0,
        versionChange: `${existingRuleSet.version} → ${nextVersion}`,
      };

      // Handle SQLite compatibility
      const changeDetailsString = typeof existingRuleSet.data === 'string'
        ? JSON.stringify(changeDetails)
        : changeDetails;

      await prisma.visaRuleSetChangeLog.create({
        data: {
          ruleSetId: existingRuleSet.id,
          changeType: 'version_update',
          changedBy: 'system',
          changeDetails: changeDetailsString as any,
          description: `Germany tourist visa rule set updated to version ${nextVersion}`,
        },
      });
    }

    // Create new rule set
    // For SQLite compatibility, data must be a JSON string
    const newRuleSet = await prisma.visaRuleSet.create({
      data: {
        countryCode,
        visaType,
        data: JSON.stringify(ruleSetData) as any,
        version: nextVersion,
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: 'system',
        createdBy: 'system',
        sourceSummary: 'Manually created comprehensive rule set for Germany/Schengen tourist visas',
      },
    });

    logInfo('[SeedDE] Germany tourist visa rule set created successfully', {
      id: newRuleSet.id,
      countryCode,
      visaType,
      version: nextVersion,
      documentCount: ruleSetData.requiredDocuments?.length || 0,
      isApproved: newRuleSet.isApproved,
    });

    console.log('\n✅ Germany tourist visa rule set seeded successfully!');
    console.log(`   Country: ${countryCode}`);
    console.log(`   Visa Type: ${visaType}`);
    console.log(`   Version: ${nextVersion}`);
    console.log(`   Documents: ${ruleSetData.requiredDocuments?.length || 0}`);
    console.log(`   Status: ${newRuleSet.isApproved ? 'APPROVED' : 'PENDING'}\n`);
  } catch (error) {
    logError('[SeedDE] Error seeding Germany tourist visa rules', error as Error);
    console.error('❌ Error seeding Germany tourist visa rules:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
