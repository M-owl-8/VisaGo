import { db as prisma } from '../db';
import { getEnvConfig } from '../config/env';
import { logInfo, logWarn, logError } from '../middleware/logger';

export class DataRetentionService {
  /**
   * Purge old log records based on retention window (days).
   * Safe: only deletes ActivityLog, AdminLog, EmailLog, NotificationLog.
   */
  static async runRetention(retentionDays?: number) {
    const days = retentionDays ?? getEnvConfig().DATA_RETENTION_DAYS ?? 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    logInfo('[DataRetention] Starting cleanup', { days, cutoff: cutoff.toISOString() });

    const tasks = [
      prisma.activityLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      prisma.adminLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      prisma.emailLog
        ? prisma.emailLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
        : Promise.resolve({ count: 0 }),
      prisma.notificationLog
        ? prisma.notificationLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
        : Promise.resolve({ count: 0 }),
    ];

    try {
      const [activity, admin, email, notification] = await Promise.all(tasks);
      logInfo('[DataRetention] Cleanup complete', {
        activityDeleted: activity.count,
        adminDeleted: admin.count,
        emailDeleted: (email as any).count ?? 0,
        notificationDeleted: (notification as any).count ?? 0,
      });
    } catch (error) {
      logError('[DataRetention] Cleanup failed', error as Error);
      throw error;
    }
  }
}

