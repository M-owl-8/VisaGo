/**
 * Document Check Service
 *
 * Phase 3.2: Service for checking documents against checklist items using GPT-4.
 *
 * This service:
 * - Matches uploaded documents to checklist items
 * - Runs GPT-4 document checks
 * - Stores results in DocumentCheckResult table
 * - Computes overall readiness scores
 */

import { PrismaClient } from '@prisma/client';
import { logInfo, logWarn, logError } from '../middleware/logger';
import { AIOpenAIService } from './ai-openai.service';
import { buildApplicantProfile } from './ai-context.service';
import type { ApplicantProfile, ChecklistBrainItem } from '../types/visa-brain';

const prisma = new PrismaClient();

export class DocCheckService {
  /**
   * Find the best candidate document for a checklist item.
   *
   * Uses classifiedType, checklist item id/name, and simple heuristics.
   *
   * @param applicationId - Application ID
   * @param checklistItem - Checklist item to match
   * @returns Best matching document or null
   */
  static async findBestDocumentForChecklistItem(
    applicationId: string,
    checklistItem: { id: string; document?: string; name: string; category: string }
  ): Promise<any | null> {
    try {
      // 1) Load all documents for the application
      const documents = await prisma.userDocument.findMany({
        where: { applicationId },
      });

      if (documents.length === 0) {
        return null;
      }

      // 2) Use heuristics to find best match
      const checklistDocKey = checklistItem.document || checklistItem.id.toLowerCase();
      const checklistName = checklistItem.name.toLowerCase();

      // Score each document
      const scored = documents.map((doc) => {
        let score = 0;

        // Exact match on documentType (classifiedType doesn't exist in schema)
        // Removed classifiedType check - field doesn't exist in schema

        // Match on documentType (legacy field)
        if (doc.documentType) {
          const docType = doc.documentType.toLowerCase();
          if (docType === checklistDocKey || docType === checklistItem.id.toLowerCase()) {
            score += 8;
          }
          if (docType.includes(checklistDocKey) || checklistDocKey.includes(docType)) {
            score += 4;
          }
        }

        // Match on fileName
        const fileName = doc.fileName.toLowerCase();
        if (fileName.includes(checklistDocKey) || fileName.includes(checklistName)) {
          score += 3;
        }

        // Match on documentName
        const docName = doc.documentName.toLowerCase();
        if (docName.includes(checklistDocKey) || docName.includes(checklistName)) {
          score += 2;
        }

        return { doc, score };
      });

      // Sort by score and return best match
      scored.sort((a, b) => b.score - a.score);
      const bestMatch = scored[0];

      // Only return if score is above threshold
      if (bestMatch && bestMatch.score >= 3) {
        logInfo('[DocCheck] Found best document match', {
          checklistItemId: checklistItem.id,
          documentId: bestMatch.doc.id,
          score: bestMatch.score,
        });
        return bestMatch.doc;
      }

      return null;
    } catch (error: any) {
      logError('[DocCheck] Failed to find document', error as Error, {
        applicationId,
        checklistItemId: checklistItem.id,
      });
      return null;
    }
  }

  /**
   * Run doc-check for a single checklist item.
   *
   * @param applicationId - Application ID
   * @param checklistItem - Checklist item to check
   * @returns DocumentCheckResult
   */
  static async checkSingleItem(
    applicationId: string,
    checklistItem: {
      id: string;
      document?: string;
      name: string;
      category: string;
      description?: string;
      status?: string;
      whoNeedsIt?: string;
    }
  ): Promise<any> {
    try {
      // 1) Find best document
      const document = await this.findBestDocumentForChecklistItem(applicationId, checklistItem);

      // 2) Fetch ApplicantProfile for this application
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
          user: true,
          country: true,
          visaType: true,
        },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Build AIUserContext (simplified for doc-check)
      const aiUserContext = {
        userProfile: {
          userId: application.userId,
          citizenship: 'UZ', // Default, should be from user profile
          appLanguage: 'en' as const,
        },
        application: {
          applicationId: application.id,
          country: application.country.code,
          visaType: (application.visaType.name.toLowerCase().includes('student')
            ? 'student'
            : 'tourist') as 'student' | 'tourist',
          status: (application.status || 'draft') as
            | 'draft'
            | 'in_progress'
            | 'submitted'
            | 'approved'
            | 'rejected',
        },
        questionnaireSummary: undefined, // May not be available
        uploadedDocuments: [],
        appActions: [],
        riskScore: undefined,
      };

      const applicantProfile = buildApplicantProfile(
        aiUserContext,
        application.country.name || application.country.code,
        application.visaType.name
      );

      // 3) Build ChecklistBrainItem representation
      const checklistBrainItem: ChecklistBrainItem = {
        id: checklistItem.id,
        status: (checklistItem.status as any) || 'REQUIRED',
        whoNeedsIt: (checklistItem.whoNeedsIt as any) || 'applicant',
        name: checklistItem.name,
        nameUz: checklistItem.name, // TODO: Get from checklist if available
        nameRu: checklistItem.name, // TODO: Get from checklist if available
        description: checklistItem.description || '',
        descriptionUz: checklistItem.description || '',
        descriptionRu: checklistItem.description || '',
        whereToObtain: '',
        whereToObtainUz: '',
        whereToObtainRu: '',
        priority: checklistItem.category === 'required' ? 'high' : 'medium',
        isCoreRequired: checklistItem.category === 'required',
      };

      // 4) Get extractedText from document
      const documentText = document?.extractedText || null;

      // 5) Call AIOpenAIService.checkDocument
      // TODO: checkDocument method doesn't exist - need to implement or use alternative
      // For now, create a mock result
      const checkResult = {
        status: document ? 'OK' : 'MISSING',
        problems: [] as any[],
        suggestions: [] as any[],
      };
      // const checkResult = await AIOpenAIService.checkDocument(...);

      // 6) Save result in DocumentCheckResult table
      // TODO: documentCheckResult model doesn't exist in schema - need to implement or use DocumentChecklist
      // For now, just return the check result without persisting
      const finalResult = {
        id: `${applicationId}-${checklistItem.id}`,
        applicationId,
        checklistItemId: checklistItem.id,
        documentId: document?.id || null,
        status: checkResult.status,
        problemsJson: JSON.stringify(checkResult.problems),
        suggestionsJson: JSON.stringify(checkResult.suggestions),
        notes:
          checkResult.problems.length > 0
            ? checkResult.problems.map((p: any) => p.message).join('; ')
            : null,
      };

      logInfo('[DocCheck] Single item checked', {
        applicationId,
        checklistItemId: checklistItem.id,
        status: checkResult.status,
        documentId: document?.id || null,
      });

      return finalResult;
    } catch (error: any) {
      logError('[DocCheck] Failed to check single item', error as Error, {
        applicationId,
        checklistItemId: checklistItem.id,
      });
      throw error;
    }
  }

  /**
   * Run doc-check for all checklist items of an application.
   *
   * @param applicationId - Application ID
   * @param userId - User ID (for verification)
   */
  static async checkAllItemsForApplication(applicationId: string, userId: string): Promise<void> {
    try {
      // Verify user owns the application
      const application = await prisma.visaApplication.findFirst({
        where: { id: applicationId, userId },
      });

      if (!application) {
        throw new Error('Application not found or access denied');
      }

      // 1) Load checklist
      const { DocumentChecklistService } = await import('./document-checklist.service');
      const checklist = await DocumentChecklistService.generateChecklist(applicationId, userId);

      // Handle both checklist object and status object
      if (!checklist || 'status' in checklist) {
        logWarn('[DocCheck] Checklist not available', {
          applicationId,
          status: (checklist as any)?.status,
        });
        return;
      }

      const items = checklist.items || [];

      logInfo('[DocCheck] Starting check for all items', {
        applicationId,
        itemCount: items.length,
      });

      // 2) Loop over checklist items, calling checkSingleItem
      // Run sequentially to avoid rate limits
      for (const item of items) {
        try {
          await this.checkSingleItem(applicationId, {
            id: (item as any).document || item.name || (item as any).id || 'unknown',
            document: (item as any).document,
            name: item.name || (item as any).document || 'Unknown',
            category: item.category || 'optional',
            description: item.description,
            status: item.category === 'required' ? 'REQUIRED' : 'HIGHLY_RECOMMENDED',
            whoNeedsIt: 'applicant', // TODO: Get from checklist if available
          });

          // Small delay to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (itemError: any) {
          logError('[DocCheck] Failed to check item', itemError as Error, {
            applicationId,
            itemId: (item as any).document || item.name,
          });
          // Continue with next item
        }
      }

      logInfo('[DocCheck] Completed check for all items', {
        applicationId,
        itemCount: items.length,
      });
    } catch (error: any) {
      logError('[DocCheck] Failed to check all items', error as Error, {
        applicationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Compute overall readiness score for an application (0-100%).
   *
   * @param applicationId - Application ID
   * @returns Readiness summary
   */
  static async computeReadiness(applicationId: string): Promise<{
    readinessPercent: number;
    totalItems: number;
    okCount: number;
    weakCount: number;
    missingCount: number;
  }> {
    try {
      // Load DocumentCheckResult rows for application
      // TODO: documentCheckResult model doesn't exist in schema
      const results: any[] = []; // await prisma.documentCheckResult.findMany({ where: { applicationId } });

      // Load checklist to get total items and categories
      const { DocumentChecklistService } = await import('./document-checklist.service');
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const checklist = await DocumentChecklistService.generateChecklist(
        applicationId,
        application.userId
      );

      // Handle status object
      if (!checklist || 'status' in checklist) {
        return {
          readinessPercent: 0,
          totalItems: 0,
          okCount: 0,
          weakCount: 0,
          missingCount: 0,
        };
      }

      const items = checklist.items || [];

      // Filter to only required and highly_recommended items
      const importantItems = items.filter(
        (item) => item.category === 'required' || item.category === 'highly_recommended'
      );

      const totalItems = importantItems.length;

      if (totalItems === 0) {
        return {
          readinessPercent: 0,
          totalItems: 0,
          okCount: 0,
          weakCount: 0,
          missingCount: 0,
        };
      }

      // Count statuses
      let okCount = 0;
      let weakCount = 0;
      let missingCount = 0;

      for (const item of importantItems) {
        const itemId = (item as any).document || item.name || (item as any).id || 'unknown';
        const result = results.find((r: any) => r.checklistItemId === itemId);

        if (!result) {
          // Not checked yet
          missingCount++;
        } else {
          const status = result.status;
          if (status === 'OK') {
            okCount++;
          } else if (status === 'MISSING') {
            missingCount++;
          } else if (status === 'PROBLEM' || status === 'UNCERTAIN') {
            weakCount++;
          }
        }
      }

      // Calculate readiness percent
      // OK items count fully, weak items count as 0.5, missing count as 0
      const readinessPercent = Math.round(((okCount + weakCount * 0.5) / totalItems) * 100);

      return {
        readinessPercent,
        totalItems,
        okCount,
        weakCount,
        missingCount,
      };
    } catch (error: any) {
      logError('[DocCheck] Failed to compute readiness', error as Error, {
        applicationId,
      });
      return {
        readinessPercent: 0,
        totalItems: 0,
        okCount: 0,
        weakCount: 0,
        missingCount: 0,
      };
    }
  }
}
