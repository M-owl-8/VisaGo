/**
 * Checklist Rules Service
 * Builds base checklist from VisaRuleSet (from database)
 */

import { VisaRulesService, VisaRuleSetData } from './visa-rules.service';
import { logInfo, logWarn } from '../middleware/logger';
import { evaluateCondition, ConditionResult } from '../utils/condition-evaluator';
import { CanonicalAIUserContext } from '../types/ai-context';
import { buildCanonicalAIUserContext } from './ai-context.service';

/**
 * Base checklist item (before GPT-4 enrichment)
 */
export interface BaseChecklistItem {
  documentType: string;
  category: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
}

/**
 * Build base checklist from VisaRuleSet
 * Supports conditional logic per document (version 2+)
 */
export function buildBaseChecklistFromRules(
  userContext: any,
  ruleSet: VisaRuleSetData
): Array<BaseChecklistItem> {
  try {
    if (!ruleSet || !ruleSet.requiredDocuments || ruleSet.requiredDocuments.length === 0) {
      logWarn('[ChecklistRules] Rule set has no required documents', {
        hasRuleSet: !!ruleSet,
        documentsCount: ruleSet?.requiredDocuments?.length || 0,
      });
      return [];
    }

    // Check if conditional logic is enabled (version 2+)
    const ruleSetVersion = ruleSet.version || 1;
    const conditionalLogicEnabled = ruleSetVersion >= 2;

    // Convert to canonical context for condition evaluation
    let canonicalContext: CanonicalAIUserContext | null = null;
    if (conditionalLogicEnabled) {
      try {
        canonicalContext = buildCanonicalAIUserContext(userContext);
      } catch (error) {
        logWarn('[ChecklistRules] Failed to build canonical context for condition evaluation', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Fall back to non-conditional mode
      }
    }

    const checklist: Array<BaseChecklistItem> = [];
    const conditionWarnings: string[] = [];

    // Process required documents from rule set
    for (const doc of ruleSet.requiredDocuments) {
      // Evaluate condition if present and conditional logic is enabled
      if (conditionalLogicEnabled && doc.condition && canonicalContext) {
        const conditionResult = evaluateCondition(doc.condition, canonicalContext);

        if (conditionResult === false) {
          // Condition evaluates to false - exclude document
          logInfo('[ChecklistRules] Document excluded by condition', {
            documentType: doc.documentType,
            condition: doc.condition,
            result: 'excluded',
          });
          continue; // Skip this document
        } else if (conditionResult === 'unknown') {
          // Condition evaluation failed or field is unknown
          // Include as highly_recommended and log warning
          conditionWarnings.push(
            `Condition evaluation failed for ${doc.documentType}: ${doc.condition}`
          );
          checklist.push({
            documentType: doc.documentType,
            category: 'highly_recommended', // Downgrade to highly_recommended
            required: false,
          });
          continue;
        }
        // conditionResult === true - include document normally
      }

      // No condition or condition evaluates to true - include document
      // Map category to required boolean
      const required = doc.category === 'required';

      checklist.push({
        documentType: doc.documentType,
        category: doc.category,
        required,
      });
    }

    // Log warnings if any
    if (conditionWarnings.length > 0) {
      logWarn('[ChecklistRules] Condition evaluation warnings', {
        warnings: conditionWarnings,
        documentCount: conditionWarnings.length,
      });
    }

    // Apply conditional documents based on user context
    const conditionalDocs = getConditionalDocuments(userContext, ruleSet);
    for (const doc of conditionalDocs) {
      // Check if document already exists
      const exists = checklist.some((item) => item.documentType === doc.documentType);
      if (!exists) {
        checklist.push(doc);
      }
    }

    // Apply risk-based documents
    const riskBasedDocs = getRiskBasedDocuments(userContext, ruleSet);
    for (const doc of riskBasedDocs) {
      const exists = checklist.some((item) => item.documentType === doc.documentType);
      if (!exists) {
        checklist.push(doc);
      }
    }

    logInfo('[ChecklistRules] Base checklist built from rules', {
      totalItems: checklist.length,
      requiredCount: checklist.filter((item) => item.required).length,
      highlyRecommendedCount: checklist.filter((item) => item.category === 'highly_recommended')
        .length,
      optionalCount: checklist.filter((item) => item.category === 'optional').length,
    });

    return checklist;
  } catch (error) {
    logWarn('[ChecklistRules] Error building checklist from rules', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Get conditional documents based on user context
 */
function getConditionalDocuments(
  userContext: any,
  ruleSet: VisaRuleSetData
): Array<BaseChecklistItem> {
  const conditional: Array<BaseChecklistItem> = [];

  // Sponsor-related documents
  if (ruleSet.financialRequirements?.sponsorRequirements?.allowed) {
    const sponsorType = userContext.questionnaireSummary?.sponsorType;
    if (sponsorType && sponsorType !== 'self') {
      // Add sponsor documents
      const sponsorDocs = ruleSet.financialRequirements.sponsorRequirements.requiredDocuments || [];
      for (const docType of sponsorDocs) {
        conditional.push({
          documentType: docType,
          category: 'required',
          required: true,
        });
      }
    }
  }

  return conditional;
}

/**
 * Get risk-based documents
 */
function getRiskBasedDocuments(
  userContext: any,
  ruleSet: VisaRuleSetData
): Array<BaseChecklistItem> {
  const riskBased: Array<BaseChecklistItem> = [];

  const riskScore = userContext.riskScore;
  if (!riskScore) {
    return riskBased;
  }

  // High risk: add additional supporting documents
  if (riskScore.level === 'high' || riskScore.probabilityPercent < 50) {
    // Add property documents if available
    if (userContext.questionnaireSummary?.hasPropertyInUzbekistan) {
      riskBased.push({
        documentType: 'property_documents',
        category: 'highly_recommended',
        required: false,
      });
    }

    // Add family ties proof
    if (userContext.questionnaireSummary?.hasFamilyInUzbekistan) {
      riskBased.push({
        documentType: 'family_ties_proof',
        category: 'highly_recommended',
        required: false,
      });
    }

    // Add refusal explanation if previous refusals
    if (userContext.questionnaireSummary?.previousVisaRejections) {
      riskBased.push({
        documentType: 'refusal_explanation_letter',
        category: 'highly_recommended',
        required: false,
      });
    }
  }

  return riskBased;
}

/**
 * Get rule set for country/visa type (wrapper for VisaRulesService)
 */
export async function getRuleSetForChecklist(
  countryCode: string,
  visaType: string
): Promise<VisaRuleSetData | null> {
  try {
    return await VisaRulesService.getActiveRuleSet(countryCode, visaType);
  } catch (error) {
    logWarn('[ChecklistRules] Error getting rule set', {
      countryCode,
      visaType,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
