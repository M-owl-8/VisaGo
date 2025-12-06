#!/usr/bin/env node
/**
 * Promote Model to Active
 */

import { PrismaClient } from '@prisma/client';
import { promoteModelToActive } from '../src/ai-model-registry/registry.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const modelVersionId = process.argv[2];
  const trafficPercentArg = process.argv[3];

  if (!modelVersionId) {
    console.error(
      'Usage: ts-node scripts/ai-promote-model.ts <modelVersionId> [trafficPercent]'
    );
    console.error('\nExample:');
    console.error('  pnpm ai:model:promote <id> 10   # 10% canary');
    console.error('  pnpm ai:model:promote <id> 100  # Full rollout');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    // Check if model exists
    const model = await prisma.aIModelVersion.findUnique({
      where: { id: modelVersionId },
    });

    if (!model) {
      console.error(`❌ Model version ${modelVersionId} not found`);
      process.exit(1);
    }

    const trafficPercent = trafficPercentArg ? parseInt(trafficPercentArg, 10) : 100;

    if (trafficPercent < 0 || trafficPercent > 100) {
      console.error('❌ trafficPercent must be between 0 and 100');
      process.exit(1);
    }

    // Promote to ACTIVE and deactivate others
    await promoteModelToActive({
      modelVersionId,
      trafficPercent,
      deactivateOthers: trafficPercent === 100,
    });

    console.log(`✅ Model ${modelVersionId} promoted to ACTIVE`);
    console.log(`   Task: ${model.taskType}`);
    console.log(`   Model Name: ${model.modelName}`);
    console.log(`   Traffic: ${trafficPercent}%`);
    if (trafficPercent === 100) {
      console.log(`   Other models for this task have been deactivated`);
    }
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

