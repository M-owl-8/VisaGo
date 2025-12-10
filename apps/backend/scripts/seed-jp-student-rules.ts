/**
 * Seed Japan (JP) Student Visa Rule Set
 * 
 * Creates a professional VisaRuleSet for Japan student visas
 * with version 2 and proper conditional documents.
 * 
 * Usage: pnpm tsx scripts/seed-jp-student-rules.ts
 */

import { PrismaClient } from '@prisma/client';
import { VisaRuleSetData } from '../src/services/visa-rules.service';
import { logInfo, logWarn, logError } from '../src/middleware/logger';

const prisma = new PrismaClient();

/**
 * Create comprehensive Japan Student Visa Rule Set
 */
function createJPStudentRuleSet(): VisaRuleSetData {
  return {
    version: 2,

    requiredDocuments: [
      // Core Required Documents (always required for Japan student visa)
      {
        documentType: 'passport_international',
        category: 'required',
        description: 'Passport must be valid for entire duration of study period in Japan',
        validityRequirements: 'Valid passport with sufficient validity for entire study period',
        formatRequirements: 'Original passport with at least 2 blank pages',
      },
      {
        documentType: 'visa_application_form',
        category: 'required',
        description: 'Completed and signed Japan student visa application form',
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
      {
        documentType: 'coe_certificate',
        category: 'required',
        description: 'Certificate of Eligibility (COE) issued by Japanese immigration authorities',
        validityRequirements: 'Valid COE issued by school and approved by immigration',
        formatRequirements: 'Original COE certificate (school applies on behalf of student)',
      },
      {
        documentType: 'university_admission_letter',
        category: 'required',
        description: 'Official admission letter from Japanese educational institution',
        validityRequirements: 'Valid admission letter for the academic year',
        formatRequirements: 'Original letter on institution letterhead, signed by authorized person',
      },
      {
        documentType: 'academic_records',
        category: 'required',
        description: 'Official academic transcripts and diplomas from previous education',
        validityRequirements: 'All academic records must be recent and official',
        formatRequirements: 'Original or certified copies, translated to Japanese or English if needed',
      },
      {
        documentType: 'japanese_language_certificate',
        category: 'highly_recommended',
        description: 'Japanese language proficiency certificate (JLPT, J-TEST, or equivalent)',
        validityRequirements: 'Valid certificate showing required proficiency level (varies by program)',
        formatRequirements: 'Original certificate or certified copy',
      },

      // Financial Documents
      {
        documentType: 'bank_statements_applicant',
        category: 'required',
        description: 'Personal bank statements showing sufficient funds for study period (minimum ¥1,000,000-1,500,000 per year)',
        validityRequirements: 'Last 6 months of statements',
        formatRequirements: 'Original statements from bank, stamped and signed, showing account holder name and sufficient balance',
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
        description: 'Letter of guarantee from sponsor (if applicable)',
        validityRequirements: 'Recent letter (within 3 months)',
        formatRequirements: 'Signed letter with sponsor contact information, passport copy, and proof of income, translated to Japanese or English',
        condition: "sponsorType !== 'self'",
      },
      {
        documentType: 'proof_of_income',
        category: 'highly_recommended',
        description: 'Proof of regular income (employment letter, tax returns, or business documents)',
        validityRequirements: 'Recent documents (within 6 months)',
        formatRequirements: 'Original or certified copies, translated to Japanese or English if needed',
      },

      // Health Insurance
      {
        documentType: 'health_insurance',
        category: 'required',
        description: 'Comprehensive health insurance valid in Japan (National Health Insurance enrollment or private insurance)',
        validityRequirements: 'Valid for entire duration of study period',
        formatRequirements: 'Insurance certificate or enrollment confirmation, translated to Japanese or English',
      },

      // Accommodation
      {
        documentType: 'accommodation_proof',
        category: 'required',
        description: 'Proof of accommodation in Japan (dormitory confirmation, rental contract, or host invitation)',
        validityRequirements: 'Valid accommodation for at least first year of study',
        formatRequirements: 'Dormitory confirmation letter, rental contract, or notarized invitation letter from host',
      },

      // Additional Documents
      {
        documentType: 'criminal_record',
        category: 'required',
        description: 'Criminal record certificate from country of residence',
        validityRequirements: 'Issued within last 3 months',
        formatRequirements: 'Original certificate, translated to Japanese or English',
      },
      {
        documentType: 'medical_certificate',
        category: 'required',
        description: 'Medical certificate confirming good health and absence of contagious diseases',
        validityRequirements: 'Issued within last 3 months',
        formatRequirements: 'Original certificate from licensed physician, translated to Japanese or English',
      },
      {
        documentType: 'travel_itinerary',
        category: 'highly_recommended',
        description: 'Flight reservation or booking confirmation to Japan',
        validityRequirements: 'Valid booking for travel to Japan',
        formatRequirements: 'Flight reservation or booking confirmation',
      },
      {
        documentType: 'return_ticket',
        category: 'optional',
        description: 'Return flight ticket (usually not required for long-term student visas)',
        validityRequirements: 'Valid flight booking (can be refundable)',
        formatRequirements: 'Flight reservation or booking confirmation',
      },
    ],

    financialRequirements: {
      minimumBalance: 15000, // Minimum ¥1,500,000 (approximately $15,000) for first year
      currency: 'JPY',
      bankStatementMonths: 6,
      sponsorRequirements: {
        allowed: true,
        requiredDocuments: ['sponsor_affidavit', 'bank_statements_sponsor', 'proof_of_income'],
      },
    },

    processingInfo: {
      processingDays: 5,
      appointmentRequired: true,
      interviewRequired: false, // Usually not required if COE is approved
      biometricsRequired: false,
    },

    fees: {
      visaFee: 0, // Japan student visa is typically free
      serviceFee: 0,
      currency: 'JPY',
      paymentMethods: ['cash', 'card'],
    },

    additionalRequirements: {
      travelInsurance: {
        required: false, // Health insurance covers this
      },
      accommodationProof: {
        required: true,
        types: ['dormitory_confirmation', 'rental_contract', 'host_invitation'],
      },
      returnTicket: {
        required: false,
        refundable: true,
      },
    },

    sourceInfo: {
      extractedFrom: 'Japan Ministry of Foreign Affairs (MOFA) and Immigration Services Agency requirements',
      extractedAt: new Date().toISOString(),
      confidence: 0.95,
    },
  };
}

/**
 * Main function to seed Japan student visa rules
 */
async function main() {
  try {
    logInfo('[SeedJP] Starting Japan student visa rule set seeding...');

    const countryCode = 'JP';
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
    const ruleSetData = createJPStudentRuleSet();

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
        sourceSummary: 'Manually created comprehensive rule set for Japan student visas',
      },
    });

    // Create version history entry
    await prisma.visaRuleVersion.create({
      data: {
        ruleSetId: newRuleSet.id,
        data: dataForDb,
        version: nextVersion,
        changeLog: 'Initial comprehensive rule set for Japan student visas',
      },
    });

    logInfo('[SeedJP] Japan student visa rule set created successfully', {
      id: newRuleSet.id,
      countryCode,
      visaType,
      version: nextVersion,
      documentCount: ruleSetData.requiredDocuments?.length || 0,
      isApproved: newRuleSet.isApproved,
    });

    console.log('\n✅ Japan student visa rule set seeded successfully!');
    console.log(`   Country: ${countryCode}`);
    console.log(`   Visa Type: ${visaType}`);
    console.log(`   Version: ${nextVersion}`);
    console.log(`   Documents: ${ruleSetData.requiredDocuments?.length || 0}`);
    console.log(`   Status: ${newRuleSet.isApproved ? 'APPROVED' : 'PENDING'}\n`);
  } catch (error) {
    logError('[SeedJP] Error seeding Japan student visa rules', error as Error);
    console.error('❌ Error seeding Japan student visa rules:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

