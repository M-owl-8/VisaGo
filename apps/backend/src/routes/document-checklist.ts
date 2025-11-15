/**
 * Document Checklist routes
 * Handles AI-generated document checklists
 */

import express, { Request, Response, NextFunction } from "express";
import { authenticateToken } from "../middleware/auth";
import { DocumentChecklistService } from "../services/document-checklist.service";
import { successResponse, errorResponse } from "../utils/response";
import { HTTP_STATUS, ERROR_CODES } from "../config/constants";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/document-checklist/:applicationId
 * Get document checklist for an application
 * 
 * @route GET /api/document-checklist/:applicationId
 * @access Private
 * @returns {object} Document checklist
 */
router.get(
  "/:applicationId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return errorResponse(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          "User ID not found in request",
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const { applicationId } = req.params;

      const checklist = await DocumentChecklistService.generateChecklist(
        applicationId,
        req.userId
      );

      // Format response with summary
      const response = {
        applicationId: checklist.applicationId,
        items: checklist.items,
        summary: {
          total: checklist.items.length,
          uploaded: checklist.items.filter(i => i.status !== 'missing').length,
          verified: checklist.items.filter(i => i.status === 'verified').length,
          missing: checklist.items.filter(i => i.status === 'missing').length,
          rejected: checklist.items.filter(i => i.status === 'rejected').length,
          progress: checklist.progress,
        },
      };

      successResponse(res, response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/document-checklist/:applicationId/items/:itemId
 * Update checklist item status
 * 
 * @route PUT /api/document-checklist/:applicationId/items/:itemId
 * @access Private
 * @body {string} status - Item status
 * @body {string} [documentId] - Document ID if uploaded
 * @returns {object} Updated checklist
 */
router.put(
  "/:applicationId/items/:itemId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return errorResponse(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          "User ID not found in request",
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const { applicationId, itemId } = req.params;
      const { status, documentId } = req.body;

      await DocumentChecklistService.updateItemStatus(
        applicationId,
        itemId,
        status,
        documentId
      );

      // Regenerate checklist to return updated version
      const checklist = await DocumentChecklistService.generateChecklist(
        applicationId,
        req.userId
      );

      successResponse(res, checklist);
    } catch (error) {
      next(error);
    }
  }
);

export default router;









