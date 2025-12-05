/**
 * Visa Rules Extraction Service
 * Processes EmbassyPageContent and creates VisaRuleSetCandidate via GPT
 */

import { PrismaClient } from '@prisma/client';
import { AIEmbassyExtractorService } from './ai-embassy-extractor.service';
import { VisaRulesService, VisaRuleSetData } from './visa-rules.service';
import { logInfo, logError, logWarn } from '../middleware/logger';

const prisma = new PrismaClient();

/**
 * Diff between old and new rule sets
 */
export interface RuleSetDiff {
  addedDocuments: Array<{ documentType: string; category: string }>;
  removedDocuments: Array<{ documentType: string; category: string }>;
  modifiedDocuments: Array<{
    documentType: string;
    changes: {
      category?: { old: string; new: string };
      description?: { old: string; new: string };
      condition?: { old?: string; new?: string };
    };
  }>;
  financialChanges?: {
    minimumBalance?: { old?: number; new?: number };
    currency?: { old?: string; new?: string };
  };
  processingChanges?: {
    processingDays?: { old?: number; new?: number };
  };
  feeChanges?: {
    visaFee?: { old?: number; new?: number };
  };
}

/**
 * Visa Rules Extraction Service
 */
export class VisaRulesExtractionService {
  /**
   * Process a single EmbassyPageContent and create candidate
   */
  static async processPageContent(
    pageContentId: string
  ): Promise<{ success: boolean; candidateId?: string; error?: string }> {
    try {
      // Get page content with source
      const pageContent = await prisma.embassyPageContent.findUnique({
        where: { id: pageContentId },
        include: {
          source: true,
        },
      });

      if (!pageContent) {
        throw new Error(`EmbassyPageContent not found: ${pageContentId}`);
      }

      if (pageContent.status !== 'success') {
        throw new Error(`Page content status is not 'success': ${pageContent.status}`);
      }

      if (!pageContent.source) {
        throw new Error(`EmbassySource not found for page content: ${pageContentId}`);
      }

      // Check if candidate already exists
      const existingCandidate = await prisma.visaRuleSetCandidate.findFirst({
        where: {
          pageContentId: pageContentId,
        },
      });

      if (existingCandidate) {
        logInfo('[VisaRulesExtraction] Candidate already exists', {
          pageContentId,
          candidateId: existingCandidate.id,
        });
        return {
          success: true,
          candidateId: existingCandidate.id,
        };
      }

      const { source } = pageContent;
      const countryCode = source.countryCode;
      const visaType = source.visaType;

      logInfo('[VisaRulesExtraction] Processing page content', {
        pageContentId,
        countryCode,
        visaType,
        url: pageContent.url,
        textLength: pageContent.cleanedText.length,
      });

      // Get previous approved rules for context
      let previousRules: VisaRuleSetData | null = null;
      try {
        previousRules = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
        if (previousRules) {
          logInfo('[VisaRulesExtraction] Found previous approved rules', {
            countryCode,
            visaType,
          });
        }
      } catch (error) {
        logWarn('[VisaRulesExtraction] Error fetching previous rules (continuing)', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Extract rules using GPT
      const extraction = await AIEmbassyExtractorService.extractVisaRulesFromPage({
        countryCode,
        visaType,
        sourceUrl: pageContent.url,
        pageText: pageContent.cleanedText,
        pageTitle: pageContent.title || undefined,
        previousRules: previousRules || undefined,
      });

      // Compute diff if previous rules exist
      let diff: RuleSetDiff | null = null;
      if (previousRules) {
        diff = this.computeDiff(previousRules, extraction.ruleSet);
      }

      // Store diff in metadata
      const extractionMetadata = {
        ...extraction.metadata,
        diff: diff,
      };

      // Create candidate
      const candidate = await prisma.visaRuleSetCandidate.create({
        data: {
          sourceId: source.id,
          pageContentId: pageContent.id,
          countryCode,
          visaType,
          data: extraction.ruleSet as any, // Will be serialized by Prisma
          confidence: extraction.metadata.confidence,
          extractionMetadata: extractionMetadata as any,
          status: 'pending',
        },
      });

      logInfo('[VisaRulesExtraction] Candidate created', {
        candidateId: candidate.id,
        countryCode,
        visaType,
        confidence: extraction.metadata.confidence,
        hasDiff: !!diff,
      });

      return {
        success: true,
        candidateId: candidate.id,
      };
    } catch (error) {
      logError('[VisaRulesExtraction] Error processing page content', error as Error, {
        pageContentId,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process all page contents that need extraction
   */
  static async processAllPending(limit?: number): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      pageContentId: string;
      success: boolean;
      candidateId?: string;
      error?: string;
    }>;
  }> {
    try {
      // Find page contents with status='success' that don't have candidates
      const pageContents = await prisma.embassyPageContent.findMany({
        where: {
          status: 'success',
          candidates: {
            none: {}, // No candidates exist for this page content
          },
        },
        include: {
          source: true,
        },
        orderBy: {
          fetchedAt: 'desc',
        },
        take: limit || 50,
      });

      if (pageContents.length === 0) {
        logInfo('[VisaRulesExtraction] No page contents need processing');
        return {
          total: 0,
          successful: 0,
          failed: 0,
          results: [],
        };
      }

      logInfo('[VisaRulesExtraction] Processing page contents', {
        count: pageContents.length,
      });

      const results: Array<{
        pageContentId: string;
        success: boolean;
        candidateId?: string;
        error?: string;
      }> = [];

      let successful = 0;
      let failed = 0;

      for (const pageContent of pageContents) {
        const result = await this.processPageContent(pageContent.id);
        results.push({
          pageContentId: pageContent.id,
          success: result.success,
          candidateId: result.candidateId,
          error: result.error,
        });

        if (result.success) {
          successful++;
        } else {
          failed++;
        }

        // Small delay between extractions
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      logInfo('[VisaRulesExtraction] Processing completed', {
        total: pageContents.length,
        successful,
        failed,
      });

      return {
        total: pageContents.length,
        successful,
        failed,
        results,
      };
    } catch (error) {
      logError('[VisaRulesExtraction] Error processing all pending', error as Error);
      throw error;
    }
  }

  /**
   * Compute diff between old and new rule sets
   */
  static computeDiff(oldRules: VisaRuleSetData, newRules: VisaRuleSetData): RuleSetDiff {
    const diff: RuleSetDiff = {
      addedDocuments: [],
      removedDocuments: [],
      modifiedDocuments: [],
    };

    // Document diff
    const oldDocs = new Map(
      (oldRules.requiredDocuments || []).map((doc) => [doc.documentType, doc])
    );
    const newDocs = new Map(
      (newRules.requiredDocuments || []).map((doc) => [doc.documentType, doc])
    );

    // Find added documents
    for (const [docType, newDoc] of newDocs) {
      if (!oldDocs.has(docType)) {
        diff.addedDocuments.push({
          documentType: docType,
          category: newDoc.category,
        });
      } else {
        // Check for modifications
        const oldDoc = oldDocs.get(docType)!;
        const changes: any = {};

        if (oldDoc.category !== newDoc.category) {
          changes.category = { old: oldDoc.category, new: newDoc.category };
        }
        if (oldDoc.description !== newDoc.description) {
          changes.description = { old: oldDoc.description || '', new: newDoc.description || '' };
        }
        if (oldDoc.condition !== newDoc.condition) {
          changes.condition = { old: oldDoc.condition, new: newDoc.condition };
        }

        if (Object.keys(changes).length > 0) {
          diff.modifiedDocuments.push({
            documentType: docType,
            changes,
          });
        }
      }
    }

    // Find removed documents
    for (const [docType, oldDoc] of oldDocs) {
      if (!newDocs.has(docType)) {
        diff.removedDocuments.push({
          documentType: docType,
          category: oldDoc.category,
        });
      }
    }

    // Financial requirements diff
    if (oldRules.financialRequirements || newRules.financialRequirements) {
      diff.financialChanges = {};
      const oldFin = oldRules.financialRequirements || {};
      const newFin = newRules.financialRequirements || {};

      if (oldFin.minimumBalance !== newFin.minimumBalance) {
        diff.financialChanges.minimumBalance = {
          old: oldFin.minimumBalance,
          new: newFin.minimumBalance,
        };
      }
      if (oldFin.currency !== newFin.currency) {
        diff.financialChanges.currency = {
          old: oldFin.currency,
          new: newFin.currency,
        };
      }
    }

    // Processing info diff
    if (oldRules.processingInfo || newRules.processingInfo) {
      diff.processingChanges = {};
      const oldProc = oldRules.processingInfo || {};
      const newProc = newRules.processingInfo || {};

      if (oldProc.processingDays !== newProc.processingDays) {
        diff.processingChanges.processingDays = {
          old: oldProc.processingDays,
          new: newProc.processingDays,
        };
      }
    }

    // Fees diff
    if (oldRules.fees || newRules.fees) {
      diff.feeChanges = {};
      const oldFees = oldRules.fees || {};
      const newFees = newRules.fees || {};

      if (oldFees.visaFee !== newFees.visaFee) {
        diff.feeChanges.visaFee = {
          old: oldFees.visaFee,
          new: newFees.visaFee,
        };
      }
    }

    return diff;
  }
}
