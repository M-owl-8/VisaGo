#!/usr/bin/env node
/**
 * AI Evaluation CLI - Run All Evaluations
 */

import { runAllEvaluations } from '../runner';
import { printFullReport, saveJsonReport } from '../reporters';

async function main() {
  console.log('🚀 Starting AI Evaluation - All Subsystems\n');

  const options = {
    maxScenariosPerSubsystem: process.env.MAX_SCENARIOS
      ? parseInt(process.env.MAX_SCENARIOS, 10)
      : undefined,
    dryRun: process.env.DRY_RUN === 'true',
    subsystem: 'all' as const,
  };

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No GPT calls will be made\n');
  }

  try {
    const results = await runAllEvaluations(options);

    printFullReport(results);

    // Save JSON report
    const reportPath = process.env.REPORT_PATH || './ai-eval-report.json';
    saveJsonReport(reportPath, results);

    // Exit with error code if critical failures
    const criticalFailures = results.filter(
      (r) => !r.passed && r.metrics.some((m) => m.critical && !m.ok)
    );
    if (criticalFailures.length > 0) {
      console.log(
        `\n❌ ${criticalFailures.length} critical failure(s) detected. Exiting with code 1.\n`
      );
      process.exit(1);
    }

    console.log('\n✅ All evaluations completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Evaluation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
