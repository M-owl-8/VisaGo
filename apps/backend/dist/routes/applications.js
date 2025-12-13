"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const applications_service_1 = require("../services/applications.service");
const ai_application_service_1 = require("../services/ai-application.service");
const auth_1 = require("../middleware/auth");
const ai_context_service_1 = require("../services/ai-context.service");
const logger_1 = require("../middleware/logger");
const ai_openai_service_1 = require("../services/ai-openai.service");
const visa_risk_explanation_service_1 = require("../services/visa-risk-explanation.service");
const visa_checklist_explanation_service_1 = require("../services/visa-checklist-explanation.service");
const prisma = new client_1.PrismaClient();
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticateToken);
/**
 * GET /api/applications
 * Get all applications for logged-in user
 */
router.get('/', async (req, res, next) => {
    try {
        const applications = await applications_service_1.ApplicationsService.getUserApplications(req.userId);
        res.json({
            success: true,
            data: applications,
            count: applications.length,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/applications/:id
 * Get single application
 */
router.get('/:id', async (req, res, next) => {
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
        const application = await applications_service_1.ApplicationsService.getApplication(applicationId, req.userId);
        res.json({
            success: true,
            data: application,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/applications
 * Create new visa application
 */
router.post('/', async (req, res, next) => {
    try {
        const { countryId, visaTypeId, notes } = req.body;
        const application = await applications_service_1.ApplicationsService.createApplication(req.userId, {
            countryId,
            visaTypeId,
            notes,
        });
        res.status(201).json({
            success: true,
            data: application,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PUT /api/applications/:id/status
 * Update application status
 */
router.put('/:id/status', async (req, res, next) => {
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
        const application = await applications_service_1.ApplicationsService.updateApplicationStatus(applicationId, req.userId, status);
        res.json({
            success: true,
            data: application,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PUT /api/applications/:id/checkpoints/:checkpointId
 * Update checkpoint status
 */
router.put('/:id/checkpoints/:checkpointId', async (req, res, next) => {
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
        const checkpoint = await applications_service_1.ApplicationsService.updateCheckpoint(applicationId, req.userId, checkpointId, status);
        res.json({
            success: true,
            data: checkpoint,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/applications/:id
 * Delete application
 */
router.delete('/:id', async (req, res, next) => {
    try {
        // MEDIUM PRIORITY FIX: Validate application ID format
        const applicationId = req.params.id;
        if (!applicationId || typeof applicationId !== 'string' || applicationId.trim() === '') {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid application ID', code: 'INVALID_INPUT' },
            });
        }
        const result = await applications_service_1.ApplicationsService.deleteApplication(applicationId, req.userId);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/applications/ai-generate
 * Generate application automatically using AI based on questionnaire data
 */
router.post('/ai-generate', async (req, res, next) => {
    try {
        const { questionnaireData } = req.body;
        (0, logger_1.logInfo)('[AI Application Generation] Request received', {
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
            (0, logger_1.logError)('[AI Application Generation] Missing questionnaire data', new Error('QUESTIONNAIRE_DATA_REQUIRED'), {
                userId: req.userId,
            });
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
            (0, logger_1.logError)('[AI Application Generation] Missing purpose field', new Error('PURPOSE_REQUIRED'), {
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
            (0, logger_1.logError)('[AI Application Generation] Missing or invalid country', new Error('COUNTRY_REQUIRED'), {
                userId: req.userId,
                country: questionnaireData.country,
                targetCountry: questionnaireData.targetCountry,
            });
            return res.status(400).json({
                success: false,
                error: {
                    code: 'COUNTRY_REQUIRED',
                    message: 'Please select a destination country',
                },
            });
        }
        (0, logger_1.logInfo)('[AI Application Generation] Validation passed, generating application', {
            userId: req.userId,
            purpose: questionnaireData.purpose,
            country: questionnaireData.country,
            version: questionnaireData.version,
        });
        const result = await ai_application_service_1.AIApplicationService.generateApplicationFromQuestionnaire(req.userId, questionnaireData);
        (0, logger_1.logInfo)('[AI Application Generation] Application created successfully', {
            userId: req.userId,
            applicationId: result.application?.id,
            country: result.application?.country?.name,
            visaType: result.application?.visaType?.name,
        });
        res.status(201).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        // FIXED: Handle ApiError with status 409 (Conflict) properly
        // Import ApiError to check instance
        const { ApiError } = await Promise.resolve().then(() => __importStar(require('../utils/errors')));
        if (error instanceof ApiError && error.status === 409) {
            // Log conflict with clear message
            (0, logger_1.logWarn)('[AI Application Generation] Conflict – active application already exists', {
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
        (0, logger_1.logError)('[AI Application Generation] Failed', error instanceof Error ? error : new Error(errorMessage), {
            userId: req.userId,
            purpose: req.body.questionnaireData?.purpose,
            country: req.body.questionnaireData?.country,
            statusCode,
        });
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
function getAIServiceURL() {
    return process.env.AI_SERVICE_URL || 'http://localhost:8001';
}
/**
 * POST /api/applications/:id/generate-checklist
 * Generate a personalized document checklist for a real user/application
 * Uses real DB data and AIUserContext (no mock data)
 */
router.post('/:id/generate-checklist', async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const userId = req.userId;
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: 'APPLICATION_ID_REQUIRED',
                message: 'Application ID is required',
            });
        }
        (0, logger_1.logInfo)('Generating checklist for application', {
            userId,
            applicationId,
        });
        // Step 1: Check if questionnaire summary exists
        const questionnaireSummary = await (0, ai_context_service_1.getQuestionnaireSummary)(userId);
        if (!questionnaireSummary) {
            (0, logger_1.logInfo)('Questionnaire summary missing', {
                userId,
                applicationId,
            });
            return res.status(400).json({
                success: false,
                error: 'QUESTIONNAIRE_MISSING',
                message: 'Questionnaire data is required to generate a checklist. Please complete the questionnaire first.',
            });
        }
        // Step 2: Build real AIUserContext (not mock)
        let aiUserContext;
        try {
            aiUserContext = await (0, ai_context_service_1.buildAIUserContext)(userId, applicationId);
            (0, logger_1.logInfo)('AIUserContext built successfully', {
                userId,
                applicationId,
                hasSummary: !!aiUserContext.questionnaireSummary,
            });
        }
        catch (contextError) {
            (0, logger_1.logError)('Failed to build AIUserContext', contextError, {
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
            const application = await applications_service_1.ApplicationsService.getApplication(applicationId, userId);
            if (!application) {
                return res.status(404).json({
                    success: false,
                    error: 'APPLICATION_NOT_FOUND',
                    message: 'Application not found',
                });
            }
            (0, logger_1.logInfo)('Generating checklist using OpenAI', {
                applicationId,
                userId,
                country: application.country.name,
                visaType: application.visaType.name,
            });
            const checklist = await ai_openai_service_1.AIOpenAIService.generateChecklist(aiUserContext, application.country.name, application.visaType.name);
            (0, logger_1.logInfo)('Checklist generated successfully', {
                userId,
                applicationId,
                checklistType: checklist.type,
                itemCount: checklist.checklist?.length || 0,
            });
            return res.json({
                success: true,
                checklist: checklist,
            });
        }
        catch (error) {
            (0, logger_1.logError)('Checklist generation failed', error, {
                userId,
                applicationId,
            });
            return res.status(500).json({
                success: false,
                error: 'CHECKLIST_FAILED',
                message: error.message || 'VisaBuddy could not generate your checklist. Please try again later.',
            });
        }
    }
    catch (error) {
        (0, logger_1.logError)('Checklist generation error', error, {
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
router.post('/:id/visa-probability', async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const userId = req.userId;
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: 'APPLICATION_ID_REQUIRED',
                message: 'Application ID is required',
            });
        }
        (0, logger_1.logInfo)('Generating visa probability for application', {
            userId,
            applicationId,
        });
        // Step 1: Check if questionnaire summary exists
        const questionnaireSummary = await (0, ai_context_service_1.getQuestionnaireSummary)(userId);
        if (!questionnaireSummary) {
            (0, logger_1.logInfo)('Questionnaire summary missing', {
                userId,
                applicationId,
            });
            return res.status(400).json({
                success: false,
                error: 'QUESTIONNAIRE_MISSING',
                message: 'Questionnaire data is required to generate a probability estimate. Please complete the questionnaire first.',
            });
        }
        // Step 2: Call AI service probability endpoint
        const aiServiceURL = getAIServiceURL();
        const probabilityEndpoint = `${aiServiceURL}/api/visa-probability`;
        (0, logger_1.logInfo)('Calling AI service for probability generation', {
            url: probabilityEndpoint,
            applicationId,
            userId,
        });
        try {
            const aiResponse = await axios_1.default.post(probabilityEndpoint, {
                application_id: applicationId,
                auth_token: req.headers.authorization?.replace('Bearer ', ''), // Pass JWT token for internal API calls
            }, {
                timeout: 60000, // 60 second timeout for AI generation
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (aiResponse.data.success && aiResponse.data.data) {
                const probability = aiResponse.data.data;
                (0, logger_1.logInfo)('Probability generated successfully', {
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
            }
            else {
                throw new Error(aiResponse.data.error || 'AI service returned unsuccessful response');
            }
        }
        catch (axiosError) {
            const error = axiosError;
            // Handle timeout
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                (0, logger_1.logError)('AI service timeout', error, {
                    userId,
                    applicationId,
                    url: probabilityEndpoint,
                });
                return res.status(504).json({
                    success: false,
                    error: 'PROBABILITY_FAILED',
                    message: 'VisaBuddy could not generate your probability estimate. The request timed out. Please try again later.',
                });
            }
            // Handle other errors
            (0, logger_1.logError)('AI service call failed', error, {
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
    }
    catch (error) {
        (0, logger_1.logError)('Probability generation error', error, {
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
router.get('/:id/risk-explanation', async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const userId = req.userId;
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: 'APPLICATION_ID_REQUIRED',
                message: 'Application ID is required',
            });
        }
        (0, logger_1.logInfo)('[RiskExplanation] Requesting risk explanation', {
            userId,
            applicationId,
        });
        const explanation = await visa_risk_explanation_service_1.VisaRiskExplanationService.generateRiskExplanation(userId, applicationId);
        res.json({
            success: true,
            data: explanation,
        });
    }
    catch (error) {
        (0, logger_1.logError)('[RiskExplanation] Error generating risk explanation', error, {
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
router.get('/:applicationId/checklist/:documentType/explanation', async (req, res, next) => {
    try {
        const applicationId = req.params.applicationId;
        const documentType = req.params.documentType;
        const userId = req.userId;
        if (!applicationId || !documentType) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_PARAMS',
                message: 'Application ID and document type are required',
            });
        }
        (0, logger_1.logInfo)('[ChecklistExplanation] Requesting document explanation', {
            userId,
            applicationId,
            documentType,
        });
        const explanation = await visa_checklist_explanation_service_1.VisaChecklistExplanationService.getExplanation(userId, applicationId, documentType);
        res.json({
            success: true,
            data: explanation,
        });
    }
    catch (error) {
        (0, logger_1.logError)('[ChecklistExplanation] Error generating explanation', error, {
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
});
/**
 * POST /api/applications/:id/checklist-feedback
 * Submit feedback about checklist quality
 */
router.post('/:id/checklist-feedback', async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const userId = req.userId;
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
        let checklistSnapshot = null;
        if (checklist?.checklistData) {
            try {
                checklistSnapshot =
                    typeof checklist.checklistData === 'string'
                        ? JSON.parse(checklist.checklistData)
                        : checklist.checklistData;
            }
            catch (e) {
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
                checklistSnapshot: JSON.stringify(checklistSnapshot),
                feedbackType,
                feedbackText,
            },
        });
        (0, logger_1.logInfo)('[ChecklistFeedback] Feedback submitted', {
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
    }
    catch (error) {
        (0, logger_1.logError)('[ChecklistFeedback] Error submitting feedback', error, {
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
exports.default = router;
//# sourceMappingURL=applications.js.map