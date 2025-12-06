#!/usr/bin/env node
/**
 * Update Canary Traffic Percentage
 */

import { PrismaClient } from '@prisma/client';
import { updateCanaryTraffic } from '../src/ai-model-registry/registry.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const modelVersionId = process.argv[2];
  const trafficPercentArg = process.argv[3];

  if (!modelVersionId || !trafficPercentArg) {
    console.error(
      'Usage: ts-node scripts/ai-canary-traffic.ts <modelVersionId> <trafficPercent>'
    );
    console.error('\nExample:');
    console.error('  pnpm ai:model:canary <id> 5   # Set to 5%');
    console.error('  pnpm ai:model:canary <id> 25  # Increase to 25%');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const trafficPercent = parseInt(trafficPercentArg, 10);

    if (trafficPercent < 0 || trafficPercent > 100) {
      console.error('❌ trafficPercent must be between 0 and 100');
      process.exit(1);
    }

    // Check if model exists
    const model = await prisma.aIModelVersion.findUnique({
      where: { id: modelVersionId },
    });

    if (!model) {
      console.error(`❌ Model version ${modelVersionId} not found`);
      process.exit(1);
    }

    await updateCanaryTraffic({ modelVersionId, trafficPercent });

    console.log(`✅ Model ${modelVersionId} canary traffic updated to ${trafficPercent}%`);
    console.log(`   Task: ${model.taskType}`);
    console.log(`   Model Name: ${model.modelName}`);
    console.log(`   Status: ${model.status}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

