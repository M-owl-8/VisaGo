import express, { Request, Response, NextFunction } from 'express';
import axios, { AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';
import { ApplicationsService } from '../services/applications.service';
import { AIApplicationService } from '../services/ai-application.service';
import { authenticateToken } from '../middleware/auth';
import { buildAIUserContext, getQuestionnaireSummary } from '../services/ai-context.service';
import { logError, logInfo, logWarn } from '../middleware/logger';
import { AIOpenAIService } from '../services/ai-openai.service';
import { VisaRiskExplanationService } from '../services/visa-risk-explanation.service';
import { VisaChecklistExplanationService } from '../services/visa-checklist-explanation.service';

const prisma = new PrismaClient();

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/applications
 * Get all applications for logged-in user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applications = await ApplicationsService.getUserApplications(req.userId!);

    res.json({
      success: true,
      data: applications,
      count: applications.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/applications/:id
 * Get single application
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // MEDIUM PRIORITY FIX: Validate application ID format before processing
    // This prevents Prisma errors from invalid IDs and provides better error messages
    const applicationId = req.params.id;
    if (!applicationId || typeof applicationId !== 'string' || applicationId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid application ID',
          code: 'INVALID_INPUT',
        },
      });
    }

    const application = await ApplicationsService.getApplication(applicationId, req.userId!);

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/applications
 * Create new visa application
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { countryId, visaTypeId, notes } = req.body;

    const application = await ApplicationsService.createApplication(req.userId!, {
      countryId,
      visaTypeId,
      notes,
    });

    res.status(201).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/applications/:id/status
 * Update application status
 */
router.put('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // MEDIUM PRIORITY FIX: Validate application ID format
    const applicationId = req.params.id;
    if (!applicationId || typeof applicationId !== 'string' || applicationId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid application ID', code: 'INVALID_INPUT' },
      });
    }

    const { status } = req.body;

    const application = await ApplicationsService.updateApplicationStatus(
      applicationId,
      req.userId!,
      status
    );

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/applications/:id/checkpoints/:checkpointId
 * Update checkpoint status
 */
router.put(
  '/:id/checkpoints/:checkpointId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // MEDIUM PRIORITY FIX: Validate application and checkpoint ID formats
      const applicationId = req.params.id;
      const checkpointId = req.params.checkpointId;
      if (!applicationId || typeof applicationId !== 'string' || applicationId.trim() === '') {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid application ID', code: 'INVALID_INPUT' },
        });
      }
      if (!checkpointId || typeof checkpointId !== 'string' || checkpointId.trim() === '') {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid checkpoint ID', code: 'INVALID_INPUT' },
        });
      }

      const { status } = req.body;

      const checkpoint = await ApplicationsService.updateCheckpoint(
        applicationId,
        req.userId!,
        checkpointId,
        status
      );

      res.json({
        success: true,
        data: checkpoint,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/applications/:id
 * Delete application
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // MEDIUM PRIORITY FIX: Validate application ID format
    const applicationId = req.params.id;
    if (!applicationId || typeof applicationId !== 'string' || applicationId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid application ID', code: 'INVALID_INPUT' },
      });
    }

    const result = await ApplicationsService.deleteApplication(applicationId, req.userId!);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/applications/ai-generate
 * Generate application automatically using AI based on questionnaire data
 */
router.post('/ai-generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { questionnaireData } = req.body;

    logInfo('[AI Application Generation] Request received', {
      userId: req.userId,
      hasQuestionnaireData: !!questionnaireData,
      version: questionnaireData?.version,
      purpose: questionnaireData?.purpose,
      visaType: questionnaireData?.visaType,
      country: questionnaireData?.country,
      targetCountry: questionnaireData?.targetCountry,
      requestBodyKeys: questionnaireData ? Object.keys(questionnaireData) : [],
    });

    if (!questionnaireData) {
      logError(
        '[AI Application Generation] Missing questionnaire data',
        new Error('QUESTIONNAIRE_DATA_REQUIRED'),
        {
          userId: req.userId,
        }
      );
      return res.status(400).json({
        success: false,
        error: {
          code: 'QUESTIONNAIRE_DATA_REQUIRED',
          message: 'Questionnaire data is required',
        },
      });
    }

    // Validate that purpose is provided
    if (!questionnaireData.purpose) {
      logError('[AI Application Generation] Missing purpose field', new Error('PURPOSE_REQUIRED'), {
        userId: req.userId,
        version: questionnaireData.version,
        visaType: questionnaireData.visaType,
        receivedKeys: Object.keys(questionnaireData),
      });
      return res.status(400).json({
        success: false,
        error: {
          code: 'PURPOSE_REQUIRED',
          message: "Questionnaire data must include 'purpose' field (study, tourism, work, etc.)",
        },
      });
    }

    // Validate that country is provided (unless it's "not_sure")
    if (!questionnaireData.country || questionnaireData.country === 'not_sure') {
      logError(
        '[AI Application Generation] Missing or invalid country',
        new Error('COUNTRY_REQUIRED'),
        {
          userId: req.userId,
          country: questionnaireData.country,
          targetCountry: questionnaireData.targetCountry,
        }
      );
      return res.status(400).json({
        success: false,
        error: {
          code: 'COUNTRY_REQUIRED',
          message: 'Please select a destination country',
        },
      });
    }

    logInfo('[AI Application Generation] Validation passed, generating application', {
      userId: req.userId,
      purpose: questionnaireData.purpose,
      country: questionnaireData.country,
      version: questionnaireData.version,
    });

    const result = await AIApplicationService.generateApplicationFromQuestionnaire(
      req.userId!,
      questionnaireData
    );

    logInfo('[AI Application Generation] Application created successfully', {
      userId: req.userId,
      applicationId: result.application?.id,
      country: result.application?.country?.name,
      visaType: result.application?.visaType?.name,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    // FIXED: Handle ApiError with status 409 (Conflict) properly
    // Import ApiError to check instance
    const { ApiError } = await import('../utils/errors');

    if (error instanceof ApiError && error.status === 409) {
      // Log conflict with clear message
      logWarn('[AI Application Generation] Conflict – active application already exists', {
        userId: req.userId,
        country: req.body.questionnaireData?.country,
        targetCountry: req.body.questionnaireData?.targetCountry,
        purpose: req.body.questionnaireData?.purpose,
        errorMessage: error.message,
      });

      // Return 409 Conflict status (not 500)
      return res.status(409).json({
        success: false,
        error: {
          code: error.code || 'APPLICATION_CONFLICT',
          message: error.message || 'Active application for this country already exists',
        },
      });
    }

    // Return user-friendly error message for other errors
    const errorMessage = error.message || 'Failed to generate application from questionnaire';
    const statusCode = error.statusCode || error.status || 500;

    logError(
      '[AI Application Generation] Failed',
      error instanceof Error ? error : new Error(errorMessage),
      {
        userId: req.userId,
        purpose: req.body.questionnaireData?.purpose,
        country: req.body.questionnaireData?.country,
        statusCode,
      }
    );

    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'APPLICATION_GENERATION_FAILED',
        message: errorMessage,
      },
    });
  }
});

/**
 * Get AI service URL from environment
 */
function getAIServiceURL(): string {
  return process.env.AI_SERVICE_URL || 'http://localhost:8001';
}

/**
 * POST /api/applications/:id/generate-checklist
 * Generate a personalized document checklist for a real user/application
 * Uses real DB data and AIUserContext (no mock data)
 */
router.post('/:id/generate-checklist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = req.params.id;
    const userId = req.userId!;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'APPLICATION_ID_REQUIRED',
        message: 'Application ID is required',
      });
    }

    logInfo('Generating checklist for application', {
      userId,
      applicationId,
    });

    // Step 1: Check if questionnaire summary exists
    const questionnaireSummary = await getQuestionnaireSummary(userId);
    if (!questionnaireSummary) {
      logInfo('Questionnaire summary missing', {
        userId,
        applicationId,
      });
      return res.status(400).json({
        success: false,
        error: 'QUESTIONNAIRE_MISSING',
        message:
          'Questionnaire data is required to generate a checklist. Please complete the questionnaire first.',
      });
    }

    // Step 2: Build real AIUserContext (not mock)
    let aiUserContext;
    try {
      aiUserContext = await buildAIUserContext(userId, applicationId);
      logInfo('AIUserContext built successfully', {
        userId,
        applicationId,
        hasSummary: !!aiUserContext.questionnaireSummary,
      });
    } catch (contextError) {
      logError('Failed to build AIUserContext', contextError as Error, {
        userId,
        applicationId,
      });
      return res.status(500).json({
        success: false,
        error: 'CONTEXT_BUILD_FAILED',
        message: 'Failed to build application context. Please try again later.',
      });
    }

    // Step 3: Generate checklist using OpenAI directly
    try {
      const application = await ApplicationsService.getApplication(applicationId, userId);
      if (!application) {
        return res.status(404).json({
          success: false,
          error: 'APPLICATION_NOT_FOUND',
          message: 'Application not found',
        });
      }

      logInfo('Generating checklist using OpenAI', {
        applicationId,
        userId,
        country: application.country.name,
        visaType: application.visaType.name,
      });

      const checklist = await AIOpenAIService.generateChecklist(
        aiUserContext,
        application.country.name,
        application.visaType.name
      );

      logInfo('Checklist generated successfully', {
        userId,
        applicationId,
        checklistType: checklist.type,
        itemCount: checklist.checklist?.length || 0,
      });

      return res.json({
        success: true,
        checklist: checklist,
      });
    } catch (error: any) {
      logError('Checklist generation failed', error, {
        userId,
        applicationId,
      });

      return res.status(500).json({
        success: false,
        error: 'CHECKLIST_FAILED',
        message:
          error.message || 'VisaBuddy could not generate your checklist. Please try again later.',
      });
    }
  } catch (error) {
    logError('Checklist generation error', error as Error, {
      userId: req.userId,
      applicationId: req.params.id,
    });
    next(error);
  }
});

/**
 * POST /api/applications/:id/visa-probability
 * Generate a personalized visa probability estimate for a real user/application
 * Uses real DB data, AIUserContext.riskScore, RAG, and AI
 */
router.post('/:id/visa-probability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = req.params.id;
    const userId = req.userId!;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'APPLICATION_ID_REQUIRED',
        message: 'Application ID is required',
      });
    }

    logInfo('Generating visa probability for application', {
      userId,
      applicationId,
    });

    // Step 1: Check if questionnaire summary exists
    const questionnaireSummary = await getQuestionnaireSummary(userId);
    if (!questionnaireSummary) {
      logInfo('Questionnaire summary missing', {
        userId,
        applicationId,
      });
      return res.status(400).json({
        success: false,
        error: 'QUESTIONNAIRE_MISSING',
        message:
          'Questionnaire data is required to generate a probability estimate. Please complete the questionnaire first.',
      });
    }

    // Step 2: Call AI service probability endpoint
    const aiServiceURL = getAIServiceURL();
    const probabilityEndpoint = `${aiServiceURL}/api/visa-probability`;

    logInfo('Calling AI service for probability generation', {
      url: probabilityEndpoint,
      applicationId,
      userId,
    });

    try {
      const aiResponse = await axios.post(
        probabilityEndpoint,
        {
          application_id: applicationId,
          auth_token: req.headers.authorization?.replace('Bearer ', ''), // Pass JWT token for internal API calls
        },
        {
          timeout: 60000, // 60 second timeout for AI generation
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (aiResponse.data.success && aiResponse.data.data) {
        const probability = aiResponse.data.data;

        logInfo('Probability generated successfully', {
          userId,
          applicationId,
          probabilityType: probability.type,
          percent: probability.probability?.percent,
          level: probability.probability?.level,
        });

        return res.json({
          success: true,
          probability: probability,
        });
      } else {
        throw new Error(aiResponse.data.error || 'AI service returned unsuccessful response');
      }
    } catch (axiosError) {
      const error = axiosError as AxiosError;

      // Handle timeout
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        logError('AI service timeout', error, {
          userId,
          applicationId,
          url: probabilityEndpoint,
        });
        return res.status(504).json({
          success: false,
          error: 'PROBABILITY_FAILED',
          message:
            'VisaBuddy could not generate your probability estimate. The request timed out. Please try again later.',
        });
      }

      // Handle other errors
      logError('AI service call failed', error, {
        userId,
        applicationId,
        url: probabilityEndpoint,
        status: error.response?.status,
        data: error.response?.data,
      });

      return res.status(500).json({
        success: false,
        error: 'PROBABILITY_FAILED',
        message: 'VisaBuddy could not generate your probability estimate. Please try again later.',
      });
    }
  } catch (error) {
    logError('Probability generation error', error as Error, {
      userId: req.userId,
      applicationId: req.params.id,
    });
    next(error);
  }
});

/**
 * GET /api/applications/:id/risk-explanation
 * Get GPT-generated risk explanation and improvement advice
 */
router.get('/:id/risk-explanation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = req.params.id;
    const userId = req.userId!;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'APPLICATION_ID_REQUIRED',
        message: 'Application ID is required',
      });
    }

    logInfo('[RiskExplanation] Requesting risk explanation', {
      userId,
      applicationId,
    });

    const explanation = await VisaRiskExplanationService.generateRiskExplanation(
      userId,
      applicationId
    );

    res.json({
      success: true,
      data: explanation,
    });
  } catch (error: any) {
    logError('[RiskExplanation] Error generating risk explanation', error as Error, {
      userId: req.userId,
      applicationId: req.params.id,
    });

    if (error.message === 'Application not found') {
      return res.status(404).json({
        success: false,
        error: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    }

    if (error.message === 'Unauthorized') {
      return res.status(403).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this application',
      });
    }

    res.status(500).json({
      success: false,
      error: 'RISK_EXPLANATION_ERROR',
      message: error.message || 'Failed to generate risk explanation',
    });
  }
});

/**
 * GET /api/applications/:applicationId/checklist/:documentType/explanation
 * Get GPT-generated explanation for why a specific checklist item is needed
 */
router.get(
  '/:applicationId/checklist/:documentType/explanation',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = req.params.applicationId;
      const documentType = req.params.documentType;
      const userId = req.userId!;

      if (!applicationId || !documentType) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_PARAMS',
          message: 'Application ID and document type are required',
        });
      }

      logInfo('[ChecklistExplanation] Requesting document explanation', {
        userId,
        applicationId,
        documentType,
      });

      const explanation = await VisaChecklistExplanationService.getExplanation(
        userId,
        applicationId,
        documentType
      );

      res.json({
        success: true,
        data: explanation,
      });
    } catch (error: any) {
      logError('[ChecklistExplanation] Error generating explanation', error as Error, {
        userId: req.userId,
        applicationId: req.params.applicationId,
        documentType: req.params.documentType,
      });

      if (error.message === 'Application not found') {
        return res.status(404).json({
          success: false,
          error: 'APPLICATION_NOT_FOUND',
          message: 'Application not found',
        });
      }

      if (error.message === 'Unauthorized') {
        return res.status(403).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'You do not have access to this application',
        });
      }

      res.status(500).json({
        success: false,
        error: 'EXPLANATION_ERROR',
        message: error.message || 'Failed to generate explanation',
      });
    }
  }
);

/**
 * POST /api/applications/:id/checklist-feedback
 * Submit feedback about checklist quality
 */
router.post('/:id/checklist-feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = req.params.id;
    const userId = req.userId!;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'APPLICATION_ID_REQUIRED',
        message: 'Application ID is required',
      });
    }

    const { feedbackType, feedbackText } = req.body;

    if (!feedbackType || !feedbackText) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Feedback type and text are required',
      });
    }

    if (!['missing_docs', 'unnecessary_docs', 'other'].includes(feedbackType)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FEEDBACK_TYPE',
        message: 'Feedback type must be: missing_docs, unnecessary_docs, or other',
      });
    }

    // Get application
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: {
        country: true,
        visaType: true,
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    }

    // Verify ownership
    if (application.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this application',
      });
    }

    // Get current checklist snapshot
    const checklist = await prisma.documentChecklist.findUnique({
      where: { applicationId },
    });

    let checklistSnapshot: any = null;
    if (checklist?.checklistData) {
      try {
        checklistSnapshot =
          typeof checklist.checklistData === 'string'
            ? JSON.parse(checklist.checklistData)
            : checklist.checklistData;
      } catch (e) {
        // If parse fails, use raw data
        checklistSnapshot = { raw: checklist.checklistData };
      }
    }

    // Store feedback
    const feedback = await prisma.checklistFeedback.create({
      data: {
        applicationId,
        userId,
        countryCode: application.country.code.toUpperCase(),
        visaType: application.visaType.name.toLowerCase(),
        checklistSnapshot: JSON.stringify(checklistSnapshot) as any,
        feedbackType,
        feedbackText,
      },
    });

    logInfo('[ChecklistFeedback] Feedback submitted', {
      feedbackId: feedback.id,
      applicationId,
      userId,
      countryCode: application.country.code,
      visaType: application.visaType.name,
      feedbackType,
    });

    res.json({
      success: true,
      data: {
        id: feedback.id,
        message: 'Feedback submitted successfully',
      },
    });
  } catch (error: any) {
    logError('[ChecklistFeedback] Error submitting feedback', error as Error, {
      userId: req.userId,
      applicationId: req.params.id,
    });

    res.status(500).json({
      success: false,
      error: 'FEEDBACK_ERROR',
      message: error.message || 'Failed to submit feedback',
    });
  }
});

export default router;
