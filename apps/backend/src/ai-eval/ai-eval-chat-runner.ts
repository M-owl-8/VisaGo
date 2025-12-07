/**
 * AI Chat Evaluation Runner (Phase 6)
 *
 * ⚠️ DEV-ONLY: This is a development evaluation harness to test chat assistant behavior.
 *
 * This runner:
 * - Tests chat responses with synthetic scenarios
 * - Validates self-evaluation catches mistakes
 * - Ensures country/visa category consistency
 * - Tests that promises are avoided
 *
 * Usage:
 *   import { runChatEval } from './ai-eval/ai-eval-chat-runner';
 *   await runChatEval(console);
 */

import { EVAL_SCENARIOS, EvalScenario } from './ai-eval-scenarios';
import { CHAT_EVAL_SCENARIOS, ChatEvalScenario } from './ai-eval-chat-scenarios';
import {
  VisaConversationOrchestratorService,
  VisaChatRequest,
} from '../services/visa-conversation-orchestrator.service';
import { buildCanonicalAIUserContext } from '../services/ai-context.service';
import { logInfo, logWarn, logError } from '../middleware/logger';

/**
 * Logger interface for evaluation output
 */
export interface EvalLogger {
  log(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
}

/**
 * Chat evaluation result
 */
export interface ChatEvalResult {
  scenarioId: string;
  questionId: string;
  countryCode: string;
  visaCategory: 'tourist' | 'student';
  violatedInvariants: string[]; // e.g. ["PROMISES_APPROVAL", "COUNTRY_MISMATCH"]
  selfCheckFlags: string[]; // Flags from self-evaluation
  error?: string;
  details?: {
    replyLength?: number;
    selfCheckPassed?: boolean;
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
 * Test chat for a scenario + question combination
 */
async function testChat(
  evalScenario: ChatEvalScenario,
  question: ChatEvalScenario['questions'][0],
  baseScenario: EvalScenario
): Promise<ChatEvalResult> {
  const result: ChatEvalResult = {
    scenarioId: evalScenario.scenarioId,
    questionId: question.id,
    countryCode: evalScenario.countryCode,
    visaCategory: evalScenario.visaCategory,
    violatedInvariants: [],
    selfCheckFlags: [],
  };

  try {
    // Create mock context
    const mockAIUserContext = createMockAIUserContext(baseScenario);

    // Call orchestrator
    const request: VisaChatRequest = {
      userId: `eval-user-${baseScenario.id}`,
      message: question.question,
      applicationId: `eval-app-${baseScenario.id}`,
      conversationHistory: [],
    };

    const response = await VisaConversationOrchestratorService.handleUserMessage(request);

    result.selfCheckFlags = response.selfCheck?.flags || [];
    result.details = {
      replyLength: response.reply.length,
      selfCheckPassed: response.selfCheck?.passed,
    };

    const reply = response.reply.toLowerCase();
    const replyLower = reply.toLowerCase();

    // Check invariants
    const expected = question.expectedBehavior;

    // Invariant 1: No promises
    if (expected.shouldNotPromise) {
      const promisePhrases = [
        'guaranteed',
        '100%',
        'definitely will get',
        'you will definitely get approved',
        'guarantee',
        'certain to',
        'will definitely',
        'assured',
      ];
      const hasPromise = promisePhrases.some((phrase) => replyLower.includes(phrase));
      if (hasPromise) {
        // Check if self-evaluation caught it
        if (!result.selfCheckFlags.includes('PROMISES_APPROVAL')) {
          result.violatedInvariants.push('PROMISES_APPROVAL_NOT_CAUGHT');
        } else {
          result.violatedInvariants.push('PROMISES_APPROVAL'); // Caught but still present
        }
      }
    }

    // Invariant 2: Country consistency
    if (expected.shouldMentionCountry) {
      const countryMentions = [
        { code: 'US', names: ['united states', 'us', 'usa', 'american'] },
        { code: 'GB', names: ['united kingdom', 'uk', 'britain', 'british'] },
        { code: 'DE', names: ['germany', 'german'] },
        { code: 'ES', names: ['spain', 'spanish'] },
        { code: 'FR', names: ['france', 'french'] },
        { code: 'AU', names: ['australia', 'australian'] },
        { code: 'CA', names: ['canada', 'canadian'] },
        { code: 'JP', names: ['japan', 'japanese'] },
        { code: 'KR', names: ['south korea', 'korea', 'korean'] },
        { code: 'AE', names: ['uae', 'united arab emirates', 'emirates'] },
      ];

      const expectedCountry = countryMentions.find((c) => c.code === expected.shouldMentionCountry);
      if (expectedCountry) {
        const mentionsExpected = expectedCountry.names.some((name) => replyLower.includes(name));
        if (!mentionsExpected) {
          // Check if reply mentions wrong country
          const mentionsWrongCountry = countryMentions
            .filter((c) => c.code !== expected.shouldMentionCountry)
            .some((c) => c.names.some((name) => replyLower.includes(name)));
          if (mentionsWrongCountry) {
            if (!result.selfCheckFlags.includes('COUNTRY_MISMATCH')) {
              result.violatedInvariants.push('COUNTRY_MISMATCH_NOT_CAUGHT');
            } else {
              result.violatedInvariants.push('COUNTRY_MISMATCH');
            }
          }
        }
      }
    }

    // Invariant 3: Visa category consistency
    if (expected.shouldMentionVisaCategory) {
      if (expected.shouldMentionVisaCategory === 'tourist') {
        // Should not explain student-specific requirements
        const studentTerms = ['i-20', 'cas', 'coe', 'student visa', 'f-1', 'sevis'];
        const mentionsStudent = studentTerms.some((term) => replyLower.includes(term));
        if (mentionsStudent && !question.question.toLowerCase().includes('student')) {
          if (!result.selfCheckFlags.includes('WRONG_VISA_CATEGORY')) {
            result.violatedInvariants.push('WRONG_VISA_CATEGORY_NOT_CAUGHT');
          } else {
            result.violatedInvariants.push('WRONG_VISA_CATEGORY');
          }
        }
      } else if (expected.shouldMentionVisaCategory === 'student') {
        // Should not explain tourist-only requirements in a way that excludes students
        // This is less strict, but we can check for obvious mismatches
      }
    }

    // Invariant 4: Rule contradiction (e.g., Schengen insurance)
    if (expected.shouldNotContradictRules) {
      const shouldNotSay = expected.shouldNotContradictRules.shouldNotSay.toLowerCase();
      if (replyLower.includes(shouldNotSay)) {
        if (!result.selfCheckFlags.includes('OBVIOUS_RULE_CONTRADICTION')) {
          result.violatedInvariants.push('RULE_CONTRADICTION_NOT_CAUGHT');
        } else {
          result.violatedInvariants.push('RULE_CONTRADICTION');
        }
      }
    }

    // Invariant 5: Risk driver reference (if expected)
    if (expected.shouldReferenceRiskDrivers && expected.shouldReferenceRiskDrivers.length > 0) {
      // This is a softer check - we just verify the reply is relevant
      // Not a hard failure if risk drivers aren't explicitly mentioned
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    result.violatedInvariants.push('ERROR');
  }

  return result;
}

/**
 * Run chat evaluation
 */
export async function runChatEval(logger: EvalLogger = console): Promise<void> {
  logger.log('='.repeat(80));
  logger.log('AI CHAT EVALUATION (Phase 6)');
  logger.log('='.repeat(80));
  logger.log('');

  const results: ChatEvalResult[] = [];

  // For each chat eval scenario, find matching base scenario and test questions
  for (const chatScenario of CHAT_EVAL_SCENARIOS) {
    const baseScenario = EVAL_SCENARIOS.find((s) => s.id === chatScenario.scenarioId);
    if (!baseScenario) {
      logger.warn(`Base scenario not found for ${chatScenario.scenarioId}, skipping`);
      continue;
    }

    logger.log(
      `Testing scenario: ${chatScenario.scenarioId} (${chatScenario.countryCode} / ${chatScenario.visaCategory})`
    );

    for (const question of chatScenario.questions) {
      logger.log(`  Question: ${question.question.substring(0, 60)}...`);

      const result = await testChat(chatScenario, question, baseScenario);
      results.push(result);

      const status = result.violatedInvariants.length > 0 ? 'VIOLATION' : 'OK';
      logger.log(
        `    → ${status}${result.violatedInvariants.length > 0 ? ` (${result.violatedInvariants.join(', ')})` : ''}${result.selfCheckFlags.length > 0 ? ` [self-check: ${result.selfCheckFlags.join(', ')}]` : ''}`
      );
    }
  }

  logger.log('');
  logger.log('='.repeat(80));
  logger.log('CHAT EVALUATION SUMMARY');
  logger.log('='.repeat(80));
  logger.log('');

  const totalTests = results.length;
  const violations = results.filter((r) => r.violatedInvariants.length > 0).length;
  const passed = totalTests - violations;

  logger.log(`Total chat tests: ${totalTests}`);
  logger.log(`Passed: ${passed}`);
  logger.log(`Violations: ${violations}`);
  logger.log('');

  // Breakdown by country
  const byCountry = new Map<string, { total: number; violations: number }>();
  for (const result of results) {
    const key = result.countryCode;
    const current = byCountry.get(key) || { total: 0, violations: 0 };
    current.total++;
    if (result.violatedInvariants.length > 0) {
      current.violations++;
    }
    byCountry.set(key, current);
  }

  logger.log('Breakdown by country:');
  for (const [country, stats] of byCountry.entries()) {
    logger.log(`  ${country}: ${stats.total} tests, ${stats.violations} violations`);
  }

  logger.log('');

  // Breakdown by visaCategory
  const byCategory = new Map<string, { total: number; violations: number }>();
  for (const result of results) {
    const key = result.visaCategory;
    const current = byCategory.get(key) || { total: 0, violations: 0 };
    current.total++;
    if (result.violatedInvariants.length > 0) {
      current.violations++;
    }
    byCategory.set(key, current);
  }

  logger.log('Breakdown by visaCategory:');
  for (const [category, stats] of byCategory.entries()) {
    logger.log(`  ${category}: ${stats.total} tests, ${stats.violations} violations`);
  }

  logger.log('');

  // Breakdown by invariant type
  const byInvariant = new Map<string, number>();
  for (const result of results) {
    for (const invariant of result.violatedInvariants) {
      const current = byInvariant.get(invariant) || 0;
      byInvariant.set(invariant, current + 1);
    }
  }

  if (byInvariant.size > 0) {
    logger.log('Breakdown by invariant type:');
    for (const [invariant, count] of byInvariant.entries()) {
      logger.log(`  ${invariant}: ${count} occurrences`);
    }
    logger.log('');
  }

  logger.log('='.repeat(80));

  if (violations > 0) {
    logger.warn(`⚠️  Found ${violations} violations. Review the results above.`);
  } else {
    logger.log('✅ All chat tests passed!');
  }
}
