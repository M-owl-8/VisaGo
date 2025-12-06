/**
 * AI Evaluation Scenarios (Phase 7)
 *
 * ⚠️ DEV-ONLY: These are SYNTHETIC Uzbek applicant profiles for AI evaluation only.
 *
 * These scenarios are NOT real user data and are used exclusively for:
 * - Sanity-checking GPT-4 subsystem behavior (checklist, risk, doc-check, doc-explanation)
 * - Validating JSON schema compliance
 * - Ensuring tri-language output (UZ/RU/EN)
 * - Testing expert field reasoning (financial, ties, travel history)
 *
 * Each scenario represents a realistic but synthetic profile covering:
 * - 10 destination countries (US, UK, DE, ES, CA, AU, JP, KR, AE)
 * - 2 visa types (tourist, student)
 * - Various risk profiles (low/medium/high)
 *
 * DO NOT use these scenarios in production code or expose them via public APIs.
 */

// Note: Using simplified scenario context focusing on expert fields

/**
 * Simplified scenario context focusing on expert fields
 */
export interface EvalScenarioContext {
  // Basic application info
  countryCode: string;
  visaType: 'tourist' | 'student';

  // Expert fields (core focus)
  financial?: {
    bankBalanceUSD?: number;
    monthlyIncomeUSD?: number;
    requiredFundsUSD?: number;
    availableFundsUSD?: number;
    financialSufficiencyRatio?: number;
    financialSufficiencyLabel?: 'low' | 'borderline' | 'sufficient' | 'strong';
  };

  ties?: {
    hasPropertyInUzbekistan?: boolean;
    propertyValueUSD?: number;
    hasFamilyInUzbekistan?: boolean;
    hasChildren?: boolean;
    isEmployed?: boolean;
    employmentDurationMonths?: number;
    tiesStrengthScore?: number;
    tiesStrengthLabel?: 'weak' | 'medium' | 'strong';
  };

  travelHistory?: {
    hasInternationalTravel?: boolean;
    previousVisaRejections?: number;
    hasOverstayHistory?: boolean;
    travelHistoryScore?: number;
    travelHistoryLabel?: 'none' | 'limited' | 'good' | 'strong';
  };

  uzbekContext?: {
    isUzbekCitizen: boolean;
    residesInUzbekistan: boolean;
  };

  riskScore?: {
    level: 'low' | 'medium' | 'high';
    probabilityPercent: number;
    riskFactors: string[];
    positiveFactors: string[];
  };

  meta?: {
    dataCompletenessScore?: number;
    missingCriticalFields?: string[];
  };
}

/**
 * Evaluation scenario
 */
export interface EvalScenario {
  id: string;
  label: string;
  countryCode: string;
  visaType: 'tourist' | 'student';
  context: EvalScenarioContext;
}

/**
 * Representative scenarios for 10 countries × 2 visa types
 */
export const EVAL_SCENARIOS: EvalScenario[] = [
  // ========================================================================
  // US TOURIST - Low funds, no travel history, weak ties
  // ========================================================================
  {
    id: 'us_tourist_low_funds_no_travel',
    label: 'US Tourist: Low funds, no travel history, weak ties',
    countryCode: 'US',
    visaType: 'tourist',
    context: {
      countryCode: 'US',
      visaType: 'tourist',
      financial: {
        bankBalanceUSD: 3000,
        monthlyIncomeUSD: 400,
        requiredFundsUSD: 5000,
        availableFundsUSD: 4000,
        financialSufficiencyRatio: 0.8,
        financialSufficiencyLabel: 'borderline',
      },
      ties: {
        hasPropertyInUzbekistan: false,
        hasFamilyInUzbekistan: true,
        hasChildren: false,
        isEmployed: true,
        employmentDurationMonths: 12,
        tiesStrengthScore: 0.35,
        tiesStrengthLabel: 'weak',
      },
      travelHistory: {
        hasInternationalTravel: false,
        previousVisaRejections: 0,
        hasOverstayHistory: false,
        travelHistoryScore: 0.1,
        travelHistoryLabel: 'none',
      },
      uzbekContext: {
        isUzbekCitizen: true,
        residesInUzbekistan: true,
      },
      riskScore: {
        level: 'high',
        probabilityPercent: 35,
        riskFactors: ['Low bank balance', 'No travel history', 'Weak ties to home country'],
        positiveFactors: ['Employed'],
      },
      meta: {
        dataCompletenessScore: 0.85,
        missingCriticalFields: [],
      },
    },
  },

  // ========================================================================
  // US TOURIST - Strong profile
  // ========================================================================
  {
    id: 'us_tourist_strong_profile',
    label: 'US Tourist: Strong finances, strong ties, good travel history',
    countryCode: 'US',
    visaType: 'tourist',
    context: {
      countryCode: 'US',
      visaType: 'tourist',
      financial: {
        bankBalanceUSD: 15000,
        monthlyIncomeUSD: 1200,
        requiredFundsUSD: 5000,
        availableFundsUSD: 18000,
        financialSufficiencyRatio: 3.6,
        financialSufficiencyLabel: 'strong',
      },
      ties: {
        hasPropertyInUzbekistan: true,
        propertyValueUSD: 50000,
        hasFamilyInUzbekistan: true,
        hasChildren: true,
        isEmployed: true,
        employmentDurationMonths: 48,
        tiesStrengthScore: 0.85,
        tiesStrengthLabel: 'strong',
      },
      travelHistory: {
        hasInternationalTravel: true,
        previousVisaRejections: 0,
        hasOverstayHistory: false,
        travelHistoryScore: 0.75,
        travelHistoryLabel: 'good',
      },
      uzbekContext: {
        isUzbekCitizen: true,
        residesInUzbekistan: true,
      },
      riskScore: {
        level: 'low',
        probabilityPercent: 85,
        riskFactors: [],
        positiveFactors: [
          'Strong finances',
          'Strong ties',
          'Good travel history',
          'Stable employment',
        ],
      },
      meta: {
        dataCompletenessScore: 0.95,
        missingCriticalFields: [],
      },
    },
  },

  // ========================================================================
  // CANADA STUDENT - Sponsored, strong
  // ========================================================================
  {
    id: 'ca_student_sponsored_strong',
    label: 'Canada Student: Parent sponsor with strong funds, medium ties',
    countryCode: 'CA',
    visaType: 'student',
    context: {
      countryCode: 'CA',
      visaType: 'student',
      financial: {
        bankBalanceUSD: 5000,
        monthlyIncomeUSD: 300,
        requiredFundsUSD: 28000, // Tuition + living for 1 year
        availableFundsUSD: 35000, // Parent sponsor funds
        financialSufficiencyRatio: 1.25,
        financialSufficiencyLabel: 'sufficient',
      },
      ties: {
        hasPropertyInUzbekistan: true,
        propertyValueUSD: 30000,
        hasFamilyInUzbekistan: true,
        hasChildren: false,
        isEmployed: false, // Student
        employmentDurationMonths: 0,
        tiesStrengthScore: 0.55,
        tiesStrengthLabel: 'medium',
      },
      travelHistory: {
        hasInternationalTravel: false,
        previousVisaRejections: 0,
        hasOverstayHistory: false,
        travelHistoryScore: 0.2,
        travelHistoryLabel: 'none',
      },
      uzbekContext: {
        isUzbekCitizen: true,
        residesInUzbekistan: true,
      },
      riskScore: {
        level: 'medium',
        probabilityPercent: 65,
        riskFactors: ['No travel history'],
        positiveFactors: ['Strong sponsor funds', 'Property ownership', 'Clear study purpose'],
      },
      meta: {
        dataCompletenessScore: 0.9,
        missingCriticalFields: [],
      },
    },
  },

  // ========================================================================
  // GERMANY TOURIST (Schengen) - Low ties
  // ========================================================================
  {
    id: 'de_tourist_schengen_low_ties',
    label: 'Germany Tourist (Schengen): OK funds, weak ties, no travel history',
    countryCode: 'DE',
    visaType: 'tourist',
    context: {
      countryCode: 'DE',
      visaType: 'tourist',
      financial: {
        bankBalanceUSD: 6000,
        monthlyIncomeUSD: 600,
        requiredFundsUSD: 4000,
        availableFundsUSD: 7500,
        financialSufficiencyRatio: 1.875,
        financialSufficiencyLabel: 'sufficient',
      },
      ties: {
        hasPropertyInUzbekistan: false,
        hasFamilyInUzbekistan: false,
        hasChildren: false,
        isEmployed: true,
        employmentDurationMonths: 6,
        tiesStrengthScore: 0.25,
        tiesStrengthLabel: 'weak',
      },
      travelHistory: {
        hasInternationalTravel: false,
        previousVisaRejections: 0,
        hasOverstayHistory: false,
        travelHistoryScore: 0.1,
        travelHistoryLabel: 'none',
      },
      uzbekContext: {
        isUzbekCitizen: true,
        residesInUzbekistan: true,
      },
      riskScore: {
        level: 'medium',
        probabilityPercent: 50,
        riskFactors: [
          'Weak ties to home country',
          'No travel history',
          'Short employment duration',
        ],
        positiveFactors: ['Adequate funds', 'Employed'],
      },
      meta: {
        dataCompletenessScore: 0.8,
        missingCriticalFields: ['propertyValueUSD'],
      },
    },
  },

  // ========================================================================
  // KOREA STUDENT - Medium risk
  // ========================================================================
  {
    id: 'kr_student_medium_risk',
    label: 'Korea Student: Medium finances, decent ties, no travel but strong study plan',
    countryCode: 'KR',
    visaType: 'student',
    context: {
      countryCode: 'KR',
      visaType: 'student',
      financial: {
        bankBalanceUSD: 8000,
        monthlyIncomeUSD: 500,
        requiredFundsUSD: 14000, // Tuition + living
        availableFundsUSD: 11000,
        financialSufficiencyRatio: 0.79,
        financialSufficiencyLabel: 'borderline',
      },
      ties: {
        hasPropertyInUzbekistan: true,
        propertyValueUSD: 25000,
        hasFamilyInUzbekistan: true,
        hasChildren: false,
        isEmployed: false, // Student
        employmentDurationMonths: 0,
        tiesStrengthScore: 0.5,
        tiesStrengthLabel: 'medium',
      },
      travelHistory: {
        hasInternationalTravel: false,
        previousVisaRejections: 0,
        hasOverstayHistory: false,
        travelHistoryScore: 0.2,
        travelHistoryLabel: 'none',
      },
      uzbekContext: {
        isUzbekCitizen: true,
        residesInUzbekistan: true,
      },
      riskScore: {
        level: 'medium',
        probabilityPercent: 55,
        riskFactors: ['Borderline finances', 'No travel history'],
        positiveFactors: ['Property ownership', 'Clear study purpose', 'Family ties'],
      },
      meta: {
        dataCompletenessScore: 0.85,
        missingCriticalFields: [],
      },
    },
  },

  // ========================================================================
  // UAE TOURIST - High risk
  // ========================================================================
  {
    id: 'ae_tourist_high_risk',
    label: 'UAE Tourist: Low funds, no ties, no travel, high risk',
    countryCode: 'AE',
    visaType: 'tourist',
    context: {
      countryCode: 'AE',
      visaType: 'tourist',
      financial: {
        bankBalanceUSD: 2000,
        monthlyIncomeUSD: 300,
        requiredFundsUSD: 3000,
        availableFundsUSD: 2750,
        financialSufficiencyRatio: 0.92,
        financialSufficiencyLabel: 'borderline',
      },
      ties: {
        hasPropertyInUzbekistan: false,
        hasFamilyInUzbekistan: false,
        hasChildren: false,
        isEmployed: false,
        employmentDurationMonths: 0,
        tiesStrengthScore: 0.1,
        tiesStrengthLabel: 'weak',
      },
      travelHistory: {
        hasInternationalTravel: false,
        previousVisaRejections: 1, // Previous refusal
        hasOverstayHistory: false,
        travelHistoryScore: 0.05,
        travelHistoryLabel: 'none',
      },
      uzbekContext: {
        isUzbekCitizen: true,
        residesInUzbekistan: true,
      },
      riskScore: {
        level: 'high',
        probabilityPercent: 25,
        riskFactors: [
          'Low bank balance',
          'No ties to home country',
          'No travel history',
          'Previous visa refusal',
          'Unemployed',
        ],
        positiveFactors: [],
      },
      meta: {
        dataCompletenessScore: 0.75,
        missingCriticalFields: ['propertyValueUSD', 'employmentDurationMonths'],
      },
    },
  },

  // ========================================================================
  // UK STUDENT - Strong profile
  // ========================================================================
  {
    id: 'gb_student_strong_profile',
    label: 'UK Student: Strong finances, strong ties, good travel history',
    countryCode: 'GB',
    visaType: 'student',
    context: {
      countryCode: 'GB',
      visaType: 'student',
      financial: {
        bankBalanceUSD: 25000,
        monthlyIncomeUSD: 0, // Student, no income
        requiredFundsUSD: 27000, // Tuition + living
        availableFundsUSD: 30000, // Parent sponsor
        financialSufficiencyRatio: 1.11,
        financialSufficiencyLabel: 'sufficient',
      },
      ties: {
        hasPropertyInUzbekistan: true,
        propertyValueUSD: 60000,
        hasFamilyInUzbekistan: true,
        hasChildren: false,
        isEmployed: false,
        employmentDurationMonths: 0,
        tiesStrengthScore: 0.7,
        tiesStrengthLabel: 'strong',
      },
      travelHistory: {
        hasInternationalTravel: true,
        previousVisaRejections: 0,
        hasOverstayHistory: false,
        travelHistoryScore: 0.65,
        travelHistoryLabel: 'good',
      },
      uzbekContext: {
        isUzbekCitizen: true,
        residesInUzbekistan: true,
      },
      riskScore: {
        level: 'low',
        probabilityPercent: 80,
        riskFactors: [],
        positiveFactors: [
          'Strong finances',
          'Strong ties',
          'Good travel history',
          'Clear study purpose',
        ],
      },
      meta: {
        dataCompletenessScore: 0.95,
        missingCriticalFields: [],
      },
    },
  },

  // ========================================================================
  // AUSTRALIA TOURIST - Medium risk
  // ========================================================================
  {
    id: 'au_tourist_medium_risk',
    label: 'Australia Tourist: Medium finances, medium ties, limited travel',
    countryCode: 'AU',
    visaType: 'tourist',
    context: {
      countryCode: 'AU',
      visaType: 'tourist',
      financial: {
        bankBalanceUSD: 7000,
        monthlyIncomeUSD: 700,
        requiredFundsUSD: 5000,
        availableFundsUSD: 8750,
        financialSufficiencyRatio: 1.75,
        financialSufficiencyLabel: 'sufficient',
      },
      ties: {
        hasPropertyInUzbekistan: true,
        propertyValueUSD: 20000,
        hasFamilyInUzbekistan: true,
        hasChildren: false,
        isEmployed: true,
        employmentDurationMonths: 24,
        tiesStrengthScore: 0.6,
        tiesStrengthLabel: 'medium',
      },
      travelHistory: {
        hasInternationalTravel: true,
        previousVisaRejections: 0,
        hasOverstayHistory: false,
        travelHistoryScore: 0.4,
        travelHistoryLabel: 'limited',
      },
      uzbekContext: {
        isUzbekCitizen: true,
        residesInUzbekistan: true,
      },
      riskScore: {
        level: 'medium',
        probabilityPercent: 60,
        riskFactors: ['Limited travel history'],
        positiveFactors: [
          'Adequate funds',
          'Property ownership',
          'Stable employment',
          'Family ties',
        ],
      },
      meta: {
        dataCompletenessScore: 0.9,
        missingCriticalFields: [],
      },
    },
  },
];
