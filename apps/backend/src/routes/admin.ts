import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import AdminService from '../services/admin.service';
import AnalyticsService from '../services/analytics.service';
import { VisaRulesService } from '../services/visa-rules.service';
import { EmbassySourceService } from '../services/embassy-source.service';
import { EmbassySyncJobService } from '../services/embassy-sync-job.service';
import { EmbassySyncSchedulerService } from '../services/embassy-sync-scheduler.service';

const router = express.Router();

/**
 * GET /api/admin/dashboard
 * Get main dashboard metrics
 */
router.get('/dashboard', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('[AdminRoute] GET /api/admin/dashboard - User ID:', (req as any).userId);
    const metrics = await AdminService.getDashboardMetrics();
    console.log('[AdminRoute] Dashboard metrics retrieved successfully');
    res.json(metrics);
  } catch (error) {
    console.error('[AdminRoute] Error fetching dashboard metrics:', error);
    if (error instanceof Error) {
      console.error('[AdminRoute] Error details:', error.message, error.stack);
    }
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

/**
 * GET /api/admin/analytics
 * Get analytics summary
 */
router.get('/analytics', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const analytics = await AdminService.getAnalyticsSummary();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/admin/users
 * Get all users with pagination
 */
router.get('/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = Math.min(parseInt(req.query.take as string) || 20, 100);

    console.log(`[AdminRoute] GET /api/admin/users - skip: ${skip}, take: ${take}`);
    const result = await AdminService.getUsers(skip, take);
    console.log(`[AdminRoute] Users retrieved: ${result.data.length} of ${result.total}`);
    res.json(result);
  } catch (error) {
    console.error('[AdminRoute] Error fetching users:', error);
    if (error instanceof Error) {
      console.error('[AdminRoute] Error details:', error.message, error.stack);
    }
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get user details
 */
router.get(
  '/users/:userId',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const user = await AdminService.getUserDetails(req.params.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  }
);

/**
 * PATCH /api/admin/users/:userId/role
 * Update user role
 */
router.patch(
  '/users/:userId/role',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ error: 'Role is required' });
      }

      const user = await AdminService.updateUserRole(req.params.userId, role);
      res.json({ message: 'User role updated', user });
    } catch (error: any) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: error.message || 'Failed to update user role' });
    }
  }
);

/**
 * GET /api/admin/applications
 * Get all applications with pagination
 */
router.get(
  '/applications',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = Math.min(parseInt(req.query.take as string) || 20, 100);

      console.log(`[AdminRoute] GET /api/admin/applications - skip: ${skip}, take: ${take}`);
      const result = await AdminService.getApplications(skip, take);
      console.log(`[AdminRoute] Applications retrieved: ${result.data.length} of ${result.total}`);
      res.json(result);
    } catch (error) {
      console.error('[AdminRoute] Error fetching applications:', error);
      if (error instanceof Error) {
        console.error('[AdminRoute] Error details:', error.message, error.stack);
      }
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  }
);

/**
 * PATCH /api/admin/applications/:applicationId/status
 * Update application status
 */
router.patch(
  '/applications/:applicationId/status',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const validStatuses = ['draft', 'submitted', 'approved', 'rejected', 'expired'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const application = await AdminService.updateApplicationStatus(
        req.params.applicationId,
        status
      );
      res.json({ message: 'Application status updated', application });
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({ error: 'Failed to update application status' });
    }
  }
);

/**
 * GET /api/admin/payments
 * Get all payments with pagination
 */
router.get('/payments', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = Math.min(parseInt(req.query.take as string) || 20, 100);

    const result = await AdminService.getPayments(skip, take);
    res.json(result);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

/**
 * GET /api/admin/documents/verification-queue
 * Get document verification queue
 */
router.get(
  '/documents/verification-queue',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = Math.min(parseInt(req.query.take as string) || 20, 100);

      const result = await AdminService.getDocumentVerificationQueue(skip, take);
      res.json(result);
    } catch (error) {
      console.error('Error fetching document verification queue:', error);
      res.status(500).json({ error: 'Failed to fetch document verification queue' });
    }
  }
);

/**
 * PATCH /api/admin/documents/:documentId/verify
 * Verify or reject document
 */
router.patch(
  '/documents/:documentId/verify',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      if (!['verified', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const document = await AdminService.updateDocumentStatus(
        req.params.documentId,
        status,
        notes
      );
      res.json({ message: 'Document verified', document });
    } catch (error) {
      console.error('Error verifying document:', error);
      res.status(500).json({ error: 'Failed to verify document' });
    }
  }
);

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/analytics/metrics
 * Get detailed metrics for a period
 */
router.get(
  '/analytics/metrics',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const metrics = await AnalyticsService.getMetrics(days);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }
);

/**
 * GET /api/admin/analytics/conversion-funnel
 * Get conversion funnel data
 */
router.get(
  '/analytics/conversion-funnel',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const funnel = await AnalyticsService.getConversionFunnel();
      res.json(funnel);
    } catch (error) {
      console.error('Error fetching conversion funnel:', error);
      res.status(500).json({ error: 'Failed to fetch conversion funnel' });
    }
  }
);

/**
 * GET /api/admin/analytics/user-acquisition
 * Get user acquisition breakdown by source
 */
router.get(
  '/analytics/user-acquisition',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const breakdown = await AnalyticsService.getUserAcquisition();
      res.json(breakdown);
    } catch (error) {
      console.error('Error fetching user acquisition:', error);
      res.status(500).json({ error: 'Failed to fetch user acquisition' });
    }
  }
);

/**
 * GET /api/admin/analytics/events
 * Get event breakdown
 */
router.get(
  '/analytics/events',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const events = await AnalyticsService.getEventBreakdown(days);
      res.json(events);
    } catch (error) {
      console.error('Error fetching event breakdown:', error);
      res.status(500).json({ error: 'Failed to fetch event breakdown' });
    }
  }
);

// ============================================================================
// EMBASSY RULES SYNC PIPELINE ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/visa-rules
 * List visa rule sets with filtering
 */
router.get('/visa-rules', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const countryCode = req.query.countryCode as string | undefined;
    const visaType = req.query.visaType as string | undefined;
    const isApproved = req.query.isApproved ? req.query.isApproved === 'true' : undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await VisaRulesService.listRuleSets({
      countryCode,
      visaType,
      isApproved,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[AdminRoute] Error listing visa rules:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list visa rules',
    });
  }
});

/**
 * GET /api/admin/visa-rules/:id
 * Get visa rule set by ID
 */
router.get(
  '/visa-rules/:id',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const ruleSet = await VisaRulesService.getRuleSetById(req.params.id);

      if (!ruleSet) {
        return res.status(404).json({
          success: false,
          error: 'Rule set not found',
        });
      }

      res.json({
        success: true,
        data: ruleSet,
      });
    } catch (error: any) {
      console.error('[AdminRoute] Error getting visa rule set:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get visa rule set',
      });
    }
  }
);

/**
 * POST /api/admin/visa-rules/:id/approve
 * Approve a visa rule set
 */
router.post(
  '/visa-rules/:id/approve',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const result = await VisaRulesService.approveRuleSet(req.params.id, userId);

      res.json({
        success: true,
        data: result,
        message: 'Rule set approved successfully',
      });
    } catch (error: any) {
      console.error('[AdminRoute] Error approving visa rule set:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to approve visa rule set',
      });
    }
  }
);

/**
 * POST /api/admin/visa-rules/:id/reject
 * Reject a visa rule set
 */
router.post(
  '/visa-rules/:id/reject',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
        });
      }

      const result = await VisaRulesService.rejectRuleSet(req.params.id, userId, reason);

      res.json({
        success: true,
        data: result,
        message: 'Rule set rejected successfully',
      });
    } catch (error: any) {
      console.error('[AdminRoute] Error rejecting visa rule set:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to reject visa rule set',
      });
    }
  }
);

/**
 * GET /api/admin/visa-rules/:id1/compare/:id2
 * Compare two visa rule sets
 */
router.get(
  '/visa-rules/:id1/compare/:id2',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const result = await VisaRulesService.compareRuleSets(req.params.id1, req.params.id2);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[AdminRoute] Error comparing visa rule sets:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to compare visa rule sets',
      });
    }
  }
);

/**
 * GET /api/admin/embassy-sources
 * List embassy sources
 */
router.get(
  '/embassy-sources',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const countryCode = req.query.countryCode as string | undefined;
      const visaType = req.query.visaType as string | undefined;
      const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await EmbassySourceService.listSources({
        countryCode,
        visaType,
        isActive,
        limit,
        offset,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[AdminRoute] Error listing embassy sources:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list embassy sources',
      });
    }
  }
);

/**
 * POST /api/admin/embassy-sources
 * Add a new embassy source
 */
router.post(
  '/embassy-sources',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { countryCode, visaType, url, name, description, priority, fetchInterval, metadata } =
        req.body;

      if (!countryCode || !visaType || !url) {
        return res.status(400).json({
          success: false,
          error: 'countryCode, visaType, and url are required',
        });
      }

      const source = await EmbassySourceService.addSource({
        countryCode,
        visaType,
        url,
        name,
        description,
        priority,
        fetchInterval,
        metadata,
      });

      res.json({
        success: true,
        data: source,
        message: 'Embassy source added successfully',
      });
    } catch (error: any) {
      console.error('[AdminRoute] Error adding embassy source:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add embassy source',
      });
    }
  }
);

/**
 * POST /api/admin/embassy-sources/:id/sync
 * Manually trigger sync for a source
 */
router.post(
  '/embassy-sources/:id/sync',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      await EmbassySyncJobService.enqueueSync(req.params.id);

      res.json({
        success: true,
        message: 'Sync job enqueued successfully',
      });
    } catch (error: any) {
      console.error('[AdminRoute] Error triggering sync:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to trigger sync',
      });
    }
  }
);

/**
 * POST /api/admin/embassy-sync/trigger
 * Manually trigger sync for all pending sources
 */
router.post(
  '/embassy-sync/trigger',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const count = await EmbassySyncSchedulerService.triggerManualSync();

      res.json({
        success: true,
        data: {
          jobsEnqueued: count,
        },
        message: `Sync jobs enqueued for ${count} sources`,
      });
    } catch (error: any) {
      console.error('[AdminRoute] Error triggering manual sync:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to trigger manual sync',
      });
    }
  }
);

/**
 * GET /api/admin/embassy-sync/queue-stats
 * Get queue statistics
 */
router.get(
  '/embassy-sync/queue-stats',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const stats = await EmbassySyncJobService.getQueueStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('[AdminRoute] Error getting queue stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get queue stats',
      });
    }
  }
);

/**
 * GET /api/admin/_debug/version
 * Debug endpoint to verify which version is running
 */
router.get(
  '/_debug/version',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const hasEmbassySyncRoutes =
        typeof EmbassySyncSchedulerService.triggerManualSync === 'function';

      res.json({
        version: 'embassy-sync-v1',
        hasEmbassySyncRoutes,
        timestamp: new Date().toISOString(),
        routes: {
          'POST /api/admin/embassy-sync/trigger': hasEmbassySyncRoutes,
          'GET /api/admin/embassy-sync/queue-stats': hasEmbassySyncRoutes,
          'GET /api/admin/embassy-sources': true,
          'POST /api/admin/embassy-sources': true,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get version info',
      });
    }
  }
);

export default router;
