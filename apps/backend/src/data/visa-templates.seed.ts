/**
 * Initial Visa Templates Seed for Phase 2
 *
 * NOTE: This is NOT automatically executed. It is a source of truth for manual/one-time seeding.
 *
 * To seed the database, you would:
 * 1. Import this function
 * 2. Map each template to Prisma create operations
 * 3. Run the seed script manually or via a migration
 */

import type { VisaTemplate } from '../types/visa-brain';

/**
 * Get initial visa templates seed data
 *
 * @returns Array of VisaTemplate objects ready for seeding
 */
export function getInitialVisaTemplatesSeed(): VisaTemplate[] {
  const templates: VisaTemplate[] = [];

  // Helper to push templates
  function addTemplate(tpl: VisaTemplate) {
    templates.push(tpl);
  }

  // ============================================================================
  // US - Long-stay Student (F-1)
  // ============================================================================
  addTemplate({
    id: 'US_student_long_stay',
    countryCode: 'US',
    countryName: 'United States',
    visaTypeCode: 'student_long_stay',
    visaTypeLabel: 'F-1 Long-stay Student Visa',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'accepted_school',
        description: 'Must be accepted by a SEVIS-certified school.',
        critical: true,
      },
      {
        id: 'full_time',
        description: 'Must enroll as a full-time student.',
        critical: true,
      },
      {
        id: 'financial_capacity',
        description:
          'Must demonstrate sufficient financial resources to cover tuition and living expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description:
          'Passport valid at least 6 months beyond intended stay with blank pages for visa stamp.',
        isCoreRequired: true,
      },
      {
        id: 'i20',
        name: 'Form I-20',
        whoNeedsIt: 'school',
        description: 'Official I-20 form issued by the SEVIS-certified institution.',
        isCoreRequired: true,
      },
      {
        id: 'sevis_fee',
        name: 'SEVIS Fee Receipt (I-901)',
        whoNeedsIt: 'applicant',
        description: 'Proof of SEVIS fee payment (I-901).',
        isCoreRequired: true,
      },
      {
        id: 'ds160',
        name: 'DS-160 Confirmation Page',
        whoNeedsIt: 'applicant',
        description: 'Completed DS-160 online form with confirmation barcode.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'sponsor',
        description:
          'Recent bank statements showing sufficient funds to cover tuition and living expenses.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: '2x2 inch photo with white background, taken within last 6 months.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'annual_cost',
        currency: 'USD',
        amount: undefined,
        description: 'Funds to cover 1 year of tuition + living expenses as shown on the I-20.',
      },
    ],
    processingTime: {
      minDays: 7,
      maxDays: 60,
      notes: 'Varies by consulate and season. Peak season (summer) may take longer.',
    },
    officialLinks: [
      {
        label: 'US Department of State - Student Visas',
        url: 'https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html',
      },
      {
        label: 'SEVIS Fee Payment',
        url: 'https://www.fmjfee.com/',
      },
    ],
    specialNotes: [
      {
        id: 'sevis_requirement',
        text: 'All F-1 students must be registered in SEVIS (Student and Exchange Visitor Information System).',
      },
    ],
  });

  // ============================================================================
  // US - Tourist Short Stay (B-2)
  // ============================================================================
  addTemplate({
    id: 'US_tourist_short',
    countryCode: 'US',
    countryName: 'United States',
    visaTypeCode: 'tourist_short',
    visaTypeLabel: 'B-2 Tourist Visa',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'temporary_visit',
        description: 'Must demonstrate intent to return to home country after temporary visit.',
        critical: true,
      },
      {
        id: 'sufficient_funds',
        description: 'Must show sufficient funds to cover trip expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid at least 6 months beyond intended stay.',
        isCoreRequired: true,
      },
      {
        id: 'ds160',
        name: 'DS-160 Confirmation Page',
        whoNeedsIt: 'applicant',
        description: 'Completed DS-160 online form with confirmation barcode.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: '2x2 inch photo with white background.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'applicant',
        description: 'Recent bank statements (last 3-6 months) showing sufficient funds.',
        isCoreRequired: true,
      },
      {
        id: 'travel_itinerary',
        name: 'Travel Itinerary',
        whoNeedsIt: 'applicant',
        description: 'Planned travel dates and destinations within the US.',
        isCoreRequired: false,
        isConditional: true,
        conditionDescription: 'Required if travel dates are confirmed.',
      },
    ],
    financialRequirements: [
      {
        type: 'lump_sum',
        currency: 'USD',
        amount: undefined,
        description: 'Sufficient funds to cover travel, accommodation, and daily expenses.',
      },
    ],
    processingTime: {
      minDays: 7,
      maxDays: 30,
      notes: 'Interview required at US consulate. Processing time varies by location.',
    },
    officialLinks: [
      {
        label: 'US Department of State - Tourist Visas',
        url: 'https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html',
      },
    ],
    specialNotes: [],
  });

  // ============================================================================
  // Canada - Long-stay Student
  // ============================================================================
  addTemplate({
    id: 'CA_student_long_stay',
    countryCode: 'CA',
    countryName: 'Canada',
    visaTypeCode: 'student_long_stay',
    visaTypeLabel: 'Study Permit (Long-stay)',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'accepted_dli',
        description: 'Must be accepted by a Designated Learning Institution (DLI).',
        critical: true,
      },
      {
        id: 'financial_capacity',
        description: 'Must demonstrate sufficient funds for tuition and living expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid for the duration of study.',
        isCoreRequired: true,
      },
      {
        id: 'loa',
        name: 'Letter of Acceptance (LOA)',
        whoNeedsIt: 'school',
        description: 'Letter of Acceptance from a Designated Learning Institution (DLI).',
        isCoreRequired: true,
      },
      {
        id: 'gic',
        name: 'Guaranteed Investment Certificate (GIC)',
        whoNeedsIt: 'applicant',
        description: 'GIC of CAD $10,000+ from a participating Canadian financial institution.',
        isCoreRequired: false,
        isConditional: true,
        conditionDescription: 'Required for SDS (Student Direct Stream) applicants.',
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'sponsor',
        description:
          'Bank statements showing sufficient funds for tuition and living expenses (typically CAD $10,000+ per year).',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Two passport photos meeting Canadian specifications.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'annual_cost',
        currency: 'CAD',
        amount: undefined,
        description: 'Funds to cover tuition fees + CAD $10,000+ per year for living expenses.',
      },
    ],
    processingTime: {
      minDays: 4,
      maxDays: 20,
      notes: 'SDS (Student Direct Stream) processing is typically faster (4-6 weeks).',
    },
    officialLinks: [
      {
        label: 'IRCC - Study Permits',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html',
      },
    ],
    specialNotes: [
      {
        id: 'sds_program',
        text: 'SDS (Student Direct Stream) offers faster processing for eligible applicants from certain countries.',
      },
    ],
  });

  // ============================================================================
  // Canada - Tourist Short Stay
  // ============================================================================
  addTemplate({
    id: 'CA_tourist_short',
    countryCode: 'CA',
    countryName: 'Canada',
    visaTypeCode: 'tourist_short',
    visaTypeLabel: 'Visitor Visa (Tourist)',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'temporary_visit',
        description: 'Must demonstrate intent to return to home country after temporary visit.',
        critical: true,
      },
      {
        id: 'sufficient_funds',
        description: 'Must show sufficient funds to cover trip expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid at least 6 months beyond intended stay.',
        isCoreRequired: true,
      },
      {
        id: 'visa_application_form',
        name: 'Visitor Visa Application Form',
        whoNeedsIt: 'applicant',
        description: 'Completed visitor visa application form (IMM 5257).',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Two passport photos meeting Canadian specifications.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'applicant',
        description: 'Recent bank statements (last 3-6 months) showing sufficient funds.',
        isCoreRequired: true,
      },
      {
        id: 'travel_itinerary',
        name: 'Travel Itinerary',
        whoNeedsIt: 'applicant',
        description: 'Planned travel dates and destinations within Canada.',
        isCoreRequired: false,
        isConditional: true,
        conditionDescription: 'Recommended to show travel plans.',
      },
    ],
    financialRequirements: [
      {
        type: 'lump_sum',
        currency: 'CAD',
        amount: undefined,
        description: 'Sufficient funds to cover travel, accommodation, and daily expenses.',
      },
    ],
    processingTime: {
      minDays: 14,
      maxDays: 45,
      notes: 'Processing time varies by application volume and consulate location.',
    },
    officialLinks: [
      {
        label: 'IRCC - Visitor Visas',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html',
      },
    ],
    specialNotes: [],
  });

  // ============================================================================
  // United Kingdom - Long-stay Student (Tier 4)
  // ============================================================================
  addTemplate({
    id: 'GB_student_long_stay',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    visaTypeCode: 'student_long_stay',
    visaTypeLabel: 'Student Visa (Tier 4)',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'cas_letter',
        description:
          'Must have a Confirmation of Acceptance for Studies (CAS) from a licensed sponsor.',
        critical: true,
      },
      {
        id: 'financial_capacity',
        description:
          'Must demonstrate sufficient funds for tuition and living expenses (28-day rule).',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid for the duration of study.',
        isCoreRequired: true,
      },
      {
        id: 'cas',
        name: 'CAS Letter (Confirmation of Acceptance for Studies)',
        whoNeedsIt: 'school',
        description: 'CAS letter from a UK licensed student sponsor.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'sponsor',
        description:
          'Bank statements showing sufficient funds (28 days minimum) for tuition and living expenses. // TODO: Verify exact amount requirements with UKVI.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Passport photo meeting UK specifications.',
        isCoreRequired: true,
      },
      {
        id: 'tuberculosis_test',
        name: 'Tuberculosis (TB) Test Certificate',
        whoNeedsIt: 'applicant',
        description: 'TB test certificate from an approved clinic (if required for your country).',
        isCoreRequired: false,
        isConditional: true,
        conditionDescription: 'Required for applicants from certain countries.',
      },
    ],
    financialRequirements: [
      {
        type: 'annual_cost',
        currency: 'GBP',
        amount: undefined,
        description:
          'Funds to cover tuition fees + living costs (typically £1,023 per month for London, £820 outside London). // TODO: Verify current amounts with UKVI.',
      },
    ],
    processingTime: {
      minDays: 15,
      maxDays: 60,
      notes:
        'Standard processing: 15 working days. Priority services available for faster processing.',
    },
    officialLinks: [
      {
        label: 'UK Government - Student Visas',
        url: 'https://www.gov.uk/student-visa',
      },
    ],
    specialNotes: [
      {
        id: 'cas_requirement',
        text: 'CAS must be issued by a licensed student sponsor and cannot be more than 6 months old.',
      },
    ],
  });

  // ============================================================================
  // United Kingdom - Tourist Short Stay
  // ============================================================================
  addTemplate({
    id: 'GB_tourist_short',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    visaTypeCode: 'tourist_short',
    visaTypeLabel: 'Standard Visitor Visa',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'temporary_visit',
        description: 'Must demonstrate intent to return to home country after temporary visit.',
        critical: true,
      },
      {
        id: 'sufficient_funds',
        description: 'Must show sufficient funds to cover trip expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid at least 6 months beyond intended stay.',
        isCoreRequired: true,
      },
      {
        id: 'visa_application_form',
        name: 'UK Visa Application Form',
        whoNeedsIt: 'applicant',
        description: 'Completed online visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Passport photo meeting UK specifications.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'applicant',
        description: 'Recent bank statements (last 3-6 months) showing sufficient funds.',
        isCoreRequired: true,
      },
      {
        id: 'travel_itinerary',
        name: 'Travel Itinerary',
        whoNeedsIt: 'applicant',
        description: 'Planned travel dates and destinations within the UK.',
        isCoreRequired: false,
        isConditional: true,
        conditionDescription: 'Recommended to show travel plans.',
      },
    ],
    financialRequirements: [
      {
        type: 'lump_sum',
        currency: 'GBP',
        amount: undefined,
        description: 'Sufficient funds to cover travel, accommodation, and daily expenses.',
      },
    ],
    processingTime: {
      minDays: 15,
      maxDays: 30,
      notes: 'Standard processing: 15 working days. Priority services available.',
    },
    officialLinks: [
      {
        label: 'UK Government - Visit Visas',
        url: 'https://www.gov.uk/standard-visitor-visa',
      },
    ],
    specialNotes: [],
  });

  // ============================================================================
  // Spain - Long-stay Student (Type D)
  // ============================================================================
  addTemplate({
    id: 'ES_student_long_stay',
    countryCode: 'ES',
    countryName: 'Spain',
    visaTypeCode: 'student_long_stay',
    visaTypeLabel: 'Long-stay National Visa (Type D) for Students',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'accepted_school',
        description: 'Must be accepted by a recognized Spanish educational institution.',
        critical: true,
      },
      {
        id: 'financial_capacity',
        description: 'Must demonstrate sufficient funds for tuition and living expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid for the duration of study.',
        isCoreRequired: true,
      },
      {
        id: 'acceptance_letter',
        name: 'Acceptance Letter from Educational Institution',
        whoNeedsIt: 'school',
        description:
          'Official acceptance letter from a recognized Spanish educational institution.',
        isCoreRequired: true,
      },
      {
        id: 'visa_application_form',
        name: 'National Visa Application Form (Type D)',
        whoNeedsIt: 'applicant',
        description: 'Completed long-stay national visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'sponsor',
        description:
          'Bank statements showing sufficient funds for tuition and living expenses. // TODO: Verify exact amount requirements with Spanish consulate.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Passport photo meeting Spanish specifications.',
        isCoreRequired: true,
      },
      {
        id: 'health_insurance',
        name: 'Health Insurance',
        whoNeedsIt: 'applicant',
        description: 'Health insurance valid in Spain for the duration of stay.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'monthly_cost',
        currency: 'EUR',
        amount: undefined,
        description:
          'Funds to cover tuition fees + living expenses (typically €600-800 per month). // TODO: Verify current amounts with Spanish consulate.',
      },
    ],
    processingTime: {
      minDays: 30,
      maxDays: 90,
      notes: 'Long-stay visas typically take 1-3 months to process.',
    },
    officialLinks: [
      {
        label: 'Spanish Ministry of Foreign Affairs - Student Visas',
        url: 'https://www.exteriores.gob.es/Consulados/LONDRES/en/InformacionParaExtranjeros/Pages/Visados.aspx',
      },
    ],
    specialNotes: [
      {
        id: 'residence_permit',
        text: 'After arrival in Spain, students must apply for a residence permit (TIE) within 30 days.',
      },
    ],
  });

  // ============================================================================
  // Spain - Tourist Short Stay (Schengen C)
  // ============================================================================
  addTemplate({
    id: 'ES_tourist_short',
    countryCode: 'ES',
    countryName: 'Spain',
    visaTypeCode: 'tourist_short',
    visaTypeLabel: 'Schengen Short-stay Visa (Type C)',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'temporary_visit',
        description: 'Must demonstrate intent to return to home country after temporary visit.',
        critical: true,
      },
      {
        id: 'sufficient_funds',
        description: 'Must show sufficient funds to cover trip expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description:
          'Passport valid at least 3 months beyond intended stay with at least 2 blank pages.',
        isCoreRequired: true,
      },
      {
        id: 'schengen_visa_form',
        name: 'Schengen Visa Application Form',
        whoNeedsIt: 'applicant',
        description: 'Completed Schengen visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Two passport photos meeting Schengen specifications (biometric).',
        isCoreRequired: true,
      },
      {
        id: 'travel_insurance',
        name: 'Travel Health Insurance',
        whoNeedsIt: 'applicant',
        description:
          'Schengen travel insurance covering at least €30,000 medical expenses, valid for entire stay.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'applicant',
        description: 'Recent bank statements (last 3-6 months) showing sufficient funds.',
        isCoreRequired: true,
      },
      {
        id: 'accommodation_proof',
        name: 'Accommodation Proof',
        whoNeedsIt: 'applicant',
        description: 'Hotel booking confirmation or invitation letter with accommodation details.',
        isCoreRequired: true,
      },
      {
        id: 'round_trip_ticket',
        name: 'Round Trip Flight Reservation',
        whoNeedsIt: 'applicant',
        description: 'Flight reservation showing entry and exit from Schengen area.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'other',
        currency: 'EUR',
        amount: undefined,
        description:
          'Sufficient funds to cover daily expenses (typically €50-100 per day). // TODO: Verify current amounts with Spanish consulate.',
      },
    ],
    processingTime: {
      minDays: 7,
      maxDays: 30,
      notes: 'Standard processing: 15 calendar days. Can take up to 45 days in some cases.',
    },
    officialLinks: [
      {
        label: 'Spanish Consulate - Schengen Visas',
        url: 'https://www.exteriores.gob.es/Consulados/LONDRES/en/InformacionParaExtranjeros/Pages/Visados.aspx',
      },
    ],
    specialNotes: [
      {
        id: 'schengen_insurance',
        text: 'Travel insurance must cover at least €30,000 for medical emergencies and be valid throughout the entire Schengen stay.',
      },
    ],
  });

  // ============================================================================
  // Germany - Long-stay Student (Type D)
  // ============================================================================
  addTemplate({
    id: 'DE_student_long_stay',
    countryCode: 'DE',
    countryName: 'Germany',
    visaTypeCode: 'student_long_stay',
    visaTypeLabel: 'Long-stay National Visa (Type D) for Students',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'accepted_school',
        description: 'Must be accepted by a recognized German educational institution.',
        critical: true,
      },
      {
        id: 'financial_capacity',
        description: 'Must demonstrate sufficient funds (blocked account or scholarship).',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid for the duration of study.',
        isCoreRequired: true,
      },
      {
        id: 'acceptance_letter',
        name: 'Acceptance Letter from University/School',
        whoNeedsIt: 'school',
        description:
          'Official acceptance letter (Zulassungsbescheid) from a recognized German educational institution.',
        isCoreRequired: true,
      },
      {
        id: 'visa_application_form',
        name: 'National Visa Application Form (Type D)',
        whoNeedsIt: 'applicant',
        description: 'Completed long-stay national visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'blocked_account',
        name: 'Blocked Account (Sperrkonto) or Scholarship Proof',
        whoNeedsIt: 'applicant',
        description:
          'Proof of blocked account with minimum €11,208 per year or scholarship certificate. // TODO: Verify current amount with German consulate.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Two passport photos meeting German specifications (biometric).',
        isCoreRequired: true,
      },
      {
        id: 'health_insurance',
        name: 'Health Insurance',
        whoNeedsIt: 'applicant',
        description: 'Health insurance valid in Germany for the duration of stay.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'annual_cost',
        currency: 'EUR',
        amount: undefined,
        description:
          'Blocked account with minimum €11,208 per year or equivalent scholarship. // TODO: Verify current amount with German authorities.',
      },
    ],
    processingTime: {
      minDays: 30,
      maxDays: 90,
      notes: 'Long-stay visas typically take 1-3 months to process.',
    },
    officialLinks: [
      {
        label: 'German Missions - Student Visas',
        url: 'https://www.germany-visa.org/student-visa/',
      },
    ],
    specialNotes: [
      {
        id: 'blocked_account',
        text: 'A blocked account (Sperrkonto) is the standard way to prove financial means for German student visas.',
      },
      {
        id: 'residence_permit',
        text: 'After arrival in Germany, students must apply for a residence permit at the local Foreigners Office (Ausländerbehörde).',
      },
    ],
  });

  // ============================================================================
  // Germany - Tourist Short Stay (Schengen C)
  // ============================================================================
  addTemplate({
    id: 'DE_tourist_short',
    countryCode: 'DE',
    countryName: 'Germany',
    visaTypeCode: 'tourist_short',
    visaTypeLabel: 'Schengen Short-stay Visa (Type C)',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'temporary_visit',
        description: 'Must demonstrate intent to return to home country after temporary visit.',
        critical: true,
      },
      {
        id: 'sufficient_funds',
        description: 'Must show sufficient funds to cover trip expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description:
          'Passport valid at least 3 months beyond intended stay with at least 2 blank pages.',
        isCoreRequired: true,
      },
      {
        id: 'schengen_visa_form',
        name: 'Schengen Visa Application Form',
        whoNeedsIt: 'applicant',
        description: 'Completed Schengen visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Two passport photos meeting Schengen specifications (biometric).',
        isCoreRequired: true,
      },
      {
        id: 'travel_insurance',
        name: 'Travel Health Insurance',
        whoNeedsIt: 'applicant',
        description:
          'Schengen travel insurance covering at least €30,000 medical expenses, valid for entire stay.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'applicant',
        description: 'Recent bank statements (last 3-6 months) showing sufficient funds.',
        isCoreRequired: true,
      },
      {
        id: 'accommodation_proof',
        name: 'Accommodation Proof',
        whoNeedsIt: 'applicant',
        description: 'Hotel booking confirmation or invitation letter with accommodation details.',
        isCoreRequired: true,
      },
      {
        id: 'round_trip_ticket',
        name: 'Round Trip Flight Reservation',
        whoNeedsIt: 'applicant',
        description: 'Flight reservation showing entry and exit from Schengen area.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'other',
        currency: 'EUR',
        amount: undefined,
        description:
          'Sufficient funds to cover daily expenses (typically €50-100 per day). // TODO: Verify current amounts with German consulate.',
      },
    ],
    processingTime: {
      minDays: 7,
      maxDays: 30,
      notes: 'Standard processing: 15 calendar days. Can take up to 45 days in some cases.',
    },
    officialLinks: [
      {
        label: 'German Missions - Schengen Visas',
        url: 'https://www.germany-visa.org/schengen-visa/',
      },
    ],
    specialNotes: [
      {
        id: 'schengen_insurance',
        text: 'Travel insurance must cover at least €30,000 for medical emergencies and be valid throughout the entire Schengen stay.',
      },
    ],
  });

  // ============================================================================
  // Japan - Tourist Short Stay
  // ============================================================================
  addTemplate({
    id: 'JP_tourist_short',
    countryCode: 'JP',
    countryName: 'Japan',
    visaTypeCode: 'tourist_short',
    visaTypeLabel: 'Temporary Visitor Visa',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'temporary_visit',
        description: 'Must demonstrate intent to return to home country after temporary visit.',
        critical: true,
      },
      {
        id: 'sufficient_funds',
        description: 'Must show sufficient funds to cover trip expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid at least 6 months beyond intended stay.',
        isCoreRequired: true,
      },
      {
        id: 'visa_application_form',
        name: 'Japan Visa Application Form',
        whoNeedsIt: 'applicant',
        description: 'Completed Japan visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Passport photo meeting Japanese specifications (4.5cm x 4.5cm).',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'applicant',
        description: 'Recent bank statements (last 3-6 months) showing sufficient funds.',
        isCoreRequired: true,
      },
      {
        id: 'travel_itinerary',
        name: 'Detailed Travel Itinerary',
        whoNeedsIt: 'applicant',
        description: 'Detailed day-by-day travel itinerary with accommodation and activities.',
        isCoreRequired: true,
      },
      {
        id: 'accommodation_proof',
        name: 'Accommodation Proof',
        whoNeedsIt: 'applicant',
        description: 'Hotel booking confirmations for entire stay.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'lump_sum',
        currency: 'JPY',
        amount: undefined,
        description:
          'Sufficient funds to cover travel, accommodation, and daily expenses. // TODO: Verify minimum amount requirements with Japanese consulate.',
      },
    ],
    processingTime: {
      minDays: 5,
      maxDays: 14,
      notes: 'Standard processing: 5-7 working days. Can take up to 2 weeks in some cases.',
    },
    officialLinks: [
      {
        label: 'Ministry of Foreign Affairs of Japan - Visas',
        url: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
      },
    ],
    specialNotes: [
      {
        id: 'detailed_itinerary',
        text: 'Japan requires a very detailed day-by-day itinerary showing planned activities and accommodation.',
      },
    ],
  });

  // ============================================================================
  // Japan - Long-stay Student
  // ============================================================================
  addTemplate({
    id: 'JP_student_long_stay',
    countryCode: 'JP',
    countryName: 'Japan',
    visaTypeCode: 'student_long_stay',
    visaTypeLabel: 'Student Visa (Long-stay)',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'accepted_school',
        description: 'Must be accepted by a recognized Japanese educational institution.',
        critical: true,
      },
      {
        id: 'financial_capacity',
        description: 'Must demonstrate sufficient funds for tuition and living expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid for the duration of study.',
        isCoreRequired: true,
      },
      {
        id: 'certificate_eligibility',
        name: 'Certificate of Eligibility (COE)',
        whoNeedsIt: 'school',
        description:
          'Certificate of Eligibility issued by the Japanese Immigration Bureau (applied for by the school).',
        isCoreRequired: true,
      },
      {
        id: 'visa_application_form',
        name: 'Japan Student Visa Application Form',
        whoNeedsIt: 'applicant',
        description: 'Completed student visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'sponsor',
        description:
          'Bank statements showing sufficient funds for tuition and living expenses. // TODO: Verify exact amount requirements with Japanese consulate.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Passport photo meeting Japanese specifications (4.5cm x 4.5cm).',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'annual_cost',
        currency: 'JPY',
        amount: undefined,
        description:
          'Funds to cover tuition fees + living expenses (typically ¥1,000,000-2,000,000 per year). // TODO: Verify current amounts with Japanese consulate.',
      },
    ],
    processingTime: {
      minDays: 5,
      maxDays: 14,
      notes: 'Processing time after COE is received: 5-7 working days.',
    },
    officialLinks: [
      {
        label: 'Ministry of Foreign Affairs of Japan - Student Visas',
        url: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
      },
    ],
    specialNotes: [
      {
        id: 'coe_requirement',
        text: 'Certificate of Eligibility (COE) must be obtained first by the educational institution before applying for the visa.',
      },
    ],
  });

  // ============================================================================
  // United Arab Emirates - Tourist Short Stay
  // ============================================================================
  addTemplate({
    id: 'AE_tourist_short',
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    visaTypeCode: 'tourist_short',
    visaTypeLabel: 'Tourist Visa',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'temporary_visit',
        description: 'Must demonstrate intent to return to home country after temporary visit.',
        critical: true,
      },
      {
        id: 'sufficient_funds',
        description: 'Must show sufficient funds to cover trip expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid at least 6 months beyond intended stay.',
        isCoreRequired: true,
      },
      {
        id: 'visa_application_form',
        name: 'UAE Visa Application Form',
        whoNeedsIt: 'applicant',
        description: 'Completed UAE visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Passport photo meeting UAE specifications.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'applicant',
        description: 'Recent bank statements (last 3-6 months) showing sufficient funds.',
        isCoreRequired: true,
      },
      {
        id: 'hotel_booking',
        name: 'Hotel Booking Confirmation',
        whoNeedsIt: 'applicant',
        description: 'Hotel booking confirmation for entire stay.',
        isCoreRequired: false,
        isConditional: true,
        conditionDescription: 'Required if not staying with a sponsor.',
      },
      {
        id: 'sponsor_letter',
        name: 'Sponsor Letter (if applicable)',
        whoNeedsIt: 'sponsor',
        description: 'Invitation letter from sponsor in UAE (if staying with sponsor).',
        isCoreRequired: false,
        isConditional: true,
        conditionDescription: 'Required if staying with a sponsor in UAE.',
      },
    ],
    financialRequirements: [
      {
        type: 'lump_sum',
        currency: 'AED',
        amount: undefined,
        description: 'Sufficient funds to cover travel, accommodation, and daily expenses.',
      },
    ],
    processingTime: {
      minDays: 3,
      maxDays: 14,
      notes: 'Standard processing: 3-5 working days. Express services available.',
    },
    officialLinks: [
      {
        label: 'UAE Government - Visa Information',
        url: 'https://www.visitdubai.com/en/plan-your-trip/visa-information',
      },
    ],
    specialNotes: [],
  });

  // ============================================================================
  // United Arab Emirates - Long-stay Student
  // ============================================================================
  addTemplate({
    id: 'AE_student_long_stay',
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    visaTypeCode: 'student_long_stay',
    visaTypeLabel: 'Student Visa (Long-stay)',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'accepted_school',
        description: 'Must be accepted by a recognized UAE educational institution.',
        critical: true,
      },
      {
        id: 'financial_capacity',
        description: 'Must demonstrate sufficient funds for tuition and living expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid for the duration of study.',
        isCoreRequired: true,
      },
      {
        id: 'acceptance_letter',
        name: 'Acceptance Letter from Educational Institution',
        whoNeedsIt: 'school',
        description: 'Official acceptance letter from a recognized UAE educational institution.',
        isCoreRequired: true,
      },
      {
        id: 'visa_application_form',
        name: 'Student Visa Application Form',
        whoNeedsIt: 'applicant',
        description: 'Completed student visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'sponsor',
        description:
          'Bank statements showing sufficient funds for tuition and living expenses. // TODO: Verify exact amount requirements with UAE authorities.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Passport photo meeting UAE specifications.',
        isCoreRequired: true,
      },
      {
        id: 'medical_test',
        name: 'Medical Test Certificate',
        whoNeedsIt: 'applicant',
        description: 'Medical test certificate from approved UAE medical center.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'annual_cost',
        currency: 'AED',
        amount: undefined,
        description:
          'Funds to cover tuition fees + living expenses. // TODO: Verify exact amount requirements with UAE authorities.',
      },
    ],
    processingTime: {
      minDays: 14,
      maxDays: 30,
      notes: 'Processing time varies by institution and application volume.',
    },
    officialLinks: [
      {
        label: 'UAE Government - Student Visas',
        url: 'https://www.visitdubai.com/en/plan-your-trip/visa-information',
      },
    ],
    specialNotes: [
      {
        id: 'medical_test',
        text: 'Medical test must be done at an approved UAE medical center after arrival or before visa issuance, depending on the institution.',
      },
    ],
  });

  // ============================================================================
  // Australia - Long-stay Student
  // ============================================================================
  addTemplate({
    id: 'AU_student_long_stay',
    countryCode: 'AU',
    countryName: 'Australia',
    visaTypeCode: 'student_long_stay',
    visaTypeLabel: 'Student Visa (Subclass 500)',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'coe_letter',
        description:
          'Must have a Confirmation of Enrolment (COE) from a registered Australian educational institution.',
        critical: true,
      },
      {
        id: 'financial_capacity',
        description: 'Must demonstrate sufficient funds for tuition and living expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid for the duration of study.',
        isCoreRequired: true,
      },
      {
        id: 'coe',
        name: 'Confirmation of Enrolment (COE)',
        whoNeedsIt: 'school',
        description: 'COE letter from a registered Australian educational institution.',
        isCoreRequired: true,
      },
      {
        id: 'visa_application_form',
        name: 'Student Visa Application Form (Subclass 500)',
        whoNeedsIt: 'applicant',
        description: 'Completed online student visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'sponsor',
        description:
          'Bank statements showing sufficient funds for tuition and living expenses (typically AUD $21,041+ per year). // TODO: Verify current amounts with Australian Department of Home Affairs.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Passport photo meeting Australian specifications.',
        isCoreRequired: true,
      },
      {
        id: 'oshc',
        name: 'Overseas Student Health Cover (OSHC)',
        whoNeedsIt: 'applicant',
        description: 'OSHC insurance valid for the duration of study.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'annual_cost',
        currency: 'AUD',
        amount: undefined,
        description:
          'Funds to cover tuition fees + living expenses (typically AUD $21,041+ per year). // TODO: Verify current amounts with Australian Department of Home Affairs.',
      },
    ],
    processingTime: {
      minDays: 14,
      maxDays: 60,
      notes: 'Standard processing: 4-8 weeks. Can vary by application volume.',
    },
    officialLinks: [
      {
        label: 'Australian Department of Home Affairs - Student Visas',
        url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
      },
    ],
    specialNotes: [
      {
        id: 'oshc_requirement',
        text: 'Overseas Student Health Cover (OSHC) is mandatory for all international students in Australia.',
      },
    ],
  });

  // ============================================================================
  // Australia - Tourist Short Stay
  // ============================================================================
  addTemplate({
    id: 'AU_tourist_short',
    countryCode: 'AU',
    countryName: 'Australia',
    visaTypeCode: 'tourist_short',
    visaTypeLabel: 'Visitor Visa (Subclass 600)',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'temporary_visit',
        description: 'Must demonstrate intent to return to home country after temporary visit.',
        critical: true,
      },
      {
        id: 'sufficient_funds',
        description: 'Must show sufficient funds to cover trip expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid at least 6 months beyond intended stay.',
        isCoreRequired: true,
      },
      {
        id: 'visa_application_form',
        name: 'Visitor Visa Application Form (Subclass 600)',
        whoNeedsIt: 'applicant',
        description: 'Completed online visitor visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Passport photo meeting Australian specifications.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'applicant',
        description: 'Recent bank statements (last 3-6 months) showing sufficient funds.',
        isCoreRequired: true,
      },
      {
        id: 'travel_itinerary',
        name: 'Travel Itinerary',
        whoNeedsIt: 'applicant',
        description: 'Planned travel dates and destinations within Australia.',
        isCoreRequired: false,
        isConditional: true,
        conditionDescription: 'Recommended to show travel plans.',
      },
    ],
    financialRequirements: [
      {
        type: 'lump_sum',
        currency: 'AUD',
        amount: undefined,
        description: 'Sufficient funds to cover travel, accommodation, and daily expenses.',
      },
    ],
    processingTime: {
      minDays: 14,
      maxDays: 30,
      notes: 'Standard processing: 2-4 weeks. Can vary by application volume.',
    },
    officialLinks: [
      {
        label: 'Australian Department of Home Affairs - Visitor Visas',
        url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600',
      },
    ],
    specialNotes: [],
  });

  // ============================================================================
  // France - Long-stay Student (Type D)
  // ============================================================================
  addTemplate({
    id: 'FR_student_long_stay',
    countryCode: 'FR',
    countryName: 'France',
    visaTypeCode: 'student_long_stay',
    visaTypeLabel: 'Long-stay National Visa (Type D) for Students',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'accepted_school',
        description: 'Must be accepted by a recognized French educational institution.',
        critical: true,
      },
      {
        id: 'financial_capacity',
        description: 'Must demonstrate sufficient funds for tuition and living expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid for the duration of study.',
        isCoreRequired: true,
      },
      {
        id: 'acceptance_letter',
        name: 'Acceptance Letter from Educational Institution',
        whoNeedsIt: 'school',
        description: 'Official acceptance letter from a recognized French educational institution.',
        isCoreRequired: true,
      },
      {
        id: 'visa_application_form',
        name: 'National Visa Application Form (Type D)',
        whoNeedsIt: 'applicant',
        description: 'Completed long-stay national visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'sponsor',
        description:
          'Bank statements showing sufficient funds for tuition and living expenses (typically €615 per month). // TODO: Verify current amounts with French consulate.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Passport photo meeting French specifications.',
        isCoreRequired: true,
      },
      {
        id: 'health_insurance',
        name: 'Health Insurance',
        whoNeedsIt: 'applicant',
        description: 'Health insurance valid in France for the duration of stay.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'monthly_cost',
        currency: 'EUR',
        amount: undefined,
        description:
          'Funds to cover tuition fees + living expenses (typically €615 per month). // TODO: Verify current amounts with French consulate.',
      },
    ],
    processingTime: {
      minDays: 30,
      maxDays: 90,
      notes: 'Long-stay visas typically take 1-3 months to process.',
    },
    officialLinks: [
      {
        label: 'France-Visas - Student Visas',
        url: 'https://france-visas.gouv.fr/en/web/france-visas/student',
      },
    ],
    specialNotes: [
      {
        id: 'residence_permit',
        text: 'After arrival in France, students must validate their visa online and may need to apply for a residence permit (titre de séjour) at the local prefecture.',
      },
    ],
  });

  // ============================================================================
  // France - Tourist Short Stay (Schengen C)
  // ============================================================================
  addTemplate({
    id: 'FR_tourist_short',
    countryCode: 'FR',
    countryName: 'France',
    visaTypeCode: 'tourist_short',
    visaTypeLabel: 'Schengen Short-stay Visa (Type C)',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'temporary_visit',
        description: 'Must demonstrate intent to return to home country after temporary visit.',
        critical: true,
      },
      {
        id: 'sufficient_funds',
        description: 'Must show sufficient funds to cover trip expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description:
          'Passport valid at least 3 months beyond intended stay with at least 2 blank pages.',
        isCoreRequired: true,
      },
      {
        id: 'schengen_visa_form',
        name: 'Schengen Visa Application Form',
        whoNeedsIt: 'applicant',
        description: 'Completed Schengen visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Two passport photos meeting Schengen specifications (biometric).',
        isCoreRequired: true,
      },
      {
        id: 'travel_insurance',
        name: 'Travel Health Insurance',
        whoNeedsIt: 'applicant',
        description:
          'Schengen travel insurance covering at least €30,000 medical expenses, valid for entire stay.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'applicant',
        description: 'Recent bank statements (last 3-6 months) showing sufficient funds.',
        isCoreRequired: true,
      },
      {
        id: 'accommodation_proof',
        name: 'Accommodation Proof',
        whoNeedsIt: 'applicant',
        description: 'Hotel booking confirmation or invitation letter with accommodation details.',
        isCoreRequired: true,
      },
      {
        id: 'round_trip_ticket',
        name: 'Round Trip Flight Reservation',
        whoNeedsIt: 'applicant',
        description: 'Flight reservation showing entry and exit from Schengen area.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'other',
        currency: 'EUR',
        amount: undefined,
        description:
          'Sufficient funds to cover daily expenses (typically €50-100 per day). // TODO: Verify current amounts with French consulate.',
      },
    ],
    processingTime: {
      minDays: 7,
      maxDays: 30,
      notes: 'Standard processing: 15 calendar days. Can take up to 45 days in some cases.',
    },
    officialLinks: [
      {
        label: 'France-Visas - Schengen Visas',
        url: 'https://france-visas.gouv.fr/en/web/france-visas/',
      },
    ],
    specialNotes: [
      {
        id: 'schengen_insurance',
        text: 'Travel insurance must cover at least €30,000 for medical emergencies and be valid throughout the entire Schengen stay.',
      },
    ],
  });

  // ============================================================================
  // Italy - Long-stay Student (Type D)
  // ============================================================================
  addTemplate({
    id: 'IT_student_long_stay',
    countryCode: 'IT',
    countryName: 'Italy',
    visaTypeCode: 'student_long_stay',
    visaTypeLabel: 'Long-stay National Visa (Type D) for Students',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'accepted_school',
        description: 'Must be accepted by a recognized Italian educational institution.',
        critical: true,
      },
      {
        id: 'financial_capacity',
        description: 'Must demonstrate sufficient funds for tuition and living expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description: 'Passport valid for the duration of study.',
        isCoreRequired: true,
      },
      {
        id: 'acceptance_letter',
        name: 'Acceptance Letter from Educational Institution',
        whoNeedsIt: 'school',
        description:
          'Official acceptance letter from a recognized Italian educational institution.',
        isCoreRequired: true,
      },
      {
        id: 'visa_application_form',
        name: 'National Visa Application Form (Type D)',
        whoNeedsIt: 'applicant',
        description: 'Completed long-stay national visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'sponsor',
        description:
          'Bank statements showing sufficient funds for tuition and living expenses (typically €450-600 per month). // TODO: Verify current amounts with Italian consulate.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Passport photo meeting Italian specifications.',
        isCoreRequired: true,
      },
      {
        id: 'health_insurance',
        name: 'Health Insurance',
        whoNeedsIt: 'applicant',
        description: 'Health insurance valid in Italy for the duration of stay.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'monthly_cost',
        currency: 'EUR',
        amount: undefined,
        description:
          'Funds to cover tuition fees + living expenses (typically €450-600 per month). // TODO: Verify current amounts with Italian consulate.',
      },
    ],
    processingTime: {
      minDays: 30,
      maxDays: 90,
      notes: 'Long-stay visas typically take 1-3 months to process.',
    },
    officialLinks: [
      {
        label: 'Italian Ministry of Foreign Affairs - Student Visas',
        url: 'https://vistoperitalia.esteri.it/home/en',
      },
    ],
    specialNotes: [
      {
        id: 'residence_permit',
        text: 'After arrival in Italy, students must apply for a residence permit (permesso di soggiorno) at the local police station (Questura) within 8 days.',
      },
    ],
  });

  // ============================================================================
  // Italy - Tourist Short Stay (Schengen C)
  // ============================================================================
  addTemplate({
    id: 'IT_tourist_short',
    countryCode: 'IT',
    countryName: 'Italy',
    visaTypeCode: 'tourist_short',
    visaTypeLabel: 'Schengen Short-stay Visa (Type C)',
    version: '2025-01-27',
    coverageLevel: 'CORE',
    eligibilityRules: [
      {
        id: 'temporary_visit',
        description: 'Must demonstrate intent to return to home country after temporary visit.',
        critical: true,
      },
      {
        id: 'sufficient_funds',
        description: 'Must show sufficient funds to cover trip expenses.',
        critical: true,
      },
    ],
    requiredDocuments: [
      {
        id: 'passport',
        name: 'Valid Passport',
        whoNeedsIt: 'applicant',
        description:
          'Passport valid at least 3 months beyond intended stay with at least 2 blank pages.',
        isCoreRequired: true,
      },
      {
        id: 'schengen_visa_form',
        name: 'Schengen Visa Application Form',
        whoNeedsIt: 'applicant',
        description: 'Completed Schengen visa application form.',
        isCoreRequired: true,
      },
      {
        id: 'passport_photo',
        name: 'Passport Photo',
        whoNeedsIt: 'applicant',
        description: 'Two passport photos meeting Schengen specifications (biometric).',
        isCoreRequired: true,
      },
      {
        id: 'travel_insurance',
        name: 'Travel Health Insurance',
        whoNeedsIt: 'applicant',
        description:
          'Schengen travel insurance covering at least €30,000 medical expenses, valid for entire stay.',
        isCoreRequired: true,
      },
      {
        id: 'bank_statements',
        name: 'Bank Statements',
        whoNeedsIt: 'applicant',
        description: 'Recent bank statements (last 3-6 months) showing sufficient funds.',
        isCoreRequired: true,
      },
      {
        id: 'accommodation_proof',
        name: 'Accommodation Proof',
        whoNeedsIt: 'applicant',
        description: 'Hotel booking confirmation or invitation letter with accommodation details.',
        isCoreRequired: true,
      },
      {
        id: 'round_trip_ticket',
        name: 'Round Trip Flight Reservation',
        whoNeedsIt: 'applicant',
        description: 'Flight reservation showing entry and exit from Schengen area.',
        isCoreRequired: true,
      },
    ],
    financialRequirements: [
      {
        type: 'other',
        currency: 'EUR',
        amount: undefined,
        description:
          'Sufficient funds to cover daily expenses (typically €50-100 per day). // TODO: Verify current amounts with Italian consulate.',
      },
    ],
    processingTime: {
      minDays: 7,
      maxDays: 30,
      notes: 'Standard processing: 15 calendar days. Can take up to 45 days in some cases.',
    },
    officialLinks: [
      {
        label: 'Italian Ministry of Foreign Affairs - Schengen Visas',
        url: 'https://vistoperitalia.esteri.it/home/en',
      },
    ],
    specialNotes: [
      {
        id: 'schengen_insurance',
        text: 'Travel insurance must cover at least €30,000 for medical emergencies and be valid throughout the entire Schengen stay.',
      },
    ],
  });

  return templates;
}
