/**
 * Script entry point for AI smoke tests (Phase 7)
 *
 * Usage:
 *   npm run build
 *   node dist/apps/backend/src/scripts/run-ai-smoke-tests.js
 *
 * Or via ts-node:
 *   npx ts-node apps/backend/src/scripts/run-ai-smoke-tests.ts
 */

import { runAiSmokeTests } from '../ai-eval/ai-eval-runner';

/**
 * Simple console logger
 */
const logger = {
  log: (message: string, ...args: any[]) => {
    console.log(message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
};

/**
 * Main function
 */
async function main() {
  try {
    logger.log('Starting AI smoke tests...');
    logger.log('This may take several minutes as it calls GPT-4 for each scenario.\n');

    await runAiSmokeTests(logger);

    logger.log('\nAI smoke tests finished.');
    process.exit(0);
  } catch (error) {
    logger.error('AI smoke tests failed', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
