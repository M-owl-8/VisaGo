/**
 * Seed Spain (ES) Student Visa Rule Set
 * 
 * Creates a professional VisaRuleSet for Spain student visas
 * with version 2 and proper conditional documents.
 * 
 * Usage: pnpm tsx scripts/seed-es-student-rules.ts
 */

import { PrismaClient } from '@prisma/client';
import { VisaRuleSetData } from '../src/services/visa-rules.service';
import { logInfo, logWarn, logError } from '../src/middleware/logger';

const prisma = new PrismaClient();

/**
 * Create comprehensive Spain Student Visa Rule Set
 */
function createESStudentRuleSet(): VisaRuleSetData {
  return {
    version: 2,

    requiredDocuments: [
      // Core Required Documents (always required for Spain student visa)
      {
        documentType: 'passport_international',
        category: 'required',
        description: 'Passport must be valid for at least 1 year from visa application date',
        validityRequirements: 'Minimum 1 year validity remaining',
        formatRequirements: 'Original passport with at least 2 blank pages, issued within last 10 years',
      },
      {
        documentType: 'national_visa_form',
        category: 'required',
        description: 'Completed and signed Spanish National Visa (Type D) application form',
        validityRequirements: 'Form must be completed in Spanish or English',
        formatRequirements: 'Original signed form, all fields completed',
      },
      {
        documentType: 'visa_fee_receipt',
        category: 'required',
        description: 'Proof of payment for Spanish student visa application fee (€150)',
        validityRequirements: 'Valid receipt from visa application center or consulate',
        formatRequirements: 'Original receipt or printed confirmation',
      },
      {
        documentType: 'photo_passport',
        category: 'required',
        description: 'Recent color photograph meeting Spanish visa photo requirements',
        validityRequirements: 'Taken within last 6 months',
        formatRequirements: '35x45mm, white background, no glasses, neutral expression, 70-80% face coverage',
      },
      {
        documentType: 'university_admission_letter',
        category: 'required',
        description: 'Official admission letter from Spanish educational institution',
        validityRequirements: 'Valid admission letter for the academic year',
        formatRequirements: 'Original letter on institution letterhead, signed by authorized person',
      },
      {
        documentType: 'academic_records',
        category: 'required',
        description: 'Official academic transcripts and diplomas from previous education',
        validityRequirements: 'All academic records must be recent and official',
        formatRequirements: 'Original or certified copies, translated to Spanish if needed, with apostille if required',
      },
      {
        documentType: 'spanish_language_certificate',
        category: 'required',
        description: 'Spanish language proficiency certificate (DELE, SIELE, or equivalent)',
        validityRequirements: 'Valid certificate showing required proficiency level (usually B1 or B2)',
        formatRequirements: 'Original certificate or certified copy',
      },

      // Financial Documents
      {
        documentType: 'bank_statements_applicant',
        category: 'required',
        description: 'Personal bank statements showing sufficient funds for study period (minimum €600-700 per month)',
        validityRequirements: 'Last 6 months of statements',
        formatRequirements: 'Original statements from bank, stamped and signed, showing account holder name',
        condition: "sponsorType === 'self'",
      },
      {
        documentType: 'bank_statements_sponsor',
        category: 'required',
        description: 'Sponsor bank statements showing ability to support student during study period',
        validityRequirements: 'Last 6 months of statements',
        formatRequirements: 'Original statements from bank, stamped and signed',
        condition: "sponsorType !== 'self'",
      },
      {
        documentType: 'sponsor_affidavit',
        category: 'required',
        description: 'Signed declaration from sponsor taking financial responsibility for student',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'Signed letter with sponsor contact information, passport copy, and proof of income, translated to Spanish',
        condition: "sponsorType !== 'self'",
      },
      {
        documentType: 'proof_of_income',
        category: 'highly_recommended',
        description: 'Proof of regular income (employment letter, tax returns, or business documents)',
        validityRequirements: 'Recent documents (within 6 months)',
        formatRequirements: 'Original or certified copies, translated to Spanish if needed',
      },

      // Health Insurance
      {
        documentType: 'health_insurance',
        category: 'required',
        description: 'Comprehensive health insurance valid in Spain with minimum €30,000 coverage',
        validityRequirements: 'Valid for entire duration of study period',
        formatRequirements: 'Original insurance certificate in Spanish or English, showing coverage amount and dates',
      },

      // Accommodation
      {
        documentType: 'accommodation_proof',
        category: 'required',
        description: 'Proof of accommodation in Spain (rental contract, dormitory confirmation, or host invitation)',
        validityRequirements: 'Valid accommodation for at least first year of study',
        formatRequirements: 'Rental contract, dormitory confirmation letter, or notarized invitation letter from host',
      },

      // Additional Documents
      {
        documentType: 'criminal_record',
        category: 'required',
        description: 'Criminal record certificate from country of residence (apostilled)',
        validityRequirements: 'Issued within last 3 months',
        formatRequirements: 'Original certificate with apostille, translated to Spanish',
      },
      {
        documentType: 'medical_certificate',
        category: 'required',
        description: 'Medical certificate confirming good health and absence of contagious diseases',
        validityRequirements: 'Issued within last 3 months',
        formatRequirements: 'Original certificate from licensed physician, translated to Spanish',
      },
      {
        documentType: 'travel_itinerary',
        category: 'highly_recommended',
        description: 'Flight reservation or booking confirmation to Spain',
        validityRequirements: 'Valid booking for travel to Spain',
        formatRequirements: 'Flight reservation or booking confirmation',
      },
      {
        documentType: 'return_ticket',
        category: 'optional',
        description: 'Return flight ticket showing intent to return after studies',
        validityRequirements: 'Valid flight booking (can be refundable)',
        formatRequirements: 'Flight reservation or booking confirmation',
      },
    ],

    financialRequirements: {
      minimumBalance: 7000, // Minimum €7,000 for first year
      currency: 'EUR',
      bankStatementMonths: 6,
      sponsorRequirements: {
        allowed: true,
        requiredDocuments: ['sponsor_affidavit', 'bank_statements_sponsor', 'proof_of_income'],
      },
    },

    processingInfo: {
      processingDays: 30,
      appointmentRequired: true,
      interviewRequired: true,
      biometricsRequired: true,
    },

    fees: {
      visaFee: 150,
      serviceFee: 0,
      currency: 'EUR',
      paymentMethods: ['cash', 'card', 'bank_transfer'],
    },

    additionalRequirements: {
      travelInsurance: {
        required: false, // Health insurance covers this
      },
      accommodationProof: {
        required: true,
        types: ['rental_contract', 'dormitory_confirmation', 'host_invitation'],
      },
      returnTicket: {
        required: false,
        refundable: true,
      },
    },

    sourceInfo: {
      extractedFrom: 'Spanish Ministry of Foreign Affairs and Spanish Consulate requirements',
      extractedAt: new Date().toISOString(),
      confidence: 0.95,
    },
  };
}

/**
 * Main function to seed Spain student visa rules
 */
async function main() {
  try {
    logInfo('[SeedES] Starting Spain student visa rule set seeding...');

    const countryCode = 'ES';
    const visaType = 'student';
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
        logInfo('[SeedES] Unapproved existing rule set', {
          id: existing.id,
          version: existing.version,
        });
      }
    }

    // Determine next version
    const latestVersion = existingRuleSets.length > 0 ? existingRuleSets[0].version : 0;
    const nextVersion = Math.max(targetVersion, latestVersion + 1);

    // Create rule set data
    const ruleSetData = createESStudentRuleSet();

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
        sourceSummary: 'Manually created comprehensive rule set for Spain student visas',
      },
    });

    // Create version history entry
    await prisma.visaRuleVersion.create({
      data: {
        ruleSetId: newRuleSet.id,
        data: dataForDb,
        version: nextVersion,
        changeLog: 'Initial comprehensive rule set for Spain student visas',
      },
    });

    logInfo('[SeedES] Spain student visa rule set created successfully', {
      id: newRuleSet.id,
      countryCode,
      visaType,
      version: nextVersion,
      documentCount: ruleSetData.requiredDocuments?.length || 0,
      isApproved: newRuleSet.isApproved,
    });

    console.log('\n✅ Spain student visa rule set seeded successfully!');
    console.log(`   Country: ${countryCode}`);
    console.log(`   Visa Type: ${visaType}`);
    console.log(`   Version: ${nextVersion}`);
    console.log(`   Documents: ${ruleSetData.requiredDocuments?.length || 0}`);
    console.log(`   Status: ${newRuleSet.isApproved ? 'APPROVED' : 'PENDING'}\n`);
  } catch (error) {
    logError('[SeedES] Error seeding Spain student visa rules', error as Error);
    console.error('❌ Error seeding Spain student visa rules:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

