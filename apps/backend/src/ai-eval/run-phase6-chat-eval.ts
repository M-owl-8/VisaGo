/**
 * Phase 6 Chat Evaluation CLI Entrypoint
 *
 * ⚠️ DEV-ONLY: This script runs chat evaluation tests.
 *
 * Usage:
 *   pnpm ts-node apps/backend/src/ai-eval/run-phase6-chat-eval.ts
 *   OR
 *   pnpm backend:phase6-chat-eval (if configured in package.json)
 */

import { runChatEval } from './ai-eval-chat-runner';
import { AIOpenAIService } from '../services/ai-openai.service';

async function main() {
  console.log('Initializing OpenAI service...');

  // Initialize OpenAI service if needed
  if (!AIOpenAIService.isInitialized()) {
    await AIOpenAIService.initialize();
  }

  console.log('Running Phase 6 chat evaluation...');
  console.log('');

  await runChatEval(console);

  console.log('');
  console.log('Evaluation complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});
