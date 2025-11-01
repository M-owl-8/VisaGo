"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const applications_service_1 = require("../services/applications.service");
const auth_1 = require("../middleware/auth");
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
exports.default = router;
//# sourceMappingURL=applications.js.map