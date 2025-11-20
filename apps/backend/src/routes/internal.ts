/**
 * Internal Routes
 * Routes for internal service-to-service communication
 * These routes may have different authentication/authorization requirements
 */

import express, { Request, Response, NextFunction } from "express";
import { authenticateToken } from "../middleware/auth";
import { ApiError } from "../utils/errors";
import { buildAIUserContext } from "../services/ai-context.service";
import { logError } from "../middleware/logger";

const router = express.Router();

/**
 * GET /internal/ai-context/:applicationId
 * Get AI user context for an application
 * Used by AI service to get structured context
 * Protected route - requires JWT token & user ownership
 */
router.get(
  "/ai-context/:applicationId",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const applicationId = req.params.applicationId;

      if (!applicationId) {
        throw new ApiError(400, "Application ID is required");
      }

      // Build AI user context
      const context = await buildAIUserContext(userId, applicationId);

      res.json({
        success: true,
        data: context,
      });
    } catch (error) {
      logError("Failed to get AI context", error as Error, {
        userId: (req as any).userId,
        applicationId: req.params.applicationId,
      });
      next(error);
    }
  }
);

export default router;

