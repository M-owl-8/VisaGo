/**
 * AI Evaluation Runner (Phase 7)
 *
 * ⚠️ DEV-ONLY: This is a development evaluation harness to sanity-check GPT-4 behavior.
 *
 * This runner:
 * - Tests checklist generation (rules mode)
 * - Tests risk explanation
 * - Tests document explanation ("Why this document?")
 * - Tests document checking (optional)
 *
 * It uses synthetic scenarios from ai-eval-scenarios.ts and validates:
 * - JSON schema compliance
 * - Tri-language output (UZ/RU/EN)
 * - Risk logic and appliesToThisApplicant decisions
 * - Expert field reasoning
 *
 * This code is NOT used in production and does NOT modify any production behavior.
 * It may access private methods via type assertions for evaluation purposes only.
 *
 * Usage:
 *   import { runAiSmokeTests } from './ai-eval/ai-eval-runner';
 *   await runAiSmokeTests(console);
 */

import { EVAL_SCENARIOS, EvalScenario } from './ai-eval-scenarios';
import { AIOpenAIService } from '../services/ai-openai.service';
import { getAIConfig } from '../config/ai-models';
import {
  VisaChecklistEngineService,
  ChecklistItem,
  ChecklistResponse,
} from '../services/visa-checklist-engine.service';
import { VisaDocCheckerService, DocumentCheckResult } from '../services/visa-doc-checker.service';
import {
  VisaRiskExplanationService,
  RiskExplanationResponse,
} from '../services/visa-risk-explanation.service';
import {
  VisaChecklistExplanationService,
  ChecklistExplanationResponse,
} from '../services/visa-checklist-explanation.service';
import { logInfo, logWarn, logError } from '../middleware/logger';
import { z } from 'zod';
import {
  getCountryNameFromCode,
  normalizeCountryCode,
  getAllPriorityCountryCodes,
} from '../config/country-registry';

/**
 * Logger interface for evaluation output
 */
export interface EvalLogger {
  log(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
}

/**
 * Evaluation result for a single test
 */
interface EvalTestResult {
  scenarioId: string;
  testType: 'checklist' | 'risk' | 'doc-explanation' | 'doc-check';
  passed: boolean;
  errors: string[];
  summary: string;
  details?: any;
  // Phase 8: Country invariant violations
  violatedInvariants?: string[];
  countryMismatches?: Array<{ found: string; expected: string }>;
}

/**
 * Phase 8: Check country invariant in text response
 *
 * Scans text for wrong country names/codes and returns violations
 */
function checkCountryInvariant(
  text: string,
  expectedCountryCode: string,
  expectedCountryName: string,
  isSchengen: boolean
): {
  violated: boolean;
  violations: string[];
  mismatches: Array<{ found: string; expected: string }>;
} {
  const violations: string[] = [];
  const mismatches: Array<{ found: string; expected: string }> = [];
  const textLower = text.toLowerCase();

  // Get canonical country name
  const canonicalName = getCountryNameFromCode(expectedCountryCode);
  const expectedNameLower = canonicalName.toLowerCase();

  // Priority country names to check (excluding expected country)
  const priorityCountries = getAllPriorityCountryCodes();
  const countryNames: Record<string, string[]> = {
    US: ['united states', 'usa', 'us', 'america', 'american'],
    GB: ['united kingdom', 'uk', 'britain', 'british', 'england'],
    CA: ['canada', 'canadian'],
    AU: ['australia', 'australian'],
    DE: ['germany', 'german'],
    ES: ['spain', 'spanish'],
    FR: ['france', 'french'],
    JP: ['japan', 'japanese'],
    KR: ['south korea', 'korea', 'korean'],
    AE: ['united arab emirates', 'uae', 'emirates'],
  };

  // Check for wrong country mentions
  for (const [code, names] of Object.entries(countryNames)) {
    if (code === expectedCountryCode) continue; // Skip expected country

    for (const name of names) {
      if (textLower.includes(name.toLowerCase())) {
        // Check if it's in a context that suggests it's the primary country
        // (not just a comparison or example)
        const nameIndex = textLower.indexOf(name.toLowerCase());
        const contextBefore = textLower.substring(Math.max(0, nameIndex - 50), nameIndex);
        const contextAfter = textLower.substring(
          nameIndex + name.length,
          Math.min(textLower.length, nameIndex + name.length + 50)
        );

        // If it appears with words like "for", "in", "to", "visa", "embassy", it's likely wrong
        const wrongContextIndicators = [
          'for ',
          'in ',
          'to ',
          'visa',
          'embassy',
          'application',
          'country',
        ];
        const isWrongContext = wrongContextIndicators.some(
          (indicator) => contextBefore.includes(indicator) || contextAfter.includes(indicator)
        );

        if (isWrongContext) {
          violations.push(`COUNTRY_INVARIANT`);
          mismatches.push({
            found: name,
            expected: canonicalName,
          });
        }
      }
    }
  }

  // Check for Schengen confusion (for DE, ES, FR only)
  if (isSchengen) {
    // Allowed: "Schengen area", "Schengen visa", "Schengen countries"
    // Not allowed: replacing FR with ES, or ES with DE as primary country
    // This is handled by the country name check above
  } else {
    // For non-Schengen countries, check if "Schengen" is mentioned as primary
    if (
      textLower.includes('schengen') &&
      !textLower.includes('not schengen') &&
      !textLower.includes('non-schengen')
    ) {
      const schengenIndex = textLower.indexOf('schengen');
      const contextBefore = textLower.substring(Math.max(0, schengenIndex - 50), schengenIndex);
      const wrongContext = ['for ', 'in ', 'to ', 'visa', 'embassy', 'application'].some(
        (indicator) => contextBefore.includes(indicator)
      );
      if (wrongContext) {
        violations.push(`SCHENGEN_LABELING`);
        mismatches.push({
          found: 'Schengen',
          expected: canonicalName,
        });
      }
    }
  }

  return {
    violated: violations.length > 0,
    violations,
    mismatches,
  };
}

/**
 * Get base documents for a country/visa type
 */
function getBaseDocumentsForScenario(
  countryCode: string,
  visaType: 'tourist' | 'student'
): Array<{
  documentType: string;
  category: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
}> {
  const base: Array<{
    documentType: string;
    category: 'required' | 'highly_recommended' | 'optional';
    required: boolean;
  }> = [
    { documentType: 'passport_international', category: 'required', required: true },
    { documentType: 'passport_photo', category: 'required', required: true },
  ];

  if (visaType === 'tourist') {
    base.push(
      { documentType: 'visa_application_form', category: 'required', required: true },
      { documentType: 'bank_statements_applicant', category: 'required', required: true },
      { documentType: 'travel_itinerary', category: 'highly_recommended', required: false },
      { documentType: 'accommodation_proof', category: 'highly_recommended', required: false },
      { documentType: 'employment_letter', category: 'highly_recommended', required: false },
      { documentType: 'property_documents', category: 'optional', required: false }
    );

    // Schengen countries need travel insurance
    if (['DE', 'ES', 'FR', 'IT', 'AT'].includes(countryCode)) {
      base.push({ documentType: 'travel_insurance', category: 'required', required: true });
    }
  } else {
    // Student visa
    base.push(
      { documentType: 'visa_application_form', category: 'required', required: true },
      { documentType: 'bank_statements_applicant', category: 'required', required: true }
    );

    // Country-specific student documents
    if (countryCode === 'US') {
      base.push(
        { documentType: 'i20_form', category: 'required', required: true },
        { documentType: 'sevis_fee_receipt', category: 'required', required: true }
      );
    } else if (countryCode === 'GB' || countryCode === 'UK') {
      base.push({ documentType: 'cas_letter', category: 'required', required: true });
    } else if (countryCode === 'CA') {
      base.push({ documentType: 'loa_letter', category: 'required', required: true });
    } else if (countryCode === 'AU') {
      base.push({ documentType: 'coe_letter', category: 'required', required: true });
    }

    base.push(
      { documentType: 'tuition_payment_receipt', category: 'highly_recommended', required: false },
      { documentType: 'employment_letter', category: 'optional', required: false },
      { documentType: 'property_documents', category: 'optional', required: false }
    );
  }

  return base;
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
      country: scenario.countryCode,
      status: 'draft' as const,
    },
    questionnaireSummary: {
      version: '2.0',
      visaType: scenario.visaType,
      targetCountry: scenario.countryCode,
      bankBalanceUSD: context.financial?.bankBalanceUSD,
      monthlyIncomeUSD: context.financial?.monthlyIncomeUSD,
      sponsorType: 'self' as const,
      hasPropertyInUzbekistan: context.ties?.hasPropertyInUzbekistan ?? false,
      hasFamilyInUzbekistan: context.ties?.hasFamilyInUzbekistan ?? false,
      hasChildren: context.ties?.hasChildren ?? false,
      hasInternationalTravel: context.travelHistory?.hasInternationalTravel ?? false,
      previousVisaRejections: (context.travelHistory?.previousVisaRejections ?? 0) > 0,
      currentStatus: context.ties?.isEmployed ? ('employed' as const) : ('student' as const),
    },
    uploadedDocuments: [],
    appActions: [],
    riskScore: context.riskScore || {
      level: 'medium' as const,
      probabilityPercent: 50,
      riskFactors: [],
      positiveFactors: [],
    },
  };
}

/**
 * Test checklist generation
 */
async function testChecklistGeneration(
  scenario: EvalScenario,
  logger: EvalLogger
): Promise<EvalTestResult> {
  const errors: string[] = [];
  let summary = '';
  let details: any = {};

  try {
    logger.log(`  [CHECKLIST] Testing scenario: ${scenario.label}`);

    const baseDocuments = getBaseDocumentsForScenario(scenario.countryCode, scenario.visaType);
    const aiUserContext = createMockAIUserContext(scenario);

    // Try to use the service directly if possible
    // Note: This may require DB, so we'll use prompt builders as fallback
    let checklistResponse: any;

    try {
      // Attempt to use service (may fail if DB-dependent)
      checklistResponse = await VisaChecklistEngineService.generateChecklist(
        scenario.countryCode,
        scenario.visaType,
        aiUserContext
      );
    } catch (serviceError) {
      // Fallback: Build prompts and call GPT directly
      logger.warn(
        `  [CHECKLIST] Service call failed, using direct GPT call: ${serviceError instanceof Error ? serviceError.message : String(serviceError)}`
      );

      // Access private methods via reflection (not ideal but for dev-only eval)
      const systemPrompt =
        (VisaChecklistEngineService as any).buildSystemPrompt?.(
          scenario.countryCode,
          scenario.visaType,
          { requiredDocuments: baseDocuments } as any,
          undefined
        ) || 'You are an expert visa officer. Generate a checklist.';

      const userPrompt =
        (await (VisaChecklistEngineService as any).buildUserPrompt?.(
          aiUserContext,
          baseDocuments,
          undefined
        )) || JSON.stringify({ baseDocuments, context: scenario.context });

      const aiConfig = getAIConfig('checklist');
      const response = await AIOpenAIService.getOpenAIClient().chat.completions.create({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        response_format: aiConfig.responseFormat || undefined,
      });

      const rawContent = response.choices[0]?.message?.content || '{}';
      checklistResponse = JSON.parse(rawContent);
    }

    // Validate structure manually (schemas are private)
    if (!checklistResponse || !Array.isArray(checklistResponse.checklist)) {
      errors.push('Invalid response structure: missing checklist array');
    } else {
      // Validate each item has required fields
      checklistResponse.checklist.forEach((item: any, idx: number) => {
        if (!item.documentType || !item.name || !item.category) {
          errors.push(`Item ${idx} missing required fields`);
        }
      });
    }

    // Check tri-language fields
    const checklist = (checklistResponse as any).checklist || [];
    const missingUz = checklist.filter((item: any) => !item.nameUz || item.nameUz.trim() === '');
    const missingRu = checklist.filter((item: any) => !item.nameRu || item.nameRu.trim() === '');
    const missingDesc = checklist.filter(
      (item: any) => !item.description || item.description.trim() === ''
    );

    if (missingUz.length > 0) {
      errors.push(`${missingUz.length} items missing nameUz`);
    }
    if (missingRu.length > 0) {
      errors.push(`${missingRu.length} items missing nameRu`);
    }
    if (missingDesc.length > 0) {
      errors.push(`${missingDesc.length} items missing description`);
    }

    // Check appliesToThisApplicant logic
    const appliesCount = checklist.filter(
      (item: any) => item.appliesToThisApplicant === true
    ).length;
    const hasReasons = checklist.filter(
      (item: any) => item.appliesToThisApplicant && item.reasonIfApplies
    ).length;

    // Sample documents
    const sampleDocs = checklist.slice(0, 3).map((item: any) => ({
      documentType: item.documentType,
      appliesToThisApplicant: item.appliesToThisApplicant,
      reasonIfApplies: item.reasonIfApplies?.substring(0, 100),
    }));

    // Phase 8: Check country invariant
    const countryCheck = checkCountryInvariant(
      JSON.stringify(checklistResponse),
      scenario.countryCode,
      getCountryNameFromCode(scenario.countryCode),
      ['DE', 'ES', 'FR'].includes(scenario.countryCode)
    );
    if (countryCheck.violated) {
      errors.push(`Country invariant violation: ${countryCheck.violations.join(', ')}`);
      for (const mismatch of countryCheck.mismatches) {
        errors.push(`Found "${mismatch.found}" but expected "${mismatch.expected}"`);
      }
    }

    summary = `✓ JSON valid, ${checklist.length} documents, ${appliesCount} apply, ${hasReasons} have reasons${countryCheck.violated ? ' (COUNTRY_INVARIANT VIOLATION)' : ''}`;
    details = {
      documentCount: checklist.length,
      appliesCount,
      hasReasonsCount: hasReasons,
      sampleDocs,
      missingUzCount: missingUz.length,
      missingRuCount: missingRu.length,
      missingDescCount: missingDesc.length,
      countryCheck: countryCheck.violated ? countryCheck : undefined,
    };

    logger.log(`  [CHECKLIST] ${summary}`);
    if (sampleDocs.length > 0) {
      logger.log(`  [CHECKLIST] Sample: ${JSON.stringify(sampleDocs[0], null, 2)}`);
    }
  } catch (error) {
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    summary = `✗ Failed: ${errors[0]}`;
  }

  return {
    scenarioId: scenario.id,
    testType: 'checklist',
    passed: errors.length === 0,
    errors,
    summary,
    details,
    violatedInvariants: errors.filter(
      (e) => e.includes('COUNTRY_INVARIANT') || e.includes('SCHENGEN_LABELING')
    ),
    countryMismatches: errors
      .filter((e) => e.includes('Found "'))
      .map((e) => {
        const match = e.match(/Found "([^"]+)" but expected "([^"]+)"/);
        return match ? { found: match[1], expected: match[2] } : null;
      })
      .filter(Boolean) as Array<{ found: string; expected: string }>,
  };
}

/**
 * Test risk explanation
 */
async function testRiskExplanation(
  scenario: EvalScenario,
  logger: EvalLogger
): Promise<EvalTestResult> {
  const errors: string[] = [];
  let summary = '';
  let details: any = {};

  try {
    logger.log(`  [RISK] Testing scenario: ${scenario.label}`);

    // Build a mock canonical context
    const canonicalContext: any = {
      applicantProfile: {
        visaType: scenario.visaType,
        targetCountry: scenario.countryCode,
        sponsorType: 'self',
        bankBalanceUSD: scenario.context.financial?.bankBalanceUSD,
        monthlyIncomeUSD: scenario.context.financial?.monthlyIncomeUSD,
        financial: scenario.context.financial,
        ties: scenario.context.ties,
        travelHistory: scenario.context.travelHistory,
        hasPropertyInUzbekistan: scenario.context.ties?.hasPropertyInUzbekistan ?? false,
        hasFamilyInUzbekistan: scenario.context.ties?.hasFamilyInUzbekistan ?? false,
        hasChildren: scenario.context.ties?.hasChildren ?? false,
        isEmployed: scenario.context.ties?.isEmployed ?? false,
        hasInternationalTravel: scenario.context.travelHistory?.hasInternationalTravel ?? false,
        previousVisaRejections: (scenario.context.travelHistory?.previousVisaRejections ?? 0) > 0,
      },
      riskScore: scenario.context.riskScore || {
        level: 'medium',
        probabilityPercent: 50,
        riskFactors: [],
        positiveFactors: [],
      },
      uzbekContext: scenario.context.uzbekContext,
      meta: scenario.context.meta,
      application: {
        country: scenario.countryCode,
        visaType: scenario.visaType,
      },
    };

    // Use dev-only helper method (no DB access, uses synthetic data)
    const prompts = VisaRiskExplanationService.buildPromptsForEvaluation(canonicalContext, []);
    const systemPrompt = prompts.systemPrompt;
    const userPrompt = prompts.userPrompt;

    if (!systemPrompt || !userPrompt) {
      errors.push('Could not build prompts');
      summary = '✗ Could not build prompts';
    } else {
      const aiConfig = getAIConfig('riskExplanation');
      const response = await AIOpenAIService.getOpenAIClient().chat.completions.create({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        response_format: aiConfig.responseFormat || undefined,
      });

      const rawContent = response.choices[0]?.message?.content || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(rawContent);
      } catch (parseError) {
        errors.push(
          `JSON parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
        parsed = {};
      }

      // Validate structure manually (schemas are private)
      if (
        !parsed.riskLevel ||
        !parsed.summaryEn ||
        !parsed.summaryUz ||
        !parsed.summaryRu ||
        !Array.isArray(parsed.recommendations)
      ) {
        errors.push('Invalid response structure: missing required fields');
      }

      // Check required fields
      if (!parsed.riskLevel || !['low', 'medium', 'high'].includes(parsed.riskLevel)) {
        errors.push('riskLevel missing or invalid');
      }
      if (!parsed.summaryEn || parsed.summaryEn.trim() === '') {
        errors.push('summaryEn missing or empty');
      }
      if (!parsed.summaryUz || parsed.summaryUz.trim() === '') {
        errors.push('summaryUz missing or empty');
      }
      if (!parsed.summaryRu || parsed.summaryRu.trim() === '') {
        errors.push('summaryRu missing or empty');
      }
      if (
        !Array.isArray(parsed.recommendations) ||
        parsed.recommendations.length < 2 ||
        parsed.recommendations.length > 4
      ) {
        errors.push(
          `recommendations count invalid: ${parsed.recommendations?.length || 0} (expected 2-4)`
        );
      } else {
        // Check recommendation structure
        parsed.recommendations.forEach((rec: any, idx: number) => {
          if (!rec.titleEn || !rec.titleUz || !rec.titleRu) {
            errors.push(`Recommendation ${idx} missing titles`);
          }
          if (!rec.detailsEn || !rec.detailsUz || !rec.detailsRu) {
            errors.push(`Recommendation ${idx} missing details`);
          }
        });
      }

      summary = `✓ riskLevel: ${parsed.riskLevel}, ${parsed.recommendations?.length || 0} recommendations`;
      details = {
        riskLevel: parsed.riskLevel,
        recommendationsCount: parsed.recommendations?.length || 0,
        summaryEnPreview: parsed.summaryEn?.substring(0, 100),
      };

      // Phase 8: Check country invariant in risk explanation text
      const countryCheck = checkCountryInvariant(
        `${parsed.summaryEn || ''} ${parsed.summaryUz || ''} ${parsed.summaryRu || ''} ${parsed.recommendations?.map((r: any) => `${r.titleEn || ''} ${r.detailsEn || ''}`).join(' ') || ''}`,
        scenario.countryCode,
        getCountryNameFromCode(scenario.countryCode),
        ['DE', 'ES', 'FR'].includes(scenario.countryCode)
      );
      if (countryCheck.violated) {
        errors.push(`Country invariant violation: ${countryCheck.violations.join(', ')}`);
        for (const mismatch of countryCheck.mismatches) {
          errors.push(`Found "${mismatch.found}" but expected "${mismatch.expected}"`);
        }
      }

      logger.log(
        `  [RISK] ${summary}${countryCheck.violated ? ' (COUNTRY_INVARIANT VIOLATION)' : ''}`
      );
      logger.log(`  [RISK] Summary (EN): ${parsed.summaryEn?.substring(0, 150)}...`);
    }
  } catch (error) {
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    summary = `✗ Failed: ${errors[0]}`;
  }

  return {
    scenarioId: scenario.id,
    testType: 'risk',
    passed: errors.length === 0,
    errors,
    summary,
    details,
    violatedInvariants: errors.filter(
      (e) => e.includes('COUNTRY_INVARIANT') || e.includes('SCHENGEN_LABELING')
    ),
    countryMismatches: errors
      .filter((e) => e.includes('Found "'))
      .map((e) => {
        const match = e.match(/Found "([^"]+)" but expected "([^"]+)"/);
        return match ? { found: match[1], expected: match[2] } : null;
      })
      .filter(Boolean) as Array<{ found: string; expected: string }>,
  };
}

/**
 * Test document explanation
 */
async function testDocumentExplanation(
  scenario: EvalScenario,
  logger: EvalLogger
): Promise<EvalTestResult> {
  const errors: string[] = [];
  let summary = '';
  let details: any = {};

  try {
    logger.log(`  [DOC-EXPLANATION] Testing scenario: ${scenario.label}`);

    // Pick document based on scenario
    let documentType = 'bank_statements_applicant';
    if (scenario.context.ties?.tiesStrengthLabel === 'weak') {
      documentType = 'property_documents';
    } else if (
      scenario.context.financial?.financialSufficiencyLabel === 'low' ||
      scenario.context.financial?.financialSufficiencyLabel === 'borderline'
    ) {
      documentType = 'bank_statements_applicant';
    }

    // Build mock canonical context
    const canonicalContext: any = {
      applicantProfile: {
        visaType: scenario.visaType,
        targetCountry: scenario.countryCode,
        financial: scenario.context.financial,
        ties: scenario.context.ties,
        travelHistory: scenario.context.travelHistory,
      },
      riskScore: scenario.context.riskScore || {
        level: 'medium',
        probabilityPercent: 50,
        riskFactors: [],
        positiveFactors: [],
      },
      application: {
        country: scenario.countryCode,
        visaType: scenario.visaType,
      },
    };

    // Use dev-only helper method (no DB access, uses synthetic data)
    const prompts = VisaChecklistExplanationService.buildPromptsForEvaluation(
      canonicalContext,
      documentType,
      undefined,
      scenario.countryCode,
      scenario.visaType
    );
    const systemPrompt = prompts.systemPrompt;
    const userPrompt = prompts.userPrompt;

    if (!systemPrompt || !userPrompt) {
      errors.push('Could not build prompts');
      summary = '✗ Could not build prompts';
    } else {
      const aiConfig = getAIConfig('checklistExplanation');
      const response = await AIOpenAIService.getOpenAIClient().chat.completions.create({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        response_format: aiConfig.responseFormat || undefined,
      });

      const rawContent = response.choices[0]?.message?.content || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(rawContent);
      } catch (parseError) {
        errors.push(
          `JSON parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
        parsed = {};
      }

      // Validate structure manually (schemas are private)
      if (
        !parsed.documentType ||
        !parsed.whyEn ||
        !parsed.whyUz ||
        !parsed.whyRu ||
        !Array.isArray(parsed.tipsEn)
      ) {
        errors.push('Invalid response structure: missing required fields');
      }

      // Check required fields
      if (!parsed.whyEn || parsed.whyEn.trim() === '') {
        errors.push('whyEn missing or empty');
      }
      if (!parsed.whyUz || parsed.whyUz.trim() === '') {
        errors.push('whyUz missing or empty');
      }
      if (!parsed.whyRu || parsed.whyRu.trim() === '') {
        errors.push('whyRu missing or empty');
      }
      if (!Array.isArray(parsed.tipsEn) || parsed.tipsEn.length < 2) {
        errors.push(`tipsEn count invalid: ${parsed.tipsEn?.length || 0} (expected >= 2)`);
      }
      if (!Array.isArray(parsed.tipsUz) || parsed.tipsUz.length < 2) {
        errors.push(`tipsUz count invalid: ${parsed.tipsUz?.length || 0} (expected >= 2)`);
      }
      if (!Array.isArray(parsed.tipsRu) || parsed.tipsRu.length < 2) {
        errors.push(`tipsRu count invalid: ${parsed.tipsRu?.length || 0} (expected >= 2)`);
      }

      // Phase 8: Check country invariant in explanation text
      const countryCheck = checkCountryInvariant(
        `${parsed.whyEn || ''} ${parsed.whyUz || ''} ${parsed.whyRu || ''} ${parsed.tipsEn?.join(' ') || ''}`,
        scenario.countryCode,
        getCountryNameFromCode(scenario.countryCode),
        ['DE', 'ES', 'FR'].includes(scenario.countryCode)
      );
      if (countryCheck.violated) {
        errors.push(`Country invariant violation: ${countryCheck.violations.join(', ')}`);
        for (const mismatch of countryCheck.mismatches) {
          errors.push(`Found "${mismatch.found}" but expected "${mismatch.expected}"`);
        }
      }

      summary = `✓ Document: ${documentType}, ${parsed.tipsEn?.length || 0} tips${countryCheck.violated ? ' (COUNTRY_INVARIANT VIOLATION)' : ''}`;
      details = {
        documentType,
        whyEnPreview: parsed.whyEn?.substring(0, 100),
        tipsCount: parsed.tipsEn?.length || 0,
        countryCheck: countryCheck.violated ? countryCheck : undefined,
      };

      logger.log(`  [DOC-EXPLANATION] ${summary}`);
      logger.log(`  [DOC-EXPLANATION] Why (EN): ${parsed.whyEn?.substring(0, 150)}...`);
    }
  } catch (error) {
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    summary = `✗ Failed: ${errors[0]}`;
  }

  return {
    scenarioId: scenario.id,
    testType: 'doc-explanation',
    passed: errors.length === 0,
    errors,
    summary,
    details,
    violatedInvariants: errors.filter(
      (e) => e.includes('COUNTRY_INVARIANT') || e.includes('SCHENGEN_LABELING')
    ),
    countryMismatches: errors
      .filter((e) => e.includes('Found "'))
      .map((e) => {
        const match = e.match(/Found "([^"]+)" but expected "([^"]+)"/);
        return match ? { found: match[1], expected: match[2] } : null;
      })
      .filter(Boolean) as Array<{ found: string; expected: string }>,
  };
}

/**
 * Test document checking (optional)
 */
async function testDocumentChecking(
  scenario: EvalScenario,
  logger: EvalLogger
): Promise<EvalTestResult> {
  const errors: string[] = [];
  let summary = '';
  let details: any = {};

  try {
    logger.log(`  [DOC-CHECK] Testing scenario: ${scenario.label}`);

    // Create fake document text
    const fakeBankStatementText = `
BANK STATEMENT
Account Holder: Test User
Account Number: ****1234
Period: January 2024 - March 2024

Date: 2024-01-15 | Description: Salary | Amount: $${scenario.context.financial?.monthlyIncomeUSD || 500}
Date: 2024-02-15 | Description: Salary | Amount: $${scenario.context.financial?.monthlyIncomeUSD || 500}
Date: 2024-03-15 | Description: Salary | Amount: $${scenario.context.financial?.monthlyIncomeUSD || 500}

Current Balance: $${scenario.context.financial?.bankBalanceUSD || 3000}
    `.trim();

    const requiredDocumentRule = {
      documentType: 'bank_statements_applicant',
      category: 'required' as const,
      description: 'Bank statements showing last 3 months',
      validityRequirements: 'Last 3 months',
      formatRequirements: 'Original or certified copy',
    };

    // Build mock canonical context
    const canonicalContext: any = {
      applicantProfile: {
        financial: scenario.context.financial,
        ties: scenario.context.ties,
        travelHistory: scenario.context.travelHistory,
      },
      uzbekContext: scenario.context.uzbekContext,
      meta: scenario.context.meta,
    };

    // Use dev-only helper method (no DB access, uses synthetic data)
    const prompts = VisaDocCheckerService.buildPromptsForEvaluation(
      requiredDocumentRule,
      fakeBankStatementText,
      canonicalContext,
      {
        fileType: 'pdf',
        bankName: 'Test Bank',
        amounts: [{ value: scenario.context.financial?.bankBalanceUSD || 3000, currency: 'USD' }],
      }
    );
    const systemPrompt = prompts.systemPrompt;
    const userPrompt = prompts.userPrompt;

    if (!systemPrompt || !userPrompt) {
      errors.push('Could not build prompts');
      summary = '✗ Could not build prompts';
    } else {
      const aiConfig = getAIConfig('docVerification');
      const response = await AIOpenAIService.getOpenAIClient().chat.completions.create({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        response_format: aiConfig.responseFormat || undefined,
      });

      const rawContent = response.choices[0]?.message?.content || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(rawContent);
      } catch (parseError) {
        errors.push(
          `JSON parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
        parsed = {};
      }

      // Validate structure manually (schemas are private)
      if (!parsed.status || !parsed.short_reason || !parsed.embassy_risk_level) {
        errors.push('Invalid response structure: missing required fields');
      }

      // Check required fields
      if (!parsed.status || !['APPROVED', 'NEED_FIX', 'REJECTED'].includes(parsed.status)) {
        errors.push('status missing or invalid');
      }
      if (!parsed.short_reason || parsed.short_reason.trim() === '') {
        errors.push('short_reason missing or empty');
      }
      if (!parsed.notes?.uz || parsed.notes.uz.trim() === '') {
        errors.push('notes.uz missing or empty');
      }
      if (
        !parsed.embassy_risk_level ||
        !['LOW', 'MEDIUM', 'HIGH'].includes(parsed.embassy_risk_level)
      ) {
        errors.push('embassy_risk_level missing or invalid');
      }

      summary = `✓ Status: ${parsed.status}, Risk: ${parsed.embassy_risk_level}`;
      details = {
        status: parsed.status,
        embassyRiskLevel: parsed.embassy_risk_level,
        shortReason: parsed.short_reason?.substring(0, 100),
        hasNotesUz: !!parsed.notes?.uz,
      };

      // Phase 8: Check country invariant in doc check text
      const countryCheck = checkCountryInvariant(
        `${parsed.short_reason || ''} ${parsed.notes?.en || ''} ${parsed.notes?.uz || ''} ${parsed.notes?.ru || ''} ${parsed.technical_notes || ''}`,
        scenario.countryCode,
        getCountryNameFromCode(scenario.countryCode),
        ['DE', 'ES', 'FR'].includes(scenario.countryCode)
      );
      if (countryCheck.violated) {
        errors.push(`Country invariant violation: ${countryCheck.violations.join(', ')}`);
        for (const mismatch of countryCheck.mismatches) {
          errors.push(`Found "${mismatch.found}" but expected "${mismatch.expected}"`);
        }
      }

      logger.log(
        `  [DOC-CHECK] ${summary}${countryCheck.violated ? ' (COUNTRY_INVARIANT VIOLATION)' : ''}`
      );
      logger.log(`  [DOC-CHECK] Reason: ${parsed.short_reason?.substring(0, 150)}...`);
    }
  } catch (error) {
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    summary = `✗ Failed: ${errors[0]}`;
  }

  return {
    scenarioId: scenario.id,
    testType: 'doc-check',
    passed: errors.length === 0,
    errors,
    summary,
    details,
    violatedInvariants: errors.filter(
      (e) => e.includes('COUNTRY_INVARIANT') || e.includes('SCHENGEN_LABELING')
    ),
    countryMismatches: errors
      .filter((e) => e.includes('Found "'))
      .map((e) => {
        const match = e.match(/Found "([^"]+)" but expected "([^"]+)"/);
        return match ? { found: match[1], expected: match[2] } : null;
      })
      .filter(Boolean) as Array<{ found: string; expected: string }>,
  };
}

/**
 * Run AI smoke tests for all scenarios
 */
export async function runAiSmokeTests(logger: EvalLogger = console): Promise<void> {
  logger.log('================================================================================');
  logger.log('AI SMOKE TESTS (Phase 7)');
  logger.log('================================================================================');
  logger.log(`Testing ${EVAL_SCENARIOS.length} scenarios across 4 subsystems\n`);

  const results: EvalTestResult[] = [];

  for (const scenario of EVAL_SCENARIOS) {
    logger.log(`\n[SCENARIO] ${scenario.id}: ${scenario.label}`);
    logger.log(`  Country: ${scenario.countryCode}, Visa: ${scenario.visaType}`);

    // Test checklist generation
    const checklistResult = await testChecklistGeneration(scenario, logger);
    results.push(checklistResult);

    // Test risk explanation
    const riskResult = await testRiskExplanation(scenario, logger);
    results.push(riskResult);

    // Test document explanation
    const docExplanationResult = await testDocumentExplanation(scenario, logger);
    results.push(docExplanationResult);

    // Test document checking (optional, can skip if slow)
    try {
      const docCheckResult = await testDocumentChecking(scenario, logger);
      results.push(docCheckResult);
    } catch (error) {
      logger.warn(
        `  [DOC-CHECK] Skipped due to error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Small delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  logger.log('\n================================================================================');
  logger.log('SUMMARY');
  logger.log('================================================================================');

  const byTestType: Record<string, { total: number; passed: number }> = {};
  results.forEach((result) => {
    if (!byTestType[result.testType]) {
      byTestType[result.testType] = { total: 0, passed: 0 };
    }
    byTestType[result.testType].total++;
    if (result.passed) {
      byTestType[result.testType].passed++;
    }
  });

  Object.entries(byTestType).forEach(([testType, stats]) => {
    const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
    logger.log(`${testType}: ${stats.passed}/${stats.total} passed (${passRate}%)`);
  });

  const totalPassed = results.filter((r) => r.passed).length;
  const totalTests = results.length;
  const overallPassRate = ((totalPassed / totalTests) * 100).toFixed(1);
  logger.log(`\nOverall: ${totalPassed}/${totalTests} tests passed (${overallPassRate}%)`);

  // Show failures
  const failures = results.filter((r) => !r.passed);
  if (failures.length > 0) {
    logger.log('\nFAILURES:');
    failures.forEach((failure) => {
      logger.log(`  [${failure.testType}] ${failure.scenarioId}: ${failure.summary}`);
      if (failure.errors.length > 0) {
        failure.errors.forEach((err) => logger.log(`    - ${err}`));
      }
    });
  }

  logger.log('\n================================================================================');
}
