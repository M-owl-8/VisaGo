/**
 * Development/Testing Routes
 * Routes for testing and debugging (development only)
 */

import express, { Request, Response, NextFunction } from "express";
import axios from "axios";
import { ApiError } from "../utils/errors";
import { logError, logInfo } from "../middleware/logger";
import { AIUserContext, VisaQuestionnaireSummary } from "../types/ai-context";
import { getEnvConfig } from "../config/env";
import { calculateVisaProbability } from "../services/ai-context.service";

const router = express.Router();

/**
 * Get AI service URL from environment
 */
function getAIServiceURL(): string {
  return process.env.AI_SERVICE_URL || "http://localhost:8001";
}

/**
 * Build mock AIUserContext from questionnaire summary
 */
function buildMockAIUserContext(
  questionnaireSummary: VisaQuestionnaireSummary
): AIUserContext {
  return {
    userProfile: {
      userId: "test-user-id",
      appLanguage: questionnaireSummary.appLanguage,
      citizenship: questionnaireSummary.citizenship || "UZ",
      age: questionnaireSummary.age,
    },
    application: {
      applicationId: "test-application-id",
      visaType: questionnaireSummary.visaType,
      country: questionnaireSummary.targetCountry,
      status: "draft",
    },
    questionnaireSummary: questionnaireSummary,
    uploadedDocuments: [],
    appActions: [],
  };
}

/**
 * POST /dev/test-checklist
 * Test checklist generation with a dummy questionnaire summary
 * Development only - no authentication required for testing
 */
router.post(
  "/test-checklist",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only allow in development
      const envConfig = getEnvConfig();
      if (envConfig.NODE_ENV === "production") {
        throw new ApiError(403, "This endpoint is only available in development");
      }

      // Get questionnaire summary from request body (or use default test case)
      const questionnaireSummary: VisaQuestionnaireSummary =
        req.body.questionnaireSummary || {
          version: "1.0",
          visaType: "student",
          targetCountry: "US",
          appLanguage: "en",
          age: 19,
          citizenship: "UZ",
          currentCountry: "UZ",
          hasUniversityInvitation: true,
          bankBalanceUSD: 6000,
          sponsorType: "parent",
          hasPropertyInUzbekistan: true,
          hasFamilyInUzbekistan: true,
          hasInternationalTravel: false,
          previousVisaRejections: false,
          previousOverstay: false,
          documents: {
            hasPassport: true,
            hasBankStatement: false,
            hasEmploymentOrStudyProof: false,
          },
          notes: "Test case for US student visa checklist generation",
        };

      logInfo("Test checklist generation", {
        visaType: questionnaireSummary.visaType,
        country: questionnaireSummary.targetCountry,
        language: questionnaireSummary.appLanguage,
      });

      // Build mock AIUserContext
      const mockContext = buildMockAIUserContext(questionnaireSummary);

      logInfo("Mock AIUserContext built", {
        userId: mockContext.userProfile.userId,
        applicationId: mockContext.application.applicationId,
        hasSummary: !!mockContext.questionnaireSummary,
      });

      // Call AI service checklist generation endpoint
      const aiServiceURL = getAIServiceURL();
      const checklistEndpoint = `${aiServiceURL}/api/checklist/generate`;

      logInfo("Calling AI service", {
        url: checklistEndpoint,
        applicationId: mockContext.application.applicationId,
      });

      try {
        const aiResponse = await axios.post(
          checklistEndpoint,
          {
            user_input: "Generate a complete document checklist for my visa application",
            application_id: mockContext.application.applicationId,
            auth_token: null, // Not needed for test
            mock_context: mockContext, // Pass mock context for testing
          },
          {
            timeout: 60000, // 60 second timeout for AI generation
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (aiResponse.data.success && aiResponse.data.data) {
          const checklist = aiResponse.data.data;

          logInfo("Checklist generated successfully", {
            checklistType: checklist.type,
            visaType: checklist.visaType,
            country: checklist.country,
            itemCount: checklist.checklist?.length || 0,
            language: questionnaireSummary.appLanguage,
          });

          // Verify checklist structure
          const verification = {
            hasCorrectType: checklist.type === "checklist",
            hasCorrectVisaType: checklist.visaType === questionnaireSummary.visaType,
            hasCorrectCountry: checklist.country === questionnaireSummary.targetCountry,
            hasChecklistArray: Array.isArray(checklist.checklist),
            itemCount: checklist.checklist?.length || 0,
            hasNotes: Array.isArray(checklist.notes),
            // Check for US F-1 specific documents (if student visa to US)
            expectedDocuments: [] as Array<{ name: string; found: boolean }>,
          };

          if (
            questionnaireSummary.visaType === "student" &&
            questionnaireSummary.targetCountry === "US"
          ) {
            const checklistItems = checklist.checklist || [];
            const itemNames = checklistItems.map((item: any) =>
              (item.name || "").toLowerCase()
            );

            verification.expectedDocuments = [
              {
                name: "I-20",
                found: itemNames.some((name: string) =>
                  name.includes("i-20") || name.includes("i20")
                ),
              },
              {
                name: "Bank Statement",
                found: itemNames.some((name: string) =>
                  name.includes("bank") || name.includes("financial")
                ),
              },
              {
                name: "SEVIS Fee",
                found: itemNames.some((name: string) =>
                  name.includes("sevis") || name.includes("fee")
                ),
              },
              {
                name: "Passport",
                found: itemNames.some((name: string) =>
                  name.includes("passport")
                ),
              },
            ];
          }

          return res.json({
            success: true,
            data: {
              checklist: checklist,
              verification: verification,
              mockContext: mockContext,
              questionnaireSummary: questionnaireSummary,
            },
            message: "Checklist generated successfully",
          });
        } else {
          throw new Error(
            aiResponse.data.error || "AI service returned unsuccessful response"
          );
        }
      } catch (axiosError: any) {
        const error = axiosError as any;
        logError("AI service call failed", error, {
          url: checklistEndpoint,
          status: error.response?.status,
          data: error.response?.data,
        });

        return res.status(500).json({
          success: false,
          error: {
            message: "Failed to generate checklist from AI service",
            details: error.response?.data || error.message,
            status: error.response?.status,
          },
          mockContext: mockContext,
          questionnaireSummary: questionnaireSummary,
        });
      }
    } catch (error) {
      logError("Test checklist generation error", error as Error);
      next(error);
    }
  }
);

/**
 * POST /dev/test-probability
 * Test probability generation with a dummy questionnaire summary
 * Development only - no authentication required for testing
 */
router.post(
  "/test-probability",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only allow in development
      const envConfig = getEnvConfig();
      if (envConfig.NODE_ENV === "production") {
        throw new ApiError(403, "This endpoint is only available in development");
      }

      // Get questionnaire summary from request body (or use default test case)
      const questionnaireSummary: VisaQuestionnaireSummary =
        req.body.questionnaireSummary || {
          version: "1.0",
          visaType: "student",
          targetCountry: "US",
          appLanguage: "en", // Can be overridden in request body
          age: 19,
          citizenship: "UZ",
          currentCountry: "UZ",
          hasUniversityInvitation: true,
          bankBalanceUSD: 6000,
          sponsorType: "parent",
          hasPropertyInUzbekistan: true,
          hasFamilyInUzbekistan: true,
          hasInternationalTravel: false,
          previousVisaRejections: false,
          previousOverstay: false,
          documents: {
            hasPassport: true,
            hasBankStatement: false,
            hasEmploymentOrStudyProof: false,
          },
          notes: "Test case for US student visa probability generation",
        };

      logInfo("Test probability generation", {
        visaType: questionnaireSummary.visaType,
        country: questionnaireSummary.targetCountry,
        language: questionnaireSummary.appLanguage,
      });

      // Calculate risk score
      const probability = calculateVisaProbability(questionnaireSummary);

      // Build mock AIUserContext with risk score
      const mockContext: AIUserContext = {
        userProfile: {
          userId: "test-user-id",
          appLanguage: questionnaireSummary.appLanguage,
          citizenship: questionnaireSummary.citizenship || "UZ",
          age: questionnaireSummary.age,
        },
        application: {
          applicationId: "test-application-id",
          visaType: questionnaireSummary.visaType,
          country: questionnaireSummary.targetCountry,
          status: "draft",
        },
        questionnaireSummary: questionnaireSummary,
        uploadedDocuments: [],
        appActions: [],
        riskScore: {
          probabilityPercent: probability.score,
          level: probability.level,
          riskFactors: probability.riskFactors,
          positiveFactors: probability.positiveFactors,
        },
      };

      logInfo("Mock AIUserContext built", {
        userId: mockContext.userProfile.userId,
        applicationId: mockContext.application.applicationId,
        hasSummary: !!mockContext.questionnaireSummary,
        riskScore: mockContext.riskScore?.probabilityPercent,
        language: mockContext.userProfile.appLanguage,
      });

      // Call AI service probability generation endpoint
      const aiServiceURL = getAIServiceURL();
      const probabilityEndpoint = `${aiServiceURL}/api/visa-probability`;

      logInfo("Calling AI service", {
        url: probabilityEndpoint,
        applicationId: mockContext.application.applicationId,
        language: mockContext.userProfile.appLanguage,
      });

      try {
        const aiResponse = await axios.post(
          probabilityEndpoint,
          {
            application_id: mockContext.application.applicationId,
            auth_token: null, // Not needed for test
            mock_context: mockContext, // Pass mock context for testing
          },
          {
            timeout: 60000, // 60 second timeout for AI generation
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (aiResponse.data.success && aiResponse.data.data) {
          const probabilityData = aiResponse.data.data;

          logInfo("Probability generated successfully", {
            probabilityType: probabilityData.type,
            visaType: probabilityData.visaType,
            country: probabilityData.country,
            percent: probabilityData.probability?.percent,
            level: probabilityData.probability?.level,
            language: questionnaireSummary.appLanguage,
            hasWarning: !!probabilityData.probability?.warning,
            risksCount: probabilityData.mainRisks?.length || 0,
            positiveCount: probabilityData.positiveFactors?.length || 0,
            tipsCount: probabilityData.improvementTips?.length || 0,
          });

          // Verify language matches
          const languageVerification = {
            expectedLanguage: questionnaireSummary.appLanguage,
            warningLanguage: "unknown", // Would need to detect language of warning text
            risksLanguage: "unknown",
            tipsLanguage: "unknown",
          };

          // Check if warning text exists and is in the right language (basic check)
          const warning = probabilityData.probability?.warning || "";
          if (questionnaireSummary.appLanguage === "uz") {
            // Check for Uzbek Latin characters
            languageVerification.warningLanguage = /[a-zA-Z'ğ'ı'ş'ç'ö'ü]/.test(warning) ? "uz" : "unknown";
          } else if (questionnaireSummary.appLanguage === "ru") {
            // Check for Cyrillic characters
            languageVerification.warningLanguage = /[а-яА-ЯёЁ]/.test(warning) ? "ru" : "unknown";
          } else {
            // English - check for common English words
            languageVerification.warningLanguage = /estimate|guarantee|embassy|decision/i.test(warning) ? "en" : "unknown";
          }

          return res.json({
            success: true,
            data: {
              probability: probabilityData,
              verification: {
                hasCorrectType: probabilityData.type === "probability",
                hasCorrectVisaType: probabilityData.visaType === questionnaireSummary.visaType,
                hasCorrectCountry: probabilityData.country === questionnaireSummary.targetCountry,
                hasProbabilityObject: !!probabilityData.probability,
                hasPercent: typeof probabilityData.probability?.percent === "number",
                percentInRange: 
                  probabilityData.probability?.percent >= 10 && 
                  probabilityData.probability?.percent <= 90,
                hasLevel: ["low", "medium", "high"].includes(probabilityData.probability?.level),
                hasWarning: !!probabilityData.probability?.warning,
                hasMainRisks: Array.isArray(probabilityData.mainRisks),
                hasPositiveFactors: Array.isArray(probabilityData.positiveFactors),
                hasImprovementTips: Array.isArray(probabilityData.improvementTips),
                languageVerification: languageVerification,
              },
              mockContext: mockContext,
              questionnaireSummary: questionnaireSummary,
            },
            message: "Probability generated successfully",
          });
        } else {
          throw new Error(
            aiResponse.data.error || "AI service returned unsuccessful response"
          );
        }
      } catch (axiosError: any) {
        const error = axiosError as any;
        logError("AI service call failed", error, {
          url: probabilityEndpoint,
          status: error.response?.status,
          data: error.response?.data,
        });

        return res.status(500).json({
          success: false,
          error: {
            message: "Failed to generate probability from AI service",
            details: error.response?.data || error.message,
            status: error.response?.status,
          },
          mockContext: mockContext,
          questionnaireSummary: questionnaireSummary,
        });
      }
    } catch (error) {
      logError("Test probability generation error", error as Error);
      next(error);
    }
  }
);

export default router;

