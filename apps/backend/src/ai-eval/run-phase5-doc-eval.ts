/**
 * Phase 5 Document Check Evaluation CLI Entrypoint
 *
 * ⚠️ DEV-ONLY: This script runs document check evaluation tests.
 *
 * Usage:
 *   pnpm ts-node apps/backend/src/ai-eval/run-phase5-doc-eval.ts
 *   OR
 *   pnpm backend:phase5-doc-eval (if configured in package.json)
 */

import { runDocCheckEval } from './ai-eval-doc-runner';
import { AIOpenAIService } from '../services/ai-openai.service';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('Initializing OpenAI service...');

  // Initialize OpenAI service if needed
  if (!AIOpenAIService.isInitialized()) {
    const prisma = new PrismaClient();
    AIOpenAIService.initialize(prisma);
  }

  console.log('Running Phase 5 document check evaluation...');
  console.log('');

  await runDocCheckEval(console);

  console.log('');
  console.log('Evaluation complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});
