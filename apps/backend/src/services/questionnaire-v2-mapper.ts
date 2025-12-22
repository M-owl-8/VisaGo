/**
 * Questionnaire V2 Mapper
 * Maps QuestionnaireV2 to VisaQuestionnaireSummary for AI checklist generation
 */

import { QuestionnaireV2 } from '../types/questionnaire-v2';
import { VisaQuestionnaireSummary } from '../types/ai-context';
import {
  getQuestionnaireV2Completeness,
  validateQuestionnaireV2 as validateQuestionnaireV2Runtime,
} from '../utils/questionnaire-validation';

/**
 * Map income range to approximate USD amount
 */
function mapIncomeRangeToUSD(range: string): number | undefined {
  const map: Record<string, number> = {
    less_500: 300,
    '500_1000': 750,
    '1000_3000': 2000,
    '3000_plus': 4000,
  };
  return map[range];
}

/**
 * Map age range to approximate age
 */
function mapAgeRangeToNumber(ageRange: string): number | undefined {
  const map: Record<string, number> = {
    under_18: 16,
    '18_25': 22,
    '26_35': 30,
    '36_50': 43,
    '51_plus': 55,
  };
  return map[ageRange];
}

/**
 * Map trip duration days to summary duration format
 */
function mapTripDurationDays(
  days: number | null | undefined,
  visaType: string
): 'less_than_1_month' | '1_3_months' | '3_6_months' | '6_12_months' | 'more_than_1_year' {
  if (!days || days <= 0) {
    // Default fallback
    return visaType?.toLowerCase() === 'student' ? '6_12_months' : '1_3_months';
  }

  if (visaType?.toLowerCase() === 'student') {
    // Students typically have longer stays
    if (days > 365) {
      return 'more_than_1_year';
    }
    if (days > 180) {
      return '6_12_months';
    }
    return '3_6_months';
  }

  // Tourist/other visa mapping
  if (days <= 30) {
    return 'less_than_1_month';
  } else if (days <= 90) {
    return '1_3_months';
  } else if (days <= 180) {
    return '3_6_months';
  } else if (days <= 365) {
    return '6_12_months';
  } else {
    return 'more_than_1_year';
  }
}

/**
 * Map sponsor/payer to sponsorType
 */
function mapPayerToSponsorType(
  payer: string
): 'self' | 'parent' | 'relative' | 'company' | 'other' {
  switch (payer) {
    case 'self':
      return 'self';
    case 'parents':
      return 'parent';
    case 'other_family':
      return 'relative';
    case 'employer':
      return 'company';
    case 'scholarship':
    case 'other_sponsor':
      return 'other';
    default:
      return 'self';
  }
}

/**
 * Map current status to employment/education fields
 */
function mapCurrentStatus(status: string): {
  isEmployed: boolean;
  isStudent: boolean;
  currentStatus: 'student' | 'employed' | 'self_employed' | 'unemployed';
} {
  switch (status) {
    case 'student':
      return {
        isEmployed: false,
        isStudent: true,
        currentStatus: 'student',
      };
    case 'employed':
      return {
        isEmployed: true,
        isStudent: false,
        currentStatus: 'employed',
      };
    case 'self_employed':
    case 'business_owner':
      return {
        isEmployed: true,
        isStudent: false,
        currentStatus: 'self_employed',
      };
    case 'unemployed':
    case 'school_child':
      return {
        isEmployed: false,
        isStudent: status === 'school_child',
        currentStatus: status === 'school_child' ? 'student' : 'unemployed',
      };
    default:
      return {
        isEmployed: false,
        isStudent: false,
        currentStatus: 'unemployed',
      };
  }
}

/**
 * Map accommodation type to summary format
 */
function mapAccommodationType(
  type: string,
  visaType: string
): 'reserved' | 'university_housing' | 'not_reserved' {
  if (visaType?.toLowerCase() === 'student') {
    if (type === 'dormitory') {
      return 'university_housing';
    }
    if (type === 'rented_apartment' || type === 'host_family') {
      return 'reserved';
    }
    return 'not_reserved';
  }

  // Tourist
  if (type === 'hotel' || type === 'rented_apartment' || type === 'relative') {
    return 'reserved';
  }
  return 'not_reserved';
}

/**
 * Map regions visited to country list
 */
function mapRegionsToCountries(regions: string[]): string[] {
  const countryMap: Record<string, string[]> = {
    schengen: ['ES', 'DE', 'FR', 'IT', 'NL', 'BE', 'AT', 'CH'],
    usa_canada: ['US', 'CA'],
    uk: ['GB'],
    asia: ['JP', 'KR', 'CN', 'SG'],
    middle_east: ['AE', 'SA', 'QA'],
  };

  const countries: string[] = [];
  for (const region of regions) {
    if (countryMap[region]) {
      countries.push(...countryMap[region]);
    }
  }
  return [...new Set(countries)]; // Remove duplicates
}

/**
 * Build VisaQuestionnaireSummary from QuestionnaireV2
 * This ensures compatibility with existing AI checklist generation pipeline
 */
export function buildSummaryFromQuestionnaireV2(
  q: QuestionnaireV2,
  appLanguage: 'uz' | 'ru' | 'en' = 'en'
): VisaQuestionnaireSummary {
  const completeness = getQuestionnaireV2Completeness(q);
  if (!completeness.valid) {
    throw new Error(`QuestionnaireV2 incomplete: missing ${completeness.missingFields.join(', ')}`);
  }

  const statusMapping = mapCurrentStatus(q.status.currentStatus);
  const duration = mapTripDurationDays(q.travel.tripDurationDays, q.visaType);
  const sponsorType = mapPayerToSponsorType(q.finance.payer);
  const accommodation = mapAccommodationType(q.stay.accommodationType, q.visaType);
  const visitedCountries = mapRegionsToCountries(q.history.regionsVisited);
  const monthlyIncome = mapIncomeRangeToUSD(q.finance.approxMonthlyIncomeRange);
  const age = mapAgeRangeToNumber(q.personal.ageRange);
  const travelHistoryLevel = q.history.travelHistoryLevel;

  // Map invitation types
  const hasUniversityInvitation =
    q.visaType === 'student' &&
    q.invitation.hasInvitation &&
    q.invitation.studentInvitationType === 'university_acceptance';
  const hasOtherInvitation =
    q.visaType === 'tourist' &&
    q.invitation.hasInvitation &&
    q.invitation.touristInvitationType !== 'no_invitation';

  // Map education program type
  let programType: 'bachelor' | 'master' | 'phd' | 'exchange' | 'language' | undefined;
  if (q.visaType === 'student' && q.invitation.studentInvitationType) {
    switch (q.invitation.studentInvitationType) {
      case 'university_acceptance':
        // Infer from highest education
        if (q.status.highestEducation === 'bachelor') programType = 'bachelor';
        else if (q.status.highestEducation === 'master') programType = 'master';
        else if (q.status.highestEducation === 'phd') programType = 'phd';
        break;
      case 'language_course':
        programType = 'language';
        break;
      case 'exchange_program':
        programType = 'exchange';
        break;
    }
  }

  // Build the summary
  const summary: VisaQuestionnaireSummary = {
    version: '2.0',
    visaType: q.visaType,
    targetCountry: q.targetCountry,
    appLanguage,
    contact: q.contact,

    // Legacy fields
    age,
    citizenship: q.personal.nationality,
    maritalStatus: q.personal.maritalStatus,
    hasChildren: q.special.travelingWithChildren ? 'one' : 'no', // Simplified mapping
    ageRange:
      q.personal.ageRange === '36_50'
        ? '36_45'
        : q.personal.ageRange === '51_plus'
          ? '46_plus'
          : (q.personal.ageRange as any),
    duration,
    hasUniversityInvitation,
    hasOtherInvitation,
    sponsorType,
    hasPropertyInUzbekistan: q.ties.hasProperty,
    hasFamilyInUzbekistan: q.ties.hasCloseFamilyInUzbekistan,
    hasInternationalTravel: q.history.hasTraveledBefore,
    previousVisaRejections: q.history.hasVisaRefusals,
    monthlyIncomeUSD: monthlyIncome,
    bankBalanceUSD: q.finance.hasBankStatement ? monthlyIncome : undefined, // Approximate
    documents: {
      hasPassport: q.documents.hasPassport && q.personal.passportStatus !== 'no_passport',
      hasBankStatement: q.finance.hasBankStatement,
      hasEmploymentOrStudyProof: q.documents.hasEmploymentOrStudyProof,
      hasInsurance: q.documents.hasInsurance,
      hasFlightBooking: q.stay.hasRoundTripTicket,
      hasHotelBookingOrAccommodation: q.stay.accommodationType !== 'not_decided',
    },

    // Extended structure (v2)
    personalInfo: {
      nationality: q.personal.nationality,
      passportStatus:
        q.personal.passportStatus === 'valid_6plus_months' ||
        q.personal.passportStatus === 'valid_less_6_months'
          ? 'valid'
          : q.personal.passportStatus === 'no_passport'
            ? 'no_passport'
            : 'expired',
    },
    travelInfo: {
      funding:
        q.finance.payer === 'self'
          ? 'self'
          : q.finance.payer === 'scholarship'
            ? 'scholarship'
            : 'sponsor',
      monthlyCapacity: monthlyIncome,
      accommodation,
      duration:
        duration === 'less_than_1_month'
          ? 'less_than_15_days'
          : duration === '1_3_months'
            ? '1_3_months'
            : duration === '3_6_months'
              ? '3_6_months'
              : 'more_than_6_months',
      tripDurationDays: q.travel.tripDurationDays ?? null,
    },
    employment: {
      isEmployed: statusMapping.isEmployed,
      monthlySalaryUSD: monthlyIncome,
      currentStatus: statusMapping.currentStatus,
    },
    education: {
      isStudent: statusMapping.isStudent || q.visaType === 'student',
      programType,
      diplomaAvailable: q.status.highestEducation !== 'school',
      transcriptAvailable: q.status.highestEducation !== 'school',
      hasGraduated: q.status.highestEducation !== 'school' && q.status.currentStatus !== 'student',
    },
    financialInfo: {
      selfFundsUSD: q.finance.payer === 'self' ? monthlyIncome : undefined,
      sponsorDetails:
        q.finance.payer !== 'self'
          ? {
              relationship: (() => {
                const rel = q.finance.sponsorRelationship;
                if (rel === 'company') return 'other'; // Map 'company' to 'other' as type doesn't support 'company'
                if (rel === 'parent' || rel === 'relative' || rel === 'other') return rel;
                // Fallback to payer-based mapping
                return q.finance.payer === 'parents'
                  ? 'parent'
                  : q.finance.payer === 'other_family'
                    ? 'relative'
                    : 'other';
              })(),
              employment: q.finance.hasStableIncome ? 'employed' : 'other',
              annualIncomeUSD: monthlyIncome ? monthlyIncome * 12 : undefined,
            }
          : undefined,
    },
    travelHistory: {
      visitedCountries: visitedCountries.length > 0 ? visitedCountries : undefined,
      hasRefusals: q.history.hasVisaRefusals,
      traveledBefore: q.history.hasTraveledBefore,
      travelHistoryLevel,
      hasOverstay: q.history.hasOverstay ?? false,
    },
    ties: {
      propertyDocs: q.ties.hasProperty || q.documents.hasPropertyDocs,
      familyTies: q.ties.hasCloseFamilyInUzbekistan,
    },
    // Modules (optional)
    studentModule: q.studentModule,
    workModule: q.workModule,
    familyModule: q.familyModule,
    businessModule: q.businessModule,
    transitModule: q.transitModule,
  };

  return summary;
}

/**
 * Convert QuestionnaireV2 to legacy QuestionnaireData format
 * For backward compatibility with AIApplicationService
 */
export function convertV2ToLegacyQuestionnaireData(q: QuestionnaireV2): any {
  return {
    purpose: q.visaType === 'student' ? 'study' : 'tourism',
    country: q.targetCountry, // This will need to be mapped to country ID by the service
    duration: mapTripDurationDays(q.travel.tripDurationDays, q.visaType),
    traveledBefore: q.history.hasTraveledBefore,
    currentStatus: q.status.currentStatus,
    hasInvitation: q.invitation.hasInvitation,
    financialSituation: q.finance.payer === 'self' ? 'stable_income' : 'sponsor',
    maritalStatus: q.personal.maritalStatus,
    hasChildren: q.special.travelingWithChildren ? 'one' : 'no',
    englishLevel: 'intermediate', // Default, as V2 doesn't explicitly ask
    tripDurationDays: q.travel.tripDurationDays,
    travelHistoryLevel: q.history.travelHistoryLevel,
    hasOverstay: q.history.hasOverstay,
    sponsorRelationship: q.finance.sponsorRelationship,
    contact: q.contact,
    studentModule: q.studentModule,
    workModule: q.workModule,
    familyModule: q.familyModule,
    businessModule: q.businessModule,
    transitModule: q.transitModule,
    // Include summary for direct use
    summary: buildSummaryFromQuestionnaireV2(q, 'en'),
  };
}

/**
 * Validate QuestionnaireV2 structure
 */
export function validateQuestionnaireV2(q: any): q is QuestionnaireV2 {
  return validateQuestionnaireV2Runtime(q);
}
