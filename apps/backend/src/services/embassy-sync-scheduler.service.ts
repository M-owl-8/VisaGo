/**
 * Embassy Sync Scheduler Service
 * Schedules automatic sync jobs using cron
 */

import * as cron from 'node-cron';
import { EmbassySyncJobService } from './embassy-sync-job.service';
import { logInfo, logError, logWarn } from '../middleware/logger';

/**
 * Embassy Sync Scheduler Service
 */
export class EmbassySyncSchedulerService {
  private static cronJob: cron.ScheduledTask | null = null;
  private static isRunning = false;

  /**
   * Start the scheduler
   * Default: Runs daily at 2 AM UTC
   */
  static start(cronExpression?: string): void {
    if (this.cronJob) {
      logWarn('[EmbassySyncScheduler] Scheduler already running');
      return;
    }

    // Default: Daily at 2 AM UTC
    const expression = cronExpression || process.env.EMBASSY_SYNC_CRON || '0 2 * * *';

    this.cronJob = cron.schedule(expression, async () => {
      if (this.isRunning) {
        logWarn('[EmbassySyncScheduler] Previous sync still running, skipping');
        return;
      }

      this.isRunning = true;
      logInfo('[EmbassySyncScheduler] Starting scheduled sync', {
        cronExpression: expression,
      });

      try {
        const count = await EmbassySyncJobService.enqueueAllPendingSyncs();
        logInfo('[EmbassySyncScheduler] Scheduled sync completed', {
          jobsEnqueued: count,
        });
      } catch (error) {
        logError('[EmbassySyncScheduler] Scheduled sync failed', error as Error);
      } finally {
        this.isRunning = false;
      }
    });

    logInfo('[EmbassySyncScheduler] Scheduler started', {
      cronExpression: expression,
    });
  }

  /**
   * Stop the scheduler
   */
  static stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logInfo('[EmbassySyncScheduler] Scheduler stopped');
    }
  }

  /**
   * Trigger a manual sync (for testing/admin)
   */
  static async triggerManualSync(): Promise<number> {
    logInfo('[EmbassySyncScheduler] Manual sync triggered');
    return await EmbassySyncJobService.enqueueAllPendingSyncs();
  }

  /**
   * Check if scheduler is running
   */
  static isActive(): boolean {
    return this.cronJob !== null;
  }
}
