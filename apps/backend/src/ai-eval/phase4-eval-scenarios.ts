/**
 * Phase 4 Evaluation Scenarios
 *
 * ⚠️ DEV-ONLY: These are SYNTHETIC Uzbek applicant profiles for AI evaluation only.
 *
 * These scenarios are NOT real user data and are used exclusively for:
 * - Testing checklist generation with invariant checks
 * - Testing risk explanations for consistency
 * - Testing document explanations
 * - Validating officer-style scenario testing
 *
 * Each scenario represents a realistic but synthetic profile covering:
 * - 10 destination countries (US, GB, CA, AU, DE, ES, FR, JP, KR, AE)
 * - 2 visa types (tourist, student)
 * - Various risk profiles (low/medium/high)
 *
 * DO NOT use these scenarios in production code or expose them via public APIs.
 */

export type EvalVisaPurpose = 'tourist' | 'student';

export interface EvalApplicantProfile {
  id: string;
  label: string; // e.g. "UZ → US B1/B2, strong ties, strong funds, rich travel"
  countryCode: string; // target country, e.g. "US"
  visaCategory: EvalVisaPurpose;

  // High-level inputs needed to build questionnaire/canonical context:
  riskPreset: 'low' | 'medium' | 'high';
  hasProperty: boolean;
  hasCloseFamilyInUzbekistan: boolean;
  employmentStatus: 'employed' | 'self_employed' | 'student' | 'unemployed';
  travelHistory: 'none' | 'limited' | 'strong';
  payer: 'self' | 'parents' | 'sponsor';
  approxFundsUSD: number;
  durationCategory: 'short' | 'medium' | 'long';
  isMinor: boolean;

  // optional knobs for special conditions
  hasUniversityAdmission?: boolean;
  hasInvitationLetter?: boolean;
}

/**
 * Phase 4 Evaluation Scenarios
 * 10-20 synthetic cases covering countries, visa types, and risk profiles
 */
export const PHASE4_EVAL_SCENARIOS: EvalApplicantProfile[] = [
  // ========================================================================
  // US TOURIST SCENARIOS
  // ========================================================================
  {
    id: 'us_tourist_strong',
    label: 'UZ → US B1/B2, self-funded, strong property, employed, some travel, low risk',
    countryCode: 'US',
    visaCategory: 'tourist',
    riskPreset: 'low',
    hasProperty: true,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'employed',
    travelHistory: 'limited',
    payer: 'self',
    approxFundsUSD: 15000,
    durationCategory: 'short',
    isMinor: false,
  },
  {
    id: 'us_tourist_high_risk',
    label: 'UZ → US B1/B2, borderline funds, no property, limited travel, high risk',
    countryCode: 'US',
    visaCategory: 'tourist',
    riskPreset: 'high',
    hasProperty: false,
    hasCloseFamilyInUzbekistan: false,
    employmentStatus: 'unemployed',
    travelHistory: 'none',
    payer: 'self',
    approxFundsUSD: 3000,
    durationCategory: 'medium',
    isMinor: false,
  },
  {
    id: 'us_student_sponsored',
    label: 'UZ → US F-1, parents funding, enough funds, strong ties, medium travel, medium risk',
    countryCode: 'US',
    visaCategory: 'student',
    riskPreset: 'medium',
    hasProperty: true,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'student',
    travelHistory: 'limited',
    payer: 'parents',
    approxFundsUSD: 35000,
    durationCategory: 'long',
    isMinor: false,
    hasUniversityAdmission: true,
  },
  // ========================================================================
  // UK TOURIST SCENARIOS
  // ========================================================================
  {
    id: 'uk_tourist_high_risk',
    label: 'UZ → UK visitor, borderline funds, no property, limited travel, high risk',
    countryCode: 'GB',
    visaCategory: 'tourist',
    riskPreset: 'high',
    hasProperty: false,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'employed',
    travelHistory: 'none',
    payer: 'self',
    approxFundsUSD: 4000,
    durationCategory: 'short',
    isMinor: false,
  },
  {
    id: 'uk_student_medium',
    label: 'UZ → UK student, CAS, self-funded, medium funds, weak property, medium risk',
    countryCode: 'GB',
    visaCategory: 'student',
    riskPreset: 'medium',
    hasProperty: true,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'student',
    travelHistory: 'none',
    payer: 'self',
    approxFundsUSD: 25000,
    durationCategory: 'long',
    isMinor: false,
    hasUniversityAdmission: true,
  },
  // ========================================================================
  // SCHENGEN TOURIST SCENARIOS (ES/FR)
  // ========================================================================
  {
    id: 'es_tourist_high_risk',
    label: 'UZ → Schengen tourist (ES), short tourism trip, low funds, no travel, high risk',
    countryCode: 'ES',
    visaCategory: 'tourist',
    riskPreset: 'high',
    hasProperty: false,
    hasCloseFamilyInUzbekistan: false,
    employmentStatus: 'unemployed',
    travelHistory: 'none',
    payer: 'self',
    approxFundsUSD: 2000,
    durationCategory: 'short',
    isMinor: false,
  },
  {
    id: 'fr_tourist_medium',
    label: 'UZ → Schengen tourist (FR), medium funds, weak ties, limited travel, medium risk',
    countryCode: 'FR',
    visaCategory: 'tourist',
    riskPreset: 'medium',
    hasProperty: false,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'employed',
    travelHistory: 'limited',
    payer: 'self',
    approxFundsUSD: 5000,
    durationCategory: 'short',
    isMinor: false,
  },
  // ========================================================================
  // CANADA SCENARIOS
  // ========================================================================
  {
    id: 'ca_tourist_low_risk',
    label: 'UZ → Canada TRV, strong funds, strong ties, good travel, low risk',
    countryCode: 'CA',
    visaCategory: 'tourist',
    riskPreset: 'low',
    hasProperty: true,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'employed',
    travelHistory: 'strong',
    payer: 'self',
    approxFundsUSD: 12000,
    durationCategory: 'medium',
    isMinor: false,
  },
  {
    id: 'ca_student_sponsored',
    label: 'UZ → Canada student, LOA, parents funding, strong funds, weak property, medium risk',
    countryCode: 'CA',
    visaCategory: 'student',
    riskPreset: 'medium',
    hasProperty: true,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'student',
    travelHistory: 'none',
    payer: 'parents',
    approxFundsUSD: 30000,
    durationCategory: 'long',
    isMinor: false,
    hasUniversityAdmission: true,
  },
  // ========================================================================
  // AUSTRALIA SCENARIOS
  // ========================================================================
  {
    id: 'au_student_high_risk',
    label:
      'UZ → AU student, COE + OSHC, parents funding, strong funds, weak property/ties, medium risk',
    countryCode: 'AU',
    visaCategory: 'student',
    riskPreset: 'medium',
    hasProperty: false,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'student',
    travelHistory: 'none',
    payer: 'parents',
    approxFundsUSD: 40000,
    durationCategory: 'long',
    isMinor: false,
    hasUniversityAdmission: true,
  },
  {
    id: 'au_tourist_medium',
    label: 'UZ → AU tourist, medium funds, weak ties, limited travel, medium risk',
    countryCode: 'AU',
    visaCategory: 'tourist',
    riskPreset: 'medium',
    hasProperty: false,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'employed',
    travelHistory: 'limited',
    payer: 'self',
    approxFundsUSD: 6000,
    durationCategory: 'short',
    isMinor: false,
  },
  // ========================================================================
  // JAPAN SCENARIOS
  // ========================================================================
  {
    id: 'jp_tourist_medium',
    label: 'UZ → Japan tourist, medium funds, weak ties, no travel, medium risk',
    countryCode: 'JP',
    visaCategory: 'tourist',
    riskPreset: 'medium',
    hasProperty: false,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'employed',
    travelHistory: 'none',
    payer: 'self',
    approxFundsUSD: 5000,
    durationCategory: 'short',
    isMinor: false,
  },
  {
    id: 'jp_student_high',
    label: 'UZ → Japan student, CoE, self-funded, borderline funds, weak ties, high risk',
    countryCode: 'JP',
    visaCategory: 'student',
    riskPreset: 'high',
    hasProperty: false,
    hasCloseFamilyInUzbekistan: false,
    employmentStatus: 'student',
    travelHistory: 'none',
    payer: 'self',
    approxFundsUSD: 15000,
    durationCategory: 'long',
    isMinor: false,
    hasUniversityAdmission: true,
  },
  // ========================================================================
  // SOUTH KOREA SCENARIOS
  // ========================================================================
  {
    id: 'kr_tourist_low',
    label: 'UZ → South Korea tourist, strong funds, strong ties, good travel, low risk',
    countryCode: 'KR',
    visaCategory: 'tourist',
    riskPreset: 'low',
    hasProperty: true,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'employed',
    travelHistory: 'strong',
    payer: 'self',
    approxFundsUSD: 10000,
    durationCategory: 'short',
    isMinor: false,
  },
  {
    id: 'kr_student_medium',
    label: 'UZ → South Korea student, admission letter, parents funding, medium funds, medium ties',
    countryCode: 'KR',
    visaCategory: 'student',
    riskPreset: 'medium',
    hasProperty: true,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'student',
    travelHistory: 'limited',
    payer: 'parents',
    approxFundsUSD: 25000,
    durationCategory: 'long',
    isMinor: false,
    hasUniversityAdmission: true,
  },
  // ========================================================================
  // UAE SCENARIOS
  // ========================================================================
  {
    id: 'ae_tourist_medium',
    label: 'UZ → UAE tourist, medium funds, weak ties, no travel, medium risk',
    countryCode: 'AE',
    visaCategory: 'tourist',
    riskPreset: 'medium',
    hasProperty: false,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'employed',
    travelHistory: 'none',
    payer: 'self',
    approxFundsUSD: 5000,
    durationCategory: 'short',
    isMinor: false,
  },
  {
    id: 'ae_student_low',
    label: 'UZ → UAE student, admission letter, strong funds, strong ties, good travel, low risk',
    countryCode: 'AE',
    visaCategory: 'student',
    riskPreset: 'low',
    hasProperty: true,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'student',
    travelHistory: 'strong',
    payer: 'self',
    approxFundsUSD: 30000,
    durationCategory: 'long',
    isMinor: false,
    hasUniversityAdmission: true,
  },
  // ========================================================================
  // GERMANY STUDENT SCENARIOS
  // ========================================================================
  {
    id: 'de_student_medium',
    label: 'UZ → Germany student (Schengen), admission letter, blocked account, medium ties',
    countryCode: 'DE',
    visaCategory: 'student',
    riskPreset: 'medium',
    hasProperty: true,
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'student',
    travelHistory: 'limited',
    payer: 'self',
    approxFundsUSD: 28000,
    durationCategory: 'long',
    isMinor: false,
    hasUniversityAdmission: true,
  },
  // ========================================================================
  // EDGE CASES
  // ========================================================================
  {
    id: 'us_tourist_minor',
    label: 'UZ → US B1/B2, minor, parents funding, strong funds, strong ties',
    countryCode: 'US',
    visaCategory: 'tourist',
    riskPreset: 'low',
    hasProperty: false, // Minor doesn't own property
    hasCloseFamilyInUzbekistan: true,
    employmentStatus: 'student',
    travelHistory: 'limited',
    payer: 'parents',
    approxFundsUSD: 20000,
    durationCategory: 'short',
    isMinor: true,
  },
  {
    id: 'uk_tourist_self_employed',
    label: 'UZ → UK visitor, self-employed, borderline funds, weak ties, high risk',
    countryCode: 'GB',
    visaCategory: 'tourist',
    riskPreset: 'high',
    hasProperty: false,
    hasCloseFamilyInUzbekistan: false,
    employmentStatus: 'self_employed',
    travelHistory: 'none',
    payer: 'self',
    approxFundsUSD: 3500,
    durationCategory: 'short',
    isMinor: false,
  },
];
