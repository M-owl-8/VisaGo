import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { SubscriptionService } from '../services/subscription.service';

const router = express.Router();
const prisma = new PrismaClient();
const subscriptionService = new SubscriptionService(prisma);

/**
 * POST /api/subscriptions/create-checkout-session
 * Creates Stripe Checkout Session for subscription
 */
router.post('/create-checkout-session', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const returnUrl = req.body?.returnUrl as string | undefined;

    const session = await subscriptionService.createCheckoutSession(userId, returnUrl);
    return res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('create-checkout-session error', error);
    return res.status(400).json({
      success: false,
      error: { message: error.message || 'Failed to create checkout session' },
    });
  }
});

/**
 * GET /api/subscriptions/status
 * Returns current user's subscription status
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const subscription = await subscriptionService.getUserSubscription(userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    return res.json({
      success: true,
      data: {
        status: user?.subscriptionStatus || null,
        hasActiveSubscription: await subscriptionService.checkAccess(userId),
        subscription,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: { message: error.message || 'Failed to fetch status' },
    });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancels subscription at period end
 */
router.post('/cancel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const ok = await subscriptionService.cancelSubscription(userId);
    if (!ok) {
      return res.status(404).json({ success: false, error: { message: 'Subscription not found' } });
    }
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/subscriptions/reactivate
 * Reactivates a canceled subscription
 */
router.post('/reactivate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const ok = await subscriptionService.reactivateSubscription(userId);
    if (!ok) {
      return res.status(404).json({ success: false, error: { message: 'Subscription not found' } });
    }
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/subscriptions/webhook
 * Stripe webhook endpoint (raw body required)
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = (req as any).body;
    if (!signature) {
      return res.status(400).json({ success: false, error: 'Missing Stripe signature' });
    }
    const result = await subscriptionService.handleWebhook(rawBody, signature);
    return res.status(result.ok ? 200 : 400).json({ success: result.ok, error: result.error });
  } catch (error: any) {
    console.error('Stripe webhook error', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
