#!/usr/bin/env node
/**
 * AI Evaluation CLI - Checklist Subsystem
 */

import { runChecklistEval } from '../runner';
import { printFullReport, saveJsonReport } from '../reporters';

async function main() {
  console.log('🚀 Starting AI Evaluation - Checklist Subsystem\n');

  const options = {
    maxScenariosPerSubsystem: process.env.MAX_SCENARIOS
      ? parseInt(process.env.MAX_SCENARIOS, 10)
      : undefined,
    dryRun: process.env.DRY_RUN === 'true',
    subsystem: 'checklist' as const,
  };

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No GPT calls will be made\n');
  }

  try {
    const results = await runChecklistEval(options);

    printFullReport(results);

    const reportPath = process.env.REPORT_PATH || './ai-eval-checklist-report.json';
    saveJsonReport(reportPath, results);

    const criticalFailures = results.filter(
      (r) => !r.passed && r.metrics.some((m) => m.critical && !m.ok)
    );
    if (criticalFailures.length > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Evaluation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
