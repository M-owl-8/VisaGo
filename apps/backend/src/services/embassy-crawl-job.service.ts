/**
 * Embassy Crawl Job Service
 * Crawls due embassy sources and stores cleaned text
 * This is a simpler job than embassy-sync-job (no GPT extraction, just crawling)
 */

import { PrismaClient } from '@prisma/client';
import { EmbassySourceService } from './embassy-source.service';
import { EmbassyCrawlerService } from './embassy-crawler.service';
import { logInfo, logError, logWarn } from '../middleware/logger';

const prisma = new PrismaClient();

/**
 * Embassy Crawl Job Service
 */
export class EmbassyCrawlJobService {
  /**
   * Crawl all due sources
   */
  static async crawlAllDueSources(limit?: number): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      sourceId: string;
      url: string;
      success: boolean;
      pageContentId?: string;
      error?: string;
    }>;
  }> {
    try {
      // Get sources needing fetch (due sources)
      const sourcesNeedingFetch = await EmbassySourceService.getSourcesNeedingFetch();
      const dueSources = limit ? sourcesNeedingFetch.slice(0, limit) : sourcesNeedingFetch;

      if (dueSources.length === 0) {
        logInfo('[EmbassyCrawlJob] No sources due for crawling');
        return {
          total: 0,
          successful: 0,
          failed: 0,
          results: [],
        };
      }

      logInfo('[EmbassyCrawlJob] Starting crawl job', {
        sourcesCount: dueSources.length,
      });

      const results: Array<{
        sourceId: string;
        url: string;
        success: boolean;
        pageContentId?: string;
        error?: string;
      }> = [];

      let successful = 0;
      let failed = 0;

      // Crawl each source
      for (const source of dueSources) {
        logInfo('[EmbassyCrawlJob] Crawling source', {
          sourceId: source.id,
          countryCode: source.countryCode,
          visaType: source.visaType,
          url: source.url,
        });

        // Parse metadata if it's a string
        let parsedMetadata: any = undefined;
        if (source.metadata) {
          try {
            parsedMetadata =
              typeof source.metadata === 'string' ? JSON.parse(source.metadata) : source.metadata;
          } catch (e) {
            logWarn('[EmbassyCrawlJob] Failed to parse metadata', { sourceId: source.id });
          }
        }

        const result = await EmbassyCrawlerService.crawlAndStore(
          source.id,
          source.url,
          parsedMetadata
        );

        results.push({
          sourceId: source.id,
          url: source.url,
          success: result.success,
          pageContentId: result.pageContentId,
          error: result.error,
        });

        if (result.success) {
          successful++;
        } else {
          failed++;
        }

        // Small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      logInfo('[EmbassyCrawlJob] Crawl job completed', {
        total: dueSources.length,
        successful,
        failed,
      });

      return {
        total: dueSources.length,
        successful,
        failed,
        results,
      };
    } catch (error) {
      logError('[EmbassyCrawlJob] Error in crawl job', error as Error);
      throw error;
    }
  }

  /**
   * Crawl a specific source by ID
   */
  static async crawlSourceById(sourceId: string): Promise<{
    success: boolean;
    pageContentId?: string;
    error?: string;
  }> {
    try {
      const source = await EmbassySourceService.getSourceById(sourceId);

      if (!source) {
        throw new Error(`EmbassySource not found: ${sourceId}`);
      }

      if (!source.isActive) {
        logWarn('[EmbassyCrawlJob] Source is not active', { sourceId });
        return {
          success: false,
          error: 'Source is not active',
        };
      }

      logInfo('[EmbassyCrawlJob] Crawling specific source', {
        sourceId,
        url: source.url,
      });

      const result = await EmbassyCrawlerService.crawlAndStore(
        source.id,
        source.url,
        source.metadata ? JSON.parse(source.metadata) : undefined
      );

      return result;
    } catch (error) {
      logError('[EmbassyCrawlJob] Error crawling source by ID', error as Error, {
        sourceId,
      });
      throw error;
    }
  }
}
