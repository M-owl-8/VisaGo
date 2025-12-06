#!/usr/bin/env node
/**
 * Check Fine-Tune Job Status
 */

import { PrismaClient } from '@prisma/client';
import { refreshFineTuneJobStatus, listFineTuneJobs } from '../src/ai-training/fine-tune.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const jobId = process.argv[2];

  const prisma = new PrismaClient();

  try {
    if (jobId) {
      console.log(`Refreshing status for job ${jobId}...`);
      const updated = await refreshFineTuneJobStatus(jobId);
      console.log('\n✅ Updated job:');
      console.log(`   Status: ${updated.status}`);
      console.log(`   Result Model: ${updated.resultModelName || 'N/A'}`);
      if (updated.metrics) {
        console.log(`   Metrics: ${JSON.stringify(updated.metrics, null, 2)}`);
      }
      if (updated.errorMessage) {
        console.log(`   Error: ${updated.errorMessage}`);
      }
      return;
    }

    console.log('Recent fine-tune jobs:\n');
    const jobs = await listFineTuneJobs();
    if (jobs.length === 0) {
      console.log('No jobs found.');
      return;
    }

    jobs.forEach((job) => {
      console.log(`Job ID: ${job.id}`);
      console.log(`  Task: ${job.taskType}`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Provider: ${job.provider}`);
      console.log(`  Base Model: ${job.baseModel}`);
      if (job.resultModelName) {
        console.log(`  Result Model: ${job.resultModelName}`);
      }
      if (job.modelVersion) {
        console.log(`  Model Version ID: ${job.modelVersion.id}`);
        console.log(`  Model Status: ${job.modelVersion.status}`);
      }
      console.log(`  Created: ${job.createdAt.toISOString()}`);
      console.log('');
    });
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

