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
} from '../types/ai-context';
import type { ApplicantProfile as VisaBrainApplicantProfile } from '../types/visa-brain';

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
 * Calculate visa probability based on questionnaire summary
 * Rule-based calculator tuned for common Uzbek cases
 *
 * @param summary - VisaQuestionnaireSummary
 * @returns VisaProbabilityResult with score, level, and factors
 */
export function calculateVisaProbability(summary: VisaQuestionnaireSummary): VisaProbabilityResult {
  let score = 70; // Start with a baseline score
  const riskFactors: string[] = [];
  const positiveFactors: string[] = [];

  // Money - Bank Balance
  if (summary.bankBalanceUSD !== undefined) {
    if (summary.visaType === 'tourist' && summary.bankBalanceUSD < 2000) {
      score -= 10;
      riskFactors.push('Bank balance is relatively low for a tourist trip.');
    }
    if (summary.visaType === 'student' && summary.bankBalanceUSD < 10000) {
      score -= 15;
      riskFactors.push('Savings may be low compared to common student visa expectations.');
    }
  }

  // Rejections / overstays
  if (summary.previousVisaRejections) {
    score -= 15;
    riskFactors.push('Previous visa rejection increases the level of scrutiny.');
  }
  if (summary.previousOverstay) {
    score -= 25;
    riskFactors.push('Previous overstay strongly reduces chances of approval.');
  }

  // Ties to Uzbekistan
  if (summary.hasPropertyInUzbekistan) {
    score += 5;
    positiveFactors.push('Property in Uzbekistan strengthens your ties to home country.');
  }
  if (summary.hasFamilyInUzbekistan) {
    score += 5;
    positiveFactors.push('Close family in Uzbekistan is a strong tie to home country.');
  }

  // Clamp score to valid range
  if (score < 10) score = 10;
  if (score > 90) score = 90;

  // Determine level
  let level: 'low' | 'medium' | 'high';
  if (score < 40) {
    level = 'low';
  } else if (score < 70) {
    level = 'medium';
  } else {
    level = 'high';
  }

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
    const countryCode = application.country.code;

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
    let visaType: 'student' | 'tourist' = 'tourist';
    if (questionnaireSummary) {
      visaType = questionnaireSummary.visaType;
    } else {
      // Fallback: infer from visa type name
      const visaTypeName = application.visaType.name.toLowerCase();
      if (visaTypeName.includes('student') || visaTypeName.includes('study')) {
        visaType = 'student';
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

    // Get country code (prefer from summary, fallback to application)
    let countryCode = application.country.code;
    if (questionnaireSummary && questionnaireSummary.targetCountry) {
      countryCode = questionnaireSummary.targetCountry;
    }

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
      const probability = calculateVisaProbability(questionnaireSummary);
      context.riskScore = {
        probabilityPercent: probability.score,
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
 *
 * @param currentContext - AIUserContext from buildAIUserContext()
 * @returns CanonicalAIUserContext with all fields filled
 */
export function buildCanonicalAIUserContext(currentContext: AIUserContext): CanonicalAIUserContext {
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
  let sponsorType: 'self' | 'parent' | 'relative' | 'company' | 'other' = 'self';
  if (summary?.sponsorType) {
    sponsorType = summary.sponsorType;
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
  let currentStatus:
    | 'student'
    | 'employed'
    | 'self_employed'
    | 'unemployed'
    | 'retired'
    | 'unknown' = 'unknown';
  if (summary?.employment?.currentStatus) {
    currentStatus =
      summary.employment.currentStatus === 'retired' ? 'retired' : summary.employment.currentStatus;
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
  const maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'unknown' =
    summary?.maritalStatus ?? 'unknown';

  // Extract hasChildren (default: false)
  const hasChildren = (summary?.hasChildren && summary.hasChildren !== 'no') ?? false;

  // Extract invitations
  const hasUniversityInvitation = summary?.hasUniversityInvitation ?? false;
  const hasOtherInvitation = summary?.hasOtherInvitation ?? false;

  // Always calculate risk score (even if questionnaire is missing)
  let riskScore: CanonicalAIUserContext['riskScore'];
  if (summary) {
    const probability = calculateVisaProbability(summary);
    riskScore = {
      probabilityPercent: probability.score,
      level: probability.level,
      riskFactors: probability.riskFactors,
      positiveFactors: probability.positiveFactors,
    };
  } else {
    // Default risk score for missing questionnaire
    riskScore = {
      probabilityPercent: 70,
      level: 'medium',
      riskFactors: ['Questionnaire data incomplete - using default risk assessment'],
      positiveFactors: [],
    };
    warnings.push('Questionnaire missing - using default risk score');
  }

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
    },
    riskScore,
    uploadedDocuments: currentContext.uploadedDocuments,
    appActions: currentContext.appActions,
    metadata: {
      sourceFormat,
      extractionWarnings: warnings.length > 0 ? warnings : undefined,
      fallbackFieldsUsed: fallbacks.length > 0 ? fallbacks : undefined,
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
  const countryCode = application.country.code.toUpperCase();
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
  if (countryCode === 'GB' || countryCode === 'UK') {
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
