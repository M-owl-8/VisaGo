/**
 * Run Evaluation Suite
 * Executes comprehensive evaluation of document verification system
 * 
 * Usage: ts-node --project scripts/tsconfig.json scripts/run-evaluation.ts
 */

import { EvaluationService } from '../src/services/evaluation.service';
import { logInfo } from '../src/middleware/logger';

async function main() {
  logInfo('[Evaluation] Starting evaluation suite');

  try {
    const { results, metrics } = await EvaluationService.runEvaluationSuite();

    // Print summary
    console.log('\n=== EVALUATION RESULTS ===\n');
    console.log(`Total Test Cases: ${metrics.totalTestCases}`);
    console.log(`Passed: ${metrics.passedTestCases}`);
    console.log(`Failed: ${metrics.failedTestCases}`);
    console.log(`\nChecklist Accuracy: ${metrics.checklistAccuracy.toFixed(2)}%`);
    console.log(`Checklist Precision: ${metrics.checklistPrecision.toFixed(2)}`);
    console.log(`Checklist Recall: ${metrics.checklistRecall.toFixed(2)}`);
    console.log(`Checklist F1-Score: ${metrics.checklistF1Score.toFixed(2)}`);
    console.log(`\nDocument Verification Accuracy: ${metrics.docVerificationAccuracy.toFixed(2)}%`);
    console.log(`\nAverage Latency: ${metrics.averageLatencyMs.toFixed(0)}ms`);
    console.log(`\nFalse Positives: ${metrics.falsePositives}`);
    console.log(`False Negatives: ${metrics.falseNegatives}`);
    console.log(`True Positives: ${metrics.truePositives}`);

    // Print detailed results
    console.log('\n=== DETAILED RESULTS ===\n');
    for (const result of results) {
      console.log(`\nCase: ${result.caseName} (${result.caseId})`);
      console.log(`  Checklist Accuracy: ${result.checklistScore.accuracy.toFixed(2)}%`);
      console.log(`  Matches: ${result.checklistScore.matches}`);
      console.log(`  Missing: ${result.checklistScore.missing}`);
      console.log(`  Extra: ${result.checklistScore.extra}`);
      if (result.docVerificationScore) {
        console.log(`  Doc Verification Accuracy: ${result.docVerificationScore.accuracy.toFixed(2)}%`);
      }
      if (result.errors && result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.join(', ')}`);
      }
    }

    // Save results
    await EvaluationService.saveEvaluationResults(results, metrics);

    process.exit(0);
  } catch (error) {
    console.error('Evaluation failed:', error);
    process.exit(1);
  }
}

main();

