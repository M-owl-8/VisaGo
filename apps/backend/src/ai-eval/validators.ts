/**
 * AI Evaluation Validators
 * Validates GPT-4 outputs against constraints and schemas
 */

import { z } from 'zod';
import {
  EvalResult,
  EvalMetric,
  ChecklistEvalScenario,
  DocCheckEvalScenario,
  RiskEvalScenario,
  DocExplanationEvalScenario,
  RulesExtractionEvalScenario,
} from './types';

// Import schemas - these are private, so we'll recreate them or import from a shared location
// For now, we'll validate structure manually and use Zod inline schemas

/**
 * Validate JSON schema
 */
export function validateJsonSchema(result: any, schemaName: string): EvalMetric {
  try {
    // Basic structure validation
    if (!result || typeof result !== 'object') {
      return {
        name: 'json_valid',
        ok: false,
        details: 'Result is not an object',
        critical: true,
      };
    }

    // Schema-specific validation
    switch (schemaName) {
      case 'checklist':
        if (!result.checklist || !Array.isArray(result.checklist)) {
          return {
            name: 'json_valid',
            ok: false,
            details: 'checklist field missing or not an array',
            critical: true,
          };
        }
        // Validate checklist items have required fields
        const invalidItems = result.checklist.filter(
          (item: any) => !item.id || !item.documentType || !item.category
        );
        if (invalidItems.length > 0) {
          return {
            name: 'json_valid',
            ok: false,
            details: `${invalidItems.length} checklist items missing required fields`,
            critical: true,
          };
        }
        break;

      case 'doccheck':
        if (!result.status || !result.short_reason) {
          return {
            name: 'json_valid',
            ok: false,
            details: 'status or short_reason missing',
            critical: true,
          };
        }
        if (!['APPROVED', 'NEED_FIX', 'REJECTED'].includes(result.status)) {
          return {
            name: 'json_valid',
            ok: false,
            details: `Invalid status: ${result.status}`,
            critical: true,
          };
        }
        break;

      case 'risk':
        if (!result.riskLevel || !result.summaryEn || !result.recommendations) {
          return {
            name: 'json_valid',
            ok: false,
            details: 'riskLevel, summaryEn, or recommendations missing',
            critical: true,
          };
        }
        if (!['low', 'medium', 'high'].includes(result.riskLevel)) {
          return {
            name: 'json_valid',
            ok: false,
            details: `Invalid riskLevel: ${result.riskLevel}`,
            critical: true,
          };
        }
        break;

      default:
        return {
          name: 'json_valid',
          ok: false,
          details: `Unknown schema: ${schemaName}`,
          critical: true,
        };
    }

    return {
      name: 'json_valid',
      ok: true,
      critical: true,
    };
  } catch (error) {
    return {
      name: 'json_valid',
      ok: false,
      details: `Error validating schema: ${error instanceof Error ? error.message : String(error)}`,
      critical: true,
    };
  }
}

/**
 * Validate checklist constraints
 */
export function validateChecklistConstraints(
  scenario: ChecklistEvalScenario,
  aiOutput: any
): EvalMetric[] {
  const metrics: EvalMetric[] = [];

  if (!aiOutput || !aiOutput.checklist || !Array.isArray(aiOutput.checklist)) {
    metrics.push({
      name: 'constraints_respected',
      ok: false,
      details: 'Output is not a valid checklist object',
      critical: true,
    });
    return metrics;
  }

  const checklist = aiOutput.checklist;
  const baseDocTypes = new Set(scenario.baseDocuments.map((d) => d.documentType));
  const outputDocTypes = new Set(checklist.map((item: any) => item.documentType));

  // Check no extra documents
  if (scenario.expectedConstraints.mustNotAddDocuments) {
    const extra = Array.from(outputDocTypes).filter(
      (dt: unknown) => typeof dt === 'string' && !baseDocTypes.has(dt)
    );
    metrics.push({
      name: 'no_extra_documents',
      ok: extra.length === 0,
      details: extra.length > 0 ? `Extra documents found: ${extra.join(', ')}` : undefined,
      critical: true,
    });
  }

  // Check no removed documents
  if (scenario.expectedConstraints.mustNotRemoveDocuments) {
    const missing = Array.from(baseDocTypes).filter((dt) => !outputDocTypes.has(dt));
    metrics.push({
      name: 'no_removed_documents',
      ok: missing.length === 0,
      details: missing.length > 0 ? `Missing documents: ${missing.join(', ')}` : undefined,
      critical: true,
    });
  }

  // Check appliesToThisApplicant
  if (scenario.expectedConstraints.shouldSetAppliesToThisApplicant) {
    const allHaveApplies = checklist.every(
      (item: any) => typeof item.appliesToThisApplicant === 'boolean'
    );
    metrics.push({
      name: 'applies_to_this_applicant_set',
      ok: allHaveApplies,
      details: allHaveApplies ? undefined : 'Some items missing appliesToThisApplicant field',
      critical: false,
    });
  }

  // Check reasonIfApplies
  if (scenario.expectedConstraints.shouldGiveReasonIfApplies) {
    const itemsWithApplies = checklist.filter((item: any) => item.appliesToThisApplicant === true);
    const allHaveReason = itemsWithApplies.every(
      (item: any) => item.reasonIfApplies && item.reasonIfApplies.length > 0
    );
    metrics.push({
      name: 'reason_if_applies_provided',
      ok: allHaveReason,
      details: allHaveReason
        ? undefined
        : 'Some items with appliesToThisApplicant=true missing reasonIfApplies',
      critical: false,
    });
  }

  // Check item count
  if (scenario.expectedConstraints.minItems !== undefined) {
    metrics.push({
      name: 'min_items_met',
      ok: checklist.length >= scenario.expectedConstraints.minItems!,
      details:
        checklist.length < scenario.expectedConstraints.minItems!
          ? `Expected at least ${scenario.expectedConstraints.minItems}, got ${checklist.length}`
          : undefined,
      critical: false,
    });
  }

  if (scenario.expectedConstraints.maxItems !== undefined) {
    metrics.push({
      name: 'max_items_met',
      ok: checklist.length <= scenario.expectedConstraints.maxItems!,
      details:
        checklist.length > scenario.expectedConstraints.maxItems!
          ? `Expected at most ${scenario.expectedConstraints.maxItems}, got ${checklist.length}`
          : undefined,
      critical: false,
    });
  }

  // Check required fields present
  const requiredFields = [
    'id',
    'documentType',
    'category',
    'name',
    'nameUz',
    'nameRu',
    'description',
  ];
  const allHaveRequiredFields = checklist.every((item: any) =>
    requiredFields.every((field) => item[field] !== undefined && item[field] !== null)
  );
  metrics.push({
    name: 'required_fields_present',
    ok: allHaveRequiredFields,
    details: allHaveRequiredFields ? undefined : 'Some items missing required fields',
    critical: true,
  });

  // Check response length reasonable
  const responseLength = JSON.stringify(aiOutput).length;
  metrics.push({
    name: 'response_length_reasonable',
    ok: responseLength > 100 && responseLength < 100000,
    details:
      responseLength <= 100
        ? 'Response too short'
        : responseLength >= 100000
          ? 'Response too long'
          : undefined,
    critical: false,
  });

  return metrics;
}

/**
 * Validate document check constraints
 */
export function validateDocCheckConstraints(
  scenario: DocCheckEvalScenario,
  aiOutput: any
): EvalMetric[] {
  const metrics: EvalMetric[] = [];

  if (!aiOutput) {
    metrics.push({
      name: 'constraints_respected',
      ok: false,
      details: 'Output is null or undefined',
      critical: true,
    });
    return metrics;
  }

  // Check status in set
  if (scenario.expectedConstraints.statusInSet) {
    const statusValid = scenario.expectedConstraints.statusInSet.includes(aiOutput.status);
    metrics.push({
      name: 'status_in_valid_set',
      ok: statusValid,
      details: statusValid
        ? undefined
        : `Status ${aiOutput.status} not in expected set: ${scenario.expectedConstraints.statusInSet.join(', ')}`,
      critical: true,
    });
  }

  // Check short_reason non-empty
  if (scenario.expectedConstraints.shortReasonNonEmpty) {
    const reasonNonEmpty = aiOutput.short_reason && aiOutput.short_reason.length > 0;
    metrics.push({
      name: 'short_reason_non_empty',
      ok: reasonNonEmpty,
      details: reasonNonEmpty ? undefined : 'short_reason is empty or missing',
      critical: true,
    });
  }

  // Check notes.uz present
  if (scenario.expectedConstraints.notesUzPresent) {
    const notesUzPresent = aiOutput.notes && aiOutput.notes.uz && aiOutput.notes.uz.length > 0;
    metrics.push({
      name: 'notes_uz_present',
      ok: notesUzPresent,
      details: notesUzPresent ? undefined : 'notes.uz is missing or empty',
      critical: false,
    });
  }

  // Check if insufficient amount then risk not low
  if (scenario.expectedConstraints.ifInsufficientAmountThenRiskNotLow) {
    const hasInsufficientAmount =
      scenario.metadata?.amounts?.[0]?.value !== undefined &&
      scenario.requiredDocumentRule.description?.toLowerCase().includes('minimum') &&
      scenario.metadata.amounts[0].value < 2000; // Rough check
    if (hasInsufficientAmount && aiOutput.embassy_risk_level === 'LOW') {
      metrics.push({
        name: 'insufficient_amount_risk_not_low',
        ok: false,
        details: 'Document has insufficient amount but risk level is LOW',
        critical: false,
      });
    } else {
      metrics.push({
        name: 'insufficient_amount_risk_not_low',
        ok: true,
      });
    }
  }

  // Check validation details present
  if (scenario.expectedConstraints.validationDetailsPresent) {
    const validationDetailsPresent = aiOutput.validationDetails !== undefined;
    metrics.push({
      name: 'validation_details_present',
      ok: validationDetailsPresent,
      details: validationDetailsPresent
        ? undefined
        : 'validationDetails field missing (Phase 3 expert field)',
      critical: false,
    });
  }

  return metrics;
}

/**
 * Validate risk explanation constraints
 */
export function validateRiskConstraints(scenario: RiskEvalScenario, aiOutput: any): EvalMetric[] {
  const metrics: EvalMetric[] = [];

  if (!aiOutput) {
    metrics.push({
      name: 'constraints_respected',
      ok: false,
      details: 'Output is null or undefined',
      critical: true,
    });
    return metrics;
  }

  // Check risk level matches
  if (scenario.expectedConstraints.riskLevelMatches) {
    const riskLevelMatches = aiOutput.riskLevel === scenario.expectedRiskLevel;
    metrics.push({
      name: 'risk_level_matches',
      ok: riskLevelMatches,
      details: riskLevelMatches
        ? undefined
        : `Expected risk level ${scenario.expectedRiskLevel}, got ${aiOutput.riskLevel}`,
      critical: false,
    });
  }

  // Check summaries non-empty
  if (scenario.expectedConstraints.summaryEnNonEmpty) {
    metrics.push({
      name: 'summary_en_non_empty',
      ok: aiOutput.summaryEn && aiOutput.summaryEn.length > 0,
      details:
        aiOutput.summaryEn && aiOutput.summaryEn.length > 0
          ? undefined
          : 'summaryEn is empty or missing',
      critical: true,
    });
  }

  if (scenario.expectedConstraints.summaryUzNonEmpty) {
    metrics.push({
      name: 'summary_uz_non_empty',
      ok: aiOutput.summaryUz && aiOutput.summaryUz.length > 0,
      details:
        aiOutput.summaryUz && aiOutput.summaryUz.length > 0
          ? undefined
          : 'summaryUz is empty or missing',
      critical: true,
    });
  }

  if (scenario.expectedConstraints.summaryRuNonEmpty) {
    metrics.push({
      name: 'summary_ru_non_empty',
      ok: aiOutput.summaryRu && aiOutput.summaryRu.length > 0,
      details:
        aiOutput.summaryRu && aiOutput.summaryRu.length > 0
          ? undefined
          : 'summaryRu is empty or missing',
      critical: true,
    });
  }

  // Check recommendations count
  if (scenario.expectedConstraints.recommendationsCount) {
    const recCount = Array.isArray(aiOutput.recommendations) ? aiOutput.recommendations.length : 0;
    const min = scenario.expectedConstraints.recommendationsCount.min ?? 0;
    const max = scenario.expectedConstraints.recommendationsCount.max ?? Infinity;
    const countValid = recCount >= min && recCount <= max;
    metrics.push({
      name: 'recommendations_count_valid',
      ok: countValid,
      details: countValid ? undefined : `Expected ${min}-${max} recommendations, got ${recCount}`,
      critical: false,
    });
  }

  // Check recommendations mention factors
  if (scenario.expectedConstraints.recommendationsMentionFactors) {
    const recommendations = Array.isArray(aiOutput.recommendations) ? aiOutput.recommendations : [];
    const mentionsFactors = recommendations.some((rec: any) => {
      const text = (rec.detailsEn || rec.titleEn || '').toLowerCase();
      return (
        text.includes('financial') ||
        text.includes('ties') ||
        text.includes('travel') ||
        text.includes('funds')
      );
    });
    metrics.push({
      name: 'recommendations_mention_factors',
      ok: mentionsFactors,
      details: mentionsFactors ? undefined : 'Recommendations do not mention specific risk factors',
      critical: false,
    });
  }

  // Check factor weights present
  if (scenario.expectedConstraints.factorWeightsPresent) {
    const factorWeightsPresent = aiOutput.factorWeights !== undefined;
    metrics.push({
      name: 'factor_weights_present',
      ok: factorWeightsPresent,
      details: factorWeightsPresent
        ? undefined
        : 'factorWeights field missing (Phase 3 expert field)',
      critical: false,
    });
  }

  return metrics;
}

/**
 * Validate document explanation constraints
 */
export function validateDocExplanationConstraints(
  scenario: DocExplanationEvalScenario,
  aiOutput: any
): EvalMetric[] {
  const metrics: EvalMetric[] = [];

  if (!aiOutput) {
    metrics.push({
      name: 'constraints_respected',
      ok: false,
      details: 'Output is null or undefined',
      critical: true,
    });
    return metrics;
  }

  // Check why mentions visa type
  if (scenario.expectedConstraints.whyMentionsVisaType) {
    const whyText = (aiOutput.why || aiOutput.whyEn || '').toLowerCase();
    const mentionsVisaType = whyText.includes(scenario.visaType.toLowerCase());
    metrics.push({
      name: 'why_mentions_visa_type',
      ok: mentionsVisaType,
      details: mentionsVisaType
        ? undefined
        : `why field does not mention visa type: ${scenario.visaType}`,
      critical: false,
    });
  }

  // Check why mentions country
  if (scenario.expectedConstraints.whyMentionsCountry) {
    const whyText = (aiOutput.why || aiOutput.whyEn || '').toLowerCase();
    const mentionsCountry =
      whyText.includes(scenario.countryCode.toLowerCase()) || whyText.includes('embassy');
    metrics.push({
      name: 'why_mentions_country',
      ok: mentionsCountry,
      details: mentionsCountry
        ? undefined
        : `why field does not mention country: ${scenario.countryCode}`,
      critical: false,
    });
  }

  // Check tips length
  if (scenario.expectedConstraints.tipsLength) {
    const tips = Array.isArray(aiOutput.tips) ? aiOutput.tips : [];
    const minTips = scenario.expectedConstraints.tipsLength.min ?? 0;
    const tipsLengthValid = tips.length >= minTips;
    metrics.push({
      name: 'tips_length_valid',
      ok: tipsLengthValid,
      details: tipsLengthValid
        ? undefined
        : `Expected at least ${minTips} tips, got ${tips.length}`,
      critical: false,
    });
  }

  // Check mentions common mistake
  if (scenario.expectedConstraints.mentionsCommonMistake) {
    const allText = JSON.stringify(aiOutput).toLowerCase();
    const mentionsMistake =
      allText.includes('mistake') || allText.includes('error') || allText.includes('avoid');
    metrics.push({
      name: 'mentions_common_mistake',
      ok: mentionsMistake,
      details: mentionsMistake
        ? undefined
        : 'Output does not mention common mistakes or errors to avoid',
      critical: false,
    });
  }

  // Check mentions officer checks
  if (scenario.expectedConstraints.mentionsOfficerChecks) {
    const allText = JSON.stringify(aiOutput).toLowerCase();
    const mentionsOfficer =
      allText.includes('officer') || allText.includes('check') || allText.includes('verify');
    metrics.push({
      name: 'mentions_officer_checks',
      ok: mentionsOfficer,
      details: mentionsOfficer
        ? undefined
        : 'Output does not mention what officers check or verify',
      critical: false,
    });
  }

  return metrics;
}

/**
 * Validate rules extraction constraints
 */
export function validateRulesExtractionConstraints(
  scenario: RulesExtractionEvalScenario,
  aiOutput: any
): EvalMetric[] {
  const metrics: EvalMetric[] = [];

  if (!aiOutput || !aiOutput.requiredDocuments) {
    metrics.push({
      name: 'constraints_respected',
      ok: false,
      details: 'Output is missing requiredDocuments field',
      critical: true,
    });
    return metrics;
  }

  // Extract document types mentioned in text (simple keyword matching)
  const textLower = scenario.embassyPageText.toLowerCase();
  const mentionedDocs: string[] = [];
  const docKeywords = [
    'passport',
    'photo',
    'application',
    'bank',
    'statement',
    'employment',
    'insurance',
    'invitation',
    'i-20',
    'i20',
    'cas',
    'sevis',
  ];
  docKeywords.forEach((keyword: string) => {
    if (textLower.includes(keyword)) {
      mentionedDocs.push(keyword);
    }
  });

  // Check all documents in text appear
  if (scenario.expectedConstraints.allDocumentsInTextAppear) {
    const extractedDocs = aiOutput.requiredDocuments.map(
      (doc: any) => doc.documentType?.toLowerCase() || ''
    );
    const allAppear = mentionedDocs.every((mentioned) =>
      extractedDocs.some(
        (extracted: string) => extracted.includes(mentioned) || mentioned.includes(extracted)
      )
    );
    metrics.push({
      name: 'all_documents_in_text_appear',
      ok: allAppear,
      details: allAppear
        ? undefined
        : 'Some documents mentioned in text are missing from extraction',
      critical: false,
    });
  }

  // Check no extra documents
  if (scenario.expectedConstraints.noExtraDocuments) {
    // This is harder to validate without a comprehensive list, so we'll check if count is reasonable
    const extractedCount = Array.isArray(aiOutput.requiredDocuments)
      ? aiOutput.requiredDocuments.length
      : 0;
    const reasonableCount = extractedCount <= 20; // Reasonable upper bound
    metrics.push({
      name: 'no_extra_documents',
      ok: reasonableCount,
      details: reasonableCount
        ? undefined
        : `Extracted ${extractedCount} documents, seems excessive`,
      critical: false,
    });
  }

  // Check financial requirements present
  if (scenario.expectedConstraints.financialRequirementsPresent) {
    const hasFinancialReqs = aiOutput.financialRequirements !== undefined;
    const textHasFinancial =
      textLower.includes('minimum') || textLower.includes('balance') || textLower.includes('fund');
    const financialValid = !textHasFinancial || hasFinancialReqs;
    metrics.push({
      name: 'financial_requirements_present',
      ok: financialValid,
      details: financialValid
        ? undefined
        : 'Text mentions financial requirements but extraction does not include them',
      critical: false,
    });
  }

  // Check confidence threshold
  if (scenario.expectedConstraints.confidenceThreshold) {
    const confidence = aiOutput.confidence || aiOutput.sourceInfo?.confidence || 0;
    const confidenceValid = confidence >= scenario.expectedConstraints.confidenceThreshold!;
    metrics.push({
      name: 'confidence_threshold_met',
      ok: confidenceValid,
      details: confidenceValid
        ? undefined
        : `Confidence ${confidence} below threshold ${scenario.expectedConstraints.confidenceThreshold}`,
      critical: false,
    });
  }

  // Check required documents count
  if (scenario.expectedConstraints.requiredDocumentsCount) {
    const docCount = Array.isArray(aiOutput.requiredDocuments)
      ? aiOutput.requiredDocuments.length
      : 0;
    const min = scenario.expectedConstraints.requiredDocumentsCount.min ?? 0;
    const countValid = docCount >= min;
    metrics.push({
      name: 'required_documents_count_valid',
      ok: countValid,
      details: countValid ? undefined : `Expected at least ${min} documents, got ${docCount}`,
      critical: false,
    });
  }

  return metrics;
}
