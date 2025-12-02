/**
 * Embassy Sync Job Service
 * Bull queue job for crawling and extracting visa rules from embassy sources
 */

import Queue from 'bull';
import { PrismaClient } from '@prisma/client';
import { EmbassySourceService } from './embassy-source.service';
import { EmbassyCrawlerService } from './embassy-crawler.service';
import { AIEmbassyExtractorService } from './ai-embassy-extractor.service';
import { VisaRulesService } from './visa-rules.service';
import { logInfo, logError, logWarn } from '../middleware/logger';

const prisma = new PrismaClient();

/**
 * Job data interface
 */
interface EmbassySyncJobData {
  sourceId: string;
  countryCode: string;
  visaType: string;
  url: string;
}

/**
 * Embassy Sync Job Service
 */
export class EmbassySyncJobService {
  private static queue: Queue.Queue<EmbassySyncJobData> | null = null;

  /**
   * Initialize the queue
   */
  static initialize(): Queue.Queue<EmbassySyncJobData> {
    if (this.queue) {
      return this.queue;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.queue = new Queue<EmbassySyncJobData>('embassy-sync', redisUrl);

    // Set up processor
    this.queue.process(async (job) => {
      const { sourceId, countryCode, visaType, url } = job.data;

      logInfo('[EmbassySyncJob] Processing job', {
        sourceId,
        countryCode,
        visaType,
        url,
        jobId: job.id,
      });

      try {
        // Step 1: Update source status to pending
        await EmbassySourceService.updateSourceStatus(sourceId, {
          lastStatus: 'pending',
        });

        // Step 2: Crawl the source
        const crawled = await EmbassyCrawlerService.crawlSource(url);

        // Step 3: Get previous rules (if any) for context
        const previousRules = await VisaRulesService.getLatestRuleSet(
          countryCode,
          visaType,
          false // Only approved rules
        );

        // Step 4: Extract rules using GPT-4
        const extraction = await AIEmbassyExtractorService.extractVisaRulesFromPage({
          countryCode,
          visaType,
          sourceUrl: url,
          pageText: crawled.cleanedText,
          pageTitle: crawled.title,
          previousRules: previousRules?.data,
        });

        // Step 5: Create rule set in database
        const { id: ruleSetId, version } = await VisaRulesService.createOrUpdateRuleSetFromAI({
          countryCode,
          visaType,
          data: extraction.ruleSet,
          sourceId,
          sourceSummary: `Extracted from ${url}`,
          extractionMetadata: {
            tokensUsed: extraction.metadata.tokensUsed,
            confidence: extraction.metadata.confidence,
            extractionTime: extraction.metadata.extractionTime,
            model: extraction.metadata.model,
          },
        });

        // Step 6: Update source status to success
        await EmbassySourceService.updateSourceStatus(sourceId, {
          lastFetchedAt: new Date(),
          lastStatus: 'success',
          lastError: null,
        });

        logInfo('[EmbassySyncJob] Job completed successfully', {
          sourceId,
          ruleSetId,
          version,
          countryCode,
          visaType,
        });

        return {
          success: true,
          ruleSetId,
          version,
          confidence: extraction.metadata.confidence,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Update source status to failed
        await EmbassySourceService.updateSourceStatus(sourceId, {
          lastStatus: 'failed',
          lastError: errorMessage,
        });

        logError('[EmbassySyncJob] Job failed', error as Error, {
          sourceId,
          countryCode,
          visaType,
          url,
        });

        throw error;
      }
    });

    // Set up event handlers
    this.queue.on('completed', (job, result) => {
      logInfo('[EmbassySyncJob] Job completed', {
        jobId: job.id,
        sourceId: job.data.sourceId,
        result,
      });
    });

    this.queue.on('failed', (job, error) => {
      logError('[EmbassySyncJob] Job failed', error as Error, {
        jobId: job?.id,
        sourceId: job?.data.sourceId,
      });
    });

    logInfo('[EmbassySyncJob] Queue initialized and processor set up');

    return this.queue;
  }

  /**
   * Enqueue a sync job for a source
   */
  static async enqueueSync(sourceId: string): Promise<void> {
    const queue = this.initialize();

    const source = await EmbassySourceService.getSourceById(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    await queue.add(
      {
        sourceId: source.id,
        countryCode: source.countryCode,
        visaType: source.visaType,
        url: source.url,
      },
      {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 seconds
        },
        removeOnComplete: true, // Remove completed jobs
        removeOnFail: false, // Keep failed jobs for debugging
      }
    );

    logInfo('[EmbassySyncJob] Job enqueued', { sourceId });
  }

  /**
   * Enqueue sync jobs for all sources that need fetching
   */
  static async enqueueAllPendingSyncs(): Promise<number> {
    const queue = this.initialize();

    const sources = await EmbassySourceService.getSourcesNeedingFetch();

    logInfo('[EmbassySyncJob] Enqueuing sync jobs', {
      count: sources.length,
    });

    for (const source of sources) {
      await queue.add(
        {
          sourceId: source.id,
          countryCode: source.countryCode,
          visaType: source.visaType,
          url: source.url,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    }

    logInfo('[EmbassySyncJob] All sync jobs enqueued', {
      count: sources.length,
    });

    return sources.length;
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats() {
    const queue = this.initialize();

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  }

  /**
   * Close the queue
   */
  static async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
      logInfo('[EmbassySyncJob] Queue closed');
    }
  }
}
