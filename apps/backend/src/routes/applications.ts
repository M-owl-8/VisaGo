import express, { Request, Response, NextFunction } from "express";
import { ApplicationsService } from "../services/applications.service";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/applications
 * Get all applications for logged-in user
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
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
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const application = await ApplicationsService.getApplication(req.params.id, req.userId!);

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
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
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
router.put("/:id/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;

    const application = await ApplicationsService.updateApplicationStatus(
      req.params.id,
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
router.put("/:id/checkpoints/:checkpointId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;

    const checkpoint = await ApplicationsService.updateCheckpoint(
      req.params.id,
      req.userId!,
      req.params.checkpointId,
      status
    );

    res.json({
      success: true,
      data: checkpoint,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/applications/:id
 * Delete application
 */
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ApplicationsService.deleteApplication(req.params.id, req.userId!);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;