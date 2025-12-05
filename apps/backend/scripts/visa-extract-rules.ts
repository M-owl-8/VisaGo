/**
 * Visa Rules Extraction Script
 * 
 * Processes EmbassyPageContent and creates VisaRuleSetCandidate via GPT
 * 
 * Usage:
 *   pnpm visa:extract-rules                    # Process all pending (limit 10)
 *   pnpm visa:extract-rules -- --limit 20     # Process with custom limit
 *   pnpm visa:extract-rules -- --page-content-id <id> # Process specific page content
 */

import { PrismaClient } from '@prisma/client';
import { VisaRulesExtractionService } from '../src/services/visa-rules-extraction.service';

const prisma = new PrismaClient();

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  try {
    // Option 1: Process specific page content
    const pageContentIdIndex = args.indexOf('--page-content-id');
    if (pageContentIdIndex !== -1 && args[pageContentIdIndex + 1]) {
      const pageContentId = args[pageContentIdIndex + 1];
      console.log(`[VisaExtractRules] Processing specific page content: ${pageContentId}`);

      const result = await VisaRulesExtractionService.processPageContent(pageContentId);

      if (result.success) {
        console.log(`✅ Successfully created candidate: ${result.candidateId}`);
      } else {
        console.error(`❌ Failed to process: ${result.error}`);
        process.exit(1);
      }
      return;
    }

    // Option 2: Process all pending (with optional limit)
    const limitIndex = args.indexOf('--limit');
    const limit = limitIndex !== -1 && args[limitIndex + 1]
      ? parseInt(args[limitIndex + 1], 10)
      : 10; // Default limit: 10

    console.log(`[VisaExtractRules] Processing pending page contents (limit: ${limit})...`);

    const result = await VisaRulesExtractionService.processAllPending(limit);

    console.log('\n📊 Extraction Results:');
    console.log(`   Total processed: ${result.total}`);
    console.log(`   ✅ Successful: ${result.successful}`);
    console.log(`   ❌ Failed: ${result.failed}`);

    if (result.results.length > 0) {
      console.log('\n📋 Details:');
      result.results.forEach((r) => {
        if (r.success) {
          console.log(`   ✅ Page content ${r.pageContentId} → Candidate ${r.candidateId}`);
        } else {
          console.log(`   ❌ Page content ${r.pageContentId} - ${r.error}`);
        }
      });
    }

    if (result.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(
      '[VisaExtractRules] Script error:',
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

