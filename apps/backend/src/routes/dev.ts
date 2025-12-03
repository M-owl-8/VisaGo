/**
 * Development/Testing Routes
 * Routes for testing and debugging (development only)
 */

import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { ApiError } from '../utils/errors';
import { logError, logInfo } from '../middleware/logger';
import { AIUserContext, VisaQuestionnaireSummary } from '../types/ai-context';
import { getEnvConfig } from '../config/env';
import { calculateVisaProbability } from '../services/ai-context.service';
import { AIOpenAIService } from '../services/ai-openai.service';
import { validateDocumentWithAI } from '../services/document-validation.service';
import { PrismaClient } from '@prisma/client';

const router = express.Router();

/**
 * Get AI service URL from environment
 */
function getAIServiceURL(): string {
  return process.env.AI_SERVICE_URL || 'http://localhost:8001';
}

/**
 * Build mock AIUserContext from questionnaire summary
 */
function buildMockAIUserContext(questionnaireSummary: VisaQuestionnaireSummary): AIUserContext {
  return {
    userProfile: {
      userId: 'test-user-id',
      appLanguage: questionnaireSummary.appLanguage,
      citizenship: questionnaireSummary.citizenship || 'UZ',
      age: questionnaireSummary.age,
    },
    application: {
      applicationId: 'test-application-id',
      visaType: questionnaireSummary.visaType,
      country: questionnaireSummary.targetCountry,
      status: 'draft',
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
router.post('/test-checklist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only allow in development
    const envConfig = getEnvConfig();
    if (envConfig.NODE_ENV === 'production') {
      throw new ApiError(403, 'This endpoint is only available in development');
    }

    // Get questionnaire summary from request body (or use default test case)
    const questionnaireSummary: VisaQuestionnaireSummary = req.body.questionnaireSummary || {
      version: '1.0',
      visaType: 'student',
      targetCountry: 'US',
      appLanguage: 'en',
      age: 19,
      citizenship: 'UZ',
      currentCountry: 'UZ',
      hasUniversityInvitation: true,
      bankBalanceUSD: 6000,
      sponsorType: 'parent',
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
      notes: 'Test case for US student visa checklist generation',
    };

    logInfo('Test checklist generation', {
      visaType: questionnaireSummary.visaType,
      country: questionnaireSummary.targetCountry,
      language: questionnaireSummary.appLanguage,
    });

    // Build mock AIUserContext
    const mockContext = buildMockAIUserContext(questionnaireSummary);

    logInfo('Mock AIUserContext built', {
      userId: mockContext.userProfile.userId,
      applicationId: mockContext.application.applicationId,
      hasSummary: !!mockContext.questionnaireSummary,
    });

    // Call AI service checklist generation endpoint
    const aiServiceURL = getAIServiceURL();
    const checklistEndpoint = `${aiServiceURL}/api/checklist/generate`;

    logInfo('Calling AI service', {
      url: checklistEndpoint,
      applicationId: mockContext.application.applicationId,
    });

    try {
      const aiResponse = await axios.post(
        checklistEndpoint,
        {
          user_input: 'Generate a complete document checklist for my visa application',
          application_id: mockContext.application.applicationId,
          auth_token: null, // Not needed for test
          mock_context: mockContext, // Pass mock context for testing
        },
        {
          timeout: 60000, // 60 second timeout for AI generation
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (aiResponse.data.success && aiResponse.data.data) {
        const checklist = aiResponse.data.data;

        logInfo('Checklist generated successfully', {
          checklistType: checklist.type,
          visaType: checklist.visaType,
          country: checklist.country,
          itemCount: checklist.checklist?.length || 0,
          language: questionnaireSummary.appLanguage,
        });

        // Verify checklist structure
        const verification = {
          hasCorrectType: checklist.type === 'checklist',
          hasCorrectVisaType: checklist.visaType === questionnaireSummary.visaType,
          hasCorrectCountry: checklist.country === questionnaireSummary.targetCountry,
          hasChecklistArray: Array.isArray(checklist.checklist),
          itemCount: checklist.checklist?.length || 0,
          hasNotes: Array.isArray(checklist.notes),
          // Check for US F-1 specific documents (if student visa to US)
          expectedDocuments: [] as Array<{ name: string; found: boolean }>,
        };

        if (
          questionnaireSummary.visaType === 'student' &&
          questionnaireSummary.targetCountry === 'US'
        ) {
          const checklistItems = checklist.checklist || [];
          const itemNames = checklistItems.map((item: any) => (item.name || '').toLowerCase());

          verification.expectedDocuments = [
            {
              name: 'I-20',
              found: itemNames.some(
                (name: string) => name.includes('i-20') || name.includes('i20')
              ),
            },
            {
              name: 'Bank Statement',
              found: itemNames.some(
                (name: string) => name.includes('bank') || name.includes('financial')
              ),
            },
            {
              name: 'SEVIS Fee',
              found: itemNames.some(
                (name: string) => name.includes('sevis') || name.includes('fee')
              ),
            },
            {
              name: 'Passport',
              found: itemNames.some((name: string) => name.includes('passport')),
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
          message: 'Checklist generated successfully',
        });
      } else {
        throw new Error(aiResponse.data.error || 'AI service returned unsuccessful response');
      }
    } catch (axiosError: any) {
      const error = axiosError as any;
      logError('AI service call failed', error, {
        url: checklistEndpoint,
        status: error.response?.status,
        data: error.response?.data,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate checklist from AI service',
          details: error.response?.data || error.message,
          status: error.response?.status,
        },
        mockContext: mockContext,
        questionnaireSummary: questionnaireSummary,
      });
    }
  } catch (error) {
    logError('Test checklist generation error', error as Error);
    next(error);
  }
});

/**
 * POST /dev/test-probability
 * Test probability generation with a dummy questionnaire summary
 * Development only - no authentication required for testing
 */
router.post('/test-probability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only allow in development
    const envConfig = getEnvConfig();
    if (envConfig.NODE_ENV === 'production') {
      throw new ApiError(403, 'This endpoint is only available in development');
    }

    // Get questionnaire summary from request body (or use default test case)
    const questionnaireSummary: VisaQuestionnaireSummary = req.body.questionnaireSummary || {
      version: '1.0',
      visaType: 'student',
      targetCountry: 'US',
      appLanguage: 'en', // Can be overridden in request body
      age: 19,
      citizenship: 'UZ',
      currentCountry: 'UZ',
      hasUniversityInvitation: true,
      bankBalanceUSD: 6000,
      sponsorType: 'parent',
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
      notes: 'Test case for US student visa probability generation',
    };

    logInfo('Test probability generation', {
      visaType: questionnaireSummary.visaType,
      country: questionnaireSummary.targetCountry,
      language: questionnaireSummary.appLanguage,
    });

    // Calculate risk score
    const probability = calculateVisaProbability(questionnaireSummary);

    // Build mock AIUserContext with risk score
    const mockContext: AIUserContext = {
      userProfile: {
        userId: 'test-user-id',
        appLanguage: questionnaireSummary.appLanguage,
        citizenship: questionnaireSummary.citizenship || 'UZ',
        age: questionnaireSummary.age,
      },
      application: {
        applicationId: 'test-application-id',
        visaType: questionnaireSummary.visaType,
        country: questionnaireSummary.targetCountry,
        status: 'draft',
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

    logInfo('Mock AIUserContext built', {
      userId: mockContext.userProfile.userId,
      applicationId: mockContext.application.applicationId,
      hasSummary: !!mockContext.questionnaireSummary,
      riskScore: mockContext.riskScore?.probabilityPercent,
      language: mockContext.userProfile.appLanguage,
    });

    // Call AI service probability generation endpoint
    const aiServiceURL = getAIServiceURL();
    const probabilityEndpoint = `${aiServiceURL}/api/visa-probability`;

    logInfo('Calling AI service', {
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
            'Content-Type': 'application/json',
          },
        }
      );

      if (aiResponse.data.success && aiResponse.data.data) {
        const probabilityData = aiResponse.data.data;

        logInfo('Probability generated successfully', {
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
          warningLanguage: 'unknown', // Would need to detect language of warning text
          risksLanguage: 'unknown',
          tipsLanguage: 'unknown',
        };

        // Check if warning text exists and is in the right language (basic check)
        const warning = probabilityData.probability?.warning || '';
        if (questionnaireSummary.appLanguage === 'uz') {
          // Check for Uzbek Latin characters
          languageVerification.warningLanguage = /[a-zA-Z'Дџ'Д±'Еџ'Г§'Г¶'Гј]/.test(warning)
            ? 'uz'
            : 'unknown';
        } else if (questionnaireSummary.appLanguage === 'ru') {
          // Check for Cyrillic characters
          languageVerification.warningLanguage = /\p{Script=Cyrillic}/u.test(warning)
            ? 'ru'
            : 'unknown';
        } else {
          // English - check for common English words
          languageVerification.warningLanguage = /estimate|guarantee|embassy|decision/i.test(
            warning
          )
            ? 'en'
            : 'unknown';
        }

        return res.json({
          success: true,
          data: {
            probability: probabilityData,
            verification: {
              hasCorrectType: probabilityData.type === 'probability',
              hasCorrectVisaType: probabilityData.visaType === questionnaireSummary.visaType,
              hasCorrectCountry: probabilityData.country === questionnaireSummary.targetCountry,
              hasProbabilityObject: !!probabilityData.probability,
              hasPercent: typeof probabilityData.probability?.percent === 'number',
              percentInRange:
                probabilityData.probability?.percent >= 10 &&
                probabilityData.probability?.percent <= 90,
              hasLevel: ['low', 'medium', 'high'].includes(probabilityData.probability?.level),
              hasWarning: !!probabilityData.probability?.warning,
              hasMainRisks: Array.isArray(probabilityData.mainRisks),
              hasPositiveFactors: Array.isArray(probabilityData.positiveFactors),
              hasImprovementTips: Array.isArray(probabilityData.improvementTips),
              languageVerification: languageVerification,
            },
            mockContext: mockContext,
            questionnaireSummary: questionnaireSummary,
          },
          message: 'Probability generated successfully',
        });
      } else {
        throw new Error(aiResponse.data.error || 'AI service returned unsuccessful response');
      }
    } catch (axiosError: any) {
      const error = axiosError as any;
      logError('AI service call failed', error, {
        url: probabilityEndpoint,
        status: error.response?.status,
        data: error.response?.data,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate probability from AI service',
          details: error.response?.data || error.message,
          status: error.response?.status,
        },
        mockContext: mockContext,
        questionnaireSummary: questionnaireSummary,
      });
    }
  } catch (error) {
    logError('Test probability generation error', error as Error);
    next(error);
  }
});

/**
 * GET /dev/ai-self-check
 * Test GPT-4o-mini checklist generation and document validation end-to-end
 * Development only - no authentication required for testing
 */
router.get('/ai-self-check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only allow in development
    const envConfig = getEnvConfig();
    if (envConfig.NODE_ENV === 'production') {
      throw new ApiError(403, 'This endpoint is only available in development');
    }

    logInfo('[Dev][AI Self-Check] Starting AI self-check', {
      model: AIOpenAIService.MODEL,
    });

    const results: any = {
      checklistOk: false,
      docValidationOk: false,
      usedModel: AIOpenAIService.MODEL,
      checklistItemCount: 0,
      validationStatus: null,
      validationNotesUz: null,
      errors: [] as string[],
    };

    // Initialize OpenAI service if needed
    try {
      if (!AIOpenAIService.isInitialized()) {
        const prisma = new PrismaClient();
        AIOpenAIService.initialize(prisma);
      }
    } catch (initError: any) {
      results.errors.push(`OpenAI initialization failed: ${initError.message}`);
      return res.status(500).json({
        success: false,
        message: 'AI self-check failed: OpenAI service not initialized',
        error: initError.message,
        results,
      });
    }

    // Test 1: Checklist Generation
    try {
      logInfo('[Dev][AI Self-Check] Testing checklist generation', {
        model: AIOpenAIService.MODEL,
        country: 'Germany',
        visaType: 'tourist',
      });

      const mockUserContext = {
        personalInfo: {
          fullName: 'Test User',
          dateOfBirth: '1995-01-01',
          nationality: 'UZ',
        },
        travelInfo: {
          purpose: 'tourism',
          funding: 'self',
        },
        financialInfo: {
          selfFundsUSD: 5000,
        },
      };

      const checklistResult = await AIOpenAIService.generateChecklist(
        mockUserContext,
        'Germany',
        'tourist'
      );

      if (
        checklistResult &&
        checklistResult.checklist &&
        Array.isArray(checklistResult.checklist)
      ) {
        results.checklistOk = true;
        results.checklistItemCount = checklistResult.checklist.length;
        logInfo('[Dev][AI Self-Check] Checklist generation successful', {
          itemCount: results.checklistItemCount,
          model: AIOpenAIService.MODEL,
        });
      } else {
        results.errors.push('Checklist generation returned invalid format');
      }
    } catch (checklistError: any) {
      results.errors.push(`Checklist generation failed: ${checklistError.message}`);
      logError(
        '[Dev][AI Self-Check] Checklist generation failed',
        checklistError instanceof Error ? checklistError : new Error(checklistError.message),
        {
          model: AIOpenAIService.MODEL,
        }
      );
    }

    // Test 2: Document Validation
    try {
      logInfo('[Dev][AI Self-Check] Testing document validation', {
        model: AIOpenAIService.MODEL,
        documentType: 'passport',
        country: 'Germany',
        visaType: 'tourist',
      });

      const mockDocument = {
        id: 'test-doc-id',
        documentType: 'passport',
        documentName: 'Test Passport',
        fileName: 'passport_test.jpg',
        fileUrl: 'https://example.com/passport_test.jpg',
        uploadedAt: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      };

      const mockApplication = {
        id: 'test-app-id',
        country: { name: 'Germany', code: 'DE' },
        visaType: { name: 'tourist' },
      };

      const validationResult = await validateDocumentWithAI({
        document: mockDocument,
        checklistItem: {
          name: 'Passport',
          nameUz: 'Pasport',
          description: 'Valid passport required',
          descriptionUz: 'Yaroqli pasport talab qilinadi',
          required: true,
        },
        application: mockApplication,
        countryName: 'Germany',
        visaTypeName: 'tourist',
      });

      if (validationResult && validationResult.status) {
        results.docValidationOk = true;
        results.validationStatus = validationResult.status;
        results.validationNotesUz = validationResult.notes?.uz || validationResult.notesUz || '';
        results.validationConfidence = validationResult.confidence;
        results.verifiedByAI = validationResult.verifiedByAI;
        logInfo('[Dev][AI Self-Check] Document validation successful', {
          status: validationResult.status,
          verifiedByAI: validationResult.verifiedByAI,
          confidence: validationResult.confidence,
          model: AIOpenAIService.MODEL,
        });
      } else {
        results.errors.push('Document validation returned invalid format');
      }
    } catch (validationError: any) {
      results.errors.push(`Document validation failed: ${validationError.message}`);
      logError(
        '[Dev][AI Self-Check] Document validation failed',
        validationError instanceof Error ? validationError : new Error(validationError.message),
        {
          model: AIOpenAIService.MODEL,
        }
      );
    }

    // Return results
    const allOk = results.checklistOk && results.docValidationOk;
    const statusCode = allOk ? 200 : 500;

    logInfo('[Dev][AI Self-Check] AI self-check completed', {
      checklistOk: results.checklistOk,
      docValidationOk: results.docValidationOk,
      model: results.usedModel,
      errors: results.errors.length,
    });

    return res.status(statusCode).json({
      success: allOk,
      message: allOk
        ? 'AI self-check passed: Both checklist generation and document validation are working'
        : 'AI self-check failed: Some tests did not pass',
      results,
    });
  } catch (error: any) {
    logError(
      '[Dev][AI Self-Check] AI self-check failed',
      error instanceof Error ? error : new Error(error.message)
    );
    return res.status(500).json({
      success: false,
      message: 'AI self-check failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
