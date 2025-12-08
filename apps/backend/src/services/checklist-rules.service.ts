/**
 * Checklist Rules Service
 * Builds base checklist from VisaRuleSet (from database)
 */

import { VisaRulesService, VisaRuleSetData } from './visa-rules.service';
import { logInfo, logWarn } from '../middleware/logger';
import { evaluateCondition, ConditionResult } from '../utils/condition-evaluator';
import { CanonicalAIUserContext } from '../types/ai-context';
import { buildCanonicalAIUserContext } from './ai-context.service';
import { getEnvConfig } from '../config/env';
import { PrismaClient } from '@prisma/client';
import { toCanonicalDocumentType, logUnknownDocumentType } from '../config/document-types-map';

const prisma = new PrismaClient();

/**
 * Check if global document catalog feature is enabled
 * Uses config helper to read from validated environment variables
 */
function useGlobalDocumentCatalog(): boolean {
  try {
    const config = getEnvConfig();
    return config.USE_GLOBAL_DOCUMENT_CATALOG === true;
  } catch (error) {
    // If config parsing fails, fall back to direct env read (for safety)
    return process.env.USE_GLOBAL_DOCUMENT_CATALOG === 'true';
  }
}

/**
 * Base checklist item (before GPT-4 enrichment)
 */
export interface BaseChecklistItem {
  documentType: string;
  category: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
}

/**
 * Build base checklist from DocumentCatalog + VisaRuleReference (catalog mode)
 */
async function buildBaseChecklistFromCatalogReferences(
  ruleSetId: string,
  countryCode: string,
  visaType: string,
  userContext: any
): Promise<Array<BaseChecklistItem> | null> {
  try {
    // Fetch rule set with document references
    const ruleSetWithRefs = await prisma.visaRuleSet.findUnique({
      where: { id: ruleSetId },
      include: {
        documentReferences: {
          include: {
            document: true,
          },
        },
      },
    });

    if (
      !ruleSetWithRefs ||
      !ruleSetWithRefs.documentReferences ||
      ruleSetWithRefs.documentReferences.length === 0
    ) {
      logWarn('[ChecklistRules] No document references found for rule set', {
        ruleSetId,
        countryCode,
        visaType,
      });
      return null;
    }

    // Build canonical context for condition evaluation
    let canonicalContext: CanonicalAIUserContext | null = null;
    try {
      canonicalContext = await buildCanonicalAIUserContext(userContext);
    } catch (error) {
      logWarn('[ChecklistRules] Failed to build canonical context for catalog mode', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }

    const checklist: Array<BaseChecklistItem> = [];
    const conditionWarnings: string[] = [];

    // Process each document reference
    for (const ref of ruleSetWithRefs.documentReferences) {
      const catalogDoc = ref.document;

      if (!catalogDoc || !catalogDoc.isActive) {
        continue; // Skip inactive documents
      }

      // Evaluate condition if present
      if (ref.condition && canonicalContext) {
        const conditionResult = evaluateCondition(ref.condition, canonicalContext);

        if (conditionResult === false) {
          // Condition evaluates to false - exclude document
          logInfo('[ChecklistRules] Document excluded by condition (catalog mode)', {
            documentType: catalogDoc.documentType,
            condition: ref.condition,
            result: 'excluded',
          });
          continue; // Skip this document
        } else if (conditionResult === 'unknown') {
          // Condition evaluation failed - include as highly_recommended and log warning
          conditionWarnings.push(
            `Condition evaluation failed for ${catalogDoc.documentType}: ${ref.condition}`
          );
          const effectiveCategory = ref.categoryOverride || catalogDoc.defaultCategory;

          // Normalize document type
          const norm = toCanonicalDocumentType(catalogDoc.documentType);
          if (!norm.canonicalType) {
            logUnknownDocumentType(catalogDoc.documentType, {
              source: 'VisaRuleReference.DocumentCatalog (condition failed)',
              countryCode,
              visaType,
              ruleSetId,
            });
          }
          const documentType = norm.canonicalType ?? catalogDoc.documentType;

          checklist.push({
            documentType,
            category: effectiveCategory as 'required' | 'highly_recommended' | 'optional',
            required: effectiveCategory === 'required',
          });
          continue;
        }
        // conditionResult === true - include document normally
      }

      // Determine effective category
      const effectiveCategory = ref.categoryOverride || catalogDoc.defaultCategory;
      const required = effectiveCategory === 'required';

      // Normalize document type
      const norm = toCanonicalDocumentType(catalogDoc.documentType);
      if (!norm.canonicalType) {
        logUnknownDocumentType(catalogDoc.documentType, {
          source: 'VisaRuleReference.DocumentCatalog',
          countryCode,
          visaType,
          ruleSetId,
        });
      }
      const documentType = norm.canonicalType ?? catalogDoc.documentType;

      checklist.push({
        documentType,
        category: effectiveCategory as 'required' | 'highly_recommended' | 'optional',
        required,
      });
    }

    // Log warnings if any
    if (conditionWarnings.length > 0) {
      logWarn('[ChecklistRules] Condition evaluation warnings (catalog mode)', {
        warnings: conditionWarnings,
        documentCount: conditionWarnings.length,
      });
    }

    // Safety check: ensure minimum items
    const MIN_ITEMS_HARD = 4;
    if (checklist.length < MIN_ITEMS_HARD) {
      logWarn('[ChecklistRules] Catalog-based base checklist too small, falling back to embedded', {
        itemCount: checklist.length,
        minRequired: MIN_ITEMS_HARD,
        ruleSetId,
        countryCode,
        visaType,
      });
      return null; // Trigger fallback
    }

    logInfo('[ChecklistRules] Base checklist built from catalog references', {
      totalItems: checklist.length,
      requiredCount: checklist.filter((item) => item.required).length,
      highlyRecommendedCount: checklist.filter((item) => item.category === 'highly_recommended')
        .length,
      optionalCount: checklist.filter((item) => item.category === 'optional').length,
      ruleSetId,
    });

    return checklist;
  } catch (error) {
    logWarn('[ChecklistRules] Error building checklist from catalog references', {
      error: error instanceof Error ? error.message : String(error),
      ruleSetId,
    });
    return null; // Trigger fallback
  }
}

/**
 * Build base checklist from embedded documents (legacy mode)
 */
async function buildBaseChecklistFromEmbeddedDocuments(
  userContext: any,
  ruleSet: VisaRuleSetData
): Promise<Array<BaseChecklistItem>> {
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
        canonicalContext = await buildCanonicalAIUserContext(userContext);
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

          // Normalize document type
          const norm = toCanonicalDocumentType(doc.documentType);
          if (!norm.canonicalType) {
            logUnknownDocumentType(doc.documentType, {
              source: 'VisaRuleSet.requiredDocuments (condition failed)',
            });
          }
          const documentType = norm.canonicalType ?? doc.documentType;

          checklist.push({
            documentType,
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

      // Normalize document type
      const norm = toCanonicalDocumentType(doc.documentType);
      if (!norm.canonicalType) {
        logUnknownDocumentType(doc.documentType, {
          source: 'VisaRuleSet.requiredDocuments',
        });
      }
      const documentType = norm.canonicalType ?? doc.documentType;

      checklist.push({
        documentType,
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

    // Log with rule set info for ES/tourist specifically
    // Extract countryCode and visaType from userContext if available
    const countryCode =
      userContext?.application?.country?.toUpperCase() ||
      userContext?.questionnaireSummary?.targetCountry?.toUpperCase() ||
      'UNKNOWN';
    const visaType =
      userContext?.application?.visaType?.toLowerCase() ||
      userContext?.questionnaireSummary?.visaType?.toLowerCase() ||
      'UNKNOWN';
    const isESTourist =
      countryCode === 'ES' &&
      (visaType === 'tourist' || visaType === 'schengen tourist' || visaType.includes('tourist'));

    if (isESTourist) {
      logInfo('[ChecklistRules] Base checklist built from VisaRuleSet (ES/tourist)', {
        totalItems: checklist.length,
        requiredCount: checklist.filter((item) => item.required).length,
        highlyRecommendedCount: checklist.filter((item) => item.category === 'highly_recommended')
          .length,
        optionalCount: checklist.filter((item) => item.category === 'optional').length,
        ruleSetVersion: ruleSet.version || 1,
        ruleSetDocumentCount: ruleSet.requiredDocuments?.length || 0,
        countryCode,
        visaType,
      });
    } else {
      logInfo('[ChecklistRules] Base checklist built from embedded documents', {
        totalItems: checklist.length,
        requiredCount: checklist.filter((item) => item.required).length,
        highlyRecommendedCount: checklist.filter((item) => item.category === 'highly_recommended')
          .length,
        optionalCount: checklist.filter((item) => item.category === 'optional').length,
      });
    }

    return checklist;
  } catch (error) {
    logWarn('[ChecklistRules] Error building checklist from embedded documents', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Build base checklist from VisaRuleSet
 * Supports conditional logic per document (version 2+)
 * Supports catalog mode when feature flag is enabled and ruleSetId is provided
 */
export async function buildBaseChecklistFromRules(
  userContext: any,
  ruleSet: VisaRuleSetData,
  options?: {
    ruleSetId?: string;
    countryCode?: string;
    visaType?: string;
    documentReferences?: Array<{
      id: string;
      documentId: string;
      condition?: string | null;
      categoryOverride?: string | null;
    }>;
  }
): Promise<Array<BaseChecklistItem>> {
  // Check if catalog mode should be used (generic - works for any rule set with references)
  const hasReferences = options?.documentReferences && options.documentReferences.length > 0;
  const useCatalog = useGlobalDocumentCatalog() && options?.ruleSetId && hasReferences;

  if (useCatalog) {
    try {
      const refCount = options.documentReferences!.length;
      logInfo('[ChecklistRules] Using DocumentCatalog for base docs', {
        ruleSetId: options.ruleSetId,
        country: options.countryCode,
        visaType: options.visaType,
        references: refCount,
      });

      const catalogChecklist = await buildBaseChecklistFromCatalogReferences(
        options.ruleSetId!,
        options.countryCode || 'UNKNOWN',
        options.visaType || 'UNKNOWN',
        userContext
      );

      if (catalogChecklist && catalogChecklist.length > 0) {
        return catalogChecklist;
      }

      // Fall back to embedded if catalog mode failed
      const reason =
        catalogChecklist === null ? 'catalog_checklist_too_small_or_error' : 'empty_checklist';
      logWarn('[ChecklistRules] Falling back to embedded requiredDocuments for base docs', {
        ruleSetId: options.ruleSetId,
        country: options.countryCode,
        visaType: options.visaType,
        reason,
      });
    } catch (error) {
      logWarn('[ChecklistRules] Error in catalog mode, falling back to embedded', {
        error: error instanceof Error ? error.message : String(error),
        ruleSetId: options.ruleSetId,
        country: options.countryCode,
        visaType: options.visaType,
      });
    }
  }

  // Legacy path (always available fallback)
  return buildBaseChecklistFromEmbeddedDocuments(userContext, ruleSet);
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
