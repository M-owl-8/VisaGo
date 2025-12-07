/**
 * AI Document Check Evaluation Runner (Phase 5)
 *
 * ⚠️ DEV-ONLY: This is a development evaluation harness to test document validation behavior.
 *
 * This runner:
 * - Tests document validation with synthetic document fixtures
 * - Validates risk-driven document checking
 * - Ensures embassy rules and playbooks are used correctly
 * - Checks invariants (e.g., low funds + bad bank statement = not APPROVED)
 *
 * Usage:
 *   import { runDocCheckEval } from './ai-eval/ai-eval-doc-runner';
 *   await runDocCheckEval(console);
 */

import { EVAL_SCENARIOS, EvalScenario } from './ai-eval-scenarios';
import { DOC_FIXTURES, getDocFixture } from './ai-eval-doc-fixtures';
import { VisaDocCheckerService, DocumentCheckResult } from '../services/visa-doc-checker.service';
import { buildCanonicalAIUserContext } from '../services/ai-context.service';
import { logInfo, logWarn, logError } from '../middleware/logger';
import { normalizeDocumentType } from '../config/document-types-map';
import { getCountryNameFromCode, normalizeCountryCode } from '../config/country-registry';

/**
 * Logger interface for evaluation output
 */
export interface EvalLogger {
  log(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
}

/**
 * Document check evaluation result
 */
export interface EvalDocCheckResult {
  scenarioId: string;
  countryCode: string;
  visaCategory: 'tourist' | 'student';
  docType: string;
  docFixtureKey: string;
  decision: 'APPROVED' | 'NEED_FIX' | 'REJECTED';
  riskDrivers: string[];
  violatesObviousLogic: boolean;
  error?: string;
  details?: {
    confidence?: number;
    riskDriversAddressed?: string[];
    issues?: string[];
  };
}

/**
 * Create mock AIUserContext from scenario
 */
function createMockAIUserContext(scenario: EvalScenario): any {
  const context = scenario.context;

  return {
    userProfile: {
      userId: `eval-user-${scenario.id}`,
      appLanguage: 'en' as const,
      citizenship: 'UZ',
      age: 28,
    },
    application: {
      applicationId: `eval-app-${scenario.id}`,
      visaType: scenario.visaType,
      country: { code: scenario.countryCode, name: scenario.countryCode },
      status: 'draft' as const,
    },
    applicantProfile: {
      travel: {
        purpose: scenario.visaType === 'student' ? 'study' : 'tourism',
        duration: '1_3_months',
        previousTravel: context.travelHistory?.hasInternationalTravel || false,
      },
      employment: {
        currentStatus: context.ties?.isEmployed ? 'employee' : 'unemployed',
        hasStableIncome: context.financial?.monthlyIncomeUSD
          ? context.financial.monthlyIncomeUSD > 500
          : false,
      },
      financial: {
        financialSituation: 'stable_income',
        isSponsored: false,
        bankBalanceUSD: context.financial?.bankBalanceUSD || 0,
        monthlyIncomeUSD: context.financial?.monthlyIncomeUSD || 0,
      },
      familyAndTies: {
        maritalStatus: 'single',
        hasChildren: context.ties?.hasChildren || false,
        hasStrongTies: (context.ties?.tiesStrengthScore || 0) > 0.5,
      },
      meta: {
        countryCode: scenario.countryCode,
        visaType: scenario.visaType,
      },
      hasProperty: context.ties?.hasPropertyInUzbekistan || false,
    },
    riskScore: context.riskScore || {
      level: 'medium',
      probabilityPercent: 50,
      riskFactors: [],
      positiveFactors: [],
    },
  };
}

/**
 * Create mock required document rule
 */
function createMockDocumentRule(
  docType: string,
  countryCode: string,
  visaCategory: 'tourist' | 'student'
): any {
  const baseRule: any = {
    documentType: docType,
    category: 'required',
    required: true,
    description: `Required ${docType} for ${countryCode} ${visaCategory} visa`,
  };

  // Add country-specific requirements
  if (docType === 'bank_statement' || docType === 'bank_statements_applicant') {
    if (countryCode === 'GB' || countryCode === 'UK') {
      baseRule.validityRequirements = {
        statementMonths: 3,
        fundsHeldForDays: 28,
      };
      baseRule.financialRequirements = {
        minimumBalance: 2000,
        currency: 'GBP',
      };
    } else if (countryCode === 'US') {
      baseRule.financialRequirements = {
        minimumBalance: 5000,
        currency: 'USD',
      };
      baseRule.validityRequirements = {
        statementMonths: 3,
      };
    }
  } else if (docType === 'travel_insurance') {
    if (['DE', 'ES', 'FR'].includes(countryCode)) {
      baseRule.validityRequirements = {
        minimumCoverage: 30000,
        currency: 'EUR',
        coverageArea: 'Schengen',
      };
    }
  }

  return baseRule;
}

/**
 * Test document check for a scenario + fixture combination
 */
async function testDocCheck(
  scenario: EvalScenario,
  docFixtureKey: keyof typeof DOC_FIXTURES,
  docType: string
): Promise<EvalDocCheckResult> {
  const result: EvalDocCheckResult = {
    scenarioId: scenario.id,
    countryCode: scenario.countryCode,
    visaCategory: scenario.visaType,
    docType,
    docFixtureKey,
    decision: 'NEED_FIX',
    riskDrivers: scenario.context.riskScore?.riskFactors || [],
    violatesObviousLogic: false,
  };

  try {
    // Create mock context
    const mockAIUserContext = createMockAIUserContext(scenario);
    const canonicalContext = await buildCanonicalAIUserContext(mockAIUserContext);

    // Get document fixture text
    const docText = getDocFixture(docFixtureKey);

    // Create mock document rule
    const documentRule = createMockDocumentRule(docType, scenario.countryCode, scenario.visaType);

    // Call document checker
    const checkResult = await VisaDocCheckerService.checkDocument(
      documentRule,
      docText,
      mockAIUserContext,
      undefined, // metadata
      scenario.countryCode,
      scenario.visaType
    );

    result.decision = checkResult.status;
    result.details = {
      confidence:
        checkResult.embassy_risk_level === 'LOW'
          ? 0.9
          : checkResult.embassy_risk_level === 'MEDIUM'
            ? 0.7
            : 0.5,
      riskDriversAddressed: [], // Would need to extract from checkResult if available
      issues: checkResult.technical_notes ? [checkResult.technical_notes] : [],
    };

    // Check invariants
    const riskDrivers = canonicalContext.riskDrivers || [];
    const hasLowFunds =
      riskDrivers.includes('low_funds') || riskDrivers.includes('borderline_funds');
    const hasWeakTies = riskDrivers.includes('weak_ties') || riskDrivers.includes('no_property');

    // Invariant 1: Low funds + bad bank statement should NOT be APPROVED
    if (
      hasLowFunds &&
      (docFixtureKey === 'BAD_US_BANK_STATEMENT_LOW_FUNDS_SHORT_HISTORY' ||
        (docFixtureKey.includes('BAD') && docType.includes('bank')))
    ) {
      if (result.decision === 'APPROVED') {
        result.violatesObviousLogic = true;
        result.error =
          'Low funds + bad bank statement was APPROVED (should be NEED_FIX or REJECTED)';
      }
    }

    // Invariant 2: Strong employment letter with weak ties should generally be APPROVED or NEED_FIX (not REJECTED without reason)
    if (
      hasWeakTies &&
      docFixtureKey === 'UZB_EMPLOYMENT_LETTER_STRONG_TIES' &&
      docType.includes('employment')
    ) {
      if (result.decision === 'REJECTED' && !result.details?.issues?.length) {
        result.violatesObviousLogic = true;
        result.error = 'Strong employment letter with weak ties was REJECTED without clear reason';
      }
    }

    // Invariant 3: Bad insurance (low coverage) for Schengen should NOT be APPROVED
    if (
      ['DE', 'ES', 'FR'].includes(scenario.countryCode) &&
      docFixtureKey === 'SCHENGEN_TRAVEL_INSURANCE_BAD_COVERAGE' &&
      docType.includes('insurance')
    ) {
      if (result.decision === 'APPROVED') {
        result.violatesObviousLogic = true;
        result.error =
          'Bad insurance (low coverage) for Schengen was APPROVED (should be NEED_FIX or REJECTED)';
      }
    }

    // Invariant 4: Good insurance for Schengen should generally be APPROVED or at least not REJECTED
    if (
      ['DE', 'ES', 'FR'].includes(scenario.countryCode) &&
      docFixtureKey === 'SCHENGEN_TRAVEL_INSURANCE_OK' &&
      docType.includes('insurance')
    ) {
      if (result.decision === 'REJECTED' && !result.details?.issues?.length) {
        result.violatesObviousLogic = true;
        result.error = 'Good insurance for Schengen was REJECTED without clear reason';
      }
    }

    // Invariant 5: Wrong document type should be REJECTED
    if (docFixtureKey === 'WRONG_DOCUMENT_TYPE_EMPLOYMENT_FOR_BANK_STATEMENT') {
      if (result.decision !== 'REJECTED') {
        result.violatesObviousLogic = true;
        result.error = 'Wrong document type was not REJECTED';
      }
    }

    // Invariant 6: Expired passport should be REJECTED
    if (docFixtureKey === 'EXPIRED_PASSPORT') {
      if (result.decision !== 'REJECTED') {
        result.violatesObviousLogic = true;
        result.error = 'Expired passport was not REJECTED';
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    result.violatesObviousLogic = true;
  }

  return result;
}

/**
 * Run document check evaluation
 */
export async function runDocCheckEval(logger: EvalLogger = console): Promise<void> {
  logger.log('='.repeat(80));
  logger.log('AI DOCUMENT CHECK EVALUATION (Phase 5)');
  logger.log('='.repeat(80));
  logger.log('');

  // Test scenarios: Focus on a subset of scenarios that test different risk profiles
  const testScenarios = EVAL_SCENARIOS.filter(
    (s) =>
      s.id === 'us_tourist_low_funds_no_travel' ||
      s.id === 'us_tourist_strong_profile' ||
      s.id === 'gb_tourist_medium_risk' ||
      s.id === 'de_tourist_schengen'
  );

  // Test combinations: scenario + document fixture + document type
  const testCases: Array<{
    scenario: EvalScenario;
    docFixtureKey: keyof typeof DOC_FIXTURES;
    docType: string;
  }> = [];

  // US tourist with low funds: test bad bank statement
  const usLowFundsScenario = testScenarios.find((s) => s.id === 'us_tourist_low_funds_no_travel');
  if (usLowFundsScenario) {
    testCases.push({
      scenario: usLowFundsScenario,
      docFixtureKey: 'BAD_US_BANK_STATEMENT_LOW_FUNDS_SHORT_HISTORY',
      docType: 'bank_statement',
    });
    testCases.push({
      scenario: usLowFundsScenario,
      docFixtureKey: 'GOOD_US_BANK_STATEMENT_STRONG_FUNDS',
      docType: 'bank_statement',
    });
    testCases.push({
      scenario: usLowFundsScenario,
      docFixtureKey: 'UZB_EMPLOYMENT_LETTER_STRONG_TIES',
      docType: 'employment_letter',
    });
  }

  // US tourist with strong profile: test good bank statement
  const usStrongScenario = testScenarios.find((s) => s.id === 'us_tourist_strong_profile');
  if (usStrongScenario) {
    testCases.push({
      scenario: usStrongScenario,
      docFixtureKey: 'GOOD_US_BANK_STATEMENT_STRONG_FUNDS',
      docType: 'bank_statement',
    });
  }

  // Schengen tourist: test insurance
  const deSchengenScenario = testScenarios.find((s) => s.id === 'de_tourist_schengen');
  if (deSchengenScenario) {
    testCases.push({
      scenario: deSchengenScenario,
      docFixtureKey: 'SCHENGEN_TRAVEL_INSURANCE_OK',
      docType: 'travel_insurance',
    });
    testCases.push({
      scenario: deSchengenScenario,
      docFixtureKey: 'SCHENGEN_TRAVEL_INSURANCE_BAD_COVERAGE',
      docType: 'travel_insurance',
    });
  }

  // Test wrong document types
  if (usLowFundsScenario) {
    testCases.push({
      scenario: usLowFundsScenario,
      docFixtureKey: 'WRONG_DOCUMENT_TYPE_EMPLOYMENT_FOR_BANK_STATEMENT',
      docType: 'bank_statement',
    });
    testCases.push({
      scenario: usLowFundsScenario,
      docFixtureKey: 'EXPIRED_PASSPORT',
      docType: 'passport',
    });
  }

  logger.log(`Running ${testCases.length} document check test cases...`);
  logger.log('');

  const results: EvalDocCheckResult[] = [];

  for (const testCase of testCases) {
    logger.log(
      `[AI Doc Eval] ${testCase.scenario.countryCode} / ${testCase.scenario.visaType} / ${testCase.scenario.id} → ${testCase.docFixtureKey} → ${testCase.docType}`
    );

    const result = await testDocCheck(testCase.scenario, testCase.docFixtureKey, testCase.docType);

    results.push(result);

    const status = result.violatesObviousLogic ? 'VIOLATION' : 'OK';
    logger.log(
      `  → decision=${result.decision} (${status})${result.error ? ` - ${result.error}` : ''}`
    );
  }

  logger.log('');
  logger.log('='.repeat(80));
  logger.log('DOCUMENT CHECK EVALUATION SUMMARY');
  logger.log('='.repeat(80));
  logger.log('');

  const totalTests = results.length;
  const violations = results.filter((r) => r.violatesObviousLogic).length;
  const passed = totalTests - violations;

  logger.log(`Total doc tests: ${totalTests}`);
  logger.log(`Passed: ${passed}`);
  logger.log(`Violations: ${violations}`);
  logger.log('');

  // Breakdown by country
  const byCountry = new Map<string, { total: number; violations: number }>();
  for (const result of results) {
    const key = result.countryCode;
    const current = byCountry.get(key) || { total: 0, violations: 0 };
    current.total++;
    if (result.violatesObviousLogic) {
      current.violations++;
    }
    byCountry.set(key, current);
  }

  logger.log('Breakdown by country:');
  for (const [country, stats] of byCountry.entries()) {
    logger.log(`  ${country}: ${stats.total} tests, ${stats.violations} violations`);
  }

  logger.log('');

  // Breakdown by docType
  const byDocType = new Map<string, { total: number; violations: number }>();
  for (const result of results) {
    const key = result.docType;
    const current = byDocType.get(key) || { total: 0, violations: 0 };
    current.total++;
    if (result.violatesObviousLogic) {
      current.violations++;
    }
    byDocType.set(key, current);
  }

  logger.log('Breakdown by docType:');
  for (const [docType, stats] of byDocType.entries()) {
    logger.log(`  ${docType}: ${stats.total} tests, ${stats.violations} violations`);
  }

  logger.log('');
  logger.log('='.repeat(80));

  if (violations > 0) {
    logger.warn(`⚠️  Found ${violations} violations. Review the results above.`);
  } else {
    logger.log('✅ All document check tests passed!');
  }
}
