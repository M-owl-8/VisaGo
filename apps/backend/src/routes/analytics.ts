import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import AnalyticsService, { AnalyticsEventPayload } from '../services/analytics.service';

const router = express.Router();

/**
 * POST /api/analytics/track
 * Track an analytics event
 */
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { eventType, source, metadata } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }

    // Get user ID from auth token if available
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        // You could decode the token here to get userId
        // For now, we'll rely on the frontend sending it if needed
      } catch (error) {
        // Continue without userId
      }
    }

    const payload: AnalyticsEventPayload = {
      userId: metadata?.userId || undefined,
      eventType: eventType as any,
      source: source as any,
      metadata,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    await AnalyticsService.trackEvent(payload);
    res.json({ success: true, message: 'Event tracked' });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * GET /api/analytics/metrics
 * Get metrics (requires admin)
 */
router.get('/metrics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const metrics = await AnalyticsService.getMetrics(days);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/analytics/conversion-funnel
 * Get conversion funnel (requires admin)
 */
router.get('/conversion-funnel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const funnel = await AnalyticsService.getConversionFunnel();
    res.json(funnel);
  } catch (error) {
    console.error('Error fetching conversion funnel:', error);
    res.status(500).json({ error: 'Failed to fetch conversion funnel' });
  }
});

/**
 * GET /api/analytics/user-acquisition
 * Get user acquisition breakdown (requires admin)
 */
router.get('/user-acquisition', authenticateToken, async (req: Request, res: Response) => {
  try {
    const breakdown = await AnalyticsService.getUserAcquisition();
    res.json(breakdown);
  } catch (error) {
    console.error('Error fetching user acquisition:', error);
    res.status(500).json({ error: 'Failed to fetch user acquisition' });
  }
});

/**
 * GET /api/analytics/events
 * Get event breakdown (requires admin)
 */
router.get('/events', authenticateToken, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const events = await AnalyticsService.getEventBreakdown(days);
    res.json(events);
  } catch (error) {
    console.error('Error fetching event breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch event breakdown' });
  }
});

export default router;
