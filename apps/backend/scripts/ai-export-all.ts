#!/usr/bin/env node
/**
 * AI Training Data Export - All Tasks
 */

import { PrismaClient } from '@prisma/client';
import {
  exportTrainingDataForTask,
  exportEvalScenariosAsTrainingData,
} from '../src/ai-training/exporter';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  const prisma = new PrismaClient();

  try {
    const outDir = process.env.AI_TRAINING_OUT_DIR || undefined;

    console.log('🚀 Starting AI training data export...\n');

    await exportTrainingDataForTask(prisma, 'checklist_enrichment', { outDir });
    await exportTrainingDataForTask(prisma, 'document_check', { outDir });
    await exportTrainingDataForTask(prisma, 'risk_explanation', { outDir });
    await exportTrainingDataForTask(prisma, 'document_explanation', { outDir });
    await exportTrainingDataForTask(prisma, 'rules_extraction', { outDir });

    // Optional: export eval scenarios
    if (process.env.EXPORT_EVAL_SCENARIOS === 'true') {
      await exportEvalScenariosAsTrainingData(prisma, { outDir });
    }

    console.log('\n✅ AI training export finished.');
  } catch (error) {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

