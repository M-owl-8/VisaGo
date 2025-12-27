import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { ApiError } from '../utils/errors';
import { GdprService } from '../services/gdpr.service';
import { SubscriptionService } from '../services/subscription.service';

const router = express.Router();
const prisma = new PrismaClient();
const subscriptionService = new SubscriptionService(prisma);

/**
 * GET /api/users/me
 * Get current authenticated user profile
 * Protected route - requires JWT token
 */
router.get('/me', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        language: true,
        timezone: true,
        currency: true,
        emailVerified: true,
        bio: true,
        questionnaireCompleted: true,
        role: true,
        subscriptionStatus: true,
        subscriptionRequired: true,
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        preferences: {
          select: {
            notificationsEnabled: true,
            emailNotifications: true,
            pushNotifications: true,
            twoFactorEnabled: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const hasActiveSubscription = await subscriptionService.checkAccess(userId);

    res.json({
      success: true,
      data: {
        ...user,
        hasActiveSubscription,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/:userId
 * Update user profile (name, phone, avatar, language, timezone, currency)
 * Protected route - requires JWT token & user ownership
 */
router.patch(
  '/:userId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const targetUserId = req.params.userId;
      const {
        firstName,
        lastName,
        phone,
        avatar,
        language,
        timezone,
        currency,
        bio,
        questionnaireCompleted,
      } = req.body;

      // Verify user can only update their own profile
      if (userId !== targetUserId) {
        throw new ApiError(403, "Forbidden - Cannot update other user's profile");
      }

      // Validate optional fields
      if (language && !['en', 'ru', 'uz'].includes(language)) {
        throw new ApiError(422, 'Invalid language. Supported: en, ru, uz');
      }

      // If bio is provided and contains QuestionnaireV2, validate and process it
      let processedBio = bio;
      if (bio) {
        try {
          const parsed = JSON.parse(bio);
          // Check if it's QuestionnaireV2
          if (parsed.version === '2.0' && parsed.targetCountry && parsed.visaType) {
            const {
              validateQuestionnaireV2,
              buildSummaryFromQuestionnaireV2,
            } = require('../services/questionnaire-v2-mapper');

            if (validateQuestionnaireV2(parsed)) {
              // Get user's language preference
              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { language: true },
              });
              const appLanguage = (user?.language || language || 'en') as 'uz' | 'ru' | 'en';

              // Build summary and store both V2 and summary
              const summary = buildSummaryFromQuestionnaireV2(parsed, appLanguage);

              // Store both V2 questionnaire and summary for backward compatibility
              processedBio = JSON.stringify({
                ...parsed, // Keep V2 structure
                _hasSummary: true,
                summary, // Include summary for AI services
              });
            } else {
              throw new ApiError(422, 'Invalid QuestionnaireV2 structure');
            }
          }
        } catch (error: any) {
          // If parsing fails, it might be legacy format - allow it
          if (error instanceof ApiError) {
            throw error;
          }
          // Otherwise, continue with original bio
        }
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phone !== undefined && { phone }),
          ...(avatar !== undefined && { avatar }),
          ...(language !== undefined && { language }),
          ...(timezone !== undefined && { timezone }),
          ...(currency !== undefined && { currency }),
          ...(processedBio !== undefined && { bio: processedBio }),
          ...(questionnaireCompleted !== undefined && { questionnaireCompleted }),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          language: true,
          timezone: true,
          currency: true,
          emailVerified: true,
          bio: true,
          questionnaireCompleted: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users/:userId/applications
 * Get all visa applications for a user
 * Protected route - requires JWT token & user ownership
 */
router.get(
  '/:userId/applications',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const targetUserId = req.params.userId;

      // Verify user can only view their own applications
      if (userId !== targetUserId) {
        throw new ApiError(403, "Forbidden - Cannot view other user's applications");
      }

      const applications = await prisma.visaApplication.findMany({
        where: { userId },
        include: {
          country: {
            select: {
              id: true,
              name: true,
              code: true,
              flagEmoji: true,
            },
          },
          visaType: {
            select: {
              id: true,
              name: true,
              fee: true,
              processingDays: true,
              validity: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              paymentMethod: true,
              transactionId: true,
              paidAt: true,
            },
          },
          documents: {
            select: {
              id: true,
              documentType: true,
              status: true,
            },
          },
          checkpoints: {
            select: {
              id: true,
              title: true,
              isCompleted: true,
              dueDate: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
        // Order by creation date ascending (oldest first)
        // This ensures applications appear in chronological order (first created = first in list)
        orderBy: {
          createdAt: 'asc',
        },
      });

      res.json({
        success: true,
        data: applications,
        count: applications.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users/:userId/payments
 * Get payment history for a user
 * Protected route - requires JWT token & user ownership
 */
router.get(
  '/:userId/payments',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const targetUserId = req.params.userId;

      // Verify user can only view their own payments
      if (userId !== targetUserId) {
        throw new ApiError(403, "Forbidden - Cannot view other user's payments");
      }

      const payments = await prisma.payment.findMany({
        where: { userId },
        include: {
          application: {
            select: {
              id: true,
              visaTypeId: true,
              country: {
                select: {
                  name: true,
                  flagEmoji: true,
                },
              },
              visaType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        success: true,
        data: payments,
        count: payments.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/users/:userId/preferences
 * Update user preferences (notifications, language, 2FA)
 * Protected route - requires JWT token & user ownership
 */
router.patch(
  '/:userId/preferences',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const targetUserId = req.params.userId;
      const {
        notificationsEnabled,
        emailNotifications,
        pushNotifications,
        twoFactorEnabled,
        language,
      } = req.body;

      // Verify user can only update their own preferences
      if (userId !== targetUserId) {
        throw new ApiError(403, "Forbidden - Cannot update other user's preferences");
      }

      // Update language on user if provided
      if (language) {
        if (!['en', 'ru', 'uz'].includes(language)) {
          throw new ApiError(422, 'Invalid language. Supported: en, ru, uz');
        }

        await prisma.user.update({
          where: { id: userId },
          data: { language },
        });
      }

      // Get or create user preferences
      let preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        preferences = await prisma.userPreferences.create({
          data: {
            userId,
            notificationsEnabled: notificationsEnabled ?? true,
            emailNotifications: emailNotifications ?? true,
            pushNotifications: pushNotifications ?? true,
            twoFactorEnabled: twoFactorEnabled ?? false,
          },
        });
      } else {
        preferences = await prisma.userPreferences.update({
          where: { userId },
          data: {
            ...(notificationsEnabled !== undefined && { notificationsEnabled }),
            ...(emailNotifications !== undefined && { emailNotifications }),
            ...(pushNotifications !== undefined && { pushNotifications }),
            ...(twoFactorEnabled !== undefined && { twoFactorEnabled }),
          },
        });
      }

      res.json({
        success: true,
        data: preferences,
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users/me/gdpr-export
 * Export user data (authenticated user only)
 */
router.get(
  '/me/gdpr-export',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }
      const data = await GdprService.exportUserData(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/users/me/gdpr-delete
 * Record a GDPR deletion request for the authenticated user.
 */
router.post(
  '/me/gdpr-delete',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }
      const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
      const result = await GdprService.requestDeletion(
        userId,
        reason,
        req.ip,
        (req.headers['user-agent'] || '').toString().slice(0, 200)
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
