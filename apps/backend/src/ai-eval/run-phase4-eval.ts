/**
 * Phase 4 Evaluation CLI Entry Point
 *
 * ⚠️ DEV-ONLY: This is a development tool for internal evaluation only.
 *
 * Usage:
 *   pnpm ts-node apps/backend/src/ai-eval/run-phase4-eval.ts
 *   pnpm ts-node apps/backend/src/ai-eval/run-phase4-eval.ts -- --scenario us_tourist_strong
 *   pnpm ts-node apps/backend/src/ai-eval/run-phase4-eval.ts -- --country US
 */

import { PHASE4_EVAL_SCENARIOS, EvalApplicantProfile } from './phase4-eval-scenarios';
import { runFullEvalForScenario, EvalAggregateResult } from './phase4-eval-runner';
import { logInfo, logWarn, logError } from '../middleware/logger';

/**
 * Aggregate results by country/visa type/risk level
 */
interface AggregatedResults {
  byCountry: Record<string, { total: number; violations: number }>;
  byVisaCategory: Record<string, { total: number; violations: number }>;
  byRiskLevel: Record<string, { total: number; violations: number }>;
  invariantViolations: {
    financial: number;
    ties: number;
    travel: number;
    checklistSize: number;
    riskConsistency: number;
    countryMismatch: number;
  };
}

/**
 * Main evaluation function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const scenarioId =
    args.indexOf('--scenario') !== -1 ? args[args.indexOf('--scenario') + 1] : null;
  const countryCode = args.indexOf('--country') !== -1 ? args[args.indexOf('--country') + 1] : null;
  const visaCategory = args.indexOf('--visa') !== -1 ? args[args.indexOf('--visa') + 1] : null;

  // Filter scenarios
  let scenariosToRun = PHASE4_EVAL_SCENARIOS;
  if (scenarioId) {
    scenariosToRun = scenariosToRun.filter((s) => s.id === scenarioId);
  }
  if (countryCode) {
    scenariosToRun = scenariosToRun.filter((s) => s.countryCode === countryCode.toUpperCase());
  }
  if (visaCategory) {
    scenariosToRun = scenariosToRun.filter((s) => s.visaCategory === visaCategory);
  }

  if (scenariosToRun.length === 0) {
    console.error('❌ No scenarios found matching criteria');
    process.exit(1);
  }

  console.log(`\n🔍 Phase 4 AI Evaluation`);
  console.log(`   Running ${scenariosToRun.length} scenario(s)\n`);

  const results: EvalAggregateResult[] = [];
  const aggregated: AggregatedResults = {
    byCountry: {},
    byVisaCategory: {},
    byRiskLevel: {},
    invariantViolations: {
      financial: 0,
      ties: 0,
      travel: 0,
      checklistSize: 0,
      riskConsistency: 0,
      countryMismatch: 0,
    },
  };

  // Run evaluations
  for (const scenario of scenariosToRun) {
    console.log(`   Running: ${scenario.label}...`);
    try {
      const result = await runFullEvalForScenario(scenario);
      results.push(result);

      // Aggregate by country
      if (!aggregated.byCountry[scenario.countryCode]) {
        aggregated.byCountry[scenario.countryCode] = { total: 0, violations: 0 };
      }
      aggregated.byCountry[scenario.countryCode].total++;

      // Aggregate by visa category
      if (!aggregated.byVisaCategory[scenario.visaCategory]) {
        aggregated.byVisaCategory[scenario.visaCategory] = { total: 0, violations: 0 };
      }
      aggregated.byVisaCategory[scenario.visaCategory].total++;

      // Aggregate by risk level
      const riskLevel = result.checklistResult.riskLevel;
      if (!aggregated.byRiskLevel[riskLevel]) {
        aggregated.byRiskLevel[riskLevel] = { total: 0, violations: 0 };
      }
      aggregated.byRiskLevel[riskLevel].total++;

      // Count violations
      if (result.checklistResult.violatesFinancialRiskInvariant) {
        aggregated.invariantViolations.financial++;
        aggregated.byCountry[scenario.countryCode].violations++;
        aggregated.byVisaCategory[scenario.visaCategory].violations++;
        aggregated.byRiskLevel[riskLevel].violations++;
      }
      if (result.checklistResult.violatesTiesRiskInvariant) {
        aggregated.invariantViolations.ties++;
        aggregated.byCountry[scenario.countryCode].violations++;
        aggregated.byVisaCategory[scenario.visaCategory].violations++;
        aggregated.byRiskLevel[riskLevel].violations++;
      }
      if (result.checklistResult.violatesTravelRiskInvariant) {
        aggregated.invariantViolations.travel++;
        aggregated.byCountry[scenario.countryCode].violations++;
        aggregated.byVisaCategory[scenario.visaCategory].violations++;
        aggregated.byRiskLevel[riskLevel].violations++;
      }
      if (result.checklistResult.violatesChecklistSizeForHighRisk) {
        aggregated.invariantViolations.checklistSize++;
        aggregated.byCountry[scenario.countryCode].violations++;
        aggregated.byVisaCategory[scenario.visaCategory].violations++;
        aggregated.byRiskLevel[riskLevel].violations++;
      }
      if (!result.riskResult.isRiskLevelConsistent) {
        aggregated.invariantViolations.riskConsistency++;
      }
      if (result.riskResult.hasCountryMismatch) {
        aggregated.invariantViolations.countryMismatch++;
      }

      // Log result
      const violations = [
        result.checklistResult.violatesFinancialRiskInvariant && 'financial',
        result.checklistResult.violatesTiesRiskInvariant && 'ties',
        result.checklistResult.violatesTravelRiskInvariant && 'travel',
        result.checklistResult.violatesChecklistSizeForHighRisk && 'checklistSize',
        !result.riskResult.isRiskLevelConsistent && 'riskConsistency',
        result.riskResult.hasCountryMismatch && 'countryMismatch',
      ].filter(Boolean);

      if (violations.length === 0) {
        console.log(`      ✅ OK (no invariants violated)`);
      } else {
        console.log(`      ⚠️  VIOLATIONS: ${violations.join(', ')}`);
      }
    } catch (error) {
      console.error(`      ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
      logError('[Phase4Eval] Scenario evaluation failed', error as Error, {
        scenarioId: scenario.id,
      });
    }
  }

  // Print summary
  console.log(`\n📊 Evaluation Summary\n`);

  // By country
  console.log('By Country:');
  for (const [country, stats] of Object.entries(aggregated.byCountry)) {
    const violationRate =
      stats.total > 0 ? ((stats.violations / stats.total) * 100).toFixed(0) : '0';
    console.log(
      `   ${country}: ${stats.violations}/${stats.total} scenarios violated invariants (${violationRate}%)`
    );
  }

  // By visa category
  console.log('\nBy Visa Category:');
  for (const [category, stats] of Object.entries(aggregated.byVisaCategory)) {
    const violationRate =
      stats.total > 0 ? ((stats.violations / stats.total) * 100).toFixed(0) : '0';
    console.log(
      `   ${category}: ${stats.violations}/${stats.total} scenarios violated invariants (${violationRate}%)`
    );
  }

  // By risk level
  console.log('\nBy Risk Level:');
  for (const [riskLevel, stats] of Object.entries(aggregated.byRiskLevel)) {
    const violationRate =
      stats.total > 0 ? ((stats.violations / stats.total) * 100).toFixed(0) : '0';
    console.log(
      `   ${riskLevel}: ${stats.violations}/${stats.total} scenarios violated invariants (${violationRate}%)`
    );
  }

  // Invariant violations breakdown
  console.log('\nInvariant Violations Breakdown:');
  console.log(`   Financial Risk Invariant: ${aggregated.invariantViolations.financial}`);
  console.log(`   Ties Risk Invariant: ${aggregated.invariantViolations.ties}`);
  console.log(`   Travel Risk Invariant: ${aggregated.invariantViolations.travel}`);
  console.log(`   Checklist Size for High Risk: ${aggregated.invariantViolations.checklistSize}`);
  console.log(`   Risk Level Consistency: ${aggregated.invariantViolations.riskConsistency}`);
  console.log(`   Country Mismatch: ${aggregated.invariantViolations.countryMismatch}`);

  // Total summary
  const totalViolations = Object.values(aggregated.invariantViolations).reduce((a, b) => a + b, 0);
  const totalScenarios = results.length;
  console.log(
    `\n📈 Overall: ${totalViolations} total violations across ${totalScenarios} scenarios`
  );

  if (totalViolations === 0) {
    console.log(`\n✅ All scenarios passed! No invariant violations detected.\n`);
  } else {
    console.log(`\n⚠️  Some scenarios violated invariants. Review results above.\n`);
  }

  // Exit with appropriate code
  process.exit(totalViolations > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Evaluation failed:', error);
    process.exit(1);
  });
}
