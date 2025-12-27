import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from '../services/subscription.service';

const prisma = new PrismaClient();
const subscriptionService = new SubscriptionService(prisma);

/**
 * Blocks access if user has no active subscription and is not grandfathered or admin.
 * Returns 402 Payment Required with a payment redirect hint.
 */
export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId as string | undefined;
    const userRole = (req as any).user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    // Admins bypass subscription check
    if (userRole === 'admin' || userRole === 'super_admin') {
      return next();
    }

    const hasAccess = await subscriptionService.checkAccess(userId);
    if (hasAccess) {
      return next();
    }

    return res.status(402).json({
      success: false,
      error: {
        message: 'Subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        redirect: '/payment',
      },
    });
  } catch (error: any) {
    console.error('Subscription middleware error', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Subscription check failed' },
    });
  }
};
