/**
 * AI Chat Evaluation Scenarios (Phase 6)
 *
 * ⚠️ DEV-ONLY: These are SYNTHETIC chat scenarios for AI evaluation only.
 *
 * These scenarios are NOT real user data and are used exclusively for:
 * - Testing chat assistant behavior
 * - Validating self-evaluation catches mistakes
 * - Ensuring country/visa category consistency
 * - Testing that promises are avoided
 *
 * DO NOT use these scenarios in production code or expose them via public APIs.
 */

import { EvalScenario } from './ai-eval-scenarios';

/**
 * Chat evaluation scenario
 */
export interface ChatEvalScenario {
  scenarioId: string;
  countryCode: string;
  visaCategory: 'tourist' | 'student';
  riskLevel: 'low' | 'medium' | 'high';
  riskDrivers: string[];
  questions: Array<{
    id: string;
    question: string;
    expectedBehavior: {
      shouldNotPromise?: boolean; // Should NOT contain guarantee phrases
      shouldMentionCountry?: string; // Should mention this country (or not mention others)
      shouldMentionVisaCategory?: 'tourist' | 'student'; // Should mention this category
      shouldReferenceRiskDrivers?: string[]; // Should reference these risk drivers if present
      shouldNotContradictRules?: {
        // For Schengen: insurance should not be said to be optional
        rule: string;
        shouldNotSay: string;
      };
    };
  }>;
}

/**
 * Chat evaluation scenarios
 */
export const CHAT_EVAL_SCENARIOS: ChatEvalScenario[] = [
  // ============================================================================
  // US TOURIST - Low funds, no travel history, weak ties
  // ============================================================================
  {
    scenarioId: 'us_tourist_low_funds_no_travel',
    countryCode: 'US',
    visaCategory: 'tourist',
    riskLevel: 'high',
    riskDrivers: ['low_funds', 'weak_ties', 'limited_travel_history'],
    questions: [
      {
        id: 'q1_financial_question',
        question: 'Do I have enough money for this visa? What documents should I focus on?',
        expectedBehavior: {
          shouldNotPromise: true,
          shouldMentionCountry: 'US',
          shouldMentionVisaCategory: 'tourist',
          shouldReferenceRiskDrivers: ['low_funds'],
        },
      },
      {
        id: 'q2_guarantee_question',
        question: 'Can you guarantee that I will get the visa if I upload all documents?',
        expectedBehavior: {
          shouldNotPromise: true, // CRITICAL: Should NOT promise approval
          shouldMentionCountry: 'US',
        },
      },
      {
        id: 'q3_general_advice',
        question: 'What should I do to improve my chances?',
        expectedBehavior: {
          shouldNotPromise: true,
          shouldMentionCountry: 'US',
          shouldReferenceRiskDrivers: ['low_funds', 'weak_ties', 'limited_travel_history'],
        },
      },
    ],
  },

  // ============================================================================
  // US TOURIST - Strong profile
  // ============================================================================
  {
    scenarioId: 'us_tourist_strong_profile',
    countryCode: 'US',
    visaCategory: 'tourist',
    riskLevel: 'low',
    riskDrivers: [],
    questions: [
      {
        id: 'q1_financial_question',
        question: 'Do I have enough money for this visa?',
        expectedBehavior: {
          shouldNotPromise: true,
          shouldMentionCountry: 'US',
          shouldMentionVisaCategory: 'tourist',
        },
      },
    ],
  },

  // ============================================================================
  // SCHENGEN TOURIST (Germany) - Insurance question
  // ============================================================================
  {
    scenarioId: 'de_tourist_schengen',
    countryCode: 'DE',
    visaCategory: 'tourist',
    riskLevel: 'medium',
    riskDrivers: ['limited_travel_history'],
    questions: [
      {
        id: 'q1_insurance_question',
        question: 'I am applying for Germany tourist visa. Tell me if I need insurance.',
        expectedBehavior: {
          shouldNotPromise: true,
          shouldMentionCountry: 'DE',
          shouldMentionVisaCategory: 'tourist',
          shouldNotContradictRules: {
            rule: 'Travel insurance is mandatory for Schengen visas',
            shouldNotSay: 'insurance is optional',
          },
        },
      },
      {
        id: 'q2_wrong_country',
        question: 'What documents do I need for a Spanish tourist visa?',
        expectedBehavior: {
          // This is OK - user explicitly asked about Spain
          shouldMentionCountry: 'ES', // Should mention Spain since user asked
        },
      },
    ],
  },

  // ============================================================================
  // UK STUDENT - CAS question
  // ============================================================================
  {
    scenarioId: 'gb_student_medium_risk',
    countryCode: 'GB',
    visaCategory: 'student',
    riskLevel: 'medium',
    riskDrivers: ['borderline_funds'],
    questions: [
      {
        id: 'q1_cas_question',
        question: 'What is a CAS letter and do I need it?',
        expectedBehavior: {
          shouldNotPromise: true,
          shouldMentionCountry: 'GB',
          shouldMentionVisaCategory: 'student',
        },
      },
      {
        id: 'q2_wrong_category',
        question: 'Tell me about I-20 forms for US student visas.',
        expectedBehavior: {
          // This is OK - user explicitly asked about US student visa
          shouldMentionCountry: 'US',
          shouldMentionVisaCategory: 'student',
        },
      },
    ],
  },

  // ============================================================================
  // AUSTRALIA TOURIST - General question
  // ============================================================================
  {
    scenarioId: 'au_tourist_medium_risk',
    countryCode: 'AU',
    visaCategory: 'tourist',
    riskLevel: 'medium',
    riskDrivers: ['limited_travel_history'],
    questions: [
      {
        id: 'q1_general',
        question: 'What documents do I need for my Australia tourist visa?',
        expectedBehavior: {
          shouldNotPromise: true,
          shouldMentionCountry: 'AU',
          shouldMentionVisaCategory: 'tourist',
        },
      },
    ],
  },
];

/**
 * Get chat eval scenario by ID
 */
export function getChatEvalScenario(scenarioId: string): ChatEvalScenario | undefined {
  return CHAT_EVAL_SCENARIOS.find((s) => s.scenarioId === scenarioId);
}

/**
 * List all chat eval scenario IDs
 */
export function listChatEvalScenarioIds(): string[] {
  return CHAT_EVAL_SCENARIOS.map((s) => s.scenarioId);
}
