/**
 * Embassy Crawl Script
 * 
 * Crawls due embassy sources and stores cleaned text in EmbassyPageContent
 * 
 * Usage:
 *   pnpm embassy:crawl                    # Crawl all due sources
 *   pnpm embassy:crawl -- --source-id <id> # Crawl specific source by ID
 *   pnpm embassy:crawl -- --limit 10      # Limit number of sources to crawl
 */

import { PrismaClient } from '@prisma/client';
import { EmbassyCrawlJobService } from '../src/services/embassy-crawl-job.service';

const prisma = new PrismaClient();

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  try {
    // Option 1: Crawl specific source by ID
    const sourceIdIndex = args.indexOf('--source-id');
    if (sourceIdIndex !== -1 && args[sourceIdIndex + 1]) {
      const sourceId = args[sourceIdIndex + 1];
      console.log(`[EmbassyCrawl] Crawling specific source by ID: ${sourceId}`);

      const result = await EmbassyCrawlJobService.crawlSourceById(sourceId);

      if (result.success) {
        console.log(`✅ Successfully crawled source: ${sourceId}`);
        console.log(`   Page content ID: ${result.pageContentId}`);
      } else {
        console.error(`❌ Failed to crawl source: ${sourceId}`);
        console.error(`   Error: ${result.error}`);
        process.exit(1);
      }
      return;
    }

    // Option 2: Crawl all due sources (with optional limit)
    const limitIndex = args.indexOf('--limit');
    const limit = limitIndex !== -1 && args[limitIndex + 1]
      ? parseInt(args[limitIndex + 1], 10)
      : undefined;

    console.log('[EmbassyCrawl] Crawling all due sources...');
    if (limit) {
      console.log(`   Limit: ${limit} sources`);
    }

    const result = await EmbassyCrawlJobService.crawlAllDueSources(limit);

    console.log('\n📊 Crawl Results:');
    console.log(`   Total sources: ${result.total}`);
    console.log(`   ✅ Successful: ${result.successful}`);
    console.log(`   ❌ Failed: ${result.failed}`);

    if (result.results.length > 0) {
      console.log('\n📋 Details:');
      result.results.forEach((r) => {
        if (r.success) {
          console.log(`   ✅ ${r.url} (${r.pageContentId})`);
        } else {
          console.log(`   ❌ ${r.url} - ${r.error}`);
        }
      });
    }

    if (result.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(
      '[EmbassyCrawl] Script error:',
      error instanceof Error ? error.message : String(error)
    );
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

