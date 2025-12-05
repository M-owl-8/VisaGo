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
    // CHANGED: Enhanced error handling with granular error messages and better logging
    this.queue.process(async (job) => {
      const { sourceId, countryCode, visaType, url } = job.data;
      const jobStartTime = Date.now();

      logInfo('[EmbassySyncJob] Processing job', {
        sourceId,
        countryCode,
        visaType,
        url,
        jobId: job.id,
        attempt: job.attemptsMade + 1,
      });

      try {
        // Step 1: Update source status to pending
        logInfo('[EmbassySyncJob] Step 1: Updating source status to pending', { sourceId });
        await EmbassySourceService.updateSourceStatus(sourceId, {
          lastStatus: 'pending',
        });

        // Step 2: Crawl the source
        logInfo('[EmbassySyncJob] Step 2: Crawling source URL', { sourceId, url });
        let crawled;
        try {
          crawled = await EmbassyCrawlerService.crawlSource(url);
          logInfo('[EmbassySyncJob] Crawl successful', {
            sourceId,
            htmlLength: crawled.html.length,
            cleanedLength: crawled.cleanedText.length,
            title: crawled.title,
          });
        } catch (crawlError) {
          const crawlErrorMessage = `Failed to crawl URL: ${crawlError instanceof Error ? crawlError.message : String(crawlError)}`;
          logError('[EmbassySyncJob] Crawl failed', crawlError as Error, { sourceId, url });
          throw new Error(crawlErrorMessage);
        }

        // Step 3: Get previous rules (if any) for context
        logInfo('[EmbassySyncJob] Step 3: Fetching previous rules for context', {
          sourceId,
          countryCode,
          visaType,
        });
        let previousRules;
        try {
          previousRules = await VisaRulesService.getLatestRuleSet(
            countryCode,
            visaType,
            false // Only approved rules
          );
          if (previousRules) {
            logInfo('[EmbassySyncJob] Found previous rules', {
              sourceId,
              version: previousRules.version,
              isApproved: previousRules.isApproved,
            });
          } else {
            logInfo('[EmbassySyncJob] No previous rules found (first extraction)', { sourceId });
          }
        } catch (prevRulesError) {
          logWarn('[EmbassySyncJob] Error fetching previous rules (continuing anyway)', {
            sourceId,
            error: prevRulesError instanceof Error ? prevRulesError.message : String(prevRulesError),
          });
          // Don't fail the job if we can't get previous rules
          previousRules = null;
        }

        // Step 4: Extract rules using GPT-4
        logInfo('[EmbassySyncJob] Step 4: Extracting visa rules using AI', {
          sourceId,
          pageTextLength: crawled.cleanedText.length,
        });
        let extraction;
        try {
          extraction = await AIEmbassyExtractorService.extractVisaRulesFromPage({
            countryCode,
            visaType,
            sourceUrl: url,
            pageText: crawled.cleanedText,
            pageTitle: crawled.title,
            previousRules: previousRules?.data,
          });
          logInfo('[EmbassySyncJob] AI extraction successful', {
            sourceId,
            tokensUsed: extraction.metadata.tokensUsed,
            confidence: extraction.metadata.confidence,
            extractionTime: extraction.metadata.extractionTime,
            requiredDocsCount: extraction.ruleSet.requiredDocuments?.length || 0,
          });
        } catch (extractionError) {
          const extractionErrorMessage = `AI extraction failed: ${extractionError instanceof Error ? extractionError.message : String(extractionError)}`;
          logError('[EmbassySyncJob] AI extraction failed', extractionError as Error, {
            sourceId,
            url,
          });
          throw new Error(extractionErrorMessage);
        }

        // Step 5: Create rule set in database
        logInfo('[EmbassySyncJob] Step 5: Saving rule set to database', { sourceId });
        let ruleSetId: string;
        let version: number;
        try {
          const result = await VisaRulesService.createOrUpdateRuleSetFromAI({
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
          ruleSetId = result.id;
          version = result.version;
          logInfo('[EmbassySyncJob] Rule set saved successfully', {
            sourceId,
            ruleSetId,
            version,
          });
        } catch (saveError) {
          const saveErrorMessage = `Failed to save rule set: ${saveError instanceof Error ? saveError.message : String(saveError)}`;
          logError('[EmbassySyncJob] Failed to save rule set', saveError as Error, {
            sourceId,
            countryCode,
            visaType,
          });
          throw new Error(saveErrorMessage);
        }

        // Step 6: Update source status to success
        logInfo('[EmbassySyncJob] Step 6: Updating source status to success', { sourceId });
        await EmbassySourceService.updateSourceStatus(sourceId, {
          lastFetchedAt: new Date(),
          lastStatus: 'success',
          lastError: null,
        });

        const jobDuration = Date.now() - jobStartTime;
        logInfo('[EmbassySyncJob] Job completed successfully', {
          sourceId,
          ruleSetId,
          version,
          countryCode,
          visaType,
          jobDuration,
          confidence: extraction.metadata.confidence,
        });

        return {
          success: true,
          ruleSetId,
          version,
          confidence: extraction.metadata.confidence,
          jobDuration,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        const jobDuration = Date.now() - jobStartTime;

        // Update source status to failed with detailed error message
        try {
          await EmbassySourceService.updateSourceStatus(sourceId, {
            lastStatus: 'failed',
            lastError: errorMessage.substring(0, 1000), // Limit error message length
          });
        } catch (updateError) {
          // If updating status fails, log it but don't throw (we're already in error handling)
          logError('[EmbassySyncJob] Failed to update source status after error', updateError as Error, {
            sourceId,
          });
        }

        logError('[EmbassySyncJob] Job failed', error as Error, {
          sourceId,
          countryCode,
          visaType,
          url,
          jobId: job.id,
          attempt: job.attemptsMade + 1,
          jobDuration,
          errorMessage,
          errorStack,
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

