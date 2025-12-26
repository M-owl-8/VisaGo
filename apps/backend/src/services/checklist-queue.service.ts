/**
 * Checklist Generation Queue Service
 * Offloads heavy checklist generation to Bull with retries and backoff.
 */

import Queue from 'bull';
import { logError, logInfo, logWarn } from '../middleware/logger';
import { DocumentChecklistService } from './document-checklist.service';

interface ChecklistJobData {
  applicationId: string;
  userId: string;
}

export class ChecklistQueueService {
  private static queue: Queue.Queue<ChecklistJobData> | null = null;

  static initialize(): Queue.Queue<ChecklistJobData> {
    if (this.queue) {
      return this.queue;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.queue = new Queue<ChecklistJobData>('checklist-generation', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
        timeout: 5 * 60 * 1000, // 5 minutes
      },
    });

    const concurrency = parseInt(process.env.CHECKLIST_QUEUE_CONCURRENCY || '2', 10);
    this.queue.process(concurrency, async (job) => {
      const { applicationId, userId } = job.data;
      logInfo('[ChecklistQueue] Processing job', {
        applicationId,
        userId,
        jobId: job.id,
        attempt: job.attemptsMade + 1,
      });

      try {
        await DocumentChecklistService.runChecklistJob(applicationId, userId);
        logInfo('[ChecklistQueue] Job completed', { applicationId, jobId: job.id });
      } catch (error: any) {
        logError('[ChecklistQueue] Job failed', error as Error, {
          applicationId,
          jobId: job.id,
          attempt: job.attemptsMade + 1,
        });
        throw error;
      }
    });

    this.queue.on('failed', (job, err) => {
      logWarn('[ChecklistQueue] Job failed after attempt', {
        jobId: job?.id,
        applicationId: job?.data?.applicationId,
        error: err?.message,
      });
    });

    this.queue.on('completed', (job) => {
      logInfo('[ChecklistQueue] Job completed', {
        jobId: job.id,
        applicationId: job.data.applicationId,
      });
    });

    return this.queue;
  }

  static async enqueueGeneration(applicationId: string, userId: string) {
    const queue = this.initialize();
    await queue.add({ applicationId, userId });
  }
}

