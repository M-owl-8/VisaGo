/**
 * Doc-Check Queue Service
 * Offloads full document-check runs to Bull with retries and backoff.
 */

import Queue from 'bull';
import { logError, logInfo, logWarn } from '../middleware/logger';
import { DocCheckService } from './doc-check.service';

interface DocCheckJobData {
  applicationId: string;
  userId: string;
}

export class DocCheckQueueService {
  private static queue: Queue.Queue<DocCheckJobData> | null = null;

  static initialize(): Queue.Queue<DocCheckJobData> {
    if (this.queue) {
      return this.queue;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.queue = new Queue<DocCheckJobData>('doc-check', redisUrl, {
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
        timeout: 5 * 60 * 1000,
      },
    });

    const concurrency = parseInt(process.env.DOC_CHECK_QUEUE_CONCURRENCY || '1', 10);
    this.queue.process(concurrency, async (job) => {
      const { applicationId, userId } = job.data;
      logInfo('[DocCheckQueue] Processing job', {
        jobId: job.id,
        applicationId,
        userId,
        attempt: job.attemptsMade + 1,
      });

      try {
        await DocCheckService.checkAllItemsForApplication(applicationId, userId);
        logInfo('[DocCheckQueue] Job completed', { jobId: job.id, applicationId });
      } catch (error: any) {
        logError('[DocCheckQueue] Job failed', error as Error, {
          jobId: job.id,
          applicationId,
          attempt: job.attemptsMade + 1,
        });
        throw error;
      }
    });

    this.queue.on('failed', (job, err) => {
      logWarn('[DocCheckQueue] Job failed after attempt', {
        jobId: job?.id,
        applicationId: job?.data?.applicationId,
        error: err?.message,
      });
    });

    this.queue.on('completed', (job) => {
      logInfo('[DocCheckQueue] Job completed', {
        jobId: job.id,
        applicationId: job.data.applicationId,
      });
    });

    return this.queue;
  }

  static async enqueueDocCheck(applicationId: string, userId: string) {
    const queue = this.initialize();
    await queue.add({ applicationId, userId });
  }
}

