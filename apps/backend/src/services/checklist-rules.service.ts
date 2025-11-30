/**
 * Checklist Rules Service
 * Rule engine for building base document checklist from rules
 *
 * This service evaluates visa document rules against user context to build
 * a deterministic base checklist. GPT-4 will then enrich these documents
 * with descriptions and translations.
 */

import { AIUserContext } from '../types/ai-context';
import { VisaDocumentRuleSet, DocumentRule } from '../data/visaDocumentRules';

/**
 * Base checklist item (before GPT-4 enrichment)
 * This represents a document that should be in the checklist with its
 * category and required status determined by rules.
 */
export type BaseChecklistItem = {
  documentType: string; // Same as ChecklistItem.documentType
  category: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
};

/**
 * Build base checklist from rules
 *
 * Algorithm:
 * 1. Start with ruleSet.baseDocuments
 * 2. For each conditionalDocuments rule:
 *    - Check if 'when' conditions match userContext
 *    - If matches, add the listed documents
 * 3. For riskAdjustments:
 *    - If risk level matches, add or upgrade documents
 * 4. Deduplicate by document id, last applied rule wins for category/required
 *
 * @param userContext - AI user context with questionnaire summary and risk score
 * @param ruleSet - Visa document rule set for this country+visa type
 * @returns Array of base checklist items
 */
export function buildBaseChecklistFromRules(
  userContext: AIUserContext,
  ruleSet: VisaDocumentRuleSet
): BaseChecklistItem[] {
  const items = new Map<string, BaseChecklistItem>();

  // Step 1: Add base documents
  for (const doc of ruleSet.baseDocuments) {
    items.set(doc.id, {
      documentType: doc.id,
      category: doc.category,
      required: doc.required,
    });
  }

  // Step 2: Evaluate conditional documents
  if (ruleSet.conditionalDocuments) {
    for (const conditional of ruleSet.conditionalDocuments) {
      if (evaluateCondition(conditional.when, userContext)) {
        for (const doc of conditional.add) {
          // Last rule wins for category/required
          items.set(doc.id, {
            documentType: doc.id,
            category: doc.category || 'optional',
            required: doc.required !== undefined ? doc.required : false,
          });
        }
      }
    }
  }

  // Step 3: Apply risk adjustments
  if (ruleSet.riskAdjustments && userContext.riskScore) {
    const riskLevel = userContext.riskScore.level;
    const adjustment = ruleSet.riskAdjustments.find((adj) => adj.whenRiskLevel === riskLevel);

    if (adjustment) {
      // Add documents
      if (adjustment.add) {
        for (const doc of adjustment.add) {
          items.set(doc.id, {
            documentType: doc.id,
            category: doc.category || 'optional',
            required: doc.required !== undefined ? doc.required : false,
          });
        }
      }

      // Upgrade categories
      if (adjustment.upgradeCategory) {
        for (const upgrade of adjustment.upgradeCategory) {
          const existing = items.get(upgrade.id);
          if (existing) {
            existing.category = upgrade.toCategory;
            // If upgrading to required or highly_recommended, set required appropriately
            if (upgrade.toCategory === 'required') {
              existing.required = true;
            } else if (upgrade.toCategory === 'highly_recommended') {
              // Keep existing required value or default to false
              existing.required = existing.required || false;
            }
          }
        }
      }
    }
  }

  return Array.from(items.values());
}

/**
 * Evaluate condition against user context
 *
 * @param condition - Condition object with optional fields
 * @param userContext - AI user context
 * @returns True if condition matches, false otherwise
 */
function evaluateCondition(
  condition: {
    sponsorType?: 'self' | 'parent' | 'relative' | 'company' | 'other';
    hasTravelHistory?: boolean;
    previousVisaRejections?: boolean;
    isMinor?: boolean;
    hasPropertyInUzbekistan?: boolean;
    hasFamilyInUzbekistan?: boolean;
  },
  userContext: AIUserContext
): boolean {
  const summary = userContext.questionnaireSummary;

  // Check sponsorType
  if (condition.sponsorType !== undefined) {
    const actualSponsorType = summary?.sponsorType;
    if (actualSponsorType !== condition.sponsorType) {
      return false;
    }
  }

  // Check hasTravelHistory
  if (condition.hasTravelHistory !== undefined) {
    const actualHasTravelHistory = summary?.hasInternationalTravel ?? false;
    if (actualHasTravelHistory !== condition.hasTravelHistory) {
      return false;
    }
  }

  // Check previousVisaRejections
  if (condition.previousVisaRejections !== undefined) {
    const actualPreviousRejections = summary?.previousVisaRejections ?? false;
    if (actualPreviousRejections !== condition.previousVisaRejections) {
      return false;
    }
  }

  // Check isMinor
  if (condition.isMinor !== undefined) {
    // Infer from age range
    const ageRange = summary?.ageRange;
    const isMinor = ageRange === 'under_18';
    if (isMinor !== condition.isMinor) {
      return false;
    }
  }

  // Check hasPropertyInUzbekistan
  if (condition.hasPropertyInUzbekistan !== undefined) {
    const actualHasProperty = summary?.hasPropertyInUzbekistan ?? false;
    if (actualHasProperty !== condition.hasPropertyInUzbekistan) {
      return false;
    }
  }

  // Check hasFamilyInUzbekistan
  if (condition.hasFamilyInUzbekistan !== undefined) {
    const actualHasFamily = summary?.hasFamilyInUzbekistan ?? false;
    if (actualHasFamily !== condition.hasFamilyInUzbekistan) {
      return false;
    }
  }

  // All conditions matched
  return true;
}
