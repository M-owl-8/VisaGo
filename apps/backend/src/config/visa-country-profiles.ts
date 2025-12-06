/**
 * Visa Country Profiles (Phase 6)
 *
 * Code-only config expressing expected patterns for 10 countries × 2 visa types.
 * Used to provide defaults when embassy data is weak or missing.
 *
 * Design principles:
 * - No DB calls, pure constants
 * - Focus on default costs, insurance minimums, statement months
 * - Small notes array for future prompt hints
 */

export interface VisaCountryProfile {
  // Tourist visa defaults
  defaultDailyCostUSD?: number;
  minDaysIfUnknown?: number;

  // Student visa defaults
  defaultAnnualTuitionUSD?: number;
  defaultAnnualLivingUSD?: number;

  // Financial requirements
  defaultBankStatementMonths?: number; // Typically 3 or 6

  // Insurance requirements
  insuranceMinimumEUR?: number; // For Schengen countries
  insuranceMinimumUSD?: number; // For non-Schengen countries

  // Processing hints
  typicalProcessingDays?: number;
  interviewRequired?: boolean;
  biometricsRequired?: boolean;

  // Notes for prompt hints
  notes?: string[];
}

type CountryCode = 'US' | 'GB' | 'DE' | 'ES' | 'CA' | 'AU' | 'JP' | 'KR' | 'AE';
type VisaType = 'tourist' | 'student';
type ProfileKey = `${CountryCode}:${VisaType}`;

export const VISA_COUNTRY_PROFILES: Record<ProfileKey, VisaCountryProfile> = {
  // ========================================================================
  // UNITED STATES
  // ========================================================================
  'US:tourist': {
    defaultDailyCostUSD: 80,
    minDaysIfUnknown: 14,
    defaultBankStatementMonths: 3,
    insuranceMinimumUSD: 0, // Not strictly required for tourist
    typicalProcessingDays: 14,
    interviewRequired: true,
    biometricsRequired: true,
    notes: [
      'Strong ties emphasized (employment, property, family)',
      'No strict insurance requirement for tourist visa',
      'DS-160 form required',
      'Interview typically required',
    ],
  },
  'US:student': {
    defaultAnnualTuitionUSD: 20000,
    defaultAnnualLivingUSD: 12000,
    defaultBankStatementMonths: 6,
    insuranceMinimumUSD: 0, // Covered by school insurance typically
    typicalProcessingDays: 14,
    interviewRequired: true,
    biometricsRequired: true,
    notes: [
      'I-20 form required (F-1) or DS-2019 (J-1)',
      'SEVIS fee required (I-901)',
      'First year funds expectation (tuition + living)',
      'DS-160 form required',
      'Interview typically required',
    ],
  },

  // ========================================================================
  // UNITED KINGDOM
  // ========================================================================
  'GB:tourist': {
    defaultDailyCostUSD: 90,
    minDaysIfUnknown: 14,
    defaultBankStatementMonths: 3,
    insuranceMinimumUSD: 0, // Not strictly required
    typicalProcessingDays: 15,
    interviewRequired: false, // Usually not required
    biometricsRequired: true,
    notes: [
      '28-day rule: Bank statements must show funds for 28+ consecutive days',
      'Strong ties to home country emphasized',
      'Travel itinerary and accommodation proof required',
    ],
  },
  'GB:student': {
    defaultAnnualTuitionUSD: 15000,
    defaultAnnualLivingUSD: 12000,
    defaultBankStatementMonths: 6,
    insuranceMinimumUSD: 0, // NHS surcharge for students
    typicalProcessingDays: 15,
    interviewRequired: false,
    biometricsRequired: true,
    notes: [
      'CAS (Confirmation of Acceptance for Studies) letter required',
      '28-day rule for bank statements',
      'TB test certificate may be required',
      'Student visa (Tier 4)',
    ],
  },

  // ========================================================================
  // GERMANY (Schengen)
  // ========================================================================
  'DE:tourist': {
    defaultDailyCostUSD: 70,
    minDaysIfUnknown: 14,
    defaultBankStatementMonths: 3,
    insuranceMinimumEUR: 30000,
    typicalProcessingDays: 10,
    interviewRequired: false,
    biometricsRequired: true,
    notes: [
      'Travel health insurance required (minimum €30,000 coverage)',
      'Accommodation proof required (hotel booking, invitation, etc.)',
      'Round-trip flight reservation',
      'Schengen visa application form',
    ],
  },
  'DE:student': {
    defaultAnnualTuitionUSD: 0, // Public universities often free/low cost
    defaultAnnualLivingUSD: 10000,
    defaultBankStatementMonths: 3,
    insuranceMinimumEUR: 30000,
    typicalProcessingDays: 8,
    interviewRequired: false,
    biometricsRequired: true,
    notes: [
      'Admission letter from German university required',
      'Blocked account (Sperrkonto) may be required',
      'Health insurance required (minimum €30,000)',
      'Student residence permit application',
    ],
  },

  // ========================================================================
  // SPAIN (Schengen)
  // ========================================================================
  'ES:tourist': {
    defaultDailyCostUSD: 60,
    minDaysIfUnknown: 14,
    defaultBankStatementMonths: 3,
    insuranceMinimumEUR: 30000,
    typicalProcessingDays: 10,
    interviewRequired: false,
    biometricsRequired: true,
    notes: [
      'Travel health insurance required (minimum €30,000 coverage)',
      'Accommodation proof required (hotel, Airbnb, invitation)',
      'Round-trip flight reservation',
      'Schengen visa application form',
    ],
  },
  'ES:student': {
    defaultAnnualTuitionUSD: 2000, // Public universities relatively low cost
    defaultAnnualLivingUSD: 9000,
    defaultBankStatementMonths: 3,
    insuranceMinimumEUR: 30000,
    typicalProcessingDays: 8,
    interviewRequired: false,
    biometricsRequired: true,
    notes: [
      'Admission letter from Spanish university required',
      'Health insurance required (minimum €30,000)',
      'Student visa application',
    ],
  },

  // ========================================================================
  // CANADA
  // ========================================================================
  'CA:tourist': {
    defaultDailyCostUSD: 90,
    minDaysIfUnknown: 14,
    defaultBankStatementMonths: 3,
    insuranceMinimumUSD: 0, // Not strictly required
    typicalProcessingDays: 14,
    interviewRequired: false,
    biometricsRequired: true,
    notes: [
      'Strong ties to home country emphasized',
      'Travel itinerary and accommodation proof',
      'Visitor visa application',
    ],
  },
  'CA:student': {
    defaultAnnualTuitionUSD: 18000,
    defaultAnnualLivingUSD: 10000,
    defaultBankStatementMonths: 4,
    insuranceMinimumUSD: 0, // Provincial health insurance
    typicalProcessingDays: 14,
    interviewRequired: false,
    biometricsRequired: true,
    notes: [
      'LOA (Letter of Acceptance) from DLI (Designated Learning Institution) required',
      'GIC (Guaranteed Investment Certificate) may be required',
      'First year funds (tuition + living expenses)',
      'Study permit application',
    ],
  },

  // ========================================================================
  // AUSTRALIA
  // ========================================================================
  'AU:tourist': {
    defaultDailyCostUSD: 80,
    minDaysIfUnknown: 14,
    defaultBankStatementMonths: 3,
    insuranceMinimumUSD: 0, // Not strictly required
    typicalProcessingDays: 20,
    interviewRequired: false,
    biometricsRequired: true,
    notes: [
      'Travel insurance recommended',
      'Travel itinerary and accommodation proof',
      'Visitor visa application',
    ],
  },
  'AU:student': {
    defaultAnnualTuitionUSD: 22000,
    defaultAnnualLivingUSD: 20000,
    defaultBankStatementMonths: 6,
    insuranceMinimumUSD: 0, // OSHC (Overseas Student Health Cover) required
    typicalProcessingDays: 20,
    interviewRequired: false,
    biometricsRequired: true,
    notes: [
      'COE (Confirmation of Enrolment) required',
      'OSHC (Overseas Student Health Cover) insurance required',
      'GTE (Genuine Temporary Entrant) statement may be required',
      'First year funds (tuition + living expenses)',
      'Student visa application',
    ],
  },

  // ========================================================================
  // JAPAN
  // ========================================================================
  'JP:tourist': {
    defaultDailyCostUSD: 80,
    minDaysIfUnknown: 14,
    defaultBankStatementMonths: 3,
    insuranceMinimumUSD: 0, // Not strictly required
    typicalProcessingDays: 5,
    interviewRequired: false,
    biometricsRequired: false,
    notes: [
      'Detailed itinerary with specific dates and locations',
      'Accommodation proof (hotel reservations or invitation)',
      'Sponsor proof if sponsored',
      'Tourist visa application',
    ],
  },
  'JP:student': {
    defaultAnnualTuitionUSD: 8000,
    defaultAnnualLivingUSD: 10000,
    defaultBankStatementMonths: 3,
    insuranceMinimumUSD: 0, // National health insurance
    typicalProcessingDays: 5,
    interviewRequired: false,
    biometricsRequired: false,
    notes: [
      'Certificate of Eligibility (COE) required',
      'Admission letter from Japanese school/university',
      'Sufficient funds for tuition and living expenses',
      'Student visa application',
    ],
  },

  // ========================================================================
  // SOUTH KOREA
  // ========================================================================
  'KR:tourist': {
    defaultDailyCostUSD: 70,
    minDaysIfUnknown: 14,
    defaultBankStatementMonths: 3,
    insuranceMinimumUSD: 0, // Not strictly required
    typicalProcessingDays: 7,
    interviewRequired: false,
    biometricsRequired: false,
    notes: [
      'Travel itinerary and accommodation proof',
      'Sponsor proof if sponsored',
      'Tourist visa application',
    ],
  },
  'KR:student': {
    defaultAnnualTuitionUSD: 6000,
    defaultAnnualLivingUSD: 8000,
    defaultBankStatementMonths: 3,
    insuranceMinimumUSD: 0, // National health insurance
    typicalProcessingDays: 7,
    interviewRequired: false,
    biometricsRequired: false,
    notes: [
      'Admission letter from Korean school/university',
      'D-2 (university) or D-4 (language school) visa',
      'Clear study plans required',
      'Financial proof for tuition and living expenses',
      'Student visa application',
    ],
  },

  // ========================================================================
  // UAE
  // ========================================================================
  'AE:tourist': {
    defaultDailyCostUSD: 70,
    minDaysIfUnknown: 14,
    defaultBankStatementMonths: 3,
    insuranceMinimumUSD: 0, // Not strictly required
    typicalProcessingDays: 3,
    interviewRequired: false,
    biometricsRequired: false,
    notes: [
      'Hotel booking confirmation',
      'Sponsor letter if invited',
      'Proof of financial means',
      'Travel insurance may be required',
      'Tourist visa application',
    ],
  },
  'AE:student': {
    defaultAnnualTuitionUSD: 15000,
    defaultAnnualLivingUSD: 12000,
    defaultBankStatementMonths: 6,
    insuranceMinimumUSD: 0, // Health insurance may be required
    typicalProcessingDays: 5,
    interviewRequired: false,
    biometricsRequired: false,
    notes: [
      'Admission letter from UAE school/university',
      'Sponsor letter if sponsored',
      'Financial proof for tuition and living expenses',
      'Student visa application',
    ],
  },
};

/**
 * Get visa country profile for a given country code and visa type
 *
 * @param countryCode - ISO country code (US, GB, DE, ES, CA, AU, JP, KR, AE)
 * @param visaType - 'tourist' or 'student'
 * @returns VisaCountryProfile or null if not found
 */
export function getVisaCountryProfile(
  countryCode: string,
  visaType: 'tourist' | 'student'
): VisaCountryProfile | null {
  const key = `${countryCode.toUpperCase()}:${visaType}` as ProfileKey;
  return VISA_COUNTRY_PROFILES[key] || null;
}
