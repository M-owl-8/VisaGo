/**
 * Seed Japan (JP) Tourist Visa Rule Set
 * 
 * Creates a professional VisaRuleSet for Japan tourist visas
 * with version 2 and proper conditional documents.
 * 
 * Usage: pnpm tsx scripts/seed-jp-tourist-rules.ts
 */

import { PrismaClient } from '@prisma/client';
import { VisaRuleSetData } from '../src/services/visa-rules.service';
import { logInfo, logWarn, logError } from '../src/middleware/logger';

const prisma = new PrismaClient();

/**
 * Create comprehensive Japan Tourist Visa Rule Set
 */
function createJPTouristRuleSet(): VisaRuleSetData {
  return {
    version: 2,

    requiredDocuments: [
      // Core Required Documents (always required for Japan tourist visa)
      {
        documentType: 'passport_international',
        category: 'required',
        description: 'Passport must be valid for entire duration of stay in Japan',
        validityRequirements: 'Valid passport with sufficient validity for entire stay',
        formatRequirements: 'Original passport with at least 2 blank pages',
      },
      {
        documentType: 'visa_application_form',
        category: 'required',
        description: 'Completed and signed Japan visa application form',
        validityRequirements: 'Form must be completed in English or Japanese',
        formatRequirements: 'Original signed form, all fields completed, no corrections',
      },
      {
        documentType: 'photo_passport',
        category: 'required',
        description: 'Recent color photograph meeting Japan visa photo requirements',
        validityRequirements: 'Taken within last 6 months',
        formatRequirements: '45x45mm or 2x2 inches, white background, no glasses, neutral expression, full face visible',
      },

      // Financial Documents
      {
        documentType: 'bank_statements_applicant',
        category: 'required',
        description: 'Personal bank statements showing sufficient funds for trip (minimum $100-150 per day)',
        validityRequirements: 'Last 3-6 months of statements',
        formatRequirements: 'Original statements from bank, stamped and signed, showing account holder name and sufficient balance',
        condition: "sponsorType === 'self'",
      },
      {
        documentType: 'bank_statements_sponsor',
        category: 'required',
        description: 'Sponsor bank statements showing ability to support applicant during trip',
        validityRequirements: 'Last 3-6 months of statements',
        formatRequirements: 'Original statements from bank, stamped and signed',
        condition: "sponsorType !== 'self'",
      },
      {
        documentType: 'sponsor_affidavit',
        category: 'required',
        description: 'Letter of guarantee from sponsor (if applicable)',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'Signed letter with sponsor contact information, passport copy, and proof of income',
        condition: "sponsorType !== 'self'",
      },
      {
        documentType: 'proof_of_income',
        category: 'highly_recommended',
        description: 'Proof of regular income (employment letter, tax returns, or business documents)',
        validityRequirements: 'Recent documents (within 6 months)',
        formatRequirements: 'Original or certified copies, translated to English if needed',
      },

      // Travel Documents
      {
        documentType: 'travel_itinerary',
        category: 'required',
        description: 'Detailed travel itinerary including flight reservations, accommodation bookings, and planned activities',
        validityRequirements: 'Tentative itinerary covering entire stay in Japan',
        formatRequirements: 'Print or digital itinerary with dates, locations, and activities',
      },
      {
        documentType: 'accommodation_proof',
        category: 'required',
        description: 'Hotel bookings, Airbnb reservations, or host accommodation confirmation for entire stay',
        validityRequirements: 'Valid accommodation bookings for all nights in Japan',
        formatRequirements: 'Booking confirmations with dates, addresses, and contact information',
      },
      {
        documentType: 'return_ticket',
        category: 'highly_recommended',
        description: 'Round-trip or return flight ticket showing intent to return',
        validityRequirements: 'Valid flight booking (can be refundable)',
        formatRequirements: 'Flight reservation or booking confirmation',
      },

      // Employment/Status Documents
      {
        documentType: 'employment_letter',
        category: 'required',
        description: 'Letter from current employer confirming employment, position, salary, and leave approval',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'On company letterhead, signed by HR or supervisor, in English or Japanese',
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
        documentType: 'student_enrollment_letter',
        category: 'required',
        description: 'Letter from educational institution confirming enrollment and leave approval',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'On institution letterhead, signed by registrar or dean',
        condition: "currentStatus === 'student'",
      },

      // Additional Documents
      {
        documentType: 'invitation_letter',
        category: 'optional',
        description: 'Invitation letter from host in Japan (if staying with friends/family)',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'Signed letter with host contact information, address, and relationship to applicant',
      },
      {
        documentType: 'travel_insurance',
        category: 'highly_recommended',
        description: 'Travel health insurance covering entire stay in Japan',
        validityRequirements: 'Valid for entire duration of stay',
        formatRequirements: 'Insurance certificate showing coverage amount and dates',
      },
    ],

    financialRequirements: {
      minimumBalance: 5000, // Minimum $5,000 for trip
      currency: 'USD',
      bankStatementMonths: 3,
      sponsorRequirements: {
        allowed: true,
        requiredDocuments: ['sponsor_affidavit', 'bank_statements_sponsor', 'proof_of_income'],
      },
    },

    processingInfo: {
      processingDays: 5,
      appointmentRequired: true,
      interviewRequired: false, // Usually not required for tourist visas
      biometricsRequired: false,
    },

    fees: {
      visaFee: 0, // Japan tourist visa is typically free for many nationalities
      serviceFee: 0,
      currency: 'USD',
      paymentMethods: ['cash', 'card'],
    },

    additionalRequirements: {
      travelInsurance: {
        required: false,
      },
      accommodationProof: {
        required: true,
        types: ['hotel_booking', 'airbnb', 'host_invitation'],
      },
      returnTicket: {
        required: false,
        refundable: true,
      },
    },

    sourceInfo: {
      extractedFrom: 'Japan Ministry of Foreign Affairs (MOFA) visa requirements',
      extractedAt: new Date().toISOString(),
      confidence: 0.95,
    },
  };
}

/**
 * Main function to seed Japan tourist visa rules
 */
async function main() {
  try {
    logInfo('[SeedJP] Starting Japan tourist visa rule set seeding...');

    const countryCode = 'JP';
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
        logInfo('[SeedJP] Unapproved existing rule set', {
          id: existing.id,
          version: existing.version,
        });
      }
    }

    // Determine next version
    const latestVersion = existingRuleSets.length > 0 ? existingRuleSets[0].version : 0;
    const nextVersion = Math.max(targetVersion, latestVersion + 1);

    // Create rule set data
    const ruleSetData = createJPTouristRuleSet();

    // Create new rule set
    // Handle both PostgreSQL (Json) and SQLite (String) compatibility
    const isPostgreSQL = process.env.DATABASE_URL?.includes('postgresql') || process.env.DATABASE_URL?.includes('postgres');
    const dataForDb = isPostgreSQL ? (ruleSetData as any) : (JSON.stringify(ruleSetData) as any);
    
    const newRuleSet = await prisma.visaRuleSet.create({
      data: {
        countryCode,
        visaType,
        data: dataForDb,
        version: nextVersion,
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: 'system',
        createdBy: 'system',
        sourceSummary: 'Manually created comprehensive rule set for Japan tourist visas',
      },
    });

    // Create version history entry
    await prisma.visaRuleVersion.create({
      data: {
        ruleSetId: newRuleSet.id,
        data: dataForDb,
        version: nextVersion,
        changeLog: 'Initial comprehensive rule set for Japan tourist visas',
      },
    });

    logInfo('[SeedJP] Japan tourist visa rule set created successfully', {
      id: newRuleSet.id,
      countryCode,
      visaType,
      version: nextVersion,
      documentCount: ruleSetData.requiredDocuments?.length || 0,
      isApproved: newRuleSet.isApproved,
    });

    console.log('\n✅ Japan tourist visa rule set seeded successfully!');
    console.log(`   Country: ${countryCode}`);
    console.log(`   Visa Type: ${visaType}`);
    console.log(`   Version: ${nextVersion}`);
    console.log(`   Documents: ${ruleSetData.requiredDocuments?.length || 0}`);
    console.log(`   Status: ${newRuleSet.isApproved ? 'APPROVED' : 'PENDING'}\n`);
  } catch (error) {
    logError('[SeedJP] Error seeding Japan tourist visa rules', error as Error);
    console.error('❌ Error seeding Japan tourist visa rules:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

