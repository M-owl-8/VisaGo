"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const applications_service_1 = require("../services/applications.service");
const ai_application_service_1 = require("../services/ai-application.service");
const auth_1 = require("../middleware/auth");
const ai_context_service_1 = require("../services/ai-context.service");
const logger_1 = require("../middleware/logger");
const ai_openai_service_1 = require("../services/ai-openai.service");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticateToken);
/**
 * GET /api/applications
 * Get all applications for logged-in user
 */
router.get("/", async (req, res, next) => {
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
router.get("/:id", async (req, res, next) => {
    try {
        const application = await applications_service_1.ApplicationsService.getApplication(req.params.id, req.userId);
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
router.post("/", async (req, res, next) => {
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
router.put("/:id/status", async (req, res, next) => {
    try {
        const { status } = req.body;
        const application = await applications_service_1.ApplicationsService.updateApplicationStatus(req.params.id, req.userId, status);
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
router.put("/:id/checkpoints/:checkpointId", async (req, res, next) => {
    try {
        const { status } = req.body;
        const checkpoint = await applications_service_1.ApplicationsService.updateCheckpoint(req.params.id, req.userId, req.params.checkpointId, status);
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
router.delete("/:id", async (req, res, next) => {
    try {
        const result = await applications_service_1.ApplicationsService.deleteApplication(req.params.id, req.userId);
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
router.post("/ai-generate", async (req, res, next) => {
    try {
        const { questionnaireData } = req.body;
        if (!questionnaireData) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Questionnaire data is required",
                },
            });
        }
        const result = await ai_application_service_1.AIApplicationService.generateApplicationFromQuestionnaire(req.userId, questionnaireData);
        res.status(201).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get AI service URL from environment
 */
function getAIServiceURL() {
    return process.env.AI_SERVICE_URL || "http://localhost:8001";
}
/**
 * POST /api/applications/:id/generate-checklist
 * Generate a personalized document checklist for a real user/application
 * Uses real DB data and AIUserContext (no mock data)
 */
router.post("/:id/generate-checklist", async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const userId = req.userId;
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: "APPLICATION_ID_REQUIRED",
                message: "Application ID is required",
            });
        }
        (0, logger_1.logInfo)("Generating checklist for application", {
            userId,
            applicationId,
        });
        // Step 1: Check if questionnaire summary exists
        const questionnaireSummary = await (0, ai_context_service_1.getQuestionnaireSummary)(userId);
        if (!questionnaireSummary) {
            (0, logger_1.logInfo)("Questionnaire summary missing", {
                userId,
                applicationId,
            });
            return res.status(400).json({
                success: false,
                error: "QUESTIONNAIRE_MISSING",
                message: "Questionnaire data is required to generate a checklist. Please complete the questionnaire first.",
            });
        }
        // Step 2: Build real AIUserContext (not mock)
        let aiUserContext;
        try {
            aiUserContext = await (0, ai_context_service_1.buildAIUserContext)(userId, applicationId);
            (0, logger_1.logInfo)("AIUserContext built successfully", {
                userId,
                applicationId,
                hasSummary: !!aiUserContext.questionnaireSummary,
            });
        }
        catch (contextError) {
            (0, logger_1.logError)("Failed to build AIUserContext", contextError, {
                userId,
                applicationId,
            });
            return res.status(500).json({
                success: false,
                error: "CONTEXT_BUILD_FAILED",
                message: "Failed to build application context. Please try again later.",
            });
        }
        // Step 3: Generate checklist using OpenAI directly
        try {
            const application = await applications_service_1.ApplicationsService.getApplication(applicationId, userId);
            if (!application) {
                return res.status(404).json({
                    success: false,
                    error: "APPLICATION_NOT_FOUND",
                    message: "Application not found",
                });
            }
            (0, logger_1.logInfo)("Generating checklist using OpenAI", {
                applicationId,
                userId,
                country: application.country.name,
                visaType: application.visaType.name,
            });
            const checklist = await ai_openai_service_1.AIOpenAIService.generateChecklist(aiUserContext, application.country.name, application.visaType.name);
            (0, logger_1.logInfo)("Checklist generated successfully", {
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
            (0, logger_1.logError)("Checklist generation failed", error, {
                userId,
                applicationId,
            });
            return res.status(500).json({
                success: false,
                error: "CHECKLIST_FAILED",
                message: error.message || "VisaBuddy could not generate your checklist. Please try again later.",
            });
        }
    }
    catch (error) {
        (0, logger_1.logError)("Checklist generation error", error, {
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
router.post("/:id/visa-probability", async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const userId = req.userId;
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: "APPLICATION_ID_REQUIRED",
                message: "Application ID is required",
            });
        }
        (0, logger_1.logInfo)("Generating visa probability for application", {
            userId,
            applicationId,
        });
        // Step 1: Check if questionnaire summary exists
        const questionnaireSummary = await (0, ai_context_service_1.getQuestionnaireSummary)(userId);
        if (!questionnaireSummary) {
            (0, logger_1.logInfo)("Questionnaire summary missing", {
                userId,
                applicationId,
            });
            return res.status(400).json({
                success: false,
                error: "QUESTIONNAIRE_MISSING",
                message: "Questionnaire data is required to generate a probability estimate. Please complete the questionnaire first.",
            });
        }
        // Step 2: Call AI service probability endpoint
        const aiServiceURL = getAIServiceURL();
        const probabilityEndpoint = `${aiServiceURL}/api/visa-probability`;
        (0, logger_1.logInfo)("Calling AI service for probability generation", {
            url: probabilityEndpoint,
            applicationId,
            userId,
        });
        try {
            const aiResponse = await axios_1.default.post(probabilityEndpoint, {
                application_id: applicationId,
                auth_token: req.headers.authorization?.replace("Bearer ", ""), // Pass JWT token for internal API calls
            }, {
                timeout: 60000, // 60 second timeout for AI generation
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (aiResponse.data.success && aiResponse.data.data) {
                const probability = aiResponse.data.data;
                (0, logger_1.logInfo)("Probability generated successfully", {
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
                throw new Error(aiResponse.data.error || "AI service returned unsuccessful response");
            }
        }
        catch (axiosError) {
            const error = axiosError;
            // Handle timeout
            if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
                (0, logger_1.logError)("AI service timeout", error, {
                    userId,
                    applicationId,
                    url: probabilityEndpoint,
                });
                return res.status(504).json({
                    success: false,
                    error: "PROBABILITY_FAILED",
                    message: "VisaBuddy could not generate your probability estimate. The request timed out. Please try again later.",
                });
            }
            // Handle other errors
            (0, logger_1.logError)("AI service call failed", error, {
                userId,
                applicationId,
                url: probabilityEndpoint,
                status: error.response?.status,
                data: error.response?.data,
            });
            return res.status(500).json({
                success: false,
                error: "PROBABILITY_FAILED",
                message: "VisaBuddy could not generate your probability estimate. Please try again later.",
            });
        }
    }
    catch (error) {
        (0, logger_1.logError)("Probability generation error", error, {
            userId: req.userId,
            applicationId: req.params.id,
        });
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=applications.js.map