import { db as prisma } from '../db';
import { logError, logInfo, logWarn } from '../middleware/logger';
import AdminLogService from './admin-log.service';

export class GdprService {
  /**
   * Export a consolidated view of user data (metadata only, no file blobs).
   */
  static async exportUserData(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        language: true,
        timezone: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        questionnaireCompleted: true,
        preferences: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const [applications, documents, payments, activityLogs] = await Promise.all([
      prisma.application.findMany({
        where: { userId },
        select: {
          id: true,
          countryId: true,
          visaTypeId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          legacyVisaApplicationId: true,
        },
      }),
      prisma.userDocument.findMany({
        where: { userId },
        select: {
          id: true,
          applicationId: true,
          documentType: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          status: true,
          uploadedAt: true,
        },
      }),
      prisma.payment.findMany({
        where: { userId },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          paymentMethod: true,
        },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        select: {
          id: true,
          action: true,
          details: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200, // cap for response size
      }),
    ]);

    return {
      user,
      applications,
      documents,
      payments,
      activityLogs,
    };
  }

  /**
   * Records a GDPR deletion request (does not delete immediately).
   * Logs to ActivityLog and AdminLog for compliance tracking.
   */
  static async requestDeletion(
    userId: string,
    reason?: string,
    requesterIp?: string,
    userAgent?: string
  ) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'gdpr_delete_request',
          details: JSON.stringify({ reason, requesterIp, userAgent }),
          ipAddress: requesterIp,
          userAgent,
        },
      });

      await AdminLogService.recordAdminAction({
        action: 'gdpr_delete_request',
        entityType: 'user',
        entityId: userId,
        performedBy: userId,
        reason,
        changes: { requesterIp, userAgent },
      });

      // Clear reset tokens if any (minimize PII surface)
      await prisma.user.update({
        where: { id: userId },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      logInfo('[GDPR] Deletion request recorded', { userId });
      return { message: 'Deletion request recorded. We will process it within the standard SLA.' };
    } catch (error) {
      logError('[GDPR] Failed to record deletion request', error as Error, { userId });
      throw error;
    }
  }
}
