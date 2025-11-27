/**
 * Document Checklist routes
 * Handles AI-generated document checklists
 */

import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DocumentChecklistService } from '../services/document-checklist.service';
import { successResponse, errorResponse } from '../utils/response';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';
import { logWarn } from '../middleware/logger';

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
router.get('/:applicationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return errorResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        'User ID not found in request',
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const { applicationId } = req.params;

    const result = await DocumentChecklistService.generateChecklist(applicationId, req.userId);

    // Handle different return types: checklist or status object
    if ('status' in result && !('items' in result)) {
      // This is a status object, not a checklist
      if (result.status === 'processing') {
        return res.status(200).json({
          success: true,
          status: 'processing',
          message: 'Checklist generation in progress. Please check again in a moment.',
        });
      }
      if (result.status === 'failed') {
        // Should not happen anymore since service generates fallback, but handle gracefully
        logWarn('[Checklist][Route] Received failed status, this should not happen', {
          applicationId,
        });
        // Return processing status to trigger retry with fallback
        return res.status(200).json({
          success: true,
          status: 'processing',
          message: 'Checklist generation in progress. Please check again in a moment.',
        });
      }
    }

    // Type guard: result is a DocumentChecklist (has 'items' property)
    if (!('items' in result)) {
      return errorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Invalid checklist response format',
        'CHECKLIST_INVALID_FORMAT'
      );
    }

    // result is confirmed to be a DocumentChecklist
    const checklist = result;

    // Format response with summary
    const response = {
      applicationId: checklist.applicationId,
      items: checklist.items,
      summary: {
        total: checklist.items.length,
        uploaded: checklist.items.filter((i) => i.status !== 'missing').length,
        verified: checklist.items.filter((i) => i.status === 'verified').length,
        missing: checklist.items.filter((i) => i.status === 'missing').length,
        rejected: checklist.items.filter((i) => i.status === 'rejected').length,
      },
      progress: checklist.progress,
    };

    successResponse(res, response);
  } catch (error) {
    next(error);
  }
});

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
  '/:applicationId/items/:itemId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return errorResponse(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          'User ID not found in request',
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const { applicationId, itemId } = req.params;
      const { status, documentId } = req.body;

      await DocumentChecklistService.updateItemStatus(applicationId, itemId, status, documentId);

      // Regenerate checklist to return updated version
      const checklistResult = await DocumentChecklistService.generateChecklist(
        applicationId,
        req.userId
      );

      // Handle status objects
      if ('status' in checklistResult && !('items' in checklistResult)) {
        if (checklistResult.status === 'processing') {
          return res.status(200).json({
            success: true,
            status: 'processing',
            message: 'Checklist generation in progress.',
          });
        }
        if (checklistResult.status === 'failed') {
          return errorResponse(
            res,
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            checklistResult.errorMessage || 'Failed to generate checklist',
            'CHECKLIST_GENERATION_FAILED'
          );
        }
      }

      // Type guard: ensure it's a DocumentChecklist
      if (!('items' in checklistResult)) {
        return errorResponse(
          res,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          'Invalid checklist response format',
          'CHECKLIST_INVALID_FORMAT'
        );
      }

      successResponse(res, checklistResult);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
