/**
 * Run Embassy Sync Script
 * 
 * Enqueues embassy sync jobs to extract visa rules from official sources
 * 
 * Usage:
 *   npm run embassy:sync                    # Sync all active sources
 *   npm run embassy:sync -- US tourist       # Sync specific country/visaType
 *   npm run embassy:sync -- --source-id <id> # Sync specific source by ID
 */

import { PrismaClient } from '@prisma/client';
import { EmbassySyncJobService } from '../src/services/embassy-sync-job.service';
import { EmbassySourceService } from '../src/services/embassy-source.service';

const prisma = new PrismaClient();

/**
 * Normalize visa type (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  try {
    // Check if Redis is available
    if (!process.env.REDIS_URL) {
      console.error('❌ REDIS_URL is not set. Embassy sync requires Redis for the Bull queue.');
      console.error('   Please set REDIS_URL environment variable.');
      console.error('   Example: $env:REDIS_URL="redis://localhost:6379"');
      process.exit(1);
    }

    // Initialize queue
    EmbassySyncJobService.initialize();

    // Option 1: Sync specific source by ID
    const sourceIdIndex = args.indexOf('--source-id');
    if (sourceIdIndex !== -1 && args[sourceIdIndex + 1]) {
      const sourceId = args[sourceIdIndex + 1];
      console.log(`[EmbassySync] Syncing specific source by ID: ${sourceId}`);
      await EmbassySyncJobService.enqueueSync(sourceId);
      console.log(`✅ Enqueued sync job for source: ${sourceId}`);
      return;
    }

    // Option 2: Sync specific country/visaType
    if (args.length >= 2) {
      const countryCode = args[0].toUpperCase();
      const visaType = normalizeVisaType(args[1]);

      console.log(`[EmbassySync] Syncing specific country/visaType: ${countryCode} ${visaType}`);

      // Find matching source
      const sources = await EmbassySourceService.listSources({
        countryCode,
        visaType,
        isActive: true,
      });

      if (sources.sources.length === 0) {
        console.error(`❌ No active EmbassySource found for ${countryCode} ${visaType}`);
        process.exit(1);
      }

      // Enqueue sync for highest priority source
      const source = sources.sources[0];
      await EmbassySyncJobService.enqueueSync(source.id);
      console.log(`✅ Enqueued sync job for ${countryCode} ${visaType}: ${source.name}`);
      console.log(`   URL: ${source.url}`);
      return;
    }

    // Option 3: Sync all active sources
    console.log('[EmbassySync] Syncing all active sources');
    const count = await EmbassySyncJobService.enqueueAllPendingSyncs();
    console.log(`✅ Enqueued ${count} sync jobs for all active sources`);

    // Show queue stats
    const stats = await EmbassySyncJobService.getQueueStats();
    console.log('\n📊 Queue Statistics:');
    console.log(`   Waiting: ${stats.waiting}`);
    console.log(`   Active: ${stats.active}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Failed: ${stats.failed}`);
  } catch (error) {
    console.error('[EmbassySync] Script error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await EmbassySyncJobService.close();
  }
}

main();


 * 
 * Enqueues embassy sync jobs to extract visa rules from official sources
 * 
 * Usage:
 *   npm run embassy:sync                    # Sync all active sources
 *   npm run embassy:sync -- US tourist       # Sync specific country/visaType
 *   npm run embassy:sync -- --source-id <id> # Sync specific source by ID
 */

import { PrismaClient } from '@prisma/client';
import { EmbassySyncJobService } from '../src/services/embassy-sync-job.service';
import { EmbassySourceService } from '../src/services/embassy-source.service';

const prisma = new PrismaClient();

/**
 * Normalize visa type (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  try {
    // Check if Redis is available
    if (!process.env.REDIS_URL) {
      console.error('❌ REDIS_URL is not set. Embassy sync requires Redis for the Bull queue.');
      console.error('   Please set REDIS_URL environment variable.');
      console.error('   Example: $env:REDIS_URL="redis://localhost:6379"');
      process.exit(1);
    }

    // Initialize queue
    EmbassySyncJobService.initialize();

    // Option 1: Sync specific source by ID
    const sourceIdIndex = args.indexOf('--source-id');
    if (sourceIdIndex !== -1 && args[sourceIdIndex + 1]) {
      const sourceId = args[sourceIdIndex + 1];
      console.log(`[EmbassySync] Syncing specific source by ID: ${sourceId}`);
      await EmbassySyncJobService.enqueueSync(sourceId);
      console.log(`✅ Enqueued sync job for source: ${sourceId}`);
      return;
    }

    // Option 2: Sync specific country/visaType
    if (args.length >= 2) {
      const countryCode = args[0].toUpperCase();
      const visaType = normalizeVisaType(args[1]);

      console.log(`[EmbassySync] Syncing specific country/visaType: ${countryCode} ${visaType}`);

      // Find matching source
      const sources = await EmbassySourceService.listSources({
        countryCode,
        visaType,
        isActive: true,
      });

      if (sources.sources.length === 0) {
        console.error(`❌ No active EmbassySource found for ${countryCode} ${visaType}`);
        process.exit(1);
      }

      // Enqueue sync for highest priority source
      const source = sources.sources[0];
      await EmbassySyncJobService.enqueueSync(source.id);
      console.log(`✅ Enqueued sync job for ${countryCode} ${visaType}: ${source.name}`);
      console.log(`   URL: ${source.url}`);
      return;
    }

    // Option 3: Sync all active sources
    console.log('[EmbassySync] Syncing all active sources');
    const count = await EmbassySyncJobService.enqueueAllPendingSyncs();
    console.log(`✅ Enqueued ${count} sync jobs for all active sources`);

    // Show queue stats
    const stats = await EmbassySyncJobService.getQueueStats();
    console.log('\n📊 Queue Statistics:');
    console.log(`   Waiting: ${stats.waiting}`);
    console.log(`   Active: ${stats.active}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Failed: ${stats.failed}`);
  } catch (error) {
    console.error('[EmbassySync] Script error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await EmbassySyncJobService.close();
  }
}

main();


 * 
 * Enqueues embassy sync jobs to extract visa rules from official sources
 * 
 * Usage:
 *   npm run embassy:sync                    # Sync all active sources
 *   npm run embassy:sync -- US tourist       # Sync specific country/visaType
 *   npm run embassy:sync -- --source-id <id> # Sync specific source by ID
 */

import { PrismaClient } from '@prisma/client';
import { EmbassySyncJobService } from '../src/services/embassy-sync-job.service';
import { EmbassySourceService } from '../src/services/embassy-source.service';

const prisma = new PrismaClient();

/**
 * Normalize visa type (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  try {
    // Check if Redis is available
    if (!process.env.REDIS_URL) {
      console.error('❌ REDIS_URL is not set. Embassy sync requires Redis for the Bull queue.');
      console.error('   Please set REDIS_URL environment variable.');
      console.error('   Example: $env:REDIS_URL="redis://localhost:6379"');
      process.exit(1);
    }

    // Initialize queue
    EmbassySyncJobService.initialize();

    // Option 1: Sync specific source by ID
    const sourceIdIndex = args.indexOf('--source-id');
    if (sourceIdIndex !== -1 && args[sourceIdIndex + 1]) {
      const sourceId = args[sourceIdIndex + 1];
      console.log(`[EmbassySync] Syncing specific source by ID: ${sourceId}`);
      await EmbassySyncJobService.enqueueSync(sourceId);
      console.log(`✅ Enqueued sync job for source: ${sourceId}`);
      return;
    }

    // Option 2: Sync specific country/visaType
    if (args.length >= 2) {
      const countryCode = args[0].toUpperCase();
      const visaType = normalizeVisaType(args[1]);

      console.log(`[EmbassySync] Syncing specific country/visaType: ${countryCode} ${visaType}`);

      // Find matching source
      const sources = await EmbassySourceService.listSources({
        countryCode,
        visaType,
        isActive: true,
      });

      if (sources.sources.length === 0) {
        console.error(`❌ No active EmbassySource found for ${countryCode} ${visaType}`);
        process.exit(1);
      }

      // Enqueue sync for highest priority source
      const source = sources.sources[0];
      await EmbassySyncJobService.enqueueSync(source.id);
      console.log(`✅ Enqueued sync job for ${countryCode} ${visaType}: ${source.name}`);
      console.log(`   URL: ${source.url}`);
      return;
    }

    // Option 3: Sync all active sources
    console.log('[EmbassySync] Syncing all active sources');
    const count = await EmbassySyncJobService.enqueueAllPendingSyncs();
    console.log(`✅ Enqueued ${count} sync jobs for all active sources`);

    // Show queue stats
    const stats = await EmbassySyncJobService.getQueueStats();
    console.log('\n📊 Queue Statistics:');
    console.log(`   Waiting: ${stats.waiting}`);
    console.log(`   Active: ${stats.active}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Failed: ${stats.failed}`);
  } catch (error) {
    console.error('[EmbassySync] Script error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await EmbassySyncJobService.close();
  }
}

main();


 * 
 * Enqueues embassy sync jobs to extract visa rules from official sources
 * 
 * Usage:
 *   npm run embassy:sync                    # Sync all active sources
 *   npm run embassy:sync -- US tourist       # Sync specific country/visaType
 *   npm run embassy:sync -- --source-id <id> # Sync specific source by ID
 */

import { PrismaClient } from '@prisma/client';
import { EmbassySyncJobService } from '../src/services/embassy-sync-job.service';
import { EmbassySourceService } from '../src/services/embassy-source.service';

const prisma = new PrismaClient();

/**
 * Normalize visa type (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  try {
    // Check if Redis is available
    if (!process.env.REDIS_URL) {
      console.error('❌ REDIS_URL is not set. Embassy sync requires Redis for the Bull queue.');
      console.error('   Please set REDIS_URL environment variable.');
      console.error('   Example: $env:REDIS_URL="redis://localhost:6379"');
      process.exit(1);
    }

    // Initialize queue
    EmbassySyncJobService.initialize();

    // Option 1: Sync specific source by ID
    const sourceIdIndex = args.indexOf('--source-id');
    if (sourceIdIndex !== -1 && args[sourceIdIndex + 1]) {
      const sourceId = args[sourceIdIndex + 1];
      console.log(`[EmbassySync] Syncing specific source by ID: ${sourceId}`);
      await EmbassySyncJobService.enqueueSync(sourceId);
      console.log(`✅ Enqueued sync job for source: ${sourceId}`);
      return;
    }

    // Option 2: Sync specific country/visaType
    if (args.length >= 2) {
      const countryCode = args[0].toUpperCase();
      const visaType = normalizeVisaType(args[1]);

      console.log(`[EmbassySync] Syncing specific country/visaType: ${countryCode} ${visaType}`);

      // Find matching source
      const sources = await EmbassySourceService.listSources({
        countryCode,
        visaType,
        isActive: true,
      });

      if (sources.sources.length === 0) {
        console.error(`❌ No active EmbassySource found for ${countryCode} ${visaType}`);
        process.exit(1);
      }

      // Enqueue sync for highest priority source
      const source = sources.sources[0];
      await EmbassySyncJobService.enqueueSync(source.id);
      console.log(`✅ Enqueued sync job for ${countryCode} ${visaType}: ${source.name}`);
      console.log(`   URL: ${source.url}`);
      return;
    }

    // Option 3: Sync all active sources
    console.log('[EmbassySync] Syncing all active sources');
    const count = await EmbassySyncJobService.enqueueAllPendingSyncs();
    console.log(`✅ Enqueued ${count} sync jobs for all active sources`);

    // Show queue stats
    const stats = await EmbassySyncJobService.getQueueStats();
    console.log('\n📊 Queue Statistics:');
    console.log(`   Waiting: ${stats.waiting}`);
    console.log(`   Active: ${stats.active}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Failed: ${stats.failed}`);
  } catch (error) {
    console.error('[EmbassySync] Script error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await EmbassySyncJobService.close();
  }
}

main();

