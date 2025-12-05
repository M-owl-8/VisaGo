/**
 * Resolve Failed Migration
 * 
 * Marks a failed migration as rolled back in the production database.
 * Use this when a migration fails and needs to be manually resolved.
 * 
 * Usage: 
 * DATABASE_URL=postgresql://... npx ts-node --project scripts/tsconfig.json scripts/resolve-failed-migration.ts <migration_name>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const migrationName = process.argv[2];

  if (!migrationName) {
    console.error('Usage: resolve-failed-migration.ts <migration_name>');
    console.error('Example: resolve-failed-migration.ts 20251206032219_gpt_risk_and_feedback');
    process.exit(1);
  }

  try {
    console.log(`Marking migration ${migrationName} as rolled back...`);

    // Use Prisma's migrate resolve command via exec
    const { execSync } = require('child_process');
    execSync(`npx prisma migrate resolve --rolled-back ${migrationName}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    console.log(`✅ Migration ${migrationName} marked as rolled back`);
  } catch (error) {
    console.error('❌ Error resolving migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

