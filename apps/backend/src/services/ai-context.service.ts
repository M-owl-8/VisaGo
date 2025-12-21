import { normalizeVisaTypeForRules } from '../utils/visa-type-aliases';
/**
 * AI Context Service
 * Builds structured AIUserContext for AI service consumption
 */

import { PrismaClient } from '@prisma/client';
import { errors } from '../utils/errors';
import { logError, logInfo } from '../middleware/logger';
import {
  AIUserContext,
  CanonicalAIUserContext,
  VisaQuestionnaireSummary,
  VisaProbabilityResult,
  RiskDriver,
} from '../types/ai-context';
import type { ApplicantProfile as VisaBrainApplicantProfile } from '../types/visa-brain';
import { getVisaCountryProfile } from '../config/visa-country-profiles';
import {
  buildCanonicalCountryContext,
  normalizeCountryCode,
  getCountryNameFromCode,
} from '../config/country-registry';

/**
 * Structured Applicant Profile for Checklist Personalization
 * Built from questionnaire data and application metadata
 */
export interface ApplicantProfile {
  travel: {
    purpose: string; // tourism, study, work, business, etc.
    duration: string; // less_than_1, 1_3_months, 3_6_months, 6_12_months, more_than_1_year
    previousTravel: boolean;
  };
  employment: {
    currentStatus: string; // student, employee, entrepreneur, unemployed, other
    hasStableIncome: boolean;
  };
  financial: {
    financialSituation: string; // stable_income, sponsor, savings, preparing
    isSponsored: boolean;
  };
  familyAndTies: {
    maritalStatus: string; // single, married, divorced
    hasChildren: string; // no, one, two_plus
    hasStrongTies: boolean;
  };
  language: {
    englishLevel: string; // beginner, intermediate, advanced, native
  };
  meta: {
    countryCode: string; // e.g., "DE", "US"
    visaType: string; // e.g., "tourist", "student"
  };
  // Extended fields for world-class personalization
  ageRange?: 'minor' | 'adult';
  isRetired?: boolean;
  hasProperty?: boolean;
  hasBusiness?: boolean;
  countrySpecific?: {
    us?: { sevisId?: string };
    uk?: { casNumber?: string };
    au?: { coeNumber?: string };
    ca?: { dliNumber?: string };
    nz?: { nzqaNumber?: string };
  };
}

const prisma = new PrismaClient();

/**
 * Calculate required funds estimate for a visa application
 * Based on destination country, visa type, and duration
 */
function calculateRequiredFundsEstimate(
  countryCode: string,
  visaType: string,
  duration: string
): number | null {
  // Country-specific cost estimates (USD)
  const costEstimates: Record<
    string,
    { tourist: Record<string, number>; student: Record<string, number> }
  > = {
    US: {
      tourist: {
        less_than_1_month: 3000,
        '1_3_months': 5000,
        '3_6_months': 8000,
        '6_12_months': 12000,
        more_than_1_year: 20000,
      },
      student: {
        less_than_1_month: 10000, // Not typical for student
        '1_3_months': 15000,
        '3_6_months': 25000,
        '6_12_months': 35000,
        more_than_1_year: 50000, // Typical for 1 year of study
      },
    },
    UK: {
      tourist: {
        less_than_1_month: 2500,
        '1_3_months': 4000,
        '3_6_months': 7000,
        '6_12_months': 10000,
        more_than_1_year: 15000,
      },
      student: {
        less_than_1_month: 8000,
        '1_3_months': 12000,
        '3_6_months': 20000,
        '6_12_months': 30000,
        more_than_1_year: 40000,
      },
    },
    CA: {
      tourist: {
        less_than_1_month: 2500,
        '1_3_months': 4000,
        '3_6_months': 7000,
        '6_12_months': 10000,
        more_than_1_year: 15000,
      },
      student: {
        less_than_1_month: 8000,
        '1_3_months': 12000,
        '3_6_months': 20000,
        '6_12_months': 30000,
        more_than_1_year: 40000,
      },
    },
    DE: {
      tourist: {
        less_than_1_month: 2000,
        '1_3_months': 3000,
        '3_6_months': 5000,
        '6_12_months': 8000,
        more_than_1_year: 12000,
      },
      student: {
        less_than_1_month: 5000,
        '1_3_months': 8000,
        '3_6_months': 15000,
        '6_12_months': 25000,
        more_than_1_year: 35000,
      },
    },
    ES: {
      tourist: {
        less_than_1_month: 1500,
        '1_3_months': 2500,
        '3_6_months': 4000,
        '6_12_months': 6000,
        more_than_1_year: 10000,
      },
      student: {
        less_than_1_month: 4000,
        '1_3_months': 6000,
        '3_6_months': 12000,
        '6_12_months': 20000,
        more_than_1_year: 30000,
      },
    },
  };

  const countryEstimate = costEstimates[countryCode];
  if (!countryEstimate) {
    return null; // Unknown country
  }

  const visaKey = visaType?.toLowerCase() === 'student' ? 'student' : 'tourist';
  const visaEstimate = (countryEstimate as any)[visaKey];
  if (!visaEstimate) {
    return null;
  }

  // Map duration to key
  const durationKey =
    duration === 'less_than_1_month'
      ? 'less_than_1_month'
      : duration === '1_3_months'
        ? '1_3_months'
        : duration === '3_6_months'
          ? '3_6_months'
          : duration === '6_12_months'
            ? '6_12_months'
            : duration === 'more_than_1_year'
              ? 'more_than_1_year'
              : null;

  if (!durationKey) {
    return null;
  }

  return visaEstimate[durationKey] || null;
}

/**
 * Calculate financial sufficiency ratio
 * Returns availableFunds / requiredFunds (0.0-1.0+)
 */
function calculateFinancialSufficiencyRatio(
  availableFunds: number | null,
  requiredFunds: number | null
): number | null {
  if (availableFunds === null || requiredFunds === null || requiredFunds === 0) {
    return null;
  }
  return availableFunds / requiredFunds;
}

/**
 * Classify financial sufficiency with ratio and label
 * Phase 2: Extended expert field calculation
 */
function classifyFinancialSufficiency(
  required: number | null,
  available: number | null
): {
  ratio: number | null;
  label: 'low' | 'borderline' | 'sufficient' | 'strong' | null;
} {
  if (required === null || available === null || required === 0) {
    return { ratio: null, label: null };
  }

  const ratio = available / required;
  let label: 'low' | 'borderline' | 'sufficient' | 'strong' | null = null;

  if (ratio < 0.7) {
    label = 'low';
  } else if (ratio < 1.0) {
    label = 'borderline';
  } else if (ratio < 1.3) {
    label = 'sufficient';
  } else {
    label = 'strong';
  }

  return { ratio, label };
}

/**
 * Estimate required funds in USD based on country, visa type, and duration
 * Phase 2: Enhanced calculation with daily cost estimates
 */
function estimateRequiredFundsUSD(
  countryCode: string,
  visaType: string,
  plannedDurationDays: number | null
): number | null {
  // Base daily cost estimates by destination region (USD)
  const baseDailyCosts: Record<string, { tourist: number; student: number }> = {
    US: { tourist: 100, student: 150 },
    CA: { tourist: 90, student: 140 },
    GB: { tourist: 90, student: 130 },
    AU: { tourist: 80, student: 120 },
    DE: { tourist: 70, student: 100 },
    ES: { tourist: 60, student: 90 },
    FR: { tourist: 70, student: 100 },
    IT: { tourist: 70, student: 100 },
    JP: { tourist: 80, student: 120 },
    KR: { tourist: 70, student: 110 },
    AE: { tourist: 70, student: 100 },
  };

  const costs = baseDailyCosts[countryCode];
  if (!costs) {
    // Global default for unknown countries
    return visaType?.toLowerCase() === 'student' ? null : 70 * (plannedDurationDays || 14) + 500;
  }

  const visaKey = visaType?.toLowerCase() === 'student' ? 'student' : 'tourist';
  const dailyCost = (costs as any)[visaKey];
  let durationDays = plannedDurationDays;

  // If duration is unknown, use defaults
  if (durationDays === null) {
    durationDays = visaKey === 'tourist' ? 14 : 365;
  }

  if (visaType === 'tourist') {
    // Tourist: daily cost * duration + safety buffer
    return dailyCost * durationDays + 500;
  } else {
    // Student: annual tuition estimate + living cost per year
    // For now, use a simplified estimate based on country
    const annualTuitionEstimates: Record<string, number> = {
      US: 25000,
      CA: 20000,
      GB: 18000,
      AU: 20000,
      DE: 0, // Often free/low cost
      ES: 5000,
      FR: 0,
      IT: 5000,
      JP: 15000,
      KR: 12000,
      AE: 15000,
    };

    const tuition = annualTuitionEstimates[countryCode] || 15000;
    const livingCost = dailyCost * 365; // Annual living cost
    return tuition + livingCost;
  }
}

/**
 * Compute available funds USD
 * Phase 2: Enhanced calculation including income multiplier
 */
function computeAvailableFundsUSD(
  bankBalanceUSD: number | null,
  monthlyIncomeUSD: number | null,
  sponsorType: string,
  sponsorBankBalanceUSD?: number | null,
  sponsorIncomeUSD?: number | null
): number | null {
  let available = bankBalanceUSD ?? 0;

  // Add income multiplier (2-3 months of income)
  if (monthlyIncomeUSD !== null && monthlyIncomeUSD > 0) {
    available += monthlyIncomeUSD * 2.5; // Conservative multiplier
  }

  // If sponsored, factor in sponsor funds
  if (sponsorType !== 'self') {
    const sponsorFunds = sponsorBankBalanceUSD ?? 0;
    const sponsorIncomeMultiplier = sponsorIncomeUSD ? sponsorIncomeUSD * 2.5 : 0;
    available += sponsorFunds + sponsorIncomeMultiplier;
  }

  return available > 0 ? available : null;
}

/**
 * Calculate ties strength score (0.0-1.0)
 * Based on property, employment, family, and children
 * Phase 2: Returns label as well
 */
function calculateTiesStrengthScore(
  hasProperty: boolean,
  isEmployed: boolean,
  employmentDurationMonths: number | null,
  hasFamily: boolean,
  hasChildren: boolean,
  maritalStatus: string
): {
  score: number;
  label: 'weak' | 'medium' | 'strong';
  factors: { property: number; employment: number; family: number; children: number };
} {
  let score = 0.0;
  const factors = {
    property: 0.0,
    employment: 0.0,
    family: 0.0,
    children: 0.0,
  };

  // Property contribution (0.0-0.3)
  if (hasProperty) {
    factors.property = 0.3;
    score += 0.3;
  }

  // Employment contribution (0.0-0.2)
  if (isEmployed) {
    if (employmentDurationMonths !== null && employmentDurationMonths >= 24) {
      factors.employment = 0.2; // Strong employment (24+ months)
    } else {
      factors.employment = 0.2; // Employment shows ties regardless of duration
    }
    score += factors.employment;
  }

  // Family contribution (0.0-0.2)
  if (hasFamily) {
    factors.family = 0.2;
    score += 0.2;
  }

  // Children contribution (0.0-0.2)
  if (hasChildren) {
    factors.children = 0.2;
    score += 0.2;
  } else if (maritalStatus === 'married') {
    // Married without children still shows ties
    factors.family += 0.1;
    score += 0.1;
  }

  // Clamp to 0.0-1.0
  score = Math.min(Math.max(score, 0.0), 1.0);

  // Determine label
  let label: 'weak' | 'medium' | 'strong';
  if (score < 0.4) {
    label = 'weak';
  } else if (score < 0.7) {
    label = 'medium';
  } else {
    label = 'strong';
  }

  return { score, label, factors };
}

/**
 * Compute ties strength with score and label
 * Phase 2: Wrapper for calculateTiesStrengthScore
 */
function computeTiesStrengthScore(context: {
  hasProperty: boolean;
  isEmployed: boolean;
  employmentDurationMonths: number | null;
  hasFamily: boolean;
  hasChildren: boolean;
  maritalStatus: string;
}): {
  score: number | null;
  label: 'weak' | 'medium' | 'strong' | null;
} {
  try {
    const result = calculateTiesStrengthScore(
      context.hasProperty,
      context.isEmployed,
      context.employmentDurationMonths,
      context.hasFamily,
      context.hasChildren,
      context.maritalStatus
    );
    return { score: result.score, label: result.label };
  } catch (error) {
    logError('Failed to compute ties strength', error as Error);
    return { score: null, label: null };
  }
}

/**
 * Compute travel history score and label
 * Phase 2: Expert field calculation
 */
function computeTravelHistoryScore(context: {
  hasInternationalTravel: boolean;
  previousVisaRejections: boolean | number;
  hasOverstay: boolean;
}): {
  score: number | null;
  label: 'none' | 'limited' | 'good' | 'strong' | null;
} {
  try {
    const hasTravel = context.hasInternationalTravel;
    const rejections =
      typeof context.previousVisaRejections === 'number'
        ? context.previousVisaRejections
        : context.previousVisaRejections
          ? 1
          : 0;
    const hasOverstay = context.hasOverstay;

    // If no travel and no rejections → 'none'
    if (!hasTravel && rejections === 0) {
      return { score: 0.0, label: 'none' };
    }

    // If rejections exist, adjust score down
    if (rejections > 0) {
      const baseScore = hasTravel ? 0.3 : 0.0;
      const adjustedScore = Math.max(0.0, baseScore - rejections * 0.2);
      return {
        score: adjustedScore,
        label: adjustedScore < 0.2 ? 'none' : 'limited',
      };
    }

    // If overstay exists, significantly reduce score
    if (hasOverstay) {
      return { score: 0.1, label: 'limited' };
    }

    // If has travel but no rejections → 'limited' to 'good'
    if (hasTravel) {
      // For now, assume limited (could be enhanced with trip count later)
      return { score: 0.4, label: 'limited' };
    }

    return { score: null, label: null };
  } catch (error) {
    logError('Failed to compute travel history score', error as Error);
    return { score: null, label: null };
  }
}

/**
 * Compute data completeness score
 * Phase 2: Expert field calculation
 */
function computeDataCompleteness(context: {
  bankBalanceUSD: number | null;
  monthlyIncomeUSD: number | null;
  sponsorType: string;
  currentStatus: string;
  hasProperty: boolean;
  hasFamily: boolean;
  hasInternationalTravel: boolean;
}): {
  score: number | null;
  missingCriticalFields: string[];
} {
  const criticalFields = [
    { name: 'bankBalanceUSD', present: context.bankBalanceUSD !== null },
    { name: 'monthlyIncomeUSD', present: context.monthlyIncomeUSD !== null },
    {
      name: 'sponsorType',
      present: context.sponsorType !== 'unknown' && context.sponsorType !== '',
    },
    { name: 'currentStatus', present: context.currentStatus !== 'unknown' },
    { name: 'hasPropertyInUzbekistan', present: true }, // Boolean is always present
    { name: 'hasFamilyInUzbekistan', present: true }, // Boolean is always present
    { name: 'hasInternationalTravel', present: true }, // Boolean is always present
  ];

  const presentCount = criticalFields.filter((f) => f.present).length;
  const totalCount = criticalFields.length;
  const score = presentCount / totalCount;

  const missingFields = criticalFields.filter((f) => !f.present).map((f) => f.name);

  return { score, missingCriticalFields: missingFields };
}

/**
 * Compute risk drivers (Phase 2)
 * Explicit risk factors that make an applicant risky or safe
 */
function computeRiskDrivers(context: {
  financialSufficiencyRatio: number | null;
  financialSufficiencyLabel: 'low' | 'borderline' | 'sufficient' | 'strong' | null;
  tiesStrengthScore: number | null;
  tiesStrengthLabel: 'weak' | 'medium' | 'strong' | null;
  travelHistoryScore: number | null;
  travelHistoryLabel: 'none' | 'limited' | 'good' | 'strong' | null;
  hasPropertyInUzbekistan: boolean;
  isEmployed: boolean;
  currentStatus: string;
  monthlyIncomeUSD: number | null;
  hasInternationalTravel: boolean;
  previousVisaRejections: boolean | number;
  hasOverstayHistory: boolean;
  sponsorType: string;
  age: number | null;
  availableFundsUSD: number | null;
}): RiskDriver[] {
  const drivers: RiskDriver[] = [];

  // Financial risk drivers (v2 thresholds)
  if (context.financialSufficiencyRatio !== null) {
    if (context.financialSufficiencyRatio < 0.5) {
      drivers.push('low_funds');
    } else if (context.financialSufficiencyRatio < 0.8) {
      drivers.push('low_funds');
    } else if (context.financialSufficiencyRatio < 1.0) {
      drivers.push('borderline_funds');
    }
  } else if (context.availableFundsUSD === null || context.availableFundsUSD <= 0) {
    drivers.push('funds_unknown');
  }

  // Ties risk drivers (v2 thresholds)
  if (context.tiesStrengthScore !== null && context.tiesStrengthScore <= 0.3) {
    drivers.push('weak_ties');
  } else if (context.tiesStrengthLabel === 'weak') {
    drivers.push('weak_ties');
  }
  if (!context.hasPropertyInUzbekistan) {
    drivers.push('no_property');
  }
  if (
    !context.isEmployed &&
    context.currentStatus !== 'student' &&
    context.currentStatus !== 'employed' &&
    (context.monthlyIncomeUSD === null || context.monthlyIncomeUSD === 0)
  ) {
    drivers.push('no_employment');
  }

  // Travel history risk drivers (v2)
  if (context.travelHistoryLabel === 'none' || context.travelHistoryLabel === 'limited') {
    drivers.push('limited_travel_history');
  } else if (!context.hasInternationalTravel) {
    drivers.push('limited_travel_history');
  }

  // Previous refusals/overstays
  const rejectionCount =
    typeof context.previousVisaRejections === 'number'
      ? context.previousVisaRejections
      : context.previousVisaRejections
        ? 1
        : 0;
  if (rejectionCount > 0) {
    drivers.push('previous_visa_refusals');
  }
  if (context.hasOverstayHistory) {
    drivers.push('previous_overstay');
  }

  // Minor risk driver
  if (context.age !== null && context.age < 18) {
    drivers.push('is_minor');
  }

  // Sponsor-based finance risk
  if (context.sponsorType !== 'self' && context.sponsorType !== 'unknown') {
    drivers.push('sponsor_based_finance');
  }

  // Self-employed without proof
  if (
    context.currentStatus === 'self_employed' &&
    (context.monthlyIncomeUSD === null || context.monthlyIncomeUSD === 0)
  ) {
    drivers.push('self_employed_without_proof');
  }

  // Big funds vs low income (sudden money appearance risk)
  if (
    context.availableFundsUSD !== null &&
    context.monthlyIncomeUSD !== null &&
    context.monthlyIncomeUSD > 0
  ) {
    const monthsOfIncome = context.availableFundsUSD / context.monthlyIncomeUSD;
    // If available funds are more than 24 months of income, it's suspicious
    if (monthsOfIncome > 24) {
      drivers.push('big_funds_vs_low_income');
    }
  }

  // Short preparation time (if we had this data, we'd check it here)
  // For now, we don't have this in the context, so we skip it

  // If no risk drivers, return 'none' to indicate genuinely low risk
  if (drivers.length === 0) {
    return ['none'];
  }

  return drivers;
}

/**
 * Compute risk level from risk score (Risk Engine v2)
 * Centralized mapping to ensure consistency across all services
 */
export function computeRiskLevel(riskScore: number): 'low' | 'medium' | 'high' {
  if (riskScore <= 35) {
    return 'low';
  }
  if (riskScore <= 65) {
    return 'medium';
  }
  return 'high';
}

/**
 * Get embassy context from VisaRuleSet
 * Fetches financial requirements and common refusal reasons
 */
async function getEmbassyContext(
  countryCode: string,
  visaType: string
): Promise<CanonicalAIUserContext['embassyContext']> {
  try {
    const { VisaRulesService } = await import('./visa-rules.service');
    const ruleSet = await VisaRulesService.getActiveRuleSet(
      countryCode.toUpperCase(),
      visaType.toLowerCase()
    );

    if (!ruleSet) {
      return undefined;
    }

    const financialReqs = ruleSet.financialRequirements;
    const commonRefusalReasons = getCommonRefusalReasons(countryCode, visaType);
    const officerCriteria = getOfficerEvaluationCriteria(countryCode, visaType);

    return {
      minimumFundsRequired: financialReqs?.minimumBalance ?? null,
      minimumStatementMonths: financialReqs?.bankStatementMonths ?? null,
      currency: financialReqs?.currency ?? null,
      commonRefusalReasons,
      officerEvaluationCriteria: officerCriteria,
    };
  } catch (error) {
    logError('Failed to get embassy context', error as Error, { countryCode, visaType });
    return undefined;
  }
}

/**
 * Get common refusal reasons for a country/visa type
 * Country-specific patterns
 */
function getCommonRefusalReasons(countryCode: string, visaType: string): string[] {
  const reasons: Record<string, Record<string, string[]>> = {
    US: {
      tourist: [
        'Insufficient funds to cover trip expenses',
        'Weak ties to home country (risk of overstay)',
        'Unclear travel purpose or unrealistic itinerary',
        'Previous visa refusals or immigration violations',
        'Incomplete or inconsistent documentation',
      ],
      student: [
        'Insufficient funds for tuition and living expenses',
        'Weak ties to home country (immigration intent concerns)',
        'Unclear study plans or weak academic background',
        'Previous visa refusals or immigration violations',
        'Incomplete documentation (I-20, SEVIS, financial proof)',
      ],
    },
    UK: {
      tourist: [
        'Insufficient funds (28-day rule not met)',
        'Weak ties to home country',
        'Unclear travel purpose',
        'Previous refusals or overstays',
        'Incomplete documentation',
      ],
      student: [
        'Insufficient funds (CAS requirements not met)',
        'Weak academic background or unclear study plans',
        'Immigration intent concerns',
        'Previous refusals',
        'Missing CAS or financial documentation',
      ],
    },
    DE: {
      tourist: [
        'Insufficient financial means',
        'Weak ties to home country',
        'Missing travel insurance (€30,000 coverage)',
        'Incomplete accommodation proof',
        'Previous Schengen violations',
      ],
      student: [
        'Insufficient funds for study and living',
        'Weak academic background',
        'Missing acceptance letter or enrollment proof',
        'Immigration intent concerns',
        'Incomplete documentation',
      ],
    },
  };

  return (
    reasons[countryCode]?.[visaType] ?? [
      'Insufficient funds',
      'Weak ties to home country',
      'Unclear travel purpose',
      'Incomplete documentation',
    ]
  );
}

/**
 * Get officer evaluation criteria for a country/visa type
 * What embassy officers check
 */
function getOfficerEvaluationCriteria(countryCode: string, visaType: string): string[] {
  const criteria: Record<string, Record<string, string[]>> = {
    US: {
      tourist: [
        'Financial capacity (sufficient funds for trip duration)',
        'Strong ties to home country (employment, property, family)',
        'Clear travel purpose and realistic itinerary',
        'Return intention evidence',
        'Travel history and visa compliance',
      ],
      student: [
        'Financial capacity (1 year of tuition + living expenses)',
        'Academic background and study plans',
        'Ties to home country (return intention)',
        'I-20 validity and SEVIS compliance',
        'Immigration intent assessment',
      ],
    },
    UK: {
      tourist: [
        'Financial capacity (28-day rule compliance)',
        'Ties to home country',
        'Travel purpose clarity',
        'Accommodation and itinerary',
        'Previous travel history',
      ],
      student: [
        'Financial capacity (CAS requirements)',
        'Academic qualifications and study plans',
        'CAS validity and enrollment',
        'Ties to home country',
        'Immigration intent',
      ],
    },
    DE: {
      tourist: [
        'Financial means (sufficient for trip)',
        'Travel insurance (€30,000 minimum)',
        'Accommodation proof',
        'Ties to home country',
        'Schengen compliance history',
      ],
      student: [
        'Financial capacity for study period',
        'Acceptance letter and enrollment',
        'Academic background',
        'Ties to home country',
        'Study purpose clarity',
      ],
    },
  };

  return (
    criteria[countryCode]?.[visaType] ?? [
      'Financial capacity',
      'Ties to home country',
      'Travel/study purpose clarity',
      'Document completeness',
    ]
  );
}

/**
 * Calculate visa probability based on questionnaire summary
 * Rule-based calculator tuned for common Uzbek cases
 *
 * @param summary - VisaQuestionnaireSummary
 * @returns VisaProbabilityResult with score, level, and factors
 */
/**
 * Calculate visa probability using Risk Engine v2
 * Deterministic scoring with baseline 50, additive adjustments
 */
export function calculateVisaProbability(
  summary: VisaQuestionnaireSummary,
  expertFields?: {
    financialSufficiencyRatio: number | null;
    financialSufficiencyLabel: 'low' | 'borderline' | 'sufficient' | 'strong' | null;
    requiredFundsUSD: number | null;
    availableFundsUSD: number | null;
    tiesStrengthScore: number | null;
    tiesStrengthLabel: 'weak' | 'medium' | 'strong' | null;
    travelHistoryLabel: 'none' | 'limited' | 'good' | 'strong' | null;
    employmentDurationMonths: number | null;
    monthlyIncomeUSD: number | null;
  }
): VisaProbabilityResult {
  let score = 50; // Neutral baseline (v2)
  const riskFactors: string[] = [];
  const positiveFactors: string[] = [];
  const riskDrivers: string[] = [];

  // Helper to add driver
  const addDriver = (driver: string) => {
    if (!riskDrivers.includes(driver)) {
      riskDrivers.push(driver);
    }
  };

  // Extract expert fields or compute them if not provided
  const financialRatio = expertFields?.financialSufficiencyRatio ?? null;
  const financialLabel = expertFields?.financialSufficiencyLabel ?? null;
  const requiredFundsUSD = expertFields?.requiredFundsUSD ?? null;
  const availableFundsUSD = expertFields?.availableFundsUSD ?? null;
  const tiesStrengthScore = expertFields?.tiesStrengthScore ?? null;
  const tiesStrengthLabel = expertFields?.tiesStrengthLabel ?? null;
  const travelHistoryLabel = expertFields?.travelHistoryLabel ?? null;
  const employmentDurationMonths = expertFields?.employmentDurationMonths ?? null;
  const monthlyIncomeUSD = expertFields?.monthlyIncomeUSD ?? summary.monthlyIncomeUSD ?? null;

  // A) Financial sufficiency
  if (requiredFundsUSD === null || requiredFundsUSD === 0) {
    // Treat as neutral (ratio = 1)
    // No adjustment
  } else if (!availableFundsUSD || availableFundsUSD <= 0) {
    score += 5; // Small risk bump for unknown funds
    addDriver('funds_unknown');
  } else {
    const ratio = financialRatio ?? availableFundsUSD / requiredFundsUSD;
    if (ratio < 0.5) {
      score += 25;
      addDriver('low_funds');
    } else if (ratio < 0.8) {
      score += 15;
      addDriver('low_funds');
    } else if (ratio < 1.0) {
      score += 8;
      addDriver('borderline_funds');
    } else if (ratio < 1.3) {
      // Adequate, neutral
    } else if (ratio < 2.5) {
      score -= 5; // Good buffer
    } else {
      score -= 8; // Very strong buffer
    }

    // Suspicious "too much money vs income"
    if (monthlyIncomeUSD && monthlyIncomeUSD > 0) {
      const monthsOfIncome = availableFundsUSD / monthlyIncomeUSD;
      if (monthsOfIncome > 24) {
        addDriver('big_funds_vs_low_income');
        score += 5; // Slight risk bump
      }
    }
  }

  // B) Ties to home country
  if (tiesStrengthScore !== null) {
    if (tiesStrengthScore <= 0.3) {
      score += 15;
      addDriver('weak_ties');
    } else if (tiesStrengthScore <= 0.6) {
      // Medium ties, neutral
    } else {
      score -= 10; // Strong ties reduce risk
    }
  } else if (tiesStrengthLabel) {
    switch (tiesStrengthLabel) {
      case 'weak':
        score += 15;
        addDriver('weak_ties');
        break;
      case 'medium':
        // Neutral
        break;
      case 'strong':
        score -= 10;
        break;
    }
  }

  // C) Employment status
  const isEmployed =
    summary.employment?.isEmployed ||
    summary.employment?.currentStatus === 'employed' ||
    summary.employment?.currentStatus === 'self_employed';
  const currentStatus = summary.employment?.currentStatus ?? 'unknown';

  if (!isEmployed && currentStatus !== 'student') {
    score += 8;
    addDriver('no_employment');
  } else {
    // Bonus for stable employment
    if (employmentDurationMonths !== null) {
      if (employmentDurationMonths >= 12) {
        score -= 5;
      } else if (employmentDurationMonths >= 6) {
        score -= 3;
      }
    }
  }

  // D) Travel history
  if (travelHistoryLabel) {
    switch (travelHistoryLabel) {
      case 'none':
        score += 15;
        addDriver('limited_travel_history');
        break;
      case 'limited':
        score += 7;
        addDriver('limited_travel_history');
        break;
      case 'good':
      case 'strong':
        score -= 5;
        break;
    }
  } else if (!summary.hasInternationalTravel) {
    // Fallback if label not available
    score += 15;
    addDriver('limited_travel_history');
  }

  // E) Previous refusals / overstay
  const previousVisaRejections =
    typeof summary.previousVisaRejections === 'number'
      ? summary.previousVisaRejections
      : summary.previousVisaRejections
        ? 1
        : 0;
  if (previousVisaRejections > 0) {
    score += 20;
    addDriver('previous_visa_refusals');
  }

  if (summary.previousOverstay) {
    score += 30;
    addDriver('previous_overstay');
  }

  // F) Sponsor type
  const sponsorType = summary.sponsorType ?? 'unknown';
  if (sponsorType !== 'self' && sponsorType !== 'unknown') {
    score += 5;
    addDriver('sponsor_based_finance');
  }

  // G) Age
  const age =
    (summary.age ?? summary.personalInfo?.dateOfBirth)
      ? new Date().getFullYear() - new Date(summary.personalInfo!.dateOfBirth!).getFullYear()
      : null;
  if (age !== null && age < 18) {
    score += 10;
    addDriver('is_minor');
  }

  // H) Clamp to [0, 100]
  score = Math.max(0, Math.min(100, score));

  // "Strong profile cannot be high risk" override
  const hasStrongTies = tiesStrengthLabel === 'strong';
  const financesStrongEnough = financialRatio !== null && financialRatio >= 1.3;
  const noSeriousNegatives = previousVisaRejections === 0 && !summary.previousOverstay;

  if (hasStrongTies && financesStrongEnough && noSeriousNegatives) {
    // Cap at medium-risk band
    if (score > 65) score = 65;
    if (score < 40) score = 40; // Also avoid showing "low" when we know nothing
  }

  // Determine risk level using centralized function (will be updated with new thresholds)
  const level = computeRiskLevel(score);

  // Convert risk drivers to risk factors for backward compatibility
  riskFactors.push(...riskDrivers);

  return { score, level, riskFactors, positiveFactors };
}

/**
 * Convert legacy QuestionnaireData format to VisaQuestionnaireSummary
 * Handles old format with purpose, country, duration, etc.
 */
function convertLegacyQuestionnaireToSummary(
  legacyData: any,
  appLanguage: 'uz' | 'ru' | 'en' = 'en',
  countryCode?: string
): VisaQuestionnaireSummary {
  // Determine visa type from purpose
  const visaType: 'student' | 'tourist' = legacyData.purpose === 'study' ? 'student' : 'tourist';

  // Map country (try to use provided countryCode, or extract from legacy data)
  let targetCountry = countryCode || 'US';
  if (legacyData.country) {
    // If country is already a code (2-3 letters), use it
    if (typeof legacyData.country === 'string' && legacyData.country.length <= 3) {
      targetCountry = legacyData.country.toUpperCase();
    } else if (legacyData.targetCountry) {
      targetCountry = legacyData.targetCountry;
    }
  }

  // Map duration
  const durationMap: Record<
    string,
    'less_than_1_month' | '1_3_months' | '3_6_months' | '6_12_months' | 'more_than_1_year'
  > = {
    less_than_1: 'less_than_1_month',
    '1_3_months': '1_3_months',
    '3_6_months': '3_6_months',
    '6_12_months': '6_12_months',
    more_than_1_year: 'more_than_1_year',
  };
  const duration = durationMap[legacyData.duration] || '1_3_months';

  // Map financial situation to sponsor type
  let sponsorType: 'self' | 'parent' | 'relative' | 'company' | 'other' = 'self';
  if (legacyData.financialSituation === 'sponsor') {
    sponsorType = 'parent'; // Default to parent for legacy sponsor
  } else if (legacyData.financialSituation === 'stable_income') {
    sponsorType = 'self';
  }

  // Map current status
  let currentStatus: 'student' | 'employed' | 'self_employed' | 'unemployed' | undefined;
  if (legacyData.currentStatus === 'student') {
    currentStatus = 'student';
  } else if (legacyData.currentStatus === 'employee' || legacyData.currentStatus === 'employed') {
    currentStatus = 'employed';
  } else if (legacyData.currentStatus === 'entrepreneur') {
    currentStatus = 'self_employed';
  } else if (legacyData.currentStatus === 'unemployed') {
    currentStatus = 'unemployed';
  }

  // Map hasChildren
  const hasChildrenValue: 'no' | 'one' | 'two_or_more' =
    legacyData.hasChildren === 'one'
      ? 'one'
      : legacyData.hasChildren === 'two_plus'
        ? 'two_or_more'
        : 'no';

  // Build summary
  const summary: VisaQuestionnaireSummary = {
    version: '1.0', // Legacy format
    visaType,
    targetCountry,
    appLanguage,

    // Map legacy fields
    duration,
    sponsorType,
    hasInternationalTravel: legacyData.traveledBefore ?? false,
    maritalStatus: legacyData.maritalStatus as 'single' | 'married' | 'divorced' | undefined,
    hasChildren: hasChildrenValue,
    englishLevel: legacyData.englishLevel as 'basic' | 'intermediate' | 'advanced' | undefined,
    hasUniversityInvitation: visaType === 'student' && legacyData.hasInvitation === true,
    hasOtherInvitation: visaType === 'tourist' && legacyData.hasInvitation === true,

    // Employment/Education
    employment: currentStatus
      ? {
          currentStatus,
          isEmployed: currentStatus === 'employed' || currentStatus === 'self_employed',
        }
      : undefined,
    education:
      visaType === 'student' || currentStatus === 'student'
        ? {
            isStudent: true,
          }
        : undefined,

    // Documents (default to false for legacy)
    documents: {
      hasPassport: false,
      hasBankStatement: false,
      hasEmploymentOrStudyProof:
        legacyData.currentStatus === 'employee' || legacyData.currentStatus === 'student',
      hasInsurance: false,
      hasFlightBooking: false,
      hasHotelBookingOrAccommodation: false,
    },
  };

  return summary;
}

/**
 * Extract VisaQuestionnaireSummary from user bio
 * Handles both legacy and new formats (including QuestionnaireV2)
 * Now includes legacy format conversion
 */
function extractQuestionnaireSummary(
  bio: string | null | undefined,
  appLanguage: 'uz' | 'ru' | 'en' = 'en',
  countryCode?: string
): VisaQuestionnaireSummary | null {
  if (!bio) return null;

  try {
    const parsed = JSON.parse(bio);

    // Check if it's QuestionnaireV2 format
    if (parsed.version === '2.0' && parsed.targetCountry && parsed.visaType) {
      const {
        buildSummaryFromQuestionnaireV2,
        validateQuestionnaireV2,
      } = require('./questionnaire-v2-mapper');
      if (validateQuestionnaireV2(parsed)) {
        // Extract appLanguage from user or default to provided
        const lang = parsed.appLanguage || appLanguage;
        return buildSummaryFromQuestionnaireV2(parsed, lang as 'uz' | 'ru' | 'en');
      }
    }

    // Check if it's the new format with summary
    if (parsed._hasSummary && parsed.summary) {
      const summary = parsed.summary;

      // Validate summary structure
      if (
        summary &&
        typeof summary === 'object' &&
        typeof summary.version === 'string' &&
        (summary.visaType === 'student' || summary.visaType === 'tourist') &&
        typeof summary.targetCountry === 'string' &&
        ['uz', 'ru', 'en'].includes(summary.appLanguage) &&
        summary.documents &&
        typeof summary.documents === 'object'
      ) {
        return summary as VisaQuestionnaireSummary;
      }
    }

    // Legacy format: convert to summary
    if (parsed.purpose || parsed.country || parsed.duration) {
      logInfo('Converting legacy questionnaire format to summary', {
        hasPurpose: !!parsed.purpose,
        hasCountry: !!parsed.country,
      });
      return convertLegacyQuestionnaireToSummary(parsed, appLanguage, countryCode);
    }

    // If we can't identify the format, return null
    return null;
  } catch (error) {
    logError('Failed to extract questionnaire summary from bio', error as Error);
    return null;
  }
}

/**
 * Build AI User Context for an application
 *
 * @param userId - User ID
 * @param applicationId - Application ID
 * @returns AIUserContext object
 */
export async function buildAIUserContext(
  userId: string,
  applicationId: string
): Promise<AIUserContext> {
  try {
    // Fetch application with all related data
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: {
        country: true,
        visaType: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            language: true,
            bio: true,
          },
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            documentName: true,
            fileUrl: true,
            status: true,
            uploadedAt: true,
          },
        },
      },
    });

    if (!application) {
      throw errors.notFound('Application');
    }

    // Verify ownership
    if (application.userId !== userId) {
      throw errors.forbidden();
    }

    // Get app language from user or default to 'en'
    const appLanguage = (application.user.language as 'uz' | 'ru' | 'en') || 'en';
    // Phase 7: Normalize country code using CountryRegistry
    let countryCode =
      normalizeCountryCode(application.country.code) || application.country.code.toUpperCase();

    // Extract questionnaire summary from user bio (with context for legacy conversion)
    const questionnaireSummary = extractQuestionnaireSummary(
      application.user.bio,
      appLanguage,
      countryCode
    );

    // Also extract raw questionnaire data for ApplicantProfile
    let rawQuestionnaireData: any = null;
    if (application.user.bio) {
      try {
        rawQuestionnaireData = JSON.parse(application.user.bio);
      } catch (e) {
        // If parsing fails, use questionnaireSummary as fallback
        rawQuestionnaireData = questionnaireSummary;
      }
    }

    // Determine visa type from application or summary
    let visaType: string = 'tourist';
    if (questionnaireSummary) {
      visaType = questionnaireSummary.visaType;
    } else {
      // Fallback: infer from visa type name
      const visaTypeName = application.visaType.name.toLowerCase();
      if (visaTypeName.includes('student') || visaTypeName.includes('study')) {
        visaType = 'student';
      } else {
        visaType = normalizeVisaTypeForRules(countryCode, visaTypeName);
      }
    }

    // Map application status
    const statusMap: Record<
      string,
      'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected'
    > = {
      draft: 'draft',
      in_progress: 'in_progress',
      submitted: 'submitted',
      approved: 'approved',
      rejected: 'rejected',
    };
    const applicationStatus = statusMap[application.status.toLowerCase()] || 'draft';

    // Phase 8: Always use normalized country code from application (single source of truth)
    // Don't use questionnaireSummary.targetCountry as it may be inconsistent
    // The application.country.code is the canonical source
    countryCode =
      normalizeCountryCode(application.country.code) || application.country.code.toUpperCase();

    // Map documents
    const uploadedDocuments = application.documents.map((doc) => ({
      type: doc.documentType,
      fileName: doc.documentName || doc.documentType,
      url: doc.fileUrl || undefined,
      status:
        doc.status === 'verified'
          ? ('approved' as const)
          : doc.status === 'rejected'
            ? ('rejected' as const)
            : ('uploaded' as const),
    }));

    // Build user profile (appLanguage already extracted above)
    const userProfile = {
      userId: application.user.id,
      appLanguage,
      citizenship: questionnaireSummary?.citizenship,
      age: questionnaireSummary?.age,
    };

    // Build application info
    const applicationInfo = {
      applicationId: application.id,
      visaType,
      country: countryCode,
      status: applicationStatus,
    };

    // Build context
    const context: AIUserContext = {
      userProfile,
      application: applicationInfo,
      questionnaireSummary: questionnaireSummary || undefined,
      uploadedDocuments,
      appActions: [], // Can be populated from activity logs if needed
    };

    // Calculate and attach risk score if questionnaire summary exists
    if (questionnaireSummary) {
      // Legacy function call - expert fields not available here, will use defaults
      const probability = calculateVisaProbability(questionnaireSummary);
      const approvalProbability = 100 - probability.score;
      const probabilityPercent = Math.max(5, Math.min(95, approvalProbability));
      context.riskScore = {
        probabilityPercent,
        level: probability.level,
        riskFactors: probability.riskFactors,
        positiveFactors: probability.positiveFactors,
      };
    }

    logInfo('AI user context built', {
      userId,
      applicationId,
      hasSummary: !!questionnaireSummary,
      documentCount: uploadedDocuments.length,
      hasRiskScore: !!context.riskScore,
      riskScore: context.riskScore?.probabilityPercent,
    });

    return context;
  } catch (error) {
    logError('Failed to build AI user context', error as Error, {
      userId,
      applicationId,
    });
    throw error;
  }
}

/**
 * Build Canonical AI User Context
 * Rock-solid interface with no nullable core fields and explicit defaults
 * This is the preferred format for GPT services
 * Phase 3: Now includes expert fields (financial, employment, education, travel, family, property, ties, embassy context)
 *
 * @param currentContext - AIUserContext from buildAIUserContext()
 * @returns CanonicalAIUserContext with all fields filled (including expert fields)
 */
export async function buildCanonicalAIUserContext(
  currentContext: AIUserContext
): Promise<CanonicalAIUserContext> {
  const summary = currentContext.questionnaireSummary;
  const warnings: string[] = [];
  const fallbacks: string[] = [];

  // Extract citizenship (default: 'UZ')
  const citizenship =
    summary?.citizenship ||
    summary?.personalInfo?.nationality ||
    currentContext.userProfile.citizenship ||
    'UZ';
  if (!summary?.citizenship && !currentContext.userProfile.citizenship) {
    fallbacks.push('citizenship');
  }

  // Extract age (can be null)
  const age = summary?.age || currentContext.userProfile.age || null;
  if (age === null) {
    warnings.push('Age is unknown - may miss age-specific documents');
  }

  // Extract sponsorType (default: 'self')
  // Check multiple sources: questionnaire v2 finance.payer, sponsorType, financialInfo, travelInfo
  let sponsorType: 'self' | 'parent' | 'relative' | 'company' | 'other' = 'self';
  if (summary?.sponsorType) {
    sponsorType = summary.sponsorType;
  } else if ((summary as any)?.finance?.payer) {
    // v2 format: questionnaire.finance.payer
    const payer = (summary as any).finance.payer;
    if (payer === 'self') sponsorType = 'self';
    else if (payer === 'parent') sponsorType = 'parent';
    else if (payer === 'relative' || payer === 'sibling') sponsorType = 'relative';
    else if (payer === 'company') sponsorType = 'company';
    else sponsorType = 'other';
  } else if (summary?.financialInfo?.sponsorDetails?.relationship) {
    const rel = summary.financialInfo.sponsorDetails.relationship;
    sponsorType =
      rel === 'parent' ? 'parent' : rel === 'sibling' || rel === 'relative' ? 'relative' : 'other';
  } else if (summary?.travelInfo?.funding && summary.travelInfo.funding !== 'self') {
    sponsorType = summary.travelInfo.funding === 'sponsor' ? 'relative' : 'other';
  } else {
    fallbacks.push('sponsorType');
  }

  // Extract currentStatus (default: 'unknown')
  // Check multiple sources: questionnaire v2 status.currentStatus, currentStatus, employment.currentStatus
  let currentStatus:
    | 'student'
    | 'employed'
    | 'self_employed'
    | 'unemployed'
    | 'retired'
    | 'unknown' = 'unknown';
  if ((summary as any)?.status?.currentStatus) {
    // v2 format: questionnaire.status.currentStatus
    const status = (summary as any).status.currentStatus;
    if (
      status === 'student' ||
      status === 'employed' ||
      status === 'self_employed' ||
      status === 'unemployed' ||
      status === 'retired'
    ) {
      currentStatus = status;
    }
  } else if ((summary as any)?.currentStatus) {
    // v2 format: questionnaire.currentStatus (flat)
    const status = (summary as any).currentStatus;
    if (
      status === 'student' ||
      status === 'employed' ||
      status === 'self_employed' ||
      status === 'unemployed' ||
      status === 'retired'
    ) {
      currentStatus = status;
    }
  } else if (summary?.employment?.currentStatus) {
    const empStatus = summary.employment.currentStatus;
    // Handle all possible status values, including 'retired' if it exists
    if (
      empStatus === 'student' ||
      empStatus === 'employed' ||
      empStatus === 'self_employed' ||
      empStatus === 'unemployed'
    ) {
      currentStatus = empStatus;
    } else {
      // If status is something else (like 'retired'), default to 'unknown'
      currentStatus = 'unknown';
    }
  } else if (summary?.education?.isStudent) {
    currentStatus = 'student';
  } else if (summary?.employment?.isEmployed) {
    currentStatus = 'employed';
  } else {
    fallbacks.push('currentStatus');
  }

  // Extract isStudent and isEmployed
  const isStudent = currentStatus === 'student' || summary?.education?.isStudent || false;
  const isEmployed =
    currentStatus === 'employed' ||
    currentStatus === 'self_employed' ||
    summary?.employment?.isEmployed ||
    false;

  // Extract previousVisaRejections (default: false)
  const previousVisaRejections =
    summary?.previousVisaRejections ?? summary?.travelHistory?.hasRefusals ?? false;

  // Extract hasInternationalTravel (default: false)
  const hasInternationalTravel =
    summary?.hasInternationalTravel ?? summary?.travelHistory?.traveledBefore ?? false;

  // Extract previousOverstay (default: false)
  const previousOverstay = summary?.previousOverstay ?? false;

  // Extract bankBalanceUSD (can be null)
  const bankBalanceUSD = summary?.bankBalanceUSD ?? summary?.financialInfo?.selfFundsUSD ?? null;

  // Extract monthlyIncomeUSD (can be null)
  const monthlyIncomeUSD =
    summary?.monthlyIncomeUSD ?? summary?.employment?.monthlySalaryUSD ?? null;

  // Extract duration (default: 'unknown')
  const duration = summary?.duration ?? summary?.travelInfo?.duration ?? 'unknown';

  // Extract documents (all default to false)
  const documents = {
    hasPassport: summary?.documents?.hasPassport ?? false,
    hasBankStatement: summary?.documents?.hasBankStatement ?? false,
    hasEmploymentOrStudyProof: summary?.documents?.hasEmploymentOrStudyProof ?? false,
    hasInsurance:
      summary?.documents?.hasInsurance ?? summary?.documents?.hasTravelInsurance ?? false,
    hasFlightBooking: summary?.documents?.hasFlightBooking ?? false,
    hasHotelBookingOrAccommodation: summary?.documents?.hasHotelBookingOrAccommodation ?? false,
  };

  // Extract ties
  const hasPropertyInUzbekistan =
    summary?.hasPropertyInUzbekistan ?? summary?.ties?.propertyDocs ?? false;
  const hasFamilyInUzbekistan =
    summary?.hasFamilyInUzbekistan ?? summary?.ties?.familyTies ?? false;

  // Extract maritalStatus (default: 'unknown')
  // Check multiple sources: questionnaire v2 personal.maritalStatus, maritalStatus (flat)
  const maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'unknown' =
    summary?.maritalStatus ?? (summary as any)?.personal?.maritalStatus ?? 'unknown';

  // Extract hasChildren (default: false)
  const hasChildren = (summary?.hasChildren && summary.hasChildren !== 'no') ?? false;

  // Extract invitations
  // Check multiple sources: questionnaire v2 invitation.hasInvitation, hasOtherInvitation (flat)
  const hasUniversityInvitation = summary?.hasUniversityInvitation ?? false;
  const hasOtherInvitation =
    summary?.hasOtherInvitation ?? (summary as any)?.invitation?.hasInvitation ?? false;

  // ============================================
  // PHASE 3: EXPERT FIELDS EXTRACTION
  // ============================================

  // Financial expert fields
  const financial: CanonicalAIUserContext['applicantProfile']['financial'] = {
    incomeHistory: summary?.employment?.monthlySalaryUSD
      ? [summary.employment.monthlySalaryUSD] // Single value for now, could be extended
      : undefined,
    savingsGrowth:
      bankBalanceUSD !== null && monthlyIncomeUSD !== null && monthlyIncomeUSD > 0
        ? bankBalanceUSD >= monthlyIncomeUSD * 6
          ? ('increasing' as 'increasing')
          : bankBalanceUSD >= monthlyIncomeUSD * 3
            ? ('stable' as 'stable')
            : ('decreasing' as 'decreasing')
        : undefined,
    accountAgeMonths: null, // Not available in questionnaire
    sourceOfFunds:
      sponsorType !== 'self'
        ? 'sponsor'
        : isEmployed
          ? 'employment'
          : currentStatus === 'self_employed'
            ? 'business'
            : 'unknown',
    sponsor:
      sponsorType !== 'self' && summary?.financialInfo?.sponsorDetails
        ? {
            income: summary.financialInfo.sponsorDetails.annualIncomeUSD ?? null,
            savings: null, // Not available
            dependents: null, // Not available
            relationship: (summary.financialInfo.sponsorDetails.relationship ?? 'other') as
              | 'parent'
              | 'sibling'
              | 'relative'
              | 'friend'
              | 'other',
          }
        : undefined,
    requiredFundsEstimate: undefined, // Will be calculated below
    financialSufficiencyRatio: undefined, // Will be calculated below
  };

  // Calculate required funds and sufficiency ratio (Phase 2: Enhanced)
  const requiredFunds =
    calculateRequiredFundsEstimate(
      currentContext.application.country,
      currentContext.application.visaType,
      duration
    ) ??
    estimateRequiredFundsUSD(
      currentContext.application.country,
      currentContext.application.visaType,
      null // Duration in days not available, will use defaults
    );

  // Calculate available funds (Phase 2: Enhanced)
  const sponsorBankBalance = summary?.financialInfo?.sponsorDetails
    ? null // Not available in questionnaire
    : null;
  const sponsorIncome = summary?.financialInfo?.sponsorDetails?.annualIncomeUSD
    ? summary.financialInfo.sponsorDetails.annualIncomeUSD / 12 // Convert annual to monthly
    : null;

  const availableFunds = computeAvailableFundsUSD(
    bankBalanceUSD,
    monthlyIncomeUSD,
    sponsorType,
    sponsorBankBalance,
    sponsorIncome
  );

  if (requiredFunds !== null) {
    financial.requiredFundsEstimate = requiredFunds;
    financial.requiredFundsUSD = requiredFunds; // Alias for consistency
  }

  financial.availableFundsUSD = availableFunds;

  // Classify financial sufficiency (Phase 2: Enhanced with label)
  const sufficiency = classifyFinancialSufficiency(requiredFunds, availableFunds);
  if (sufficiency.ratio !== null) {
    financial.financialSufficiencyRatio = sufficiency.ratio;
    financial.financialSufficiencyLabel = sufficiency.label;
    if (sufficiency.ratio < 1.0) {
      warnings.push(
        `Financial sufficiency is ${sufficiency.label} (${(sufficiency.ratio * 100).toFixed(0)}%) - may need additional funds`
      );
    }
  }

  // Check sponsor sufficiency (Phase 2)
  if (sponsorType !== 'self' && sponsorIncome !== null) {
    financial.sponsorHasSufficientFunds = sponsorIncome * 12 >= (requiredFunds ?? 0) * 0.5; // Sponsor should cover at least 50%
  }

  // Employment expert fields
  const employment =
    isEmployed || currentStatus === 'employed' || currentStatus === 'self_employed'
      ? {
          employerName: summary?.employment?.employerName ?? null,
          industry: null, // Not available in questionnaire
          employmentDurationMonths: null, // Not available in questionnaire
          salaryHistory: summary?.employment?.monthlySalaryUSD
            ? [summary.employment.monthlySalaryUSD]
            : undefined,
          contractType:
            currentStatus === 'self_employed' ? ('freelance' as const) : ('permanent' as const),
          employerStability: 'unknown' as const,
        }
      : undefined;

  // Education expert fields
  const education =
    isStudent || currentStatus === 'student'
      ? {
          degreeLevel: (summary?.education?.programType === 'bachelor'
            ? 'bachelor'
            : summary?.education?.programType === 'master'
              ? 'master'
              : summary?.education?.programType === 'phd'
                ? 'phd'
                : summary?.education?.programType === 'language'
                  ? 'certificate'
                  : 'unknown') as 'bachelor' | 'master' | 'phd' | 'certificate' | 'unknown',
          institution: summary?.education?.university ?? null,
          graduationDate: summary?.education?.hasGraduated ? null : null, // Not available
          fieldOfStudy: null, // Not available
          gpa: null, // Not available
        }
      : undefined;

  // Travel history expert fields (Phase 2: Enhanced with score and label)
  const travelHistoryBase = hasInternationalTravel
    ? {
        countries: summary?.travelHistory?.visitedCountries
          ? summary.travelHistory.visitedCountries.map((country) => ({
              country,
              dates: undefined,
              visaType: undefined,
              outcome: 'approved' as const, // Assume approved if traveled
            }))
          : undefined,
        previousVisaTypes: summary?.travelHistory?.visitedCountries
          ? summary.travelHistory.visitedCountries.map(() => 'tourist')
          : undefined,
        previousVisaResults: summary?.travelHistory?.hasRefusals
          ? [
              {
                country: currentContext.application.country,
                visaType: currentContext.application.visaType,
                outcome: 'rejected' as const,
                date: undefined,
              },
            ]
          : undefined,
      }
    : undefined;

  // Compute travel history score and label (Phase 2)
  const travelHistoryScore = computeTravelHistoryScore({
    hasInternationalTravel,
    previousVisaRejections: previousVisaRejections ? 1 : 0,
    hasOverstay: previousOverstay,
  });

  const travelHistory = travelHistoryBase
    ? {
        ...travelHistoryBase,
        previousVisaRejections: previousVisaRejections ? 1 : 0, // Phase 2: Added count
        hasOverstayHistory: previousOverstay, // Phase 2: Added
        travelHistoryScore: travelHistoryScore.score, // Phase 2: Added
        travelHistoryLabel: travelHistoryScore.label, // Phase 2: Added
      }
    : {
        previousVisaRejections: previousVisaRejections ? 1 : 0,
        hasOverstayHistory: previousOverstay,
        travelHistoryScore: travelHistoryScore.score,
        travelHistoryLabel: travelHistoryScore.label,
      };

  // Family expert fields
  const family = {
    spouse:
      maritalStatus === 'married'
        ? {
            citizenship: null, // Not available
            employed: null, // Not available
            income: null, // Not available
          }
        : null,
    children: hasChildren
      ? [
          {
            age: null, // Not available
            citizenship: null, // Not available
            dependent: true,
          },
        ]
      : undefined,
    dependentFamily: undefined, // Not available
    familyAbroad: undefined, // Not available
  };

  // Property expert fields
  const property = hasPropertyInUzbekistan
    ? {
        valueUSD: null, // Not available
        type: 'apartment' as const, // Default assumption
        ownershipDurationMonths: null, // Not available
        location: null, // Not available
      }
    : undefined;

  // Calculate ties strength (Phase 2: Enhanced with label)
  const tiesStrength = calculateTiesStrengthScore(
    hasPropertyInUzbekistan,
    isEmployed,
    employment?.employmentDurationMonths ?? null,
    hasFamilyInUzbekistan,
    hasChildren,
    maritalStatus
  );
  const ties = {
    tiesStrengthScore: tiesStrength.score,
    tiesStrengthLabel: tiesStrength.label, // Phase 2: Added label
    tiesFactors: tiesStrength.factors,
    propertyValueUSD: property?.valueUSD ?? null, // Phase 2: Added
    employmentDurationMonths: employment?.employmentDurationMonths ?? null, // Phase 2: Added
  };

  // Get embassy context (async)
  const embassyContext = await getEmbassyContext(
    currentContext.application.country,
    currentContext.application.visaType
  );

  // Phase 2: Uzbek context
  const uzbekContext: CanonicalAIUserContext['uzbekContext'] = {
    isUzbekCitizen:
      citizenship === 'UZ' || citizenship === 'UZB' || citizenship?.toUpperCase().includes('UZBEK'),
    residesInUzbekistan:
      summary?.currentCountry === 'UZ' ||
      summary?.personalInfo?.currentResidenceCountry === 'UZ' ||
      citizenship === 'UZ' ||
      citizenship === 'UZB',
    typicalBankNamesIncluded: false, // Can be enhanced later
  };

  // Phase 2: Meta information (data completeness)
  const dataCompleteness = computeDataCompleteness({
    bankBalanceUSD,
    monthlyIncomeUSD,
    sponsorType,
    currentStatus,
    hasProperty: hasPropertyInUzbekistan,
    hasFamily: hasFamilyInUzbekistan,
    hasInternationalTravel,
  });

  const meta: CanonicalAIUserContext['meta'] = {
    dataCompletenessScore: dataCompleteness.score,
    missingCriticalFields:
      dataCompleteness.missingCriticalFields.length > 0
        ? dataCompleteness.missingCriticalFields
        : undefined,
  };

  // Always calculate risk score (even if questionnaire is missing)
  let riskScore: CanonicalAIUserContext['riskScore'];
  if (summary) {
    // Pass expert fields to calculateVisaProbability v2
    const probability = calculateVisaProbability(summary, {
      financialSufficiencyRatio: financial.financialSufficiencyRatio ?? null,
      financialSufficiencyLabel: financial.financialSufficiencyLabel ?? null,
      requiredFundsUSD: financial.requiredFundsUSD ?? null,
      availableFundsUSD: financial.availableFundsUSD ?? null,
      tiesStrengthScore: ties.tiesStrengthScore ?? null,
      tiesStrengthLabel: ties.tiesStrengthLabel ?? null,
      travelHistoryLabel: travelHistory.travelHistoryLabel ?? null,
      employmentDurationMonths: employment?.employmentDurationMonths ?? null,
      monthlyIncomeUSD: monthlyIncomeUSD,
    });
    // Phase 2: Use centralized computeRiskLevel for consistency
    const canonicalRiskLevel = computeRiskLevel(probability.score);
    // v2: probabilityPercent = 100 - score (clamped to 5-95)
    const approvalProbability = 100 - probability.score;
    const probabilityPercent = Math.max(5, Math.min(95, approvalProbability));
    riskScore = {
      probabilityPercent,
      level: canonicalRiskLevel, // Use centralized function
      riskFactors: probability.riskFactors,
      positiveFactors: probability.positiveFactors,
    };
  } else {
    // Default risk score for missing questionnaire
    const defaultScore = 50; // v2 baseline
    const approvalProbability = 100 - defaultScore;
    const probabilityPercent = Math.max(5, Math.min(95, approvalProbability));
    riskScore = {
      probabilityPercent,
      level: computeRiskLevel(defaultScore), // Use centralized function
      riskFactors: ['Questionnaire data incomplete - using default risk assessment'],
      positiveFactors: [],
    };
    warnings.push('Questionnaire missing - using default risk score');
  }

  // Phase 2: Compute risk drivers
  const riskDrivers = computeRiskDrivers({
    financialSufficiencyRatio: financial.financialSufficiencyRatio ?? null,
    financialSufficiencyLabel: financial.financialSufficiencyLabel ?? null,
    tiesStrengthScore: ties.tiesStrengthScore ?? null,
    tiesStrengthLabel: ties.tiesStrengthLabel ?? null,
    travelHistoryScore: travelHistory.travelHistoryScore ?? null,
    travelHistoryLabel: travelHistory.travelHistoryLabel ?? null,
    hasPropertyInUzbekistan,
    isEmployed,
    currentStatus,
    monthlyIncomeUSD,
    hasInternationalTravel,
    previousVisaRejections,
    hasOverstayHistory: previousOverstay,
    sponsorType,
    age,
    availableFundsUSD: financial.availableFundsUSD ?? null,
  });

  // Determine source format
  let sourceFormat: 'v2' | 'legacy' | 'hybrid' | 'unknown' = 'unknown';
  if (summary) {
    if (summary.version === '2.0') {
      sourceFormat = 'v2';
    } else if (summary.version === '1.0') {
      sourceFormat = 'hybrid';
    } else {
      sourceFormat = 'legacy';
    }
  }

  // Log warnings and fallbacks if any
  if (warnings.length > 0 || fallbacks.length > 0) {
    logInfo('Canonical context built with warnings/fallbacks', {
      warnings,
      fallbacks,
      sourceFormat,
    });
  }

  // Phase 2: Log derived metrics (non-sensitive) + debug info for employment/ties + risk drivers
  const applicationId = currentContext.application.applicationId;
  const countryCode = currentContext.application.country;
  const visaType = currentContext.application.visaType;
  const isESTourist =
    countryCode === 'ES' && (visaType === 'tourist' || visaType.includes('tourist'));

  logInfo('[AI Context] Canonical context built with expert fields', {
    applicationId,
    employmentStatus: currentStatus,
    isEmployed,
    tiesStrengthLabel: ties?.tiesStrengthLabel || 'unknown',
    hasProperty: hasPropertyInUzbekistan,
    hasFamilyInHomeCountry: hasFamilyInUzbekistan,
    financialSufficiencyLabel: financial?.financialSufficiencyLabel || 'unknown',
    dataCompletenessScore: meta?.dataCompletenessScore || null,
    riskLevel: riskScore.level,
    riskScore: riskScore.probabilityPercent,
    financialSufficiencyRatio: financial.financialSufficiencyRatio ?? null,
    tiesStrengthScore: ties.tiesStrengthScore ?? null,
    travelHistoryScore: travelHistory.travelHistoryScore ?? null,
    travelHistoryLabel: travelHistory.travelHistoryLabel ?? null,
    riskDrivers, // Phase 2: Log risk drivers
  });

  // Additional debug logging for ES/tourist to verify condition fields
  if (isESTourist) {
    logInfo('[AI Context][ES Tourist] Condition evaluation fields', {
      applicationId,
      sponsorType,
      currentStatus,
      maritalStatus,
      hasPropertyInUzbekistan,
      hasFamilyInUzbekistan,
      hasInternationalTravel,
      previousVisaRejections,
      hasOtherInvitation,
      riskLevel: riskScore.level,
      // Log source of each field for debugging
      sponsorTypeSource: summary?.sponsorType
        ? 'summary.sponsorType'
        : (summary as any)?.finance?.payer
          ? 'questionnaire.finance.payer'
          : summary?.financialInfo?.sponsorDetails?.relationship
            ? 'summary.financialInfo.sponsorDetails.relationship'
            : summary?.travelInfo?.funding
              ? 'summary.travelInfo.funding'
              : 'default(self)',
      currentStatusSource: (summary as any)?.status?.currentStatus
        ? 'questionnaire.status.currentStatus'
        : (summary as any)?.currentStatus
          ? 'questionnaire.currentStatus'
          : summary?.employment?.currentStatus
            ? 'summary.employment.currentStatus'
            : summary?.education?.isStudent
              ? 'summary.education.isStudent'
              : 'default(unknown)',
      maritalStatusSource: summary?.maritalStatus
        ? 'summary.maritalStatus'
        : (summary as any)?.personal?.maritalStatus
          ? 'questionnaire.personal.maritalStatus'
          : 'default(unknown)',
      hasOtherInvitationSource: summary?.hasOtherInvitation
        ? 'summary.hasOtherInvitation'
        : (summary as any)?.invitation?.hasInvitation
          ? 'questionnaire.invitation.hasInvitation'
          : 'default(false)',
    });
  }

  return {
    userProfile: {
      userId: currentContext.userProfile.userId,
      appLanguage: currentContext.userProfile.appLanguage,
      citizenship,
      age,
    },
    application: currentContext.application,
    applicantProfile: {
      citizenship,
      age,
      visaType: currentContext.application.visaType,
      targetCountry: currentContext.application.country,
      duration: duration as
        | 'less_than_1_month'
        | '1_3_months'
        | '3_6_months'
        | '6_12_months'
        | 'more_than_1_year'
        | 'unknown',
      sponsorType,
      bankBalanceUSD,
      monthlyIncomeUSD,
      currentStatus,
      isStudent,
      isEmployed,
      hasInternationalTravel,
      previousVisaRejections,
      previousOverstay,
      hasPropertyInUzbekistan,
      hasFamilyInUzbekistan,
      maritalStatus,
      hasChildren,
      hasUniversityInvitation,
      hasOtherInvitation,
      documents,
      // Phase 3: Expert fields (Phase 2: Enhanced)
      financial: Object.keys(financial).length > 0 ? financial : undefined,
      employment,
      education,
      travelHistory,
      family: Object.keys(family).length > 0 ? family : undefined,
      property,
      ties,
    },
    riskScore,
    uploadedDocuments: currentContext.uploadedDocuments,
    appActions: currentContext.appActions,
    metadata: {
      sourceFormat,
      extractionWarnings: warnings.length > 0 ? warnings : undefined,
      fallbackFieldsUsed: fallbacks.length > 0 ? fallbacks : undefined,
    },
    embassyContext,
    // Phase 2: New expert fields
    uzbekContext,
    meta,
    // Phase 2: Risk drivers
    riskDrivers,
    // Phase 8: Canonical country context (MANDATORY - single source of truth)
    countryContext: buildCanonicalCountryContext(currentContext.application.country) || {
      countryCode:
        normalizeCountryCode(currentContext.application.country) ||
        currentContext.application.country.toUpperCase(),
      countryName: getCountryNameFromCode(currentContext.application.country),
      schengen: false,
    },
  };
}

/**
 * Get questionnaire summary for a user
 *
 * @param userId - User ID
 * @returns VisaQuestionnaireSummary or null
 */
export async function getQuestionnaireSummary(
  userId: string
): Promise<VisaQuestionnaireSummary | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { bio: true, language: true },
    });

    if (!user || !user.bio) {
      return null;
    }

    const appLanguage = (user.language as 'uz' | 'ru' | 'en') || 'en';
    return extractQuestionnaireSummary(user.bio, appLanguage);
  } catch (error) {
    logError('Failed to get questionnaire summary', error as Error, { userId });
    return null;
  }
}

/**
 * Build Canonical AI User Context for an application
 * This is the preferred function for GPT services - always returns canonical format
 *
 * @param userId - User ID
 * @param applicationId - Application ID
 * @returns CanonicalAIUserContext with all fields filled
 */
export async function buildCanonicalAIUserContextForApplication(
  userId: string,
  applicationId: string
): Promise<CanonicalAIUserContext> {
  const context = await buildAIUserContext(userId, applicationId);
  return buildCanonicalAIUserContext(context);
}

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
      more_than_6_months: 'more_than_1_year',
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
 * Build ApplicantProfile from AIUserContext
 *
 * This function maps the existing AIUserContext structure to the new canonical ApplicantProfile schema.
 * It serves as the bridge between legacy data structures and the frozen canonical types defined in visa-brain.ts.
 *
 * The function extracts and normalizes data from:
 * - userProfile: Basic user information (userId, citizenship, age, appLanguage)
 * - application: Visa application details (country, visaType)
 * - questionnaireSummary: Detailed questionnaire responses (financial info, travel history, ties, etc.)
 *
 * All field mappings are designed to handle missing or incomplete data gracefully, with sensible defaults
 * for Uzbekistan-based applicants (default nationality: UZ, default residence: Uzbekistan).
 *
 * This function is used by ai-openai.service.ts when generating checklist prompts, ensuring that GPT-4
 * receives structured, canonical input data via ApplicantProfile rather than ad-hoc field extraction.
 *
 * @param ctx - AIUserContext from buildAIUserContext(), containing userProfile, application, questionnaireSummary, and riskScore
 * @param countryName - Full country name (e.g., "United States") - required for canonical profile's destinationCountryName field
 * @param visaTypeLabel - Full visa type label (e.g., "Student Visa") - required for canonical profile's visaTypeLabel field
 * @returns ApplicantProfile with normalized values, ready for use in GPT-4 prompts and internal processing
 *
 * @example
 * ```typescript
 * const userContext = await buildAIUserContext(userId, applicationId);
 * const profile = buildApplicantProfile(userContext, "United States", "Student Visa");
 * // profile is now ready to be sent to GPT-4 as structured JSON
 * ```
 */
/**
 * Normalize country name to ISO country code
 * Maps country names to consistent ISO-like codes for template lookup
 */
function normalizeCountryCodeFromName(name: string): string | null {
  const n = name.trim().toLowerCase();
  if (n.includes('united states') || n === 'usa' || n === 'us') return 'US';
  if (n.includes('united kingdom') || n.includes('uk') || n === 'gb') return 'GB';
  if (n.includes('spain')) return 'ES';
  if (n.includes('germany')) return 'DE';
  if (n.includes('japan')) return 'JP';
  if (n.includes('united arab emirates') || n.includes('uae')) return 'AE';
  if (n.includes('canada')) return 'CA';
  if (n.includes('australia')) return 'AU';
  if (n.includes('france')) return 'FR';
  if (n.includes('italy')) return 'IT';
  return null;
}

/**
 * Build structured ApplicantProfile from questionnaire data and application
 * This is the new helper function for checklist personalization
 *
 * @param questionnaireData - Raw questionnaire data (from User.bio or QuestionnaireData)
 * @param application - Application object with country and visaType
 * @returns Structured ApplicantProfile
 */
export function buildApplicantProfileFromQuestionnaire(
  questionnaireData: any,
  application: {
    country: { code: string };
    visaType: { name: string };
  }
): ApplicantProfile {
  // Extract questionnaire fields with defaults
  const purpose =
    questionnaireData?.purpose ||
    questionnaireData?.summary?.purpose ||
    questionnaireData?.travelInfo?.purpose ||
    'tourism';
  const duration =
    questionnaireData?.duration ||
    questionnaireData?.summary?.duration ||
    questionnaireData?.travelInfo?.duration ||
    '1_3_months';
  const traveledBefore =
    questionnaireData?.traveledBefore ??
    questionnaireData?.summary?.previousTravels ??
    questionnaireData?.travelHistory?.traveledBefore ??
    questionnaireData?.summary?.hasInternationalTravel ??
    false;
  const currentStatus =
    questionnaireData?.currentStatus ||
    questionnaireData?.summary?.currentStatus ||
    questionnaireData?.employment?.currentStatus ||
    'employee';
  const financialSituation =
    questionnaireData?.financialSituation ||
    questionnaireData?.summary?.financialSituation ||
    questionnaireData?.travelInfo?.funding ||
    'stable_income';
  const maritalStatus =
    questionnaireData?.maritalStatus || questionnaireData?.summary?.maritalStatus || 'single';
  const hasChildren =
    questionnaireData?.hasChildren || questionnaireData?.summary?.hasChildren || 'no';
  const englishLevel =
    questionnaireData?.englishLevel ||
    questionnaireData?.summary?.englishLevel ||
    questionnaireData?.summary?.englishLevel ||
    'intermediate';

  // Derive boolean flags
  const isSponsored =
    financialSituation === 'sponsor' ||
    financialSituation === 'mix' ||
    questionnaireData?.summary?.sponsorType !== undefined ||
    questionnaireData?.financialInfo?.sponsorDetails !== undefined;

  const hasStableIncome =
    currentStatus === 'employee' ||
    currentStatus === 'employed' ||
    currentStatus === 'entrepreneur' ||
    currentStatus === 'self_employed' ||
    financialSituation === 'stable_income';

  // Derive strong ties (married + children OR property OR family)
  const hasStrongTies =
    maritalStatus === 'married' ||
    hasChildren !== 'no' ||
    questionnaireData?.summary?.hasPropertyInUzbekistan === true ||
    questionnaireData?.summary?.hasFamilyInUzbekistan === true ||
    questionnaireData?.ties?.propertyDocs === true ||
    questionnaireData?.ties?.familyTies === true;

  // Extract country code and visa type from application
  // Phase 7: Normalize country code using CountryRegistry
  const countryCode =
    normalizeCountryCode(application.country.code) || application.country.code.toUpperCase();
  const visaTypeName = application.visaType.name.toLowerCase();
  const visaType =
    visaTypeName.includes('student') || visaTypeName.includes('study')
      ? 'student'
      : visaTypeName.includes('tourist') || visaTypeName.includes('tourism')
        ? 'tourist'
        : visaTypeName;

  // Derive ageRange from questionnaire (if DOB/age available)
  const age =
    questionnaireData?.age ||
    questionnaireData?.summary?.age ||
    questionnaireData?.personalInfo?.dateOfBirth
      ? (() => {
          const dob = questionnaireData?.personalInfo?.dateOfBirth;
          if (dob) {
            const birthYear = new Date(dob).getFullYear();
            const currentYear = new Date().getFullYear();
            return currentYear - birthYear;
          }
          return questionnaireData?.age || questionnaireData?.summary?.age;
        })()
      : undefined;
  const ageRange: 'minor' | 'adult' | undefined =
    age !== undefined ? (age < 18 ? 'minor' : 'adult') : undefined;

  // Derive isRetired
  const isRetired =
    currentStatus === 'retired' ||
    questionnaireData?.employment?.currentStatus === 'retired' ||
    questionnaireData?.summary?.currentStatus === 'retired' ||
    false;

  // Derive hasProperty
  const hasProperty =
    questionnaireData?.summary?.hasPropertyInUzbekistan === true ||
    questionnaireData?.ties?.propertyDocs === true ||
    false;

  // Derive hasBusiness
  const hasBusiness =
    currentStatus === 'entrepreneur' ||
    currentStatus === 'self_employed' ||
    questionnaireData?.employment?.currentStatus === 'self_employed' ||
    questionnaireData?.employment?.currentStatus === 'entrepreneur' ||
    false;

  // Extract country-specific fields
  const countrySpecific: ApplicantProfile['countrySpecific'] = {};
  if (countryCode === 'US') {
    countrySpecific.us = {
      sevisId: questionnaireData?.education?.sevisId || questionnaireData?.summary?.sevisId,
    };
  }
  // Phase 7: Normalize GB/UK to canonical GB
  const normalizedCode = normalizeCountryCode(countryCode) || countryCode;
  if (normalizedCode === 'GB' || countryCode === 'GB' || countryCode === 'UK') {
    countrySpecific.uk = {
      casNumber: questionnaireData?.education?.casNumber || questionnaireData?.summary?.casNumber,
    };
  }
  if (countryCode === 'AU') {
    countrySpecific.au = {
      coeNumber: questionnaireData?.education?.coeNumber || questionnaireData?.summary?.coeNumber,
    };
  }
  if (countryCode === 'CA') {
    countrySpecific.ca = {
      dliNumber: questionnaireData?.education?.dliNumber || questionnaireData?.summary?.dliNumber,
    };
  }
  if (countryCode === 'NZ') {
    countrySpecific.nz = {
      nzqaNumber:
        questionnaireData?.education?.nzqaNumber || questionnaireData?.summary?.nzqaNumber,
    };
  }

  const profile: ApplicantProfile = {
    travel: {
      purpose,
      duration,
      previousTravel: traveledBefore,
    },
    employment: {
      currentStatus,
      hasStableIncome,
    },
    financial: {
      financialSituation,
      isSponsored,
    },
    familyAndTies: {
      maritalStatus,
      hasChildren,
      hasStrongTies,
    },
    language: {
      englishLevel,
    },
    meta: {
      countryCode,
      visaType,
    },
    ageRange,
    isRetired: isRetired || undefined,
    hasProperty: hasProperty || undefined,
    hasBusiness: hasBusiness || undefined,
    countrySpecific: Object.keys(countrySpecific).length > 0 ? countrySpecific : undefined,
  };

  // Log extended profile
  logInfo('[Checklist][ApplicantProfile] Built extended profile', {
    countryCode,
    visaType,
    ageRange,
    isRetired,
    hasProperty,
    hasBusiness,
    countrySpecific: Object.keys(countrySpecific).length > 0 ? 'present' : 'none',
  });

  return profile;
}

/**
 * Legacy function - kept for backward compatibility with visa-brain types
 * @deprecated Use buildApplicantProfileFromQuestionnaire() for checklist personalization
 */
export function buildApplicantProfile(
  ctx: AIUserContext,
  countryName: string,
  visaTypeLabel: string
): VisaBrainApplicantProfile {
  const { userProfile, application, questionnaireSummary } = ctx;

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

  // Normalize destination country code for template lookup
  const normalizedCountryCode =
    normalizeCountryCodeFromName(countryName) || application.country || nationality;

  // Build the profile
  const profile: VisaBrainApplicantProfile = {
    userId: userProfile.userId,
    nationality,
    residenceCountry,
    destinationCountryCode: normalizedCountryCode,
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
