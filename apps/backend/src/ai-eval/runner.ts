/**
 * AI Evaluation Runner
 * Executes evaluation scenarios and collects results
 */

import { EvalResult, EvalSummary } from './types';
import { CHECKLIST_SCENARIOS } from './scenarios.checklist';
import { DOCCHECK_SCENARIOS } from './scenarios.doccheck';
import { RISK_SCENARIOS } from './scenarios.risk';
import { DOC_EXPLANATION_SCENARIOS } from './scenarios.doc-explanation';
import { RULES_EXTRACTION_SCENARIOS } from './scenarios.rules-extraction';
import {
  validateJsonSchema,
  validateChecklistConstraints,
  validateDocCheckConstraints,
  validateRiskConstraints,
  validateDocExplanationConstraints,
  validateRulesExtractionConstraints,
} from './validators';
import { VisaChecklistEngineService } from '../services/visa-checklist-engine.service';
import { VisaDocCheckerService } from '../services/visa-doc-checker.service';
import { VisaRiskExplanationService } from '../services/visa-risk-explanation.service';
import { AIEmbassyExtractorService } from '../services/ai-embassy-extractor.service';
import { logInfo, logWarn, logError } from '../middleware/logger';

export interface EvalOptions {
  maxScenariosPerSubsystem?: number;
  dryRun?: boolean;
  subsystem?: 'checklist' | 'doccheck' | 'risk' | 'doc-explanation' | 'rules-extraction' | 'all';
}

/**
 * Run checklist evaluation
 */
export async function runChecklistEval(options: EvalOptions = {}): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  const scenarios = options.maxScenariosPerSubsystem
    ? CHECKLIST_SCENARIOS.slice(0, options.maxScenariosPerSubsystem)
    : CHECKLIST_SCENARIOS;

  logInfo('[AIEval] Running checklist evaluation', {
    scenarioCount: scenarios.length,
    dryRun: options.dryRun,
  });

  for (const scenario of scenarios) {
    const startTime = Date.now();
    let result: EvalResult;

    try {
      if (options.dryRun) {
        // Dry run: just validate scenario structure
        result = {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          subsystem: 'checklist',
          passed: true,
          metrics: [
            {
              name: 'scenario_structure_valid',
              ok: true,
            },
          ],
          executionTimeMs: Date.now() - startTime,
        };
      } else {
        // Real evaluation: call GPT
        const aiUserContext = {
          userProfile: scenario.canonicalAIUserContext.userProfile,
          application: scenario.canonicalAIUserContext.application,
          questionnaireSummary: undefined,
          uploadedDocuments: scenario.canonicalAIUserContext.uploadedDocuments,
          appActions: scenario.canonicalAIUserContext.appActions,
          riskScore: scenario.canonicalAIUserContext.riskScore,
        };

        const checklistResponse = await VisaChecklistEngineService.generateChecklist(
          scenario.countryCode,
          scenario.visaType,
          aiUserContext as any
        );

        // Validate
        const jsonMetric = validateJsonSchema(checklistResponse, 'checklist');
        const constraintMetrics = validateChecklistConstraints(scenario, checklistResponse);

        const allMetrics = [jsonMetric, ...constraintMetrics];
        const criticalFailed = allMetrics.some((m) => m.critical && !m.ok);
        const allPassed = allMetrics.every((m) => m.ok);

        result = {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          subsystem: 'checklist',
          passed: !criticalFailed && allPassed,
          metrics: allMetrics,
          rawRequest: {
            countryCode: scenario.countryCode,
            visaType: scenario.visaType,
            baseDocuments: scenario.baseDocuments,
          },
          rawResponse: checklistResponse,
          executionTimeMs: Date.now() - startTime,
        };
      }
    } catch (error) {
      result = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        subsystem: 'checklist',
        passed: false,
        metrics: [
          {
            name: 'execution_error',
            ok: false,
            details: error instanceof Error ? error.message : String(error),
            critical: true,
          },
        ],
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Date.now() - startTime,
      };
      logError('[AIEval] Checklist evaluation error', error as Error, { scenarioId: scenario.id });
    }

    results.push(result);
  }

  return results;
}

/**
 * Run document check evaluation
 */
export async function runDocCheckEval(options: EvalOptions = {}): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  const scenarios = options.maxScenariosPerSubsystem
    ? DOCCHECK_SCENARIOS.slice(0, options.maxScenariosPerSubsystem)
    : DOCCHECK_SCENARIOS;

  logInfo('[AIEval] Running document check evaluation', {
    scenarioCount: scenarios.length,
    dryRun: options.dryRun,
  });

  for (const scenario of scenarios) {
    const startTime = Date.now();
    let result: EvalResult;

    try {
      if (options.dryRun) {
        result = {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          subsystem: 'doccheck',
          passed: true,
          metrics: [{ name: 'scenario_structure_valid', ok: true }],
          executionTimeMs: Date.now() - startTime,
        };
      } else {
        const aiUserContext = scenario.canonicalAIUserContext
          ? {
              userProfile: scenario.canonicalAIUserContext.userProfile,
              application: scenario.canonicalAIUserContext.application,
              questionnaireSummary: undefined,
              uploadedDocuments: [],
              appActions: [],
              riskScore: scenario.canonicalAIUserContext.riskScore,
            }
          : undefined;

        const checkResult = await VisaDocCheckerService.checkDocument(
          scenario.requiredDocumentRule as any,
          scenario.userDocumentText,
          aiUserContext as any,
          scenario.metadata
        );

        const jsonMetric = validateJsonSchema(checkResult, 'doccheck');
        const constraintMetrics = validateDocCheckConstraints(scenario, checkResult);

        const allMetrics = [jsonMetric, ...constraintMetrics];
        const criticalFailed = allMetrics.some((m) => m.critical && !m.ok);
        const allPassed = allMetrics.every((m) => m.ok);

        result = {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          subsystem: 'doccheck',
          passed: !criticalFailed && allPassed,
          metrics: allMetrics,
          rawRequest: {
            documentType: scenario.requiredDocumentRule.documentType,
            documentTextLength: scenario.userDocumentText.length,
            metadata: scenario.metadata,
          },
          rawResponse: checkResult,
          executionTimeMs: Date.now() - startTime,
        };
      }
    } catch (error) {
      result = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        subsystem: 'doccheck',
        passed: false,
        metrics: [
          {
            name: 'execution_error',
            ok: false,
            details: error instanceof Error ? error.message : String(error),
            critical: true,
          },
        ],
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Date.now() - startTime,
      };
      logError('[AIEval] Document check evaluation error', error as Error, {
        scenarioId: scenario.id,
      });
    }

    results.push(result);
  }

  return results;
}

/**
 * Run risk explanation evaluation
 */
export async function runRiskEval(options: EvalOptions = {}): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  const scenarios = options.maxScenariosPerSubsystem
    ? RISK_SCENARIOS.slice(0, options.maxScenariosPerSubsystem)
    : RISK_SCENARIOS;

  logInfo('[AIEval] Running risk explanation evaluation', {
    scenarioCount: scenarios.length,
    dryRun: options.dryRun,
  });

  for (const scenario of scenarios) {
    const startTime = Date.now();
    let result: EvalResult;

    try {
      if (options.dryRun) {
        result = {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          subsystem: 'risk',
          passed: true,
          metrics: [{ name: 'scenario_structure_valid', ok: true }],
          executionTimeMs: Date.now() - startTime,
        };
      } else {
        // For risk evaluation, we need to mock the application/user IDs
        // In real evaluation, we'd create test records, but for now we'll skip DB calls
        // and call the service directly with mocked context
        logWarn('[AIEval] Risk evaluation requires DB - skipping for now', {
          scenarioId: scenario.id,
        });
        result = {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          subsystem: 'risk',
          passed: false,
          metrics: [
            {
              name: 'db_required',
              ok: false,
              details: 'Risk evaluation requires database - implement test DB setup',
              critical: false,
            },
          ],
          executionTimeMs: Date.now() - startTime,
        };
      }
    } catch (error) {
      result = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        subsystem: 'risk',
        passed: false,
        metrics: [
          {
            name: 'execution_error',
            ok: false,
            details: error instanceof Error ? error.message : String(error),
            critical: true,
          },
        ],
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Date.now() - startTime,
      };
    }

    results.push(result);
  }

  return results;
}

/**
 * Run document explanation evaluation
 */
export async function runDocExplanationEval(options: EvalOptions = {}): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  const scenarios = options.maxScenariosPerSubsystem
    ? DOC_EXPLANATION_SCENARIOS.slice(0, options.maxScenariosPerSubsystem)
    : DOC_EXPLANATION_SCENARIOS;

  logInfo('[AIEval] Running document explanation evaluation', {
    scenarioCount: scenarios.length,
    dryRun: options.dryRun,
  });

  for (const scenario of scenarios) {
    const startTime = Date.now();
    let result: EvalResult;

    try {
      if (options.dryRun) {
        result = {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          subsystem: 'doc-explanation',
          passed: true,
          metrics: [{ name: 'scenario_structure_valid', ok: true }],
          executionTimeMs: Date.now() - startTime,
        };
      } else {
        // Document explanation service needs to be called
        // For now, mark as not implemented
        logWarn('[AIEval] Document explanation evaluation not yet implemented', {
          scenarioId: scenario.id,
        });
        result = {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          subsystem: 'doc-explanation',
          passed: false,
          metrics: [
            {
              name: 'not_implemented',
              ok: false,
              details: 'Document explanation evaluation not yet implemented',
              critical: false,
            },
          ],
          executionTimeMs: Date.now() - startTime,
        };
      }
    } catch (error) {
      result = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        subsystem: 'doc-explanation',
        passed: false,
        metrics: [
          {
            name: 'execution_error',
            ok: false,
            details: error instanceof Error ? error.message : String(error),
            critical: true,
          },
        ],
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Date.now() - startTime,
      };
    }

    results.push(result);
  }

  return results;
}

/**
 * Run rules extraction evaluation
 */
export async function runRulesExtractionEval(options: EvalOptions = {}): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  const scenarios = options.maxScenariosPerSubsystem
    ? RULES_EXTRACTION_SCENARIOS.slice(0, options.maxScenariosPerSubsystem)
    : RULES_EXTRACTION_SCENARIOS;

  logInfo('[AIEval] Running rules extraction evaluation', {
    scenarioCount: scenarios.length,
    dryRun: options.dryRun,
  });

  for (const scenario of scenarios) {
    const startTime = Date.now();
    let result: EvalResult;

    try {
      if (options.dryRun) {
        result = {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          subsystem: 'rules-extraction',
          passed: true,
          metrics: [{ name: 'scenario_structure_valid', ok: true }],
          executionTimeMs: Date.now() - startTime,
        };
      } else {
        const extractionResult = await AIEmbassyExtractorService.extractVisaRulesFromPage({
          countryCode: scenario.countryCode,
          visaType: scenario.visaType,
          sourceUrl: 'https://test-embassy-page.example.com',
          pageText: scenario.embassyPageText,
          pageTitle: `Test Embassy Page - ${scenario.countryCode} ${scenario.visaType}`,
        });

        // Validate
        const constraintMetrics = validateRulesExtractionConstraints(scenario, {
          requiredDocuments: extractionResult.ruleSet.requiredDocuments,
          financialRequirements: extractionResult.ruleSet.financialRequirements,
          confidence: extractionResult.metadata.confidence,
        });

        const allPassed = constraintMetrics.every((m) => m.ok);
        const criticalFailed = constraintMetrics.some((m) => m.critical && !m.ok);

        result = {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          subsystem: 'rules-extraction',
          passed: !criticalFailed && allPassed,
          metrics: constraintMetrics,
          rawRequest: {
            countryCode: scenario.countryCode,
            visaType: scenario.visaType,
            pageTextLength: scenario.embassyPageText.length,
          },
          rawResponse: extractionResult,
          executionTimeMs: Date.now() - startTime,
        };
      }
    } catch (error) {
      result = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        subsystem: 'rules-extraction',
        passed: false,
        metrics: [
          {
            name: 'execution_error',
            ok: false,
            details: error instanceof Error ? error.message : String(error),
            critical: true,
          },
        ],
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Date.now() - startTime,
      };
      logError('[AIEval] Rules extraction evaluation error', error as Error, {
        scenarioId: scenario.id,
      });
    }

    results.push(result);
  }

  return results;
}

/**
 * Run all evaluations
 */
export async function runAllEvaluations(options: EvalOptions = {}): Promise<EvalResult[]> {
  const results: EvalResult[] = [];

  const subsystems =
    options.subsystem === 'all' || !options.subsystem
      ? ['checklist', 'doccheck', 'risk', 'doc-explanation', 'rules-extraction']
      : [options.subsystem];

  if (subsystems.includes('checklist')) {
    results.push(...(await runChecklistEval(options)));
  }
  if (subsystems.includes('doccheck')) {
    results.push(...(await runDocCheckEval(options)));
  }
  if (subsystems.includes('risk')) {
    results.push(...(await runRiskEval(options)));
  }
  if (subsystems.includes('doc-explanation')) {
    results.push(...(await runDocExplanationEval(options)));
  }
  if (subsystems.includes('rules-extraction')) {
    results.push(...(await runRulesExtractionEval(options)));
  }

  return results;
}

/**
 * Generate evaluation summary
 */
export function generateSummary(results: EvalResult[]): EvalSummary {
  const totalScenarios = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = totalScenarios - passed;
  const criticalFailures = results.filter(
    (r) => !r.passed && r.metrics.some((m) => m.critical && !m.ok)
  ).length;

  const bySubsystem: Record<string, { total: number; passed: number; failed: number }> = {};
  results.forEach((result) => {
    if (!bySubsystem[result.subsystem]) {
      bySubsystem[result.subsystem] = { total: 0, passed: 0, failed: 0 };
    }
    bySubsystem[result.subsystem].total++;
    if (result.passed) {
      bySubsystem[result.subsystem].passed++;
    } else {
      bySubsystem[result.subsystem].failed++;
    }
  });

  const totalExecutionTime = results.reduce((sum, r) => sum + (r.executionTimeMs || 0), 0);

  return {
    totalScenarios,
    passed,
    failed,
    bySubsystem,
    criticalFailures,
    executionTimeMs: totalExecutionTime,
  };
}
