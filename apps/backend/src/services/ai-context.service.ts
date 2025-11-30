/**
 * AI Context Service
 * Builds structured AIUserContext for AI service consumption
 */

import { PrismaClient } from '@prisma/client';
import { errors } from '../utils/errors';
import { logError, logInfo } from '../middleware/logger';
import {
  AIUserContext,
  VisaQuestionnaireSummary,
  VisaProbabilityResult,
} from '../types/ai-context';
import type { ApplicantProfile } from '../types/visa-brain';

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
 * Extract VisaQuestionnaireSummary from user bio
 * Handles both legacy and new formats (including QuestionnaireV2)
 */
function extractQuestionnaireSummary(
  bio: string | null | undefined
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
        // Extract appLanguage from user or default to 'en'
        const appLanguage = parsed.appLanguage || 'en';
        return buildSummaryFromQuestionnaireV2(parsed, appLanguage as 'uz' | 'ru' | 'en');
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

    // Legacy format: try to convert (basic conversion)
    // For full conversion, we'd need the frontend mapper logic
    // For now, return null and let AI service handle legacy format
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

    // Extract questionnaire summary from user bio
    const questionnaireSummary = extractQuestionnaireSummary(application.user.bio);

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

    // Get app language from user or summary
    let appLanguage: 'uz' | 'ru' | 'en' = (application.user.language as 'uz' | 'ru' | 'en') || 'en';
    if (questionnaireSummary && questionnaireSummary.appLanguage) {
      appLanguage = questionnaireSummary.appLanguage;
    }

    // Build user profile
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
      select: { bio: true },
    });

    if (!user || !user.bio) {
      return null;
    }

    return extractQuestionnaireSummary(user.bio);
  } catch (error) {
    logError('Failed to get questionnaire summary', error as Error, { userId });
    return null;
  }
}

/**
 * Map duration category from VisaQuestionnaireSummary to ApplicantProfile format
 */
function mapDurationCategory(
  duration?: string
): '<90_days' | '90_to_180_days' | '>180_days' | 'more_than_1_year' | undefined {
  if (!duration) return undefined;

  // Map from questionnaire format to profile format
  const mapping: Record<string, '<90_days' | '90_to_180_days' | '>180_days' | 'more_than_1_year'> = {
    'less_than_1_month': '<90_days',
    '1_3_months': '90_to_180_days',
    '3_6_months': '90_to_180_days',
    '6_12_months': '>180_days',
    'more_than_1_year': 'more_than_1_year',
    'less_than_15_days': '<90_days',
    '15_30_days': '<90_days',
    'more_than_6_months': 'more_than_1_year',
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

export function buildApplicantProfile(
  ctx: AIUserContext,
  countryName: string,
  visaTypeLabel: string
): ApplicantProfile {
  const { userProfile, application, questionnaireSummary } = ctx;

  // Extract nationality/citizenship (default to UZ for Uzbekistan-based applicants)
  const nationality = questionnaireSummary?.citizenship || userProfile.citizenship || 'UZ';
  const residenceCountry = questionnaireSummary?.personalInfo?.currentResidenceCountry || 'Uzbekistan';

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
    questionnaireSummary?.sponsorType || questionnaireSummary?.financialInfo?.sponsorDetails?.relationship
  );
  const sponsorDescription = sponsorType === 'other' 
    ? questionnaireSummary?.financialInfo?.sponsorDetails?.relationship 
    : undefined;

  // Extract financial information
  const bankBalanceUSD = questionnaireSummary?.bankBalanceUSD || questionnaireSummary?.financialInfo?.selfFundsUSD;
  const monthlyIncomeUSD = questionnaireSummary?.monthlyIncomeUSD || questionnaireSummary?.employment?.monthlySalaryUSD;

  // Extract travel history
  const hasTravelHistory =
    questionnaireSummary?.hasInternationalTravel ??
    questionnaireSummary?.travelHistory?.traveledBefore ??
    (questionnaireSummary?.travelHistory?.visitedCountries?.length ?? 0) > 0;

  // Extract property and family ties
  const hasPropertyInHomeCountry =
    questionnaireSummary?.hasPropertyInUzbekistan ?? questionnaireSummary?.ties?.propertyDocs ?? false;
  const hasFamilyInHomeCountry =
    questionnaireSummary?.hasFamilyInUzbekistan ?? questionnaireSummary?.ties?.familyTies ?? false;

  // Normalize destination country code for template lookup
  const normalizedCountryCode = normalizeCountryCodeFromName(countryName) || application.country || nationality;

  // Build the profile
  const profile: ApplicantProfile = {
    userId: userProfile.userId,
    nationality,
    residenceCountry,
    destinationCountryCode: normalizedCountryCode,
    destinationCountryName: countryName,
    visaTypeCode: application.visaType,
    visaTypeLabel,
    tripPurpose,
    durationCategory: mapDurationCategory(questionnaireSummary?.duration || questionnaireSummary?.travelInfo?.duration),
    plannedTravelDates,
    sponsorType,
    sponsorDescription,
    hasTravelHistory,
    previousVisaRefusals: questionnaireSummary?.previousVisaRejections ?? questionnaireSummary?.travelHistory?.hasRefusals ?? false,
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
