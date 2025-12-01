/**
 * Visa Brain - Canonical Domain Schemas
 *
 * This file defines the core domain schemas for the GPT-4-based visa checklist system.
 * These schemas are designed to be stable and reusable for 1-2 years.
 *
 * Architecture Principles:
 * - Centralized: All core types defined here
 * - Frozen: Schema changes require careful consideration
 * - Mapped: Existing types (AIUserContext, VisaQuestionnaireSummary) map to these
 * - Typed: Strong TypeScript typing throughout
 *
 * @module visa-brain
 */

import type { AIUserContext } from './ai-context';

// ============================================================================
// APPLICANT PROFILE
// ============================================================================

/**
 * ApplicantProfile
 *
 * Core input for GPT-4 reasoning about a user's visa application.
 * This is the canonical representation of an applicant's profile,
 * mapped from AIUserContext and VisaQuestionnaireSummary.
 *
 * All fields are optional to allow gradual migration and handle missing data.
 * In production, most fields should be populated from questionnaire data.
 */
export interface ApplicantProfile {
  /** User identifier */
  userId: string;

  /** Nationality code (ISO 3166-1 alpha-2), e.g., "UZ" */
  nationality: string;

  /** Country of residence (full name), e.g., "Uzbekistan" */
  residenceCountry: string;

  /** Destination country code (ISO or internal), e.g., "US", "CA" */
  destinationCountryCode: string;

  /** Destination country name (full name), e.g., "United States" */
  destinationCountryName: string;

  /** Visa type code (internal), e.g., "student", "tourist" */
  visaTypeCode: string;

  /** Visa type label (human readable), e.g., "Student Visa" */
  visaTypeLabel: string;

  /** Short text summary of trip purpose */
  tripPurpose?: string;

  /** Duration category, e.g., "<90_days", "90_to_180_days", ">180_days", "more_than_1_year" */
  durationCategory?: string;

  /** Planned travel dates (if available) */
  plannedTravelDates?: {
    start?: string; // ISO date string
    end?: string; // ISO date string
  };

  /** Sponsor type */
  sponsorType?: 'self' | 'parent' | 'family' | 'company' | 'other';

  /** Sponsor description (if sponsorType is 'other') */
  sponsorDescription?: string;

  /** Whether family members are traveling together */
  familyTraveling?: boolean;

  /** Number of travelers (including applicant) */
  numberOfTravelers?: number;

  /** Whether applicant has previous international travel history */
  hasTravelHistory?: boolean;

  /** Whether applicant has previous visa refusals */
  previousVisaRefusals?: boolean;

  /** Whether applicant has previous overstays */
  previousOverstays?: boolean;

  /** Whether applicant owns property in home country */
  hasPropertyInHomeCountry?: boolean;

  /** Whether applicant has family in home country */
  hasFamilyInHomeCountry?: boolean;

  /** Bank balance in USD */
  bankBalanceUSD?: number;

  /** Monthly income in USD */
  monthlyIncomeUSD?: number;

  /** Application language preference */
  appLanguage: 'en' | 'ru' | 'uz';

  /** Applicant age */
  age?: number;

  /** Citizenship code (duplicate of nationality if needed for clarity) */
  citizenshipCode?: string;

  /** Additional context that doesn't fit in structured fields */
  additionalContext?: Record<string, unknown>;
}

// ============================================================================
// VISA TEMPLATE
// ============================================================================

/**
 * VisaEligibilityRule
 *
 * A rule that defines eligibility criteria for a visa type.
 */
export interface VisaEligibilityRule {
  /** Unique identifier for the rule */
  id: string;

  /** Human-readable description of the rule */
  description: string;

  /** Whether this rule is critical (must be met) */
  critical: boolean;
}

/**
 * VisaFinancialRequirement
 *
 * Financial requirement for a visa application.
 */
export interface VisaFinancialRequirement {
  /** Type of financial requirement */
  type: 'lump_sum' | 'monthly_cost' | 'annual_cost' | 'other';

  /** Required amount (if applicable) */
  amount?: number;

  /** Currency code (ISO 4217), e.g., "USD", "EUR" */
  currency?: string;

  /** Human-readable description */
  description: string;
}

/**
 * VisaProcessingTime
 *
 * Expected processing time for a visa application.
 */
export interface VisaProcessingTime {
  /** Minimum processing days */
  minDays?: number;

  /** Maximum processing days */
  maxDays?: number;

  /** Additional notes about processing time */
  notes?: string;
}

/**
 * VisaOfficialLink
 *
 * Link to official visa information or application portal.
 */
export interface VisaOfficialLink {
  /** Label for the link */
  label: string;

  /** URL */
  url: string;
}

/**
 * VisaSpecialNote
 *
 * Special note or warning about visa requirements.
 */
export interface VisaSpecialNote {
  /** Unique identifier for the note */
  id: string;

  /** Note text */
  text: string;
}

/**
 * VisaRequiredDocumentTemplate
 *
 * Template for a required document in a visa application.
 * This defines what documents are needed, not the actual documents.
 */
export interface VisaRequiredDocumentTemplate {
  /** Internal key/identifier, e.g., "passport", "i20", "loa", etc. */
  id: string;

  /** English label/name */
  name: string;

  /** Who needs to provide this document */
  whoNeedsIt: 'applicant' | 'sponsor' | 'family_member' | 'employer' | 'school' | 'other';

  /** Description of what this document is and why it's needed */
  description: string;

  /** Whether this is a core required document (MUST have by default) */
  isCoreRequired: boolean;

  /** Whether this document is only required conditionally */
  isConditional?: boolean;

  /** Description of when this document is needed (if conditional) */
  conditionDescription?: string;
}

/**
 * VisaTemplate
 *
 * Canonical template for a visa type in a specific country.
 * This defines the rules, requirements, and structure for a visa application.
 *
 * In Phase 1, this may not be fully populated from visaKnowledgeBase.ts,
 * but the schema is defined and stable for future use.
 */
export interface VisaTemplate {
  /** Unique identifier (country + visaType key), e.g., "US_student", "CA_tourist" */
  id: string;

  /** Country code (ISO or internal), e.g., "US", "CA" */
  countryCode: string;

  /** Country name (full name), e.g., "United States" */
  countryName: string;

  /** Visa type code (internal), e.g., "student", "tourist" */
  visaTypeCode: string;

  /** Visa type label (human readable), e.g., "Student Visa" */
  visaTypeLabel: string;

  /** Eligibility rules for this visa */
  eligibilityRules: VisaEligibilityRule[];

  /** Required documents template */
  requiredDocuments: VisaRequiredDocumentTemplate[];

  /** Financial requirements (if applicable) */
  financialRequirements?: VisaFinancialRequirement[];

  /** Processing time information */
  processingTime?: VisaProcessingTime;

  /** Official links (embassy, consulate, application portal) */
  officialLinks?: VisaOfficialLink[];

  /** Special notes or warnings */
  specialNotes?: VisaSpecialNote[];

  /** Template version, e.g., "2025-01-27" */
  version: string;

  /** Coverage level: CORE (essential docs only), GOOD (comprehensive), BETA (experimental) */
  coverageLevel: 'CORE' | 'GOOD' | 'BETA';
}

// ============================================================================
// CHECKLIST BRAIN OUTPUT
// ============================================================================

/**
 * ChecklistItemStatus
 *
 * High-level requirement status for a checklist item.
 * This is the canonical status that GPT-4 should assign.
 */
export type ChecklistItemStatus = 'REQUIRED' | 'HIGHLY_RECOMMENDED' | 'OPTIONAL' | 'CONDITIONAL';

/**
 * ChecklistBrainItem
 *
 * A single item in the checklist generated by GPT-4.
 * This is the internal canonical representation before mapping to API format.
 */
export interface ChecklistBrainItem {
  /** Internal identifier (can reuse 'document' field from existing schema) */
  id: string;

  /** High-level requirement status */
  status: ChecklistItemStatus;

  /** Who needs to provide this document */
  whoNeedsIt: 'applicant' | 'sponsor' | 'family_member' | 'employer' | 'other';

  /** Document name in English */
  name: string;

  /** Document name in Uzbek */
  nameUz: string;

  /** Document name in Russian */
  nameRu: string;

  /** Description in English */
  description: string;

  /** Description in Uzbek */
  descriptionUz: string;

  /** Description in Russian */
  descriptionRu: string;

  /** Where to obtain instructions in English */
  whereToObtain: string;

  /** Where to obtain instructions in Uzbek */
  whereToObtainUz: string;

  /** Where to obtain instructions in Russian */
  whereToObtainRu: string;

  /** Priority level */
  priority: 'high' | 'medium' | 'low';

  /** Whether this is a core required document from visa template/hard rules */
  isCoreRequired: boolean;

  /** Whether this document is only required conditionally */
  isConditional?: boolean;

  /** Description of when this document is needed (if conditional) */
  conditionDescription?: string;
}

/**
 * ChecklistBrainOutput
 *
 * Internal GPT-4 checklist output schema.
 * This is what GPT-4 should generate, before mapping to the existing API format.
 *
 * NOTE: This "brain" schema can be mapped to the existing API checklist schema
 * used by the frontend. DO NOT break the existing API; instead create
 * adapter/mapping functions.
 */
export interface ChecklistBrainOutput {
  /** Destination country code */
  countryCode: string;

  /** Destination country name */
  countryName: string;

  /** Visa type code */
  visaTypeCode: string;

  /** Visa type label */
  visaTypeLabel: string;

  /** Short summary of applicant context (for reference) */
  profileSummary: string;

  /** All checklist items (independent of category grouping) */
  requiredDocuments: ChecklistBrainItem[];

  /** Financial requirements (if applicable) */
  financialRequirements?: VisaFinancialRequirement[];

  /** Warnings or important notes */
  warnings?: string[];

  /** Disclaimer text */
  disclaimer: string;
}

// ============================================================================
// DOCUMENT CHECK RESULT
// ============================================================================

/**
 * DocCheckStatus
 *
 * Status of a document check operation.
 */
export type DocCheckStatus = 'OK' | 'MISSING' | 'PROBLEM' | 'UNCERTAIN';

/**
 * DocCheckProblem
 *
 * A problem found during document checking.
 */
export interface DocCheckProblem {
  /** Problem code (internal), e.g., "INSUFFICIENT_BALANCE", "MISSING_SIGNATURE" */
  code: string;

  /** English explanation for internal logs */
  message: string;

  /** User-facing explanation (optional, for display) */
  userMessage?: string;
}

/**
 * DocCheckSuggestion
 *
 * A suggestion for improving a document or application.
 */
export interface DocCheckSuggestion {
  /** Suggestion code (internal), e.g., "ADD_CO_SPONSOR", "PROVIDE_3_MONTHS_HISTORY" */
  code: string;

  /** English message */
  message: string;
}

/**
 * DocCheckResult
 *
 * Result of checking a single document against requirements.
 *
 * This will be used later when we implement the Inspector mode.
 * For Phase 1, just define and export the schema.
 */
export interface DocCheckResult {
  /** Checklist item ID that was checked */
  checklistItemId: string;

  /** Overall status of the check */
  status: DocCheckStatus;

  /** Problems found (if any) */
  problems: DocCheckProblem[];

  /** Suggestions for improvement (if any) */
  suggestions: DocCheckSuggestion[];
}

// ============================================================================
// TYPE GUARDS & UTILITIES
// ============================================================================

/**
 * Type guard to check if an object is an ApplicantProfile
 */
export function isApplicantProfile(obj: unknown): obj is ApplicantProfile {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const profile = obj as Partial<ApplicantProfile>;
  return (
    typeof profile.userId === 'string' &&
    typeof profile.nationality === 'string' &&
    typeof profile.residenceCountry === 'string' &&
    typeof profile.destinationCountryCode === 'string' &&
    typeof profile.destinationCountryName === 'string' &&
    typeof profile.visaTypeCode === 'string' &&
    typeof profile.visaTypeLabel === 'string' &&
    typeof profile.appLanguage === 'string' &&
    ['en', 'ru', 'uz'].includes(profile.appLanguage)
  );
}

/**
 * Type guard to check if an object is a ChecklistBrainOutput
 */
export function isChecklistBrainOutput(obj: unknown): obj is ChecklistBrainOutput {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const output = obj as Partial<ChecklistBrainOutput>;
  return (
    typeof output.countryCode === 'string' &&
    typeof output.countryName === 'string' &&
    typeof output.visaTypeCode === 'string' &&
    typeof output.visaTypeLabel === 'string' &&
    typeof output.profileSummary === 'string' &&
    typeof output.disclaimer === 'string' &&
    Array.isArray(output.requiredDocuments)
  );
}

// ============================================================================
// MAPPERS FROM EXISTING TYPES
// ============================================================================

/**
 * Map duration category from VisaQuestionnaireSummary to ApplicantProfile format
 */
function mapDurationCategory(
  duration?: string
): '<90_days' | '90_to_180_days' | '>180_days' | 'more_than_1_year' | undefined {
  if (!duration) return undefined;

  // Map from questionnaire format to profile format
  const mapping: Record<string, '<90_days' | '90_to_180_days' | '>180_days' | 'more_than_1_year'> =
    {
      less_than_1_month: '<90_days',
      '1_3_months': '90_to_180_days',
      '3_6_months': '90_to_180_days',
      '6_12_months': '>180_days',
      more_than_1_year: 'more_than_1_year',
      less_than_15_days: '<90_days',
      '15_30_days': '<90_days',
    };

  return mapping[duration] || undefined;
}

/**
 * Map sponsor type from VisaQuestionnaireSummary to ApplicantProfile format
 */
function mapSponsorType(
  sponsorType?: string
): 'self' | 'parent' | 'family' | 'company' | 'other' | undefined {
  if (!sponsorType) return undefined;

  const mapping: Record<string, 'self' | 'parent' | 'family' | 'company' | 'other'> = {
    self: 'self',
    parent: 'parent',
    relative: 'family',
    company: 'company',
    other: 'other',
  };

  return mapping[sponsorType] || 'other';
}

/**
 * Convert AIUserContext to ApplicantProfile
 *
 * This mapper bridges the existing AIUserContext type to the new canonical ApplicantProfile.
 * It extracts data from both the userProfile, application, and questionnaireSummary fields.
 *
 * @param context - AIUserContext from buildAIUserContext()
 * @param countryName - Full country name (e.g., "United States")
 * @param visaTypeLabel - Full visa type label (e.g., "Student Visa")
 * @returns ApplicantProfile (may have optional fields if data is missing)
 */
export function mapAIUserContextToApplicantProfile(
  context: AIUserContext,
  countryName: string,
  visaTypeLabel: string
): ApplicantProfile {
  const { userProfile, application, questionnaireSummary } = context;

  // Extract nationality/citizenship (default to UZ for Uzbekistan-based applicants)
  const nationality = questionnaireSummary?.citizenship || userProfile.citizenship || 'UZ';
  const residenceCountry =
    questionnaireSummary?.personalInfo?.currentResidenceCountry || 'Uzbekistan';

  // Extract trip purpose from questionnaire
  const tripPurpose = questionnaireSummary?.travelInfo?.purpose || questionnaireSummary?.notes;

  // Extract travel dates if available
  const plannedTravelDates = questionnaireSummary?.travelInfo?.plannedDates
    ? {
        start: questionnaireSummary.travelInfo.plannedDates,
        // End date would need to be calculated from duration, not available in current schema
      }
    : undefined;

  // Extract sponsor information
  const sponsorType = mapSponsorType(
    questionnaireSummary?.sponsorType ||
      questionnaireSummary?.financialInfo?.sponsorDetails?.relationship
  );
  const sponsorDescription =
    sponsorType === 'other'
      ? questionnaireSummary?.financialInfo?.sponsorDetails?.relationship
      : undefined;

  // Extract financial information
  const bankBalanceUSD =
    questionnaireSummary?.bankBalanceUSD || questionnaireSummary?.financialInfo?.selfFundsUSD;
  const monthlyIncomeUSD =
    questionnaireSummary?.monthlyIncomeUSD || questionnaireSummary?.employment?.monthlySalaryUSD;

  // Extract travel history
  const hasTravelHistory =
    questionnaireSummary?.hasInternationalTravel ??
    questionnaireSummary?.travelHistory?.traveledBefore ??
    (questionnaireSummary?.travelHistory?.visitedCountries?.length ?? 0) > 0;

  // Extract property and family ties
  const hasPropertyInHomeCountry =
    questionnaireSummary?.hasPropertyInUzbekistan ??
    questionnaireSummary?.ties?.propertyDocs ??
    false;
  const hasFamilyInHomeCountry =
    questionnaireSummary?.hasFamilyInUzbekistan ?? questionnaireSummary?.ties?.familyTies ?? false;

  // Build the profile
  const profile: ApplicantProfile = {
    userId: userProfile.userId,
    nationality,
    residenceCountry,
    destinationCountryCode: application.country,
    destinationCountryName: countryName,
    visaTypeCode: application.visaType,
    visaTypeLabel,
    tripPurpose,
    durationCategory: mapDurationCategory(
      questionnaireSummary?.duration || questionnaireSummary?.travelInfo?.duration
    ),
    plannedTravelDates,
    sponsorType,
    sponsorDescription,
    hasTravelHistory,
    previousVisaRefusals:
      questionnaireSummary?.previousVisaRejections ??
      questionnaireSummary?.travelHistory?.hasRefusals ??
      false,
    previousOverstays: questionnaireSummary?.previousOverstay ?? false,
    hasPropertyInHomeCountry,
    hasFamilyInHomeCountry,
    bankBalanceUSD,
    monthlyIncomeUSD,
    appLanguage: userProfile.appLanguage,
    age: userProfile.age ?? questionnaireSummary?.age,
    citizenshipCode: nationality,
  };

  return profile;
}
