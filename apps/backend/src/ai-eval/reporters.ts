/**
 * AI Evaluation Reporters
 * Formats and displays evaluation results
 */

import { EvalResult, EvalSummary } from './types';
import { generateSummary } from './runner';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Print console summary
 */
export function printConsoleSummary(results: EvalResult[]): void {
  const summary = generateSummary(results);

  console.log('\n============================================================');
  console.log('AI EVALUATION SUMMARY');
  console.log('============================================================\n');

  console.log(`Total Scenarios: ${summary.totalScenarios}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⚠️  Critical Failures: ${summary.criticalFailures}`);
  console.log(`⏱️  Total Execution Time: ${(summary.executionTimeMs / 1000).toFixed(2)}s\n`);

  console.log('By Subsystem:');
  for (const [subsystem, stats] of Object.entries(summary.bySubsystem)) {
    const passRate = ((stats.passed / stats.total) * 100).toFixed(0);
    console.log(`  ${subsystem}: ${stats.passed}/${stats.total} passed (${passRate}%)`);
  }

  console.log('\n============================================================');
  console.log('SCENARIO RESULTS');
  console.log('============================================================\n');

  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    const time = result.executionTimeMs ? ` (${result.executionTimeMs}ms)` : '';
    console.log(`${icon} [${result.subsystem}] ${result.scenarioName}${time}`);
  });

  console.log('');
}

/**
 * Print detailed failures
 */
export function printDetailedFailures(results: EvalResult[]): void {
  const failures = results.filter((r) => !r.passed);

  if (failures.length === 0) {
    console.log('\n✅ No failures to report!\n');
    return;
  }

  console.log('\n============================================================');
  console.log('DETAILED FAILURE REPORT');
  console.log('============================================================\n');

  failures.forEach((result) => {
    console.log(`\n❌ ${result.scenarioName} (${result.subsystem})`);
    console.log(`   Scenario ID: ${result.scenarioId}`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    const failedMetrics = result.metrics.filter((m) => !m.ok);
    if (failedMetrics.length > 0) {
      console.log(`   Failed Metrics (${failedMetrics.length}):`);
      failedMetrics.forEach((metric) => {
        const critical = metric.critical ? ' [CRITICAL]' : '';
        console.log(`     - ${metric.name}${critical}`);
        if (metric.details) {
          console.log(`       ${metric.details}`);
        }
      });
    }

    const criticalFailed = failedMetrics.some((m) => m.critical);
    if (criticalFailed) {
      console.log(`   ⚠️  CRITICAL FAILURE - This scenario has critical metric failures`);
    }
  });

  console.log('\n');
}

/**
 * Save JSON report
 */
export function saveJsonReport(filePath: string, results: EvalResult[]): void {
  const summary = generateSummary(results);
  const report = {
    timestamp: new Date().toISOString(),
    summary,
    results,
  };

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  console.log(`\n📄 JSON report saved to: ${filePath}\n`);
}

/**
 * Print full report (summary + failures)
 */
export function printFullReport(results: EvalResult[]): void {
  printConsoleSummary(results);
  printDetailedFailures(results);
}
