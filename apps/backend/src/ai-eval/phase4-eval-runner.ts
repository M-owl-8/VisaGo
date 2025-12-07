/**
 * Phase 4 Evaluation Runner
 *
 * ⚠️ DEV-ONLY: This is a development evaluation harness to test AI behavior.
 *
 * This runner:
 * - Converts EvalApplicantProfile to questionnaire/AI context
 * - Tests checklist generation with invariant checks
 * - Tests risk explanations for consistency
 * - Tests document explanations (optional)
 *
 * This code is NOT used in production and does NOT modify any production behavior.
 */

import {
  PHASE4_EVAL_SCENARIOS,
  EvalApplicantProfile,
  EvalVisaPurpose,
} from './phase4-eval-scenarios';
import {
  VisaChecklistEngineService,
  ChecklistResponse,
} from '../services/visa-checklist-engine.service';
import {
  VisaRiskExplanationService,
  RiskExplanationResponse,
} from '../services/visa-risk-explanation.service';
import { VisaChecklistExplanationService } from '../services/visa-checklist-explanation.service';
import { buildCanonicalAIUserContext } from '../services/ai-context.service';
import { AIUserContext } from '../types/ai-context';
import { logInfo, logWarn, logError } from '../middleware/logger';

/**
 * Evaluation result for checklist generation
 */
export interface EvalChecklistResult {
  scenarioId: string;
  countryCode: string;
  visaCategory: EvalVisaPurpose;
  riskLevel: 'low' | 'medium' | 'high';
  riskDrivers: string[];
  checklistLength: number;
  hasFinancialDocs: boolean;
  hasTiesDocs: boolean;
  hasTravelDocs: boolean;
  violatesFinancialRiskInvariant: boolean;
  violatesTiesRiskInvariant: boolean;
  violatesTravelRiskInvariant: boolean;
  violatesChecklistSizeForHighRisk: boolean;
  error?: string;
}

/**
 * Evaluation result for risk explanation
 */
export interface EvalRiskResult {
  scenarioId: string;
  countryCode: string;
  visaCategory: EvalVisaPurpose;
  riskLevelFromEngine: 'low' | 'medium' | 'high';
  riskLevelFromExplanation: 'low' | 'medium' | 'high' | null;
  isRiskLevelConsistent: boolean;
  hasCountryMismatch: boolean;
  error?: string;
}

/**
 * Aggregate evaluation result
 */
export interface EvalAggregateResult {
  scenarioId: string;
  countryCode: string;
  visaCategory: EvalVisaPurpose;
  checklistResult: EvalChecklistResult;
  riskResult: EvalRiskResult;
  documentExplanationResults?: Array<{
    documentType: string;
    hasRiskDriverMention: boolean;
    error?: string;
  }>;
}

/**
 * Financial document types (by country/visa type)
 */
const FINANCIAL_DOCUMENT_TYPES = [
  'bank_statement',
  'bank_statements_applicant',
  'sponsor_bank_statements',
  'financial_guarantee',
  'proof_of_funds',
  'sponsor_financial_documents',
  'income_certificate',
  'salary_certificate',
];

/**
 * Ties document types
 */
const TIES_DOCUMENT_TYPES = [
  'property_document',
  'property_documents',
  'property_ownership',
  'kadastr_document',
  'employment_letter',
  'employment_contract',
  'family_ties_documents',
  'marriage_certificate',
  'birth_certificate',
];

/**
 * Travel document types
 */
const TRAVEL_DOCUMENT_TYPES = [
  'travel_itinerary',
  'accommodation_proof',
  'flight_reservation',
  'return_ticket',
  'previous_visas',
];

/**
 * Minimum items for high-risk profiles
 */
const MIN_ITEMS_HARD = 10;

/**
 * Convert EvalApplicantProfile to AIUserContext
 */
function buildAIUserContextFromProfile(profile: EvalApplicantProfile): AIUserContext {
  // Map visaCategory to visaType
  const visaType = profile.visaCategory === 'student' ? 'student' : 'tourist';

  // Map employmentStatus to currentStatus
  let currentStatus:
    | 'student'
    | 'employed'
    | 'self_employed'
    | 'unemployed'
    | 'retired'
    | 'unknown' = 'unknown';
  if (profile.employmentStatus === 'student') {
    currentStatus = 'student';
  } else if (profile.employmentStatus === 'employed') {
    currentStatus = 'employed';
  } else if (profile.employmentStatus === 'self_employed') {
    currentStatus = 'self_employed';
  } else if (profile.employmentStatus === 'unemployed') {
    currentStatus = 'unemployed';
  }

  // Map travelHistory
  const hasInternationalTravel = profile.travelHistory !== 'none';
  const previousVisaRejections = profile.riskPreset === 'high' ? 0 : 0; // Can be adjusted

  // Map durationCategory to duration
  let duration:
    | 'less_than_1_month'
    | '1_3_months'
    | '3_6_months'
    | '6_12_months'
    | 'more_than_1_year' = '1_3_months';
  if (profile.durationCategory === 'short') {
    duration = 'less_than_1_month';
  } else if (profile.durationCategory === 'medium') {
    duration = '1_3_months';
  } else if (profile.durationCategory === 'long') {
    duration = 'more_than_1_year';
  }

  // Map payer to sponsorType
  let sponsorType: 'self' | 'parent' | 'relative' | 'company' | 'other' = 'self';
  if (profile.payer === 'parents') {
    sponsorType = 'parent';
  } else if (profile.payer === 'sponsor') {
    sponsorType = 'relative';
  }

  // Build questionnaire summary
  const questionnaireSummary = {
    version: '2.0',
    visaType,
    targetCountry: profile.countryCode,
    appLanguage: 'en' as const,
    age: profile.isMinor ? 17 : 25,
    citizenship: 'UZ',
    currentCountry: 'UZ',
    maritalStatus: 'single' as const,
    hasChildren: profile.hasCloseFamilyInUzbekistan ? ('no' as const) : ('no' as const),
    duration,
    monthlyIncomeUSD: profile.approxFundsUSD / 12, // Rough estimate
    bankBalanceUSD: profile.approxFundsUSD,
    sponsorType,
    hasPropertyInUzbekistan: profile.hasProperty,
    hasFamilyInUzbekistan: profile.hasCloseFamilyInUzbekistan,
    hasInternationalTravel,
    previousVisaRejections: previousVisaRejections > 0,
    documents: {
      hasPassport: true,
      hasBankStatement: true,
      hasEmploymentOrStudyProof: profile.employmentStatus !== 'unemployed',
      hasInsurance: true,
      hasFlightBooking: false,
      hasHotelBookingOrAccommodation: false,
    },
    employment: {
      currentStatus,
      isEmployed:
        profile.employmentStatus === 'employed' || profile.employmentStatus === 'self_employed',
    },
    education: {
      isStudent: profile.employmentStatus === 'student',
      hasUniversityInvitation: profile.hasUniversityAdmission || false,
    },
    travelInfo: {
      traveledBefore: hasInternationalTravel,
    },
  };

  return {
    userProfile: {
      userId: `eval_${profile.id}`,
      appLanguage: 'en',
      citizenship: 'UZ',
      age: profile.isMinor ? 17 : 25,
    },
    application: {
      applicationId: `eval_app_${profile.id}`,
      visaType,
      country: profile.countryCode,
      status: 'draft',
    },
    questionnaireSummary: questionnaireSummary as any,
    uploadedDocuments: [],
    appActions: [],
  };
}

/**
 * Check if checklist has financial documents
 */
function hasFinancialDocs(checklist: ChecklistResponse): boolean {
  return (
    checklist.checklist?.some((item) =>
      FINANCIAL_DOCUMENT_TYPES.some((type) => item.documentType?.includes(type))
    ) || false
  );
}

/**
 * Check if checklist has ties documents
 */
function hasTiesDocs(checklist: ChecklistResponse): boolean {
  return (
    checklist.checklist?.some((item) =>
      TIES_DOCUMENT_TYPES.some((type) => item.documentType?.includes(type))
    ) || false
  );
}

/**
 * Check if checklist has travel documents
 */
function hasTravelDocs(checklist: ChecklistResponse): boolean {
  return (
    checklist.checklist?.some((item) =>
      TRAVEL_DOCUMENT_TYPES.some((type) => item.documentType?.includes(type))
    ) || false
  );
}

/**
 * Run checklist evaluation for a scenario
 */
export async function runChecklistEvalForScenario(
  profile: EvalApplicantProfile
): Promise<EvalChecklistResult> {
  try {
    // Build AI context
    const aiUserContext = buildAIUserContextFromProfile(profile);
    const canonicalContext = await buildCanonicalAIUserContext(aiUserContext);

    // Get risk drivers and level
    const riskDrivers = (canonicalContext.riskDrivers || []) as string[];
    const riskLevel = canonicalContext.riskScore?.level || 'medium';

    // Generate checklist (need to pass AIUserContext, not CanonicalAIUserContext)
    const checklist = await VisaChecklistEngineService.generateChecklist(
      profile.countryCode,
      profile.visaCategory,
      aiUserContext
    );

    if (!checklist || !checklist.checklist) {
      return {
        scenarioId: profile.id,
        countryCode: profile.countryCode,
        visaCategory: profile.visaCategory,
        riskLevel,
        riskDrivers,
        checklistLength: 0,
        hasFinancialDocs: false,
        hasTiesDocs: false,
        hasTravelDocs: false,
        violatesFinancialRiskInvariant: true,
        violatesTiesRiskInvariant: true,
        violatesTravelRiskInvariant: true,
        violatesChecklistSizeForHighRisk: true,
        error: 'Checklist generation returned null or empty',
      };
    }

    const checklistLength = checklist.checklist.length;
    const hasFinancial = hasFinancialDocs(checklist);
    const hasTies = hasTiesDocs(checklist);
    const hasTravel = hasTravelDocs(checklist);

    // Check invariants
    const hasLowFundsRisk =
      riskDrivers.includes('low_funds') || riskDrivers.includes('borderline_funds');
    const hasWeakTiesRisk =
      riskDrivers.includes('weak_ties') ||
      riskDrivers.includes('no_property') ||
      riskDrivers.includes('no_employment');
    const hasLimitedTravelRisk = riskDrivers.includes('limited_travel_history');

    const violatesFinancialRiskInvariant = hasLowFundsRisk && !hasFinancial;
    const violatesTiesRiskInvariant = hasWeakTiesRisk && !hasTies;
    const violatesTravelRiskInvariant = hasLimitedTravelRisk && !hasTravel;
    const violatesChecklistSizeForHighRisk =
      riskLevel === 'high' && checklistLength < MIN_ITEMS_HARD;

    return {
      scenarioId: profile.id,
      countryCode: profile.countryCode,
      visaCategory: profile.visaCategory,
      riskLevel,
      riskDrivers,
      checklistLength,
      hasFinancialDocs: hasFinancial,
      hasTiesDocs: hasTies,
      hasTravelDocs: hasTravel,
      violatesFinancialRiskInvariant,
      violatesTiesRiskInvariant,
      violatesTravelRiskInvariant,
      violatesChecklistSizeForHighRisk,
    };
  } catch (error) {
    logError('[Phase4Eval] Checklist evaluation failed', error as Error, {
      scenarioId: profile.id,
      countryCode: profile.countryCode,
    });
    return {
      scenarioId: profile.id,
      countryCode: profile.countryCode,
      visaCategory: profile.visaCategory,
      riskLevel: 'medium',
      riskDrivers: [],
      checklistLength: 0,
      hasFinancialDocs: false,
      hasTiesDocs: false,
      hasTravelDocs: false,
      violatesFinancialRiskInvariant: true,
      violatesTiesRiskInvariant: true,
      violatesTravelRiskInvariant: true,
      violatesChecklistSizeForHighRisk: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run risk explanation evaluation for a scenario
 */
export async function runRiskExplanationEvalForScenario(
  profile: EvalApplicantProfile
): Promise<EvalRiskResult> {
  try {
    // Build AI context
    const aiUserContext = buildAIUserContextFromProfile(profile);
    const canonicalContext = await buildCanonicalAIUserContext(aiUserContext);

    // Get risk level from engine
    const riskLevelFromEngine = canonicalContext.riskScore?.level || 'medium';

    // Generate risk explanation
    // Note: This requires a real application in the database
    // For evaluation, we'll skip this or mark it as optional
    // In a real scenario, we'd need to create a mock application in the DB
    let riskExplanation: RiskExplanationResponse | null = null;
    try {
      const mockApplicationId = `eval_app_${profile.id}`;
      riskExplanation = await VisaRiskExplanationService.generateRiskExplanation(
        mockApplicationId,
        `eval_user_${profile.id}`
      );
    } catch (error) {
      // Risk explanation requires a real application - skip for now
      logWarn('[Phase4Eval] Risk explanation skipped (requires real application)', {
        scenarioId: profile.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (!riskExplanation) {
      return {
        scenarioId: profile.id,
        countryCode: profile.countryCode,
        visaCategory: profile.visaCategory,
        riskLevelFromEngine,
        riskLevelFromExplanation: null,
        isRiskLevelConsistent: false,
        hasCountryMismatch: false,
        error: 'Risk explanation skipped (requires real application in database)',
      };
    }

    // Parse risk level from explanation (try to extract from summary)
    let riskLevelFromExplanation: 'low' | 'medium' | 'high' | null = null;
    const summaryEn = riskExplanation.summaryEn?.toLowerCase() || '';
    if (summaryEn.includes('high risk') || summaryEn.includes('high-risk')) {
      riskLevelFromExplanation = 'high';
    } else if (summaryEn.includes('low risk') || summaryEn.includes('low-risk')) {
      riskLevelFromExplanation = 'low';
    } else if (summaryEn.includes('medium risk') || summaryEn.includes('medium-risk')) {
      riskLevelFromExplanation = 'medium';
    }

    // Check for country mismatch
    const countryName = getCountryName(profile.countryCode);
    const hasCountryMismatch = checkCountryMismatch(
      riskExplanation,
      profile.countryCode,
      countryName
    );

    const isRiskLevelConsistent = riskLevelFromExplanation === riskLevelFromEngine;

    return {
      scenarioId: profile.id,
      countryCode: profile.countryCode,
      visaCategory: profile.visaCategory,
      riskLevelFromEngine,
      riskLevelFromExplanation,
      isRiskLevelConsistent,
      hasCountryMismatch,
    };
  } catch (error) {
    logError('[Phase4Eval] Risk explanation evaluation failed', error as Error, {
      scenarioId: profile.id,
      countryCode: profile.countryCode,
    });
    return {
      scenarioId: profile.id,
      countryCode: profile.countryCode,
      visaCategory: profile.visaCategory,
      riskLevelFromEngine: 'medium',
      riskLevelFromExplanation: null,
      isRiskLevelConsistent: false,
      hasCountryMismatch: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get country name from code
 */
function getCountryName(countryCode: string): string {
  const countryNames: Record<string, string> = {
    US: 'United States',
    GB: 'United Kingdom',
    UK: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    DE: 'Germany',
    ES: 'Spain',
    FR: 'France',
    JP: 'Japan',
    KR: 'South Korea',
    AE: 'United Arab Emirates',
  };
  return countryNames[countryCode] || countryCode;
}

/**
 * Check for country name mismatches in risk explanation
 */
function checkCountryMismatch(
  explanation: RiskExplanationResponse,
  correctCountryCode: string,
  correctCountryName: string
): boolean {
  const incorrectCountries = [
    'US',
    'UK',
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'Spain',
    'France',
    'Japan',
    'South Korea',
    'UAE',
  ];
  const correctNames = [correctCountryName, correctCountryCode];

  const text =
    `${explanation.summaryEn || ''} ${explanation.summaryUz || ''} ${explanation.summaryRu || ''}`.toLowerCase();

  for (const incorrectCountry of incorrectCountries) {
    if (
      correctNames.every(
        (name) =>
          !incorrectCountry.toLowerCase().includes(name.toLowerCase()) &&
          !name.toLowerCase().includes(incorrectCountry.toLowerCase())
      )
    ) {
      if (text.includes(incorrectCountry.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Run full evaluation for a scenario
 */
export async function runFullEvalForScenario(
  profile: EvalApplicantProfile
): Promise<EvalAggregateResult> {
  logInfo('[Phase4Eval] Running full evaluation', {
    scenarioId: profile.id,
    countryCode: profile.countryCode,
    visaCategory: profile.visaCategory,
  });

  const checklistResult = await runChecklistEvalForScenario(profile);
  const riskResult = await runRiskExplanationEvalForScenario(profile);

  // Optional: Test document explanations for 1-2 key documents
  const documentExplanationResults: Array<{
    documentType: string;
    hasRiskDriverMention: boolean;
    error?: string;
  }> = [];

  if (checklistResult.checklistLength > 0) {
    // Try to get explanation for first financial doc if exists
    // This is optional and may fail if we don't have a real application
    // For now, we'll skip it or implement a simplified version
  }

  return {
    scenarioId: profile.id,
    countryCode: profile.countryCode,
    visaCategory: profile.visaCategory,
    checklistResult,
    riskResult,
    documentExplanationResults,
  };
}
