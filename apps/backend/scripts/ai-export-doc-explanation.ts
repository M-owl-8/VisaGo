#!/usr/bin/env node
/**
 * AI Training Data Export - Document Explanation
 */

import { PrismaClient } from '@prisma/client';
import { exportTrainingDataForTask } from '../src/ai-training/exporter';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const prisma = new PrismaClient();
  try {
    const outDir = process.env.AI_TRAINING_OUT_DIR || undefined;
    await exportTrainingDataForTask(prisma, 'document_explanation', { outDir });
    console.log('✅ Document explanation export finished.');
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

