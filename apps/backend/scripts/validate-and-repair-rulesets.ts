/**
 * Validate (and optionally repair) VisaRuleSet data across all records.
 *
 * Usage:
 *  ts-node --project scripts/tsconfig.json scripts/validate-and-repair-rulesets.ts [--repair]
 *
 * When --repair is provided, the script will attempt a minimal repair:
 *  - Parse JSON
 *  - Filter out requiredDocuments missing documentType or category
 *  - Re-run validation and persist if fixed
 *
 * All operations are logged; failures are reported at the end.
 */

import { PrismaClient } from '@prisma/client';
import { validateRuleSetData } from '../src/utils/visa-rules-validator';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const repair = args.includes('--repair');

async function main() {
  const ruleSets = await prisma.visaRuleSet.findMany();
  const report: {
    total: number;
    valid: number;
    invalid: number;
    repaired: number;
    failed: number;
    details: Array<{ id: string; errors: string[] }>;
  } = {
    total: ruleSets.length,
    valid: 0,
    invalid: 0,
    repaired: 0,
    failed: 0,
    details: [],
  };

  for (const rs of ruleSets) {
    try {
      const raw = typeof rs.data === 'string' ? JSON.parse(rs.data) : rs.data;
      let validation = validateRuleSetData(raw);

      if (validation.success) {
        report.valid += 1;
        continue;
      }

      report.invalid += 1;
      report.details.push({ id: rs.id, errors: validation.errors });

      if (!repair) {
        continue;
      }

      // Attempt minimal repair: filter bad requiredDocuments
      const repaired = {
        ...raw,
        requiredDocuments: Array.isArray((raw as any)?.requiredDocuments)
          ? (raw as any).requiredDocuments.filter(
              (doc: any) => doc?.documentType && doc?.category
            )
          : [],
      };

      validation = validateRuleSetData(repaired);
      if (validation.success) {
        await prisma.visaRuleSet.update({
          where: { id: rs.id },
          data: {
            data: JSON.stringify(validation.data) as any,
            extractionMetadata: rs.extractionMetadata,
          },
        });
        report.repaired += 1;
      } else {
        report.failed += 1;
      }
    } catch (err: any) {
      report.failed += 1;
      report.details.push({
        id: rs.id,
        errors: [err instanceof Error ? err.message : String(err)],
      });
    }
  }

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

