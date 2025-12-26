/**
 * Document Check Routes
 *
 * Phase 3.2: API routes for document checking functionality.
 */

import express, { Request, Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DocCheckService } from '../services/doc-check.service';
import { ApplicationsService } from '../services/applications.service';
import { DocCheckQueueService } from '../services/doc-check-queue.service';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';

const router = Router();
const prisma = new PrismaClient();

// Require authentication for all doc-check routes
router.use(authenticateToken);

/**
 * POST /api/doc-check/:applicationId/run
 *
 * Triggers document check for all checklist items of an application.
 */
router.post('/:applicationId/run', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { applicationId } = req.params;

    // Verify user owns the application (canonical + legacy)
    const application = await ApplicationsService.getApplication(applicationId, userId);

    const useQueue = process.env.ENABLE_DOC_CHECK_QUEUE !== 'false';

    if (useQueue) {
      try {
        await DocCheckQueueService.enqueueDocCheck(applicationId, userId);
        logInfo('[DocCheck] Enqueued document check job', { applicationId, userId });
        return res.status(202).json({
          success: true,
          data: {
            status: 'queued',
          },
        });
      } catch (queueError: any) {
        logWarn('[DocCheck] Queue enqueue failed, falling back to sync run', {
          applicationId,
          error: queueError instanceof Error ? queueError.message : String(queueError),
        });
      }
    }

    logInfo('[DocCheck] Starting document check run', {
      applicationId,
      userId,
    });

    await DocCheckService.checkAllItemsForApplication(applicationId, userId);

    const summary = await DocCheckService.computeReadiness(applicationId);

    res.json({
      success: true,
      data: {
        status: 'completed',
        summary,
      },
    });
  } catch (error: any) {
    logError('[DocCheck] Run failed', error as Error, {
      applicationId: req.params.applicationId,
    });

    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to run document check',
      },
    });
  }
});

/**
 * GET /api/doc-check/:applicationId/summary
 *
 * Returns readiness summary and per-item statuses.
 */
router.get('/:applicationId/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { applicationId } = req.params;

    // Verify user owns the application (canonical + legacy)
    const application = await ApplicationsService.getApplication(applicationId, userId);

    // Compute readiness
    const readiness = await DocCheckService.computeReadiness(applicationId);

    // Load all check results
    // TODO: documentCheckResult model doesn't exist in schema - need to implement or use DocumentChecklist
    const checkResults: any[] = []; // await prisma.documentCheckResult.findMany({ where: { applicationId } });

    // Load checklist to get item details
    const { DocumentChecklistService } = await import('../services/document-checklist.service');
    const checklist = await DocumentChecklistService.generateChecklist(applicationId, userId);

    // Handle status object
    if (!checklist || 'status' in checklist) {
      return res.json({
        success: true,
        data: {
          applicationId,
          readinessPercent: 0,
          totalItems: 0,
          okCount: 0,
          weakCount: 0,
          missingCount: 0,
          items: [],
        },
      });
    }

    const items = checklist.items || [];

    // Map items with their check results
    const itemsWithStatus = items.map((item: any) => {
      const itemId = (item as any).document || item.name || item.id || 'unknown';
      const result = checkResults.find((r: any) => r.checklistItemId === itemId);

      // Map raw status to UI status
      let status: 'OK' | 'WEAK' | 'MISSING' = 'MISSING';
      if (result) {
        if (result.status === 'OK') {
          status = 'OK';
        } else if (result.status === 'PROBLEM' || result.status === 'UNCERTAIN') {
          status = 'WEAK';
        } else {
          status = 'MISSING';
        }
      }

      // Parse problems and suggestions from JSON
      let problems: any[] = [];
      let suggestions: any[] = [];

      if (result) {
        try {
          if (result.problemsJson) {
            problems = JSON.parse(result.problemsJson as string);
          }
          if (result.suggestionsJson) {
            suggestions = JSON.parse(result.suggestionsJson as string);
          }
        } catch (parseError) {
          // If parsing fails, leave empty arrays
          logError('[DocCheck] Failed to parse JSON', parseError as Error, {
            resultId: result.id,
          });
        }
      }

      return {
        checklistItemId: itemId,
        name: item.name || item.document || 'Unknown',
        category: item.category || 'optional',
        status,
        rawStatus: result?.status || null,
        problems,
        suggestions,
        documentId: result?.documentId || null,
      };
    });

    res.json({
      success: true,
      data: {
        applicationId,
        readinessPercent: readiness.readinessPercent,
        totalItems: readiness.totalItems,
        okCount: readiness.okCount,
        weakCount: readiness.weakCount,
        missingCount: readiness.missingCount,
        items: itemsWithStatus,
      },
    });
  } catch (error: any) {
    logError('[DocCheck] Summary failed', error as Error, {
      applicationId: req.params.applicationId,
    });

    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get document check summary',
      },
    });
  }
});

export default router;
