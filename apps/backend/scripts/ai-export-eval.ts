#!/usr/bin/env node
/**
 * AI Training Data Export - Eval Scenarios
 */

import { PrismaClient } from '@prisma/client';
import { exportEvalScenariosAsTrainingData } from '../src/ai-training/exporter';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const prisma = new PrismaClient();
  try {
    const outDir = process.env.AI_TRAINING_OUT_DIR || undefined;
    await exportEvalScenariosAsTrainingData(prisma, { outDir });
    console.log('✅ Eval scenarios export finished.');
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

