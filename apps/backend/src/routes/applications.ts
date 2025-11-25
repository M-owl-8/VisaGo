import express, { Request, Response, NextFunction } from 'express';
import axios, { AxiosError } from 'axios';
import { ApplicationsService } from '../services/applications.service';
import { AIApplicationService } from '../services/ai-application.service';
import { authenticateToken } from '../middleware/auth';
import { buildAIUserContext, getQuestionnaireSummary } from '../services/ai-context.service';
import { logError, logInfo } from '../middleware/logger';
import { AIOpenAIService } from '../services/ai-openai.service';

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

    if (!questionnaireData) {
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
      return res.status(400).json({
        success: false,
        error: {
          code: 'COUNTRY_REQUIRED',
          message: 'Please select a destination country',
        },
      });
    }

    const result = await AIApplicationService.generateApplicationFromQuestionnaire(
      req.userId!,
      questionnaireData
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    // Return user-friendly error message
    const errorMessage = error.message || 'Failed to generate application from questionnaire';
    const statusCode = error.statusCode || 500;

    logError(
      '[AI Application Generation] Failed',
      error instanceof Error ? error : new Error(errorMessage),
      {
        userId: req.userId,
        purpose: req.body.questionnaireData?.purpose,
        country: req.body.questionnaireData?.country,
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

export default router;
