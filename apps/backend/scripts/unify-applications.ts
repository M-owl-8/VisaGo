/**
 * Unify Application models by backfilling canonical Application rows
 * for every legacy VisaApplication. Safe to run multiple times (idempotent).
 *
 * Usage:
 *   ts-node --project scripts/tsconfig.json scripts/unify-applications.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

async function main() {
  const legacyApps = await prisma.visaApplication.findMany();
  let created = 0;
  let updated = 0;

  for (const legacy of legacyApps) {
    const existing = await prisma.application.findUnique({ where: { id: legacy.id } });

    if (existing) {
      updated += 1;
      continue;
    }

    if (dryRun) {
      created += 1;
      continue;
    }

    await prisma.application.create({
      data: {
        id: legacy.id,
        userId: legacy.userId,
        countryId: legacy.countryId,
        visaTypeId: legacy.visaTypeId,
        legacyVisaApplicationId: legacy.id,
        status: legacy.status,
        submissionDate: legacy.submissionDate,
        approvalDate: legacy.approvalDate,
        expiryDate: legacy.expiryDate,
        metadata: legacy.notes || null,
      },
    });
    created += 1;
  }

  // Report
  const report = {
    totalLegacy: legacyApps.length,
    created,
    alreadyPresent: updated,
    dryRun,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

