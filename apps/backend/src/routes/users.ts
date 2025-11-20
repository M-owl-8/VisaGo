import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";
import { ApiError } from "../utils/errors";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/users/me
 * Get current authenticated user profile
 * Protected route - requires JWT token
 */
router.get("/me", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
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
      throw new ApiError(404, "User not found");
    }

    res.json({
      success: true,
      data: user,
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
router.patch("/:userId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const targetUserId = req.params.userId;
    const { firstName, lastName, phone, avatar, language, timezone, currency, bio, questionnaireCompleted } = req.body;

    // Verify user can only update their own profile
    if (userId !== targetUserId) {
      throw new ApiError(403, "Forbidden - Cannot update other user's profile");
    }

    // Validate optional fields
    if (language && !["en", "ru", "uz"].includes(language)) {
      throw new ApiError(422, "Invalid language. Supported: en, ru, uz");
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
        ...(bio !== undefined && { bio }),
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
      message: "Profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:userId/applications
 * Get all visa applications for a user
 * Protected route - requires JWT token & user ownership
 */
router.get("/:userId/applications", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
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
            order: "asc",
          },
        },
      },
      // Order by creation date ascending (oldest first)
      // This ensures applications appear in chronological order (first created = first in list)
      orderBy: {
        createdAt: "asc",
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
});

/**
 * GET /api/users/:userId/payments
 * Get payment history for a user
 * Protected route - requires JWT token & user ownership
 */
router.get("/:userId/payments", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
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
        createdAt: "desc",
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
});

/**
 * PATCH /api/users/:userId/preferences
 * Update user preferences (notifications, language, 2FA)
 * Protected route - requires JWT token & user ownership
 */
router.patch("/:userId/preferences", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const targetUserId = req.params.userId;
    const { notificationsEnabled, emailNotifications, pushNotifications, twoFactorEnabled, language } = req.body;

    // Verify user can only update their own preferences
    if (userId !== targetUserId) {
      throw new ApiError(403, "Forbidden - Cannot update other user's preferences");
    }

    // Update language on user if provided
    if (language) {
      if (!["en", "ru", "uz"].includes(language)) {
        throw new ApiError(422, "Invalid language. Supported: en, ru, uz");
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
      message: "Preferences updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;