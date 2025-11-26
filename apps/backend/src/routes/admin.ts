import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import AdminService from '../services/admin.service';
import AnalyticsService from '../services/analytics.service';

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

export default router;
