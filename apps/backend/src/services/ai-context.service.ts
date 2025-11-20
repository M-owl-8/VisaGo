/**
 * AI Context Service
 * Builds structured AIUserContext for AI service consumption
 */

import { PrismaClient } from "@prisma/client";
import { errors } from "../utils/errors";
import { logError, logInfo } from "../middleware/logger";
import { AIUserContext, VisaQuestionnaireSummary, VisaProbabilityResult } from "../types/ai-context";

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
    if (summary.visaType === "tourist" && summary.bankBalanceUSD < 2000) {
      score -= 10;
      riskFactors.push("Bank balance is relatively low for a tourist trip.");
    }
    if (summary.visaType === "student" && summary.bankBalanceUSD < 10000) {
      score -= 15;
      riskFactors.push("Savings may be low compared to common student visa expectations.");
    }
  }

  // Rejections / overstays
  if (summary.previousVisaRejections) {
    score -= 15;
    riskFactors.push("Previous visa rejection increases the level of scrutiny.");
  }
  if (summary.previousOverstay) {
    score -= 25;
    riskFactors.push("Previous overstay strongly reduces chances of approval.");
  }

  // Ties to Uzbekistan
  if (summary.hasPropertyInUzbekistan) {
    score += 5;
    positiveFactors.push("Property in Uzbekistan strengthens your ties to home country.");
  }
  if (summary.hasFamilyInUzbekistan) {
    score += 5;
    positiveFactors.push("Close family in Uzbekistan is a strong tie to home country.");
  }

  // Clamp score to valid range
  if (score < 10) score = 10;
  if (score > 90) score = 90;

  // Determine level
  let level: "low" | "medium" | "high";
  if (score < 40) {
    level = "low";
  } else if (score < 70) {
    level = "medium";
  } else {
    level = "high";
  }

  return { score, level, riskFactors, positiveFactors };
}

/**
 * Extract VisaQuestionnaireSummary from user bio
 * Handles both legacy and new formats
 */
function extractQuestionnaireSummary(
  bio: string | null | undefined
): VisaQuestionnaireSummary | null {
  if (!bio) return null;

  try {
    const parsed = JSON.parse(bio);

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
    logError("Failed to extract questionnaire summary from bio", error as Error);
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
      throw errors.notFound("Application");
    }

    // Verify ownership
    if (application.userId !== userId) {
      throw errors.forbidden();
    }

    // Extract questionnaire summary from user bio
    const questionnaireSummary = extractQuestionnaireSummary(application.user.bio);

    // Determine visa type from application or summary
    let visaType: "student" | "tourist" = "tourist";
    if (questionnaireSummary) {
      visaType = questionnaireSummary.visaType;
    } else {
      // Fallback: infer from visa type name
      const visaTypeName = application.visaType.name.toLowerCase();
      if (visaTypeName.includes("student") || visaTypeName.includes("study")) {
        visaType = "student";
      }
    }

    // Map application status
    const statusMap: Record<string, "draft" | "in_progress" | "submitted" | "approved" | "rejected"> = {
      "draft": "draft",
      "in_progress": "in_progress",
      "submitted": "submitted",
      "approved": "approved",
      "rejected": "rejected",
    };
    const applicationStatus = statusMap[application.status.toLowerCase()] || "draft";

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
      status: doc.status === "verified" ? "approved" as const : 
              doc.status === "rejected" ? "rejected" as const : 
              "uploaded" as const,
    }));

    // Get app language from user or summary
    let appLanguage: "uz" | "ru" | "en" = (application.user.language as "uz" | "ru" | "en") || "en";
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

    logInfo("AI user context built", {
      userId,
      applicationId,
      hasSummary: !!questionnaireSummary,
      documentCount: uploadedDocuments.length,
      hasRiskScore: !!context.riskScore,
      riskScore: context.riskScore?.probabilityPercent,
    });

    return context;
  } catch (error) {
    logError("Failed to build AI user context", error as Error, {
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
    logError("Failed to get questionnaire summary", error as Error, { userId });
    return null;
  }
}

