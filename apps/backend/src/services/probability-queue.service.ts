/**
 * Probability Generation Queue Service
 * Offloads visa probability computation to Bull with retries and polling support.
 */

import Queue from 'bull';
import axios, { AxiosError } from 'axios';
import { logError, logInfo, logWarn } from '../middleware/logger';

interface ProbabilityJobData {
  applicationId: string;
  userId: string;
  authToken?: string | null;
}

interface ProbabilityJobResult {
  probability: any;
}

export class ProbabilityQueueService {
  private static queue: Queue.Queue<ProbabilityJobData> | null = null;

  static initialize(): Queue.Queue<ProbabilityJobData> {
    if (this.queue) return this.queue;

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.queue = new Queue<ProbabilityJobData>('visa-probability', redisUrl, {
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
        timeout: 2 * 60 * 1000, // 2 minutes
      },
    });

    const concurrency = parseInt(process.env.PROBABILITY_QUEUE_CONCURRENCY || '1', 10);
    this.queue.process(concurrency, async (job) => {
      const { applicationId, userId, authToken } = job.data;
      logInfo('[ProbabilityQueue] Processing job', {
        jobId: job.id,
        applicationId,
        userId,
      });

      try {
        const result = await this.runProbability(applicationId, authToken);
        logInfo('[ProbabilityQueue] Job completed', { jobId: job.id, applicationId });
        return { probability: result } as ProbabilityJobResult;
      } catch (error: any) {
        logError('[ProbabilityQueue] Job failed', error as Error, {
          jobId: job.id,
          applicationId,
        });
        throw error;
      }
    });

    this.queue.on('failed', (job, err) => {
      logWarn('[ProbabilityQueue] Job failed', {
        jobId: job?.id,
        applicationId: job?.data?.applicationId,
        error: err?.message,
      });
    });

    return this.queue;
  }

  static async enqueueProbability(applicationId: string, userId: string, authToken?: string | null) {
    const queue = this.initialize();
    const job = await queue.add({ applicationId, userId, authToken });
    return job.id;
  }

  static async getJobStatus(jobId: string) {
    const queue = this.initialize();
    const job = await queue.getJob(jobId);
    if (!job) {
      return { status: 'not_found' as const };
    }
    const state = await job.getState();
    if (state === 'completed') {
      const result = (await job.finished()) as ProbabilityJobResult;
      return { status: 'completed' as const, result };
    }
    if (state === 'failed') {
      const reason = job.failedReason;
      return { status: 'failed' as const, error: reason };
    }
    return { status: state as any };
  }

  private static async runProbability(applicationId: string, authToken?: string | null) {
    const aiServiceURL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    const probabilityEndpoint = `${aiServiceURL}/api/visa-probability`;

    try {
      const aiResponse = await axios.post(
        probabilityEndpoint,
        {
          application_id: applicationId,
          auth_token: authToken ? authToken.replace('Bearer ', '') : undefined,
        },
        {
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (aiResponse.data.success && aiResponse.data.data) {
        return aiResponse.data.data;
      }

      throw new Error(aiResponse.data.error || 'AI service returned unsuccessful response');
    } catch (axiosError) {
      const error = axiosError as AxiosError;
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Probability generation timed out');
      }
      throw new Error(error.response?.data || error.message || 'Probability generation failed');
    }
  }
}

