#!/usr/bin/env node
/**
 * Start Fine-Tune Job
 */

import { PrismaClient } from '@prisma/client';
import { startFineTuneJob } from '../src/ai-training/fine-tune.service';
import { AITaskType } from '../src/ai-model-registry/types';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const taskType = process.argv[2] as AITaskType | undefined;
  const trainFilePath = process.argv[3];
  const valFilePath = process.argv[4];

  if (!taskType || !trainFilePath) {
    console.error(
      'Usage: ts-node scripts/ai-train-start.ts <taskType> <trainFilePath> [valFilePath]'
    );
    console.error('\nTask types:');
    console.error('  - checklist_enrichment');
    console.error('  - document_check');
    console.error('  - risk_explanation');
    console.error('  - document_explanation');
    console.error('  - rules_extraction');
    process.exit(1);
  }

  const provider = (process.env.AI_FT_PROVIDER || 'openai') as any;
  const baseModel = process.env.AI_FT_BASE_MODEL || 'gpt-4o-mini';
  const promptVersion = process.env.AI_FT_PROMPT_VERSION || 'v1';

  try {
    const { jobId } = await startFineTuneJob({
      taskType,
      provider,
      baseModel,
      trainFilePath,
      valFilePath,
      promptVersion,
    });

    console.log(`✅ Fine-tune job started. Internal jobId=${jobId}`);
    console.log(`   Task: ${taskType}`);
    console.log(`   Provider: ${provider}`);
    console.log(`   Base Model: ${baseModel}`);
    console.log(`   Train File: ${trainFilePath}`);
    if (valFilePath) {
      console.log(`   Val File: ${valFilePath}`);
    }
    console.log(`\n   Check status: pnpm ai:train:status ${jobId}`);
  } catch (error) {
    console.error('❌ Failed to start fine-tune job:', error);
    process.exit(1);
  } finally {
    const prisma = new PrismaClient();
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

