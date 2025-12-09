import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import AdminService from '../services/admin.service';
import AnalyticsService from '../services/analytics.service';
import AdminLogService from '../services/admin-log.service';
import { VisaRulesService } from '../services/visa-rules.service';
import { EmbassySourceService } from '../services/embassy-source.service';
import { EmbassySyncJobService } from '../services/embassy-sync-job.service';
import { EmbassySyncSchedulerService } from '../services/embassy-sync-scheduler.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
 *
 * CHANGED: Returns data formatted for admin panel with summary fields
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

    // Format rule sets for admin panel
    const formattedRuleSets = result.ruleSets.map((ruleSet) => {
      // Parse data if it's a string (SQLite) or use directly (PostgreSQL)
      const data = typeof ruleSet.data === 'string' ? JSON.parse(ruleSet.data) : ruleSet.data;

      // Extract summary information
      const requiredDocsCount = data.requiredDocuments?.length || 0;
      const summary = {
        requiredDocumentsCount: requiredDocsCount,
        hasFinancialRequirements: !!data.financialRequirements,
        hasProcessingInfo: !!data.processingInfo,
        hasFees: !!data.fees,
      };

      return {
        id: ruleSet.id,
        countryCode: ruleSet.countryCode,
        visaType: ruleSet.visaType,
        version: ruleSet.version,
        createdAt: ruleSet.createdAt,
        updatedAt: ruleSet.updatedAt,
        isApproved: ruleSet.isApproved,
        approvedAt: ruleSet.approvedAt,
        approvedBy: ruleSet.approvedBy,
        sourceSummary: ruleSet.sourceSummary,
        source: ruleSet.source
          ? {
              id: ruleSet.source.id,
              url: ruleSet.source.url,
              name: ruleSet.source.name,
            }
          : null,
        summary,
        // Include full data if needed (can be large)
        data: data,
      };
    });

    res.json({
      success: true,
      data: {
        ruleSets: formattedRuleSets,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
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
 *
 * CHANGED: Returns data formatted for admin panel with summary fields
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

      // Parse data if it's a string (SQLite) or use directly (PostgreSQL)
      const data = typeof ruleSet.data === 'string' ? JSON.parse(ruleSet.data) : ruleSet.data;

      // Extract summary information
      const requiredDocsCount = data.requiredDocuments?.length || 0;
      const summary = {
        requiredDocumentsCount: requiredDocsCount,
        hasFinancialRequirements: !!data.financialRequirements,
        hasProcessingInfo: !!data.processingInfo,
        hasFees: !!data.fees,
        processingDays: data.processingInfo?.processingDays,
        minimumBalance: data.financialRequirements?.minimumBalance,
        currency: data.financialRequirements?.currency || data.fees?.currency,
      };

      // Format versions
      const formattedVersions = ruleSet.versions.map((version) => ({
        id: version.id,
        version: version.version,
        createdAt: version.createdAt,
        changeLog: version.changeLog,
        data: typeof version.data === 'string' ? JSON.parse(version.data) : version.data,
      }));

      res.json({
        success: true,
        data: {
          id: ruleSet.id,
          countryCode: ruleSet.countryCode,
          visaType: ruleSet.visaType,
          version: ruleSet.version,
          createdAt: ruleSet.createdAt,
          updatedAt: ruleSet.updatedAt,
          isApproved: ruleSet.isApproved,
          approvedAt: ruleSet.approvedAt,
          approvedBy: ruleSet.approvedBy,
          rejectionReason: ruleSet.rejectionReason,
          sourceSummary: ruleSet.sourceSummary,
          extractionMetadata: ruleSet.extractionMetadata
            ? typeof ruleSet.extractionMetadata === 'string'
              ? JSON.parse(ruleSet.extractionMetadata)
              : ruleSet.extractionMetadata
            : null,
          source: ruleSet.source,
          summary,
          data,
          versions: formattedVersions,
        },
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
 * PATCH /api/admin/visa-rules/:id
 * Update visa rule set data (e.g., edit conditions)
 */
router.patch(
  '/visa-rules/:id',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { data } = req.body;

      if (!data) {
        return res.status(400).json({
          success: false,
          error: 'Data is required',
        });
      }

      const result = await VisaRulesService.updateRuleSetData(req.params.id, data, userId);

      res.json({
        success: true,
        data: result,
        message: 'Rule set updated successfully',
      });
    } catch (error: any) {
      console.error('[AdminRoute] Error updating visa rule set:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update visa rule set',
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
 * GET /api/admin/visa-rule-candidates
 * List visa rule set candidates
 */
router.get(
  '/visa-rule-candidates',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const countryCode = req.query.countryCode as string | undefined;
      const visaType = req.query.visaType as string | undefined;
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const where: any = {};
      if (countryCode) where.countryCode = countryCode.toUpperCase();
      if (visaType) where.visaType = visaType.toLowerCase();
      if (status) where.status = status;

      const [candidates, total] = await Promise.all([
        prisma.visaRuleSetCandidate.findMany({
          where,
          include: {
            source: {
              select: {
                id: true,
                name: true,
                url: true,
              },
            },
            pageContent: {
              select: {
                id: true,
                url: true,
                title: true,
                fetchedAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.visaRuleSetCandidate.count({ where }),
      ]);

      // Parse data if it's a string (SQLite) or use directly (PostgreSQL)
      const formattedCandidates = candidates.map((candidate: any) => ({
        id: candidate.id,
        countryCode: candidate.countryCode,
        visaType: candidate.visaType,
        confidence: candidate.confidence,
        status: candidate.status,
        reviewedBy: candidate.reviewedBy,
        reviewedAt: candidate.reviewedAt,
        reviewNotes: candidate.reviewNotes,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        source: candidate.source,
        pageContent: candidate.pageContent,
        data: typeof candidate.data === 'string' ? JSON.parse(candidate.data) : candidate.data,
        extractionMetadata:
          typeof candidate.extractionMetadata === 'string'
            ? JSON.parse(candidate.extractionMetadata)
            : candidate.extractionMetadata,
      }));

      res.json({
        success: true,
        data: {
          candidates: formattedCandidates,
          total,
          limit,
          offset,
        },
      });

      await prisma.$disconnect();
    } catch (error: any) {
      console.error('[AdminRoute] Error listing candidates:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list candidates',
      });
    }
  }
);

/**
 * GET /api/admin/visa-rule-candidates/:id
 * Get candidate detail with diff
 */
router.get(
  '/visa-rule-candidates/:id',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const candidate = await prisma.visaRuleSetCandidate.findUnique({
        where: { id: req.params.id },
        include: {
          source: true,
          pageContent: true,
        },
      });

      if (!candidate) {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found',
        });
      }

      // Parse data
      const candidateData =
        typeof candidate.data === 'string' ? JSON.parse(candidate.data) : candidate.data;
      const extractionMetadata =
        typeof candidate.extractionMetadata === 'string'
          ? JSON.parse(candidate.extractionMetadata)
          : candidate.extractionMetadata;

      // Get existing approved rule set for comparison
      let existingRuleSet = null;
      try {
        existingRuleSet = await VisaRulesService.getActiveRuleSet(
          candidate.countryCode,
          candidate.visaType
        );
      } catch (error) {
        // No existing rule set is fine
      }

      // Get diff from extraction metadata
      const diff = extractionMetadata?.diff || null;

      res.json({
        success: true,
        data: {
          id: candidate.id,
          countryCode: candidate.countryCode,
          visaType: candidate.visaType,
          confidence: candidate.confidence,
          status: candidate.status,
          reviewedBy: candidate.reviewedBy,
          reviewedAt: candidate.reviewedAt,
          reviewNotes: candidate.reviewNotes,
          createdAt: candidate.createdAt,
          updatedAt: candidate.updatedAt,
          source: candidate.source,
          pageContent: candidate.pageContent,
          data: candidateData,
          extractionMetadata,
          existingRuleSet,
          diff,
        },
      });

      await prisma.$disconnect();
    } catch (error: any) {
      console.error('[AdminRoute] Error getting candidate:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get candidate',
      });
    }
  }
);

/**
 * POST /api/admin/visa-rule-candidates/:id/approve
 * Approve a candidate and create new VisaRuleSet
 */
router.post(
  '/visa-rule-candidates/:id/approve',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const candidate = await prisma.visaRuleSetCandidate.findUnique({
        where: { id: req.params.id },
        include: {
          source: true,
        },
      });

      if (!candidate) {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found',
        });
      }

      if (candidate.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Candidate is not pending (status: ${candidate.status})`,
        });
      }

      // Parse candidate data
      const candidateData =
        typeof candidate.data === 'string' ? JSON.parse(candidate.data) : candidate.data;

      // Get latest version number
      const latest = await prisma.visaRuleSet.findFirst({
        where: {
          countryCode: candidate.countryCode,
          visaType: candidate.visaType,
        },
        orderBy: {
          version: 'desc',
        },
      });

      const nextVersion = latest ? latest.version + 1 : 1;

      // Unapprove all other versions for this country/visa type
      await prisma.visaRuleSet.updateMany({
        where: {
          countryCode: candidate.countryCode,
          visaType: candidate.visaType,
        },
        data: {
          isApproved: false,
        },
      });

      // Create new approved rule set
      const dataSerialized = JSON.stringify(candidateData);
      const ruleSet = await prisma.visaRuleSet.create({
        data: {
          countryCode: candidate.countryCode,
          visaType: candidate.visaType,
          data: dataSerialized as any,
          version: nextVersion,
          createdBy: userId,
          sourceSummary: candidate.source?.name || `Extracted from ${candidate.source?.url}`,
          sourceId: candidate.sourceId,
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: userId,
        },
      });

      // Create change log entry
      const extractionMetadata =
        typeof candidate.extractionMetadata === 'string'
          ? JSON.parse(candidate.extractionMetadata)
          : candidate.extractionMetadata;
      const diff = extractionMetadata?.diff || null;

      await prisma.visaRuleSetChangeLog.create({
        data: {
          ruleSetId: ruleSet.id,
          changeType: 'created',
          changedBy: userId,
          changeDetails: diff ? { diff } : null,
          description: `Approved candidate ${candidate.id} as version ${nextVersion}`,
        },
      });

      // Update candidate status
      await prisma.visaRuleSetCandidate.update({
        where: { id: candidate.id },
        data: {
          status: 'approved',
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: {
          ruleSetId: ruleSet.id,
          version: nextVersion,
          candidateId: candidate.id,
        },
        message: 'Candidate approved and rule set created',
      });

      await prisma.$disconnect();
    } catch (error: any) {
      console.error('[AdminRoute] Error approving candidate:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to approve candidate',
      });
    }
  }
);

/**
 * POST /api/admin/visa-rule-candidates/:id/reject
 * Reject a candidate
 */
router.post(
  '/visa-rule-candidates/:id/reject',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { notes } = req.body;
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const candidate = await prisma.visaRuleSetCandidate.findUnique({
        where: { id: req.params.id },
      });

      if (!candidate) {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found',
        });
      }

      if (candidate.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Candidate is not pending (status: ${candidate.status})`,
        });
      }

      await prisma.visaRuleSetCandidate.update({
        where: { id: candidate.id },
        data: {
          status: 'rejected',
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNotes: notes || null,
        },
      });

      res.json({
        success: true,
        message: 'Candidate rejected',
      });

      await prisma.$disconnect();
    } catch (error: any) {
      console.error('[AdminRoute] Error rejecting candidate:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to reject candidate',
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
 * GET /api/admin/checklist-stats
 * Get checklist generation statistics
 */
router.get(
  '/checklist-stats',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Get all checklists from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const checklists = await prisma.documentChecklist.findMany({
        where: {
          generatedAt: {
            gte: thirtyDaysAgo,
          },
          status: 'ready',
        },
        include: {
          application: {
            include: {
              country: true,
              visaType: true,
            },
          },
        },
      });

      // Aggregate by country
      const countryStats: Record<
        string,
        {
          country: string;
          countryCode: string;
          total: number;
          rulesMode: number;
          legacyMode: number;
          fallbackMode: number;
          totalItems: number;
          averageItems: number;
        }
      > = {};

      for (const checklist of checklists) {
        const countryCode = checklist.application.country.code.toUpperCase();
        const countryName = checklist.application.country.name;

        if (!countryStats[countryCode]) {
          countryStats[countryCode] = {
            country: countryName,
            countryCode,
            total: 0,
            rulesMode: 0,
            legacyMode: 0,
            fallbackMode: 0,
            totalItems: 0,
            averageItems: 0,
          };
        }

        const stats = countryStats[countryCode];
        stats.total++;

        // Parse checklist data to determine mode
        let checklistData: any = {};
        try {
          checklistData = JSON.parse(checklist.checklistData || '{}');
        } catch (e) {
          // Ignore parse errors
        }

        // Determine mode from metadata
        if (checklistData.aiGenerated === true) {
          // Check if it's rules mode (has specific metadata) or legacy
          // Rules mode typically has more structured data
          if (checklistData.mode === 'rules' || checklistData.source === 'visa-checklist-engine') {
            stats.rulesMode++;
          } else {
            stats.legacyMode++;
          }
        } else {
          stats.fallbackMode++;
        }

        // Count items
        const itemCount = checklistData.items?.length || 0;
        stats.totalItems += itemCount;
      }

      // Calculate averages and percentages
      const result = Object.values(countryStats).map((stats) => ({
        ...stats,
        averageItems: stats.total > 0 ? Math.round((stats.totalItems / stats.total) * 10) / 10 : 0,
        fallbackPercentage:
          stats.total > 0 ? Math.round((stats.fallbackMode / stats.total) * 100 * 10) / 10 : 0,
        rulesPercentage:
          stats.total > 0 ? Math.round((stats.rulesMode / stats.total) * 100 * 10) / 10 : 0,
        legacyPercentage:
          stats.total > 0 ? Math.round((stats.legacyMode / stats.total) * 100 * 10) / 10 : 0,
      }));

      // Overall statistics
      const overall = {
        totalChecklists: checklists.length,
        totalRulesMode: result.reduce((sum, s) => sum + s.rulesMode, 0),
        totalLegacyMode: result.reduce((sum, s) => sum + s.legacyMode, 0),
        totalFallbackMode: result.reduce((sum, s) => sum + s.fallbackMode, 0),
        overallFallbackPercentage:
          checklists.length > 0
            ? Math.round(
                (result.reduce((sum, s) => sum + s.fallbackMode, 0) / checklists.length) * 100 * 10
              ) / 10
            : 0,
        overallAverageItems:
          checklists.length > 0
            ? Math.round(
                (result.reduce((sum, s) => sum + s.totalItems, 0) / checklists.length) * 10
              ) / 10
            : 0,
      };

      res.json({
        success: true,
        data: {
          byCountry: result.sort((a, b) => b.total - a.total), // Sort by total descending
          overall,
          period: {
            from: thirtyDaysAgo.toISOString(),
            to: new Date().toISOString(),
            days: 30,
          },
        },
      });
    } catch (error: any) {
      console.error('[AdminRoute] Error getting checklist stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get checklist statistics',
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

// ============================================================================
// ADMIN LOG ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/activity-logs
 * Get activity logs with pagination and filters
 */
router.get(
  '/activity-logs',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
        userId: req.query.userId as string | undefined,
        action: req.query.action as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      };

      const result = await AdminLogService.getActivityLogs(filters);
      res.json(result);
    } catch (error: any) {
      console.error('[AdminRoute] Error fetching activity logs:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch activity logs',
      });
    }
  }
);

/**
 * GET /api/admin/admin-logs
 * Get admin action logs with pagination and filters
 */
router.get('/admin-logs', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const filters = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      entityType: req.query.entityType as string | undefined,
      action: req.query.action as string | undefined,
      performedBy: req.query.performedBy as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    };

    const result = await AdminLogService.getAdminLogs(filters);
    res.json(result);
  } catch (error: any) {
    console.error('[AdminRoute] Error fetching admin logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch admin logs',
    });
  }
});

/**
 * GET /api/admin/ai-interactions
 * Get AI interaction logs with pagination and filters
 */
router.get(
  '/ai-interactions',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
        taskType: req.query.taskType as string | undefined,
        model: req.query.model as string | undefined,
        userId: req.query.userId as string | undefined,
        applicationId: req.query.applicationId as string | undefined,
        countryCode: req.query.countryCode as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        success: req.query.success !== undefined ? req.query.success === 'true' : undefined,
      };

      const result = await AdminLogService.getAIInteractions(filters);
      res.json(result);
    } catch (error: any) {
      console.error('[AdminRoute] Error fetching AI interactions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch AI interactions',
      });
    }
  }
);

export default router;
