/**
 * Rule Auto-Update Service
 * Phase 5: Automatically updates VisaRuleSet from embassy sources
 * - Monitors embassy pages for changes
 * - Extracts rules using AI
 * - Compares with existing rules
 * - Updates rules if changes detected
 */

import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { EmbassyCrawlerService } from './embassy-crawler.service';
import { VisaRulesExtractionService } from './visa-rules-extraction.service';
import { VisaRulesService } from './visa-rules.service';

const prisma = new PrismaClient();

export interface RuleUpdateResult {
  ruleSetId: string;
  countryCode: string;
  visaType: string;
  updated: boolean;
  changesDetected: boolean;
  changes?: Array<{
    type: 'added' | 'removed' | 'modified';
    documentType: string;
    details?: string;
  }>;
  error?: string;
}

export class RuleAutoUpdateService {
  /**
   * Check and update rules for a specific country/visa type
   */
  static async updateRulesForCountryVisa(
    countryCode: string,
    visaType: string
  ): Promise<RuleUpdateResult> {
    try {
      logInfo('[RuleAutoUpdate] Starting rule update', {
        countryCode,
        visaType,
      });

      // 1. Get existing rule set (both data and database record)
      const existingRuleSetData = await VisaRulesService.getActiveRuleSet(countryCode, visaType);

      if (!existingRuleSetData) {
        logWarn('[RuleAutoUpdate] No existing rule set found', {
          countryCode,
          visaType,
        });
        return {
          ruleSetId: '',
          countryCode,
          visaType,
          updated: false,
          changesDetected: false,
          error: 'No existing rule set found',
        };
      }

      // Get the database record to get the ID
      const existingRuleSetRecord = await prisma.visaRuleSet.findFirst({
        where: {
          countryCode: countryCode.toUpperCase(),
          visaType: visaType.toLowerCase(),
          isApproved: true,
        },
        orderBy: {
          version: 'desc',
        },
      });

      if (!existingRuleSetRecord) {
        return {
          ruleSetId: '',
          countryCode,
          visaType,
          updated: false,
          changesDetected: false,
          error: 'No existing rule set record found',
        };
      }

      // 2. Get embassy sources for this country/visa type
      const embassySources = await prisma.embassySource.findMany({
        where: {
          countryCode: countryCode.toUpperCase(),
          visaType: visaType.toLowerCase(),
          isActive: true,
        },
      });

      if (embassySources.length === 0) {
        logWarn('[RuleAutoUpdate] No embassy sources found', {
          countryCode,
          visaType,
        });
        return {
          ruleSetId: existingRuleSetRecord.id,
          countryCode,
          visaType,
          updated: false,
          changesDetected: false,
          error: 'No embassy sources found',
        };
      }

      // 3. Fetch latest embassy content
      const embassyContents: string[] = [];
      for (const source of embassySources) {
        try {
          const crawled = await EmbassyCrawlerService.crawlSource(source.url);
          embassyContents.push(crawled.cleanedText);
        } catch (error) {
          logWarn('[RuleAutoUpdate] Failed to crawl embassy source', {
            url: source.url,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (embassyContents.length === 0) {
        return {
          ruleSetId: existingRuleSetRecord.id,
          countryCode,
          visaType,
          updated: false,
          changesDetected: false,
          error: 'Failed to fetch embassy content',
        };
      }

      // 4. Extract rules from embassy content using AI
      // Use the extraction service's processPageContent method or create a new page content entry
      // For now, we'll use a simplified approach - in production, would use the full extraction pipeline
      const { AIEmbassyExtractorService } = await import('./ai-embassy-extractor.service');
      
      let extractedRules: any = null;
      try {
        const extraction = await AIEmbassyExtractorService.extractVisaRulesFromPage({
          countryCode,
          visaType,
          sourceUrl: embassySources[0].url,
          pageText: embassyContents.join('\n\n'),
        });
        extractedRules = extraction.ruleSet;
      } catch (error) {
        logError('[RuleAutoUpdate] Failed to extract rules', error as Error, {
          countryCode,
          visaType,
        });
        return {
          ruleSetId: existingRuleSetRecord.id,
          countryCode,
          visaType,
          updated: false,
          changesDetected: false,
          error: 'Failed to extract rules from embassy content',
        };
      }

      if (!extractedRules || !extractedRules.requiredDocuments) {
        return {
          ruleSetId: existingRuleSetRecord.id,
          countryCode,
          visaType,
          updated: false,
          changesDetected: false,
          error: 'Failed to extract rules from embassy content',
        };
      }

      // 5. Compare extracted rules with existing rules
      const changes = this.compareRules(
        existingRuleSetData.requiredDocuments || [],
        extractedRules.requiredDocuments || []
      );

      if (!changes || changes.length === 0) {
        logInfo('[RuleAutoUpdate] No changes detected', {
          countryCode,
          visaType,
          ruleSetId: existingRuleSetRecord.id,
        });
        return {
          ruleSetId: existingRuleSetRecord.id,
          countryCode,
          visaType,
          updated: false,
          changesDetected: false,
        };
      }

      // 6. Create new version of rule set with updated rules
      const newVersion = (existingRuleSetRecord.version || 1) + 1;

      const updatedRuleSet = await prisma.visaRuleSet.create({
        data: {
          countryCode: countryCode.toUpperCase(),
          visaType: visaType.toLowerCase(),
          version: newVersion,
          data: {
            ...existingRuleSetData,
            requiredDocuments: extractedRules.requiredDocuments,
            financialRequirements: extractedRules.financialRequirements || existingRuleSetData.financialRequirements,
            sourceInfo: {
              ...existingRuleSetData.sourceInfo,
              extractedFrom: 'embassy_auto_update',
              extractedAt: new Date().toISOString(),
              confidence: 0.8, // Auto-extracted rules have lower confidence
            },
          } as any,
          isApproved: false, // Require manual approval for auto-updated rules
        },
      });

      logInfo('[RuleAutoUpdate] Created new rule set version', {
        countryCode,
        visaType,
        oldVersion: existingRuleSetRecord.version,
        newVersion: updatedRuleSet.version,
        changesCount: changes.length,
      });

      return {
        ruleSetId: updatedRuleSet.id,
        countryCode,
        visaType,
        updated: true,
        changesDetected: true,
        changes,
      };
    } catch (error) {
      logError('[RuleAutoUpdate] Rule update failed', error as Error, {
        countryCode,
        visaType,
      });
      return {
        ruleSetId: '',
        countryCode,
        visaType,
        updated: false,
        changesDetected: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Compare existing rules with extracted rules
   */
  private static compareRules(
    existing: Array<{ documentType: string; category?: string; name?: string }>,
    extracted: Array<{ documentType: string; category?: string; name?: string }>
  ): RuleUpdateResult['changes'] {
    const changes: RuleUpdateResult['changes'] = [];

    // Create maps for easier lookup
    const existingMap = new Map(existing.map((doc) => [doc.documentType.toLowerCase(), doc]));
    const extractedMap = new Map(extracted.map((doc) => [doc.documentType.toLowerCase(), doc]));

    // Find added documents
    for (const [docType, doc] of extractedMap) {
      if (!existingMap.has(docType)) {
        changes.push({
          type: 'added',
          documentType: doc.documentType,
          details: `New document added: ${doc.name || doc.documentType}`,
        });
      }
    }

    // Find removed documents
    for (const [docType, doc] of existingMap) {
      if (!extractedMap.has(docType)) {
        changes.push({
          type: 'removed',
          documentType: doc.documentType,
          details: `Document removed: ${doc.name || doc.documentType}`,
        });
      }
    }

    // Find modified documents (category changes)
    for (const [docType, extractedDoc] of extractedMap) {
      const existingDoc = existingMap.get(docType);
      if (existingDoc && existingDoc.category !== extractedDoc.category) {
        changes.push({
          type: 'modified',
          documentType: extractedDoc.documentType,
          details: `Category changed from "${existingDoc.category}" to "${extractedDoc.category}"`,
        });
      }
    }

    return changes;
  }

  /**
   * Run auto-update for all active rule sets
   */
  static async updateAllRules(): Promise<RuleUpdateResult[]> {
    try {
      // Get all active rule sets
      const activeRuleSets = await prisma.visaRuleSet.findMany({
        where: {
          isApproved: true,
        },
        select: {
          countryCode: true,
          visaType: true,
        },
        distinct: ['countryCode', 'visaType'],
      });

      const results: RuleUpdateResult[] = [];

      for (const ruleSet of activeRuleSets) {
        try {
          const result = await this.updateRulesForCountryVisa(
            ruleSet.countryCode,
            ruleSet.visaType
          );
          results.push(result);
        } catch (error) {
          logError('[RuleAutoUpdate] Failed to update rule set', error as Error, {
            countryCode: ruleSet.countryCode,
            visaType: ruleSet.visaType,
          });
          results.push({
            ruleSetId: '',
            countryCode: ruleSet.countryCode,
            visaType: ruleSet.visaType,
            updated: false,
            changesDetected: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logInfo('[RuleAutoUpdate] Completed batch update', {
        totalRuleSets: activeRuleSets.length,
        updated: results.filter((r) => r.updated).length,
        changesDetected: results.filter((r) => r.changesDetected).length,
      });

      return results;
    } catch (error) {
      logError('[RuleAutoUpdate] Batch update failed', error as Error);
      throw error;
    }
  }
}
