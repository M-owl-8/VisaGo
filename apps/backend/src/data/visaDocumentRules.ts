/**
 * Visa Document Rules
 * Queries database for VisaRuleSet instead of hard-coded rules
 */

import { VisaRulesService } from '../services/visa-rules.service';
import { logInfo, logWarn } from '../middleware/logger';

/**
 * Visa Document Rule Set (compatible with old interface)
 */
export interface VisaDocumentRuleSet {
  countryCode: string;
  visaType: string;
  baseDocuments: string[];
  conditionalDocuments?: Array<{
    condition: (ctx: any) => boolean;
    documents: string[];
  }>;
  riskBasedDocuments?: Array<{
    condition: (ctx: any) => boolean;
    documents: string[];
  }>;
}

/**
 * Find visa document rule set from database
 * Returns rule set if approved rule set exists, null otherwise
 */
export async function findVisaDocumentRuleSet(
  countryCode: string,
  visaType: string
): Promise<VisaDocumentRuleSet | null> {
  try {
    const ruleSet = await VisaRulesService.getActiveRuleSet(
      countryCode.toUpperCase(),
      visaType.toLowerCase()
    );

    if (!ruleSet) {
      logWarn('[VisaDocumentRules] No approved rule set found', {
        countryCode,
        visaType,
      });
      return null;
    }

    // Convert VisaRuleSetData to VisaDocumentRuleSet format
    const baseDocuments = ruleSet.requiredDocuments
      .filter((doc) => doc.category === 'required')
      .map((doc) => doc.documentType);

    const conditionalDocuments: Array<{
      condition: (ctx: any) => boolean;
      documents: string[];
    }> = [];

    // Add sponsor-related conditional documents
    if (ruleSet.financialRequirements?.sponsorRequirements?.allowed) {
      conditionalDocuments.push({
        condition: (ctx: any) => {
          const sponsorType = ctx.questionnaireSummary?.sponsorType;
          return sponsorType && sponsorType !== 'self';
        },
        documents:
          ruleSet.financialRequirements.sponsorRequirements.requiredDocuments || [],
      });
    }

    const riskBasedDocuments: Array<{
      condition: (ctx: any) => boolean;
      documents: string[];
    }> = [
      {
        condition: (ctx: any) => {
          const riskScore = ctx.riskScore;
          return (
            riskScore &&
            (riskScore.level === 'high' || riskScore.probabilityPercent < 50)
          );
        },
        documents: ['property_documents', 'family_ties_proof'],
      },
      {
        condition: (ctx: any) => {
          return ctx.questionnaireSummary?.previousVisaRejections === true;
        },
        documents: ['refusal_explanation_letter'],
      },
    ];

    logInfo('[VisaDocumentRules] Rule set found and converted', {
      countryCode,
      visaType,
      baseDocumentsCount: baseDocuments.length,
      conditionalDocumentsCount: conditionalDocuments.length,
      riskBasedDocumentsCount: riskBasedDocuments.length,
    });

    return {
      countryCode: countryCode.toUpperCase(),
      visaType: visaType.toLowerCase(),
      baseDocuments,
      conditionalDocuments,
      riskBasedDocuments,
    };
  } catch (error) {
    logWarn('[VisaDocumentRules] Error finding rule set', {
      countryCode,
      visaType,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
