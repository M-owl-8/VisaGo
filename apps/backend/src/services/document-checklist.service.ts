/**
 * Document Checklist Service
 * AI-powered document checklist generation for visa applications
 */
// Change summary (2025-11-24): Added OpenAI latency warnings and enforced country-specific terminology (e.g., LOA vs I-20).

import { PrismaClient } from '@prisma/client';
import { getEnvConfig } from '../config/env';
import { errors } from '../utils/errors';
import { logError, logInfo, logWarn } from '../middleware/logger';
import { AIOpenAIService } from './ai-openai.service';
import { getDocumentTranslation } from '../data/document-translations';
import { buildAIUserContext } from './ai-context.service';
import { inferCategory, normalizePriority } from '../utils/checklist-helpers';

const prisma = new PrismaClient();

/**
 * Document checklist item
 */
export interface ChecklistItem {
  id: string;
  documentType: string;
  name: string;
  nameUz: string;
  nameRu: string;
  description: string;
  descriptionUz: string;
  descriptionRu: string;
  category?: 'required' | 'highly_recommended' | 'optional'; // Optional for backward compatibility
  required: boolean; // Kept for backward compatibility
  priority: string; // Loosened type - runtime normalization ensures valid values
  status: 'missing' | 'pending' | 'verified' | 'rejected';
  userDocumentId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  verificationNotes?: string;
  aiVerified?: boolean;
  aiConfidence?: number;
  whereToObtain?: string;
  whereToObtainUz?: string;
  whereToObtainRu?: string;
}

/**
 * Document checklist
 */
export interface DocumentChecklist {
  applicationId: string;
  countryId: string;
  visaTypeId: string;
  items: ChecklistItem[];
  totalRequired: number;
  completed: number;
  progress: number; // 0-100
  generatedAt: string;
  aiGenerated: boolean;
  aiFallbackUsed?: boolean;
  aiErrorOccurred?: boolean;
}

/**
 * Document Checklist Service
 * Generates AI-powered document checklists
 */
export class DocumentChecklistService {
  /**
   * Generate document checklist for an application
   * Now uses persistent DB storage to avoid re-calling OpenAI on every GET
   *
   * @param applicationId - Application ID
   * @param userId - User ID (for verification)
   * @returns Document checklist or status object
   */
  static async generateChecklist(
    applicationId: string,
    userId: string
  ): Promise<DocumentChecklist | { status: 'processing' | 'failed'; errorMessage?: string }> {
    try {
      // Get application with related data
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
          country: true,
          visaType: true,
          user: true,
          documents: true,
        },
      });

      // Get stored checklist from database
      const storedChecklist = await prisma.documentChecklist.findUnique({
        where: { applicationId },
      });

      if (!application) {
        throw errors.notFound('Application');
      }

      // Verify ownership
      if (application.userId !== userId) {
        throw errors.forbidden();
      }

      // CRITICAL FIX: Check for existing stored checklist first
      if (storedChecklist) {
        // If checklist is ready, return it immediately without calling OpenAI
        if (storedChecklist.status === 'ready') {
          logInfo('[Checklist][Cache] Returning stored checklist', {
            applicationId,
            status: storedChecklist.status,
          });

          if (!storedChecklist.checklistData) {
            logWarn('[Checklist][Cache] Stored checklist has no data, will regenerate', {
              applicationId,
            });
            // Fall through to generate new checklist
          } else {
            const checklistData = JSON.parse(storedChecklist.checklistData);
            // Handle both old format (array) and new format (object with items and metadata)
            const items = Array.isArray(checklistData) ? checklistData : checklistData.items || [];
            const aiFallbackUsed = checklistData.aiFallbackUsed || false;
            const aiErrorOccurred = checklistData.aiErrorOccurred || false;
            return this.buildChecklistResponse(
              applicationId,
              application.countryId,
              application.visaTypeId,
              items,
              application.documents,
              storedChecklist.aiGenerated,
              aiFallbackUsed,
              aiErrorOccurred
            );
          }
        }

        // If checklist is pending, return status
        if (storedChecklist.status === 'pending') {
          logInfo('[Checklist][Status] Checklist generation in progress', {
            applicationId,
          });
          return { status: 'processing' };
        }

        // If checklist failed, generate fallback on-the-fly instead of returning error
        if (storedChecklist.status === 'failed') {
          logWarn('[Checklist][Status] Stored checklist failed, generating fallback on-the-fly', {
            applicationId,
            errorMessage: storedChecklist.errorMessage,
          });

          try {
            // Generate fallback checklist immediately
            const fallbackItems = await this.generateRobustFallbackChecklist(
              application.country,
              application.visaType,
              application.documents.map((doc: any) => ({
                type: doc.documentType,
                status: doc.status,
                id: doc.id,
                fileUrl: doc.fileUrl,
                fileName: doc.fileName,
                fileSize: doc.fileSize,
                uploadedAt: doc.uploadedAt,
                verificationNotes: doc.verificationNotes,
                verifiedByAI: doc.verifiedByAI ?? false,
                aiConfidence: doc.aiConfidence ?? null,
                aiNotesUz: doc.aiNotesUz ?? null,
                aiNotesRu: doc.aiNotesRu ?? null,
                aiNotesEn: doc.aiNotesEn ?? null,
              }))
            );

            // Normalize documentType keys for consistent matching
            const existingDocumentsMap = new Map(
              application.documents.map((doc: any) => {
                const normalizedType = (doc.documentType || '').trim().toLowerCase();
                return [
                  normalizedType,
                  {
                    type: normalizedType,
                    originalType: doc.documentType,
                    status: doc.status,
                    id: doc.id,
                    fileUrl: doc.fileUrl,
                    fileName: doc.fileName,
                    fileSize: doc.fileSize,
                    uploadedAt: doc.uploadedAt,
                    verificationNotes: doc.verificationNotes,
                    verifiedByAI: doc.verifiedByAI ?? false,
                    aiConfidence: doc.aiConfidence ?? null,
                    aiNotesUz: doc.aiNotesUz ?? null,
                    aiNotesRu: doc.aiNotesRu ?? null,
                    aiNotesEn: doc.aiNotesEn ?? null,
                  },
                ];
              })
            );

            const enrichedItems = this.mergeChecklistItemsWithDocuments(
              fallbackItems,
              existingDocumentsMap as Map<string, any>,
              applicationId
            );
            const sanitizedItems = this.applyCountryTerminology(
              enrichedItems,
              application.country,
              application.visaType.name
            );

            // Update stored checklist to 'ready' with fallback data
            await prisma.documentChecklist.update({
              where: { applicationId },
              data: {
                status: 'ready',
                checklistData: JSON.stringify(sanitizedItems),
                aiGenerated: false,
                generatedAt: new Date(),
                errorMessage: null,
              },
            });

            return this.buildChecklistResponse(
              applicationId,
              application.countryId,
              application.visaTypeId,
              sanitizedItems,
              application.documents,
              false // aiGenerated = false for fallback
            );
          } catch (fallbackError: any) {
            logError(
              '[Checklist] Fallback generation failed in generateChecklist',
              fallbackError as Error,
              {
                applicationId,
              }
            );
            // If even fallback fails, return processing status to trigger retry
            return { status: 'processing' };
          }
        }
      }

      // No checklist exists or needs regeneration - start async generation
      // Create checklist entry with status 'pending'
      const checklistEntry = await prisma.documentChecklist.upsert({
        where: { applicationId },
        create: {
          applicationId,
          status: 'pending',
          checklistData: '[]',
        },
        update: {
          status: 'pending',
          errorMessage: null,
        },
      });

      // Trigger async generation (don't await - let it run in background)
      this.generateChecklistAsync(applicationId, userId, application).catch((error) => {
        logError('[Checklist][Async] Background generation failed', error as Error, {
          applicationId,
        });
      });

      // Return processing status immediately
      return { status: 'processing' };
    } catch (error) {
      logError('Error generating document checklist', error as Error, {
        applicationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate checklist asynchronously in background
   * This method runs the actual AI generation and stores the result
   */
  private static async generateChecklistAsync(
    applicationId: string,
    userId: string,
    application: any
  ): Promise<void> {
    try {
      // STEP 1: Check if checklist already exists - if so, skip AI generation
      const storedChecklist = await prisma.documentChecklist.findUnique({
        where: { applicationId },
      });

      // If checklist already exists and is ready, skip generation
      if (storedChecklist && storedChecklist.status === 'ready') {
        logInfo(
          '[Checklist][Async] Checklist already exists for application, skipping AI generation',
          {
            applicationId,
            status: storedChecklist.status,
          }
        );
        return; // Early return - do not call OpenAI
      }

      // Get existing documents with full data
      // Normalize documentType keys to handle whitespace and case differences
      const existingDocumentsMap = new Map(
        application.documents.map((doc: any) => {
          const normalizedType = (doc.documentType || '').trim().toLowerCase();
          return [
            normalizedType,
            {
              type: normalizedType,
              originalType: doc.documentType,
              status: doc.status,
              id: doc.id,
              fileUrl: doc.fileUrl,
              fileName: doc.fileName,
              fileSize: doc.fileSize,
              uploadedAt: doc.uploadedAt,
              verificationNotes: doc.verificationNotes,
              verifiedByAI: doc.verifiedByAI ?? false,
              aiConfidence: doc.aiConfidence ?? null,
              aiNotesUz: doc.aiNotesUz ?? null,
              aiNotesRu: doc.aiNotesRu ?? null,
              aiNotesEn: doc.aiNotesEn ?? null,
            },
          ];
        })
      );

      let items: ChecklistItem[] = [];
      let aiGenerated = false;
      let aiFallbackUsed = false;
      let aiErrorOccurred = false;

      // Extract countryCode and visaType from application
      const countryCode = (application.country.code || '').toUpperCase();
      const visaType = application.visaType.name.toLowerCase();
      const countryName = application.country.name;

      // STEP 1: DB lookup for VisaRules BEFORE calling OpenAI
      logInfo('[Checklist][Mode] Checking for approved VisaRules', {
        applicationId,
        countryCode,
        visaType,
        countryName,
      });

      const { VisaRulesService } = await import('./visa-rules.service');
      const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);

      // Determine mode based on approved rules
      let mode: 'RULES' | 'LEGACY' = approvedRuleSet ? 'RULES' : 'LEGACY';

      // Log mode clearly
      if (mode === 'RULES') {
        logInfo('[OpenAI][Checklist] Using RULES mode', {
          countryCode,
          visaType,
          countryName,
          ruleSetVersion: 'latest', // Could add version tracking if needed
          applicationId,
        });
      } else {
        logInfo('[OpenAI][Checklist] Using LEGACY mode', {
          countryCode,
          visaType,
          countryName,
          reason: 'no_approved_rules',
          applicationId,
        });
      }

      try {
        // Build AI user context with questionnaire summary
        const userContext = await buildAIUserContext(userId, applicationId);

        logInfo('[Checklist][AI] Requesting OpenAI checklist', {
          applicationId,
          country: countryName,
          visaType: application.visaType.name,
          mode,
        });
        const aiStart = Date.now();

        // Call AI to generate checklist as primary source
        let aiChecklist: any = null;
        let aiError: Error | null = null;

        try {
          // RULES MODE: Use dedicated rules-based path
          if (mode === 'RULES' && approvedRuleSet) {
            try {
              aiChecklist = await this.generateChecklistFromRules(
                approvedRuleSet,
                userContext,
                countryCode,
                visaType,
                countryName,
                application
              );
              logInfo('[Checklist][RULES] Successfully generated checklist from rules', {
                applicationId,
                countryCode,
                visaType,
                itemCount: aiChecklist?.checklist?.length || 0,
              });
            } catch (rulesError: any) {
              logWarn('[Checklist][RULES] Rules mode failed, falling back to legacy', {
                applicationId,
                countryCode,
                visaType,
                error: rulesError instanceof Error ? rulesError.message : String(rulesError),
              });
              // Fall through to legacy mode
              mode = 'LEGACY' as const;
            }
          }

          // LEGACY MODE: Use existing VisaChecklistEngine or AIOpenAIService
          if (mode === 'LEGACY' || !aiChecklist) {
            // Try new VisaChecklistEngine first (uses VisaRuleSet from database)
            const { VisaChecklistEngineService } = await import('./visa-checklist-engine.service');

            // Get previous checklist if exists (for stable IDs)
            const previousChecklistData = storedChecklist?.checklistData;
            let previousChecklist: any[] | undefined;
            if (previousChecklistData) {
              try {
                const parsed = JSON.parse(previousChecklistData);
                previousChecklist = Array.isArray(parsed) ? parsed : parsed.items || [];
              } catch (e) {
                // Ignore parse errors
              }
            }

            try {
              aiChecklist = await VisaChecklistEngineService.generateChecklist(
                application.country.code, // Use country code instead of name
                application.visaType.name.toLowerCase(),
                userContext,
                previousChecklist
              );

              // Convert to old format for compatibility
              const convertedChecklist = {
                type: application.visaType.name,
                checklist: aiChecklist.checklist.map((item: any) => ({
                  document: item.documentType,
                  name: item.name,
                  nameUz: item.nameUz,
                  nameRu: item.nameRu,
                  category: item.category,
                  required: item.required,
                  description: item.description || '',
                  descriptionUz: item.description || '',
                  descriptionRu: item.description || '',
                  priority: item.priority === 1 ? 'high' : item.priority === 2 ? 'medium' : 'low',
                  whereToObtain: item.reasonIfApplies || item.description || '',
                  whereToObtainUz: item.reasonIfApplies || item.description || '',
                  whereToObtainRu: item.reasonIfApplies || item.description || '',
                })),
              };
              aiChecklist = convertedChecklist;

              logInfo('[Checklist][Engine] Used VisaChecklistEngineService', {
                applicationId,
                country: application.country.name,
                visaType: application.visaType.name,
              });
            } catch (engineError: any) {
              // Fall back to old AIOpenAIService if new engine fails
              logWarn('[Checklist][Engine] VisaChecklistEngine failed, falling back to legacy', {
                applicationId,
                error: engineError.message,
              });
              aiChecklist = await AIOpenAIService.generateChecklist(
                userContext,
                application.country.name,
                application.visaType.name
              );
            }
          }
          const aiDurationMs = Date.now() - aiStart;
          if (aiDurationMs > 30000) {
            logWarn('[Checklist][AI] Slow checklist generation', {
              applicationId,
              country: application.country.name,
              visaType: application.visaType.name,
              durationMs: aiDurationMs,
            });
          }
        } catch (aiServiceError: any) {
          // Catch any error from AI service (timeout, API error, etc.)
          aiError =
            aiServiceError instanceof Error ? aiServiceError : new Error(String(aiServiceError));
          logWarn('[Checklist][AI] AI service error caught, will use fallback', {
            applicationId,
            country: application.country.name,
            visaType: application.visaType.name,
            errorMessage: aiError.message,
            errorType: aiServiceError?.type || 'unknown',
          });
          // Set aiChecklist to null so we use fallback
          aiChecklist = null;
          aiFallbackUsed = true;
          aiErrorOccurred = true;
        }

        // Parse AI response into ChecklistItem[] if we got a valid response
        if (
          aiChecklist &&
          aiChecklist.checklist &&
          Array.isArray(aiChecklist.checklist) &&
          aiChecklist.checklist.length > 0
        ) {
          items = aiChecklist.checklist.map((aiItem: any, index: number) => {
            const docType =
              aiItem.document ||
              aiItem.name?.toLowerCase().replace(/\s+/g, '_') ||
              `document_${index}`;
            const existingDoc = existingDocumentsMap.get(docType) as any;

            const item = {
              id: `checklist-item-${index}`,
              documentType: docType,
              name: aiItem.name || aiItem.document || 'Unknown Document',
              nameUz: aiItem.nameUz || aiItem.name || aiItem.document || "Noma'lum hujjat",
              nameRu: aiItem.nameRu || aiItem.name || aiItem.document || 'Неизвестный документ',
              description: aiItem.description || '',
              descriptionUz: aiItem.descriptionUz || aiItem.description || '',
              descriptionRu: aiItem.descriptionRu || aiItem.description || '',
              required: aiItem.required !== undefined ? aiItem.required : true,
              priority: normalizePriority(aiItem.priority || (aiItem.required ? 'high' : 'medium')),
              status: existingDoc?.status ? (existingDoc.status as any) : 'missing',
              userDocumentId: existingDoc?.id as string | undefined,
              fileUrl: existingDoc?.fileUrl as string | undefined,
              fileName: existingDoc?.fileName as string | undefined,
              fileSize: existingDoc?.fileSize as number | undefined,
              uploadedAt: existingDoc?.uploadedAt
                ? (existingDoc.uploadedAt as Date).toISOString()
                : undefined,
              verificationNotes:
                (existingDoc?.aiNotesUz as string | null) ||
                (existingDoc?.verificationNotes as string | null) ||
                undefined,
              aiVerified: existingDoc?.verifiedByAI === true,
              aiConfidence: existingDoc?.aiConfidence as number | undefined,
            };
            return {
              ...item,
              category: aiItem.category ?? inferCategory(item),
            };
          });

          // STEP 2: Validate AI result - if too few items, treat as weak result and use fallback
          const MIN_AI_ITEMS = 10; // Stricter minimum: 10 items required
          if (items.length < MIN_AI_ITEMS) {
            logWarn('[OpenAI][Checklist] Using FALLBACK template', {
              countryCode,
              visaType,
              reason: 'too_few_items',
              aiItemCount: items.length,
              threshold: MIN_AI_ITEMS,
              applicationId,
            });

            // Use fallback instead of weak AI result
            items = await this.generateRobustFallbackChecklist(
              application.country,
              application.visaType,
              Array.from(existingDocumentsMap.values()).map((doc: any) => ({
                type: doc.type,
                status: doc.status,
                id: doc.id,
                fileUrl: doc.fileUrl,
                fileName: doc.fileName,
                fileSize: doc.fileSize,
                uploadedAt: doc.uploadedAt,
                verificationNotes: doc.verificationNotes,
                verifiedByAI: doc.verifiedByAI,
                aiConfidence: doc.aiConfidence,
                aiNotesUz: doc.aiNotesUz,
                aiNotesRu: doc.aiNotesRu,
                aiNotesEn: doc.aiNotesEn,
              }))
            );
            aiGenerated = false;
            aiFallbackUsed = true;
          } else {
            aiGenerated = true;
            logInfo('[Checklist][AI] Using AI-generated checklist', {
              applicationId,
              itemCount: items.length,
              country: application.country.name,
              visaType: application.visaType.name,
            });
          }
        } else {
          // AI returned empty or invalid checklist - use fallback
          logWarn('[OpenAI][Checklist] Using FALLBACK template', {
            countryCode,
            visaType,
            reason: 'empty_or_invalid_checklist',
            hasChecklist: !!aiChecklist,
            checklistLength: aiChecklist?.checklist?.length || 0,
            applicationId,
          });
          items = await this.generateRobustFallbackChecklist(
            application.country,
            application.visaType,
            Array.from(existingDocumentsMap.values()).map((doc: any) => ({
              type: doc.type,
              status: doc.status,
              id: doc.id,
              fileUrl: doc.fileUrl,
              fileName: doc.fileName,
              fileSize: doc.fileSize,
              uploadedAt: doc.uploadedAt,
              verificationNotes: doc.verificationNotes,
              verifiedByAI: doc.verifiedByAI,
              aiConfidence: doc.aiConfidence,
              aiNotesUz: doc.aiNotesUz,
              aiNotesRu: doc.aiNotesRu,
              aiNotesEn: doc.aiNotesEn,
            }))
          );
          aiGenerated = false;
        }
      } catch (unexpectedError: any) {
        // Catch any unexpected errors (e.g., from buildAIUserContext or generateRobustFallbackChecklist)
        logError(
          '[Checklist][AI] Unexpected error in checklist generation',
          unexpectedError as Error,
          {
            applicationId,
            country: application.country.name,
            visaType: application.visaType.name,
            errorMessage: unexpectedError?.message || String(unexpectedError),
          }
        );

        // Still try to generate fallback even if there was an unexpected error
        try {
          items = await this.generateRobustFallbackChecklist(
            application.country,
            application.visaType,
            Array.from(existingDocumentsMap.values()).map((doc: any) => ({
              type: doc.type,
              status: doc.status,
              id: doc.id,
              fileUrl: doc.fileUrl,
              fileName: doc.fileName,
              fileSize: doc.fileSize,
              uploadedAt: doc.uploadedAt,
              verificationNotes: doc.verificationNotes,
              verifiedByAI: doc.verifiedByAI,
              aiConfidence: doc.aiConfidence,
              aiNotesUz: doc.aiNotesUz,
              aiNotesRu: doc.aiNotesRu,
              aiNotesEn: doc.aiNotesEn,
            }))
          );
          aiGenerated = false;
          aiFallbackUsed = true;
          aiErrorOccurred = true;
        } catch (fallbackError: any) {
          // If even fallback fails, log but don't throw - let the outer catch handle it
          logError('[Checklist][AI] Even fallback generation failed', fallbackError as Error, {
            applicationId,
          });
          // Re-throw to be handled by outer catch which will use emergency fallback
          throw fallbackError;
        }
      }

      // Merge full document data including AI verification
      const enrichedItems = this.mergeChecklistItemsWithDocuments(
        items,
        existingDocumentsMap as Map<string, any>,
        applicationId
      );
      const sanitizedItems = this.applyCountryTerminology(
        enrichedItems,
        application.country,
        application.visaType.name
      );

      // Store checklist in database with status 'ready'
      // Include metadata about AI fallback usage
      const checklistMetadata = {
        aiGenerated,
        aiFallbackUsed,
        aiErrorOccurred,
      };
      await prisma.documentChecklist.update({
        where: { applicationId },
        data: {
          status: 'ready',
          checklistData: JSON.stringify({
            items: sanitizedItems,
            ...checklistMetadata,
          }),
          aiGenerated,
          generatedAt: new Date(),
          errorMessage: null,
        },
      });

      logInfo('[Checklist][Async] Checklist generated and stored', {
        applicationId,
        itemCount: sanitizedItems.length,
        aiGenerated,
      });
    } catch (error: any) {
      // CRITICAL: Even if everything fails, generate a basic fallback checklist
      // Never leave the checklist empty or in 'failed' status
      logError(
        '[Checklist][Async] Failed to generate checklist, using emergency fallback',
        error as Error,
        {
          applicationId,
        }
      );

      try {
        // Generate emergency fallback checklist
        const emergencyItems = await this.generateRobustFallbackChecklist(
          application.country,
          application.visaType,
          Array.from(
            (application.documents || []).map((doc: any) => ({
              type: doc.documentType,
              status: doc.status,
              id: doc.id,
              fileUrl: doc.fileUrl,
              fileName: doc.fileName,
              fileSize: doc.fileSize,
              uploadedAt: doc.uploadedAt,
              verificationNotes: doc.verificationNotes,
              verifiedByAI: doc.verifiedByAI ?? false,
              aiConfidence: doc.aiConfidence ?? null,
              aiNotesUz: doc.aiNotesUz ?? null,
              aiNotesRu: doc.aiNotesRu ?? null,
              aiNotesEn: doc.aiNotesEn ?? null,
            }))
          )
        );

        // Merge with documents
        // Normalize documentType keys for consistent matching
        const existingDocumentsMap = new Map(
          (application.documents || []).map((doc: any) => {
            const normalizedType = (doc.documentType || '').trim().toLowerCase();
            return [
              normalizedType,
              {
                type: normalizedType,
                originalType: doc.documentType,
                status: doc.status,
                id: doc.id,
                fileUrl: doc.fileUrl,
                fileName: doc.fileName,
                fileSize: doc.fileSize,
                uploadedAt: doc.uploadedAt,
                verificationNotes: doc.verificationNotes,
                verifiedByAI: doc.verifiedByAI ?? false,
                aiConfidence: doc.aiConfidence ?? null,
                aiNotesUz: doc.aiNotesUz ?? null,
                aiNotesRu: doc.aiNotesRu ?? null,
                aiNotesEn: doc.aiNotesEn ?? null,
              },
            ];
          })
        );

        const enrichedItems = this.mergeChecklistItemsWithDocuments(
          emergencyItems,
          existingDocumentsMap as Map<string, any>,
          applicationId
        );
        const sanitizedItems = this.applyCountryTerminology(
          enrichedItems,
          application.country,
          application.visaType.name
        );

        // Store checklist with status 'ready' (not 'failed')
        // Include metadata about emergency fallback usage
        await prisma.documentChecklist.update({
          where: { applicationId },
          data: {
            status: 'ready',
            checklistData: JSON.stringify({
              items: sanitizedItems,
              aiGenerated: false,
              aiFallbackUsed: true,
              aiErrorOccurred: true,
            }),
            aiGenerated: false,
            generatedAt: new Date(),
            errorMessage: null, // Clear error message since we have a fallback
          },
        });

        logInfo('[Checklist][Async] Emergency fallback checklist generated and stored', {
          applicationId,
          itemCount: sanitizedItems.length,
        });
      } catch (fallbackError: any) {
        // If even fallback fails, log but don't set status to 'failed'
        // The route handler will generate fallback on-the-fly
        logError('[Checklist][Async] Even fallback generation failed', fallbackError as Error, {
          applicationId,
        });
      }
    }
  }

  /**
   * Build checklist response from stored data
   */
  private static buildChecklistResponse(
    applicationId: string,
    countryId: string,
    visaTypeId: string,
    items: ChecklistItem[],
    documents: any[],
    aiGenerated: boolean,
    aiFallbackUsed: boolean = false,
    aiErrorOccurred: boolean = false
  ): DocumentChecklist {
    // Merge with current document status
    // Normalize documentType keys to handle whitespace and case differences
    const existingDocumentsMap = new Map(
      documents.map((doc: any) => {
        const normalizedType = (doc.documentType || '').trim().toLowerCase();
        return [
          normalizedType,
          {
            type: normalizedType,
            originalType: doc.documentType,
            status: doc.status,
            id: doc.id,
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            uploadedAt: doc.uploadedAt,
            verificationNotes: doc.verificationNotes,
            verifiedByAI: doc.verifiedByAI ?? false,
            aiConfidence: doc.aiConfidence ?? null,
            aiNotesUz: doc.aiNotesUz ?? null,
            aiNotesRu: doc.aiNotesRu ?? null,
            aiNotesEn: doc.aiNotesEn ?? null,
          },
        ];
      })
    );

    const enrichedItems = this.mergeChecklistItemsWithDocuments(
      items,
      existingDocumentsMap,
      applicationId
    );

    const progress = this.calculateDocumentProgress(enrichedItems);
    const totalRequired = enrichedItems.filter((item) => item.required).length;
    const completed = enrichedItems.filter(
      (item) => item.required && item.status === 'verified'
    ).length;

    return {
      applicationId,
      countryId,
      visaTypeId,
      items: enrichedItems,
      totalRequired,
      completed,
      progress,
      generatedAt: new Date().toISOString(),
      aiGenerated,
      aiFallbackUsed,
      aiErrorOccurred,
    };
  }

  /**
   * Generate checklist from approved VisaRules (RULES mode)
   *
   * @param ruleSet - Approved VisaRuleSetData from database
   * @param userContext - AIUserContext with questionnaire summary
   * @param countryCode - ISO country code (e.g., 'DE', 'US')
   * @param visaType - Visa type (e.g., 'tourist', 'student')
   * @param countryName - Human-readable country name
   * @param application - Application object with related data
   * @returns Checklist response in legacy format
   */
  private static async generateChecklistFromRules(
    ruleSet: any, // VisaRuleSetData
    userContext: any,
    countryCode: string,
    visaType: string,
    countryName: string,
    application: any
  ): Promise<{
    type: string;
    checklist: Array<{
      document: string;
      name?: string;
      nameUz?: string;
      nameRu?: string;
      category: 'required' | 'highly_recommended' | 'optional';
      required: boolean;
      description?: string;
      descriptionUz?: string;
      descriptionRu?: string;
      priority?: 'high' | 'medium' | 'low';
      whereToObtain?: string;
      whereToObtainUz?: string;
      whereToObtainRu?: string;
    }>;
  }> {
    try {
      logInfo('[Checklist][RULES] Generating checklist from approved rules', {
        countryCode,
        visaType,
        requiredDocsCount: ruleSet.requiredDocuments?.length || 0,
      });

      // Extract unique embassy/visa center URLs from multiple sources
      const embassyUrls = await this.extractEmbassyUrls(countryCode, visaType, ruleSet);

      // Build system prompt with rules content
      const systemPrompt = this.buildRulesModeSystemPrompt(
        countryCode,
        visaType,
        countryName,
        ruleSet,
        embassyUrls
      );

      // Build user prompt with application context
      const userPrompt = this.buildRulesModeUserPrompt(userContext, ruleSet, countryCode, visaType);

      // Call AIOpenAIService with checklist model (gpt-4o)
      const checklistModel = (
        await import('./ai-openai.service')
      ).AIOpenAIService.getChecklistModel();

      logInfo('[Checklist][RULES] Calling GPT-4 with rules-based prompt', {
        model: checklistModel,
        countryCode,
        visaType,
        embassyUrlsCount: embassyUrls.length,
      });

      const openaiClient = (await import('./ai-openai.service')).AIOpenAIService.getOpenAIClient();

      // ATTEMPT 1: Call GPT with rules/legacy prompt
      logInfo('[Checklist][RULES] Attempt 1: Calling GPT-4 for checklist generation', {
        model: checklistModel,
        countryCode,
        visaType,
      });

      let response = await openaiClient.chat.completions.create({
        model: checklistModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_completion_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const rawContent = response.choices[0]?.message?.content || '{}';

      // Parse and validate JSON response
      const { parseAndValidateChecklistResponse } = await import('../utils/json-validator');
      let validationResult = parseAndValidateChecklistResponse(
        rawContent,
        countryName,
        visaType,
        1 // attempt 1
      );

      let parsed = validationResult.parsed;

      // If validator fails → log validation error + reason, then retry
      if (!validationResult.validation.isValid) {
        logWarn('[Checklist][RULES] Attempt 1 failed validation', {
          countryCode,
          visaType,
          errors: validationResult.validation.errors,
          warnings: validationResult.validation.warnings,
          reason: validationResult.validation.errors.join('; '),
        });

        // ATTEMPT 2: Call GPT again with stronger JSON warning
        logInfo('[Checklist][RULES] Attempt 2: Retrying with stricter JSON requirements', {
          countryCode,
          visaType,
          previousErrors: validationResult.validation.errors,
        });

        const retryUserPrompt = `${userPrompt}

CRITICAL: Your previous response was invalid JSON or failed validation. You MUST return strictly valid JSON now.

Previous validation errors:
${validationResult.validation.errors.map((e) => `- ${e}`).join('\n')}

You MUST:
1. Return ONLY valid JSON matching the exact schema in the system prompt
2. Include ALL required fields for every checklist item
3. Ensure "checklist" is an array with 10-16 items
4. Include all three categories: required, highly_recommended, optional
5. No markdown, no comments, no extra text outside JSON`;

        response = await openaiClient.chat.completions.create({
          model: checklistModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: retryUserPrompt },
          ],
          temperature: 0.3, // Lower temperature for more consistent output
          max_completion_tokens: 2000,
          response_format: { type: 'json_object' },
        });

        const retryRawContent = response.choices[0]?.message?.content || '{}';
        validationResult = parseAndValidateChecklistResponse(
          retryRawContent,
          countryName,
          visaType,
          2 // attempt 2
        );

        parsed = validationResult.parsed;

        // If attempt 2 still fails → trigger fallback
        if (!validationResult.validation.isValid) {
          logError(
            '[Checklist][RULES] Attempt 2 also failed validation, triggering fallback',
            new Error('Validation failed after retry'),
            {
              countryCode,
              visaType,
              errors: validationResult.validation.errors,
              warnings: validationResult.validation.warnings,
              reason: validationResult.validation.errors.join('; '),
            }
          );
          throw new Error(
            `Validation failed after 2 attempts: ${validationResult.validation.errors.join('; ')}`
          );
        } else {
          logInfo('[Checklist][RULES] Attempt 2 succeeded after retry', {
            countryCode,
            visaType,
            itemCount: parsed?.checklist?.length || 0,
          });
        }
      }

      // Validate and convert to legacy format
      if (!parsed || !parsed.checklist || !Array.isArray(parsed.checklist)) {
        throw new Error('Invalid checklist structure in AI response');
      }

      logInfo('[Checklist][RULES] Successfully generated checklist from rules', {
        countryCode,
        visaType,
        itemCount: parsed.checklist.length,
      });

      // Map ChecklistItem[] to the expected return format, ensuring category is always present
      const mappedChecklist = parsed.checklist.map((item: any) => ({
        document: item.document,
        name: item.name,
        nameUz: item.nameUz,
        nameRu: item.nameRu,
        category:
          item.category ||
          ((item.required ? 'required' : 'highly_recommended') as
            | 'required'
            | 'highly_recommended'
            | 'optional'),
        required: item.required ?? item.category === 'required',
        description: item.description,
        descriptionUz: item.descriptionUz,
        descriptionRu: item.descriptionRu,
        priority: item.priority,
        whereToObtain: item.whereToObtain,
        whereToObtainUz: item.whereToObtainUz,
        whereToObtainRu: item.whereToObtainRu,
      }));

      return {
        type: visaType,
        checklist: mappedChecklist,
      };
    } catch (error) {
      logError('[Checklist][RULES] Error generating checklist from rules', error as Error, {
        countryCode,
        visaType,
      });
      throw error;
    }
  }

  /**
   * Extract unique embassy/visa center URLs from multiple sources
   */
  private static async extractEmbassyUrls(
    countryCode: string,
    visaType: string,
    ruleSet: any
  ): Promise<string[]> {
    const urls = new Set<string>();

    try {
      // 1. Extract URL from ruleSet.sourceInfo.extractedFrom (if exists)
      if (ruleSet.sourceInfo?.extractedFrom) {
        urls.add(ruleSet.sourceInfo.extractedFrom);
      }

      // 2. Get URL from the VisaRuleSet's related EmbassySource (via sourceId)
      const ruleSetRecord = await prisma.visaRuleSet.findFirst({
        where: {
          countryCode: countryCode.toUpperCase(),
          visaType: visaType.toLowerCase(),
          isApproved: true,
        },
        include: {
          source: {
            select: {
              url: true,
              name: true,
            },
          },
        },
        orderBy: {
          version: 'desc',
        },
      });

      if (ruleSetRecord?.source?.url) {
        urls.add(ruleSetRecord.source.url);
      }

      // 3. Get all active embassy sources for this country/visa type
      const { EmbassySourceService } = await import('./embassy-source.service');
      const sources = await EmbassySourceService.listSources({
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
        isActive: true,
      });

      sources.sources.forEach((s: any) => {
        if (s.url) {
          urls.add(s.url);
        }
      });

      logInfo('[Checklist][RULES] Extracted embassy URLs', {
        countryCode,
        visaType,
        urlCount: urls.size,
        urls: Array.from(urls),
      });
    } catch (urlError) {
      logWarn('[Checklist][RULES] Failed to fetch embassy URLs (non-blocking)', {
        countryCode,
        visaType,
        error: urlError instanceof Error ? urlError.message : String(urlError),
      });
    }

    return Array.from(urls);
  }

  /**
   * Build system prompt for RULES mode
   */
  private static buildRulesModeSystemPrompt(
    countryCode: string,
    visaType: string,
    countryName: string,
    ruleSet: any,
    embassyUrls: string[]
  ): string {
    // Format official URLs list
    const embassyUrlsText =
      embassyUrls.length > 0
        ? `\n\nOFFICIAL SOURCES:\nThese are the official sources for the requirements. Cross-check your checklist against them:\n${embassyUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}`
        : '';

    // Format rules content per document type
    const requiredDocsText =
      ruleSet.requiredDocuments?.length > 0
        ? `\n\nREQUIRED DOCUMENTS (from official rules):\n${ruleSet.requiredDocuments
            .map(
              (doc: any, i: number) =>
                `${i + 1}. ${doc.documentType} (${doc.category})\n   ${doc.description || 'No description'}\n   ${doc.validityRequirements ? `Validity: ${doc.validityRequirements}` : ''}\n   ${doc.formatRequirements ? `Format: ${doc.formatRequirements}` : ''}`
            )
            .join('\n\n')}`
        : '';

    const financialReqsText = ruleSet.financialRequirements
      ? `\n\nFINANCIAL REQUIREMENTS:\n${JSON.stringify(ruleSet.financialRequirements, null, 2)}`
      : '';

    const additionalReqsText = ruleSet.additionalRequirements
      ? `\n\nADDITIONAL REQUIREMENTS:\n${JSON.stringify(ruleSet.additionalRequirements, null, 2)}`
      : '';

    return `You are a visa document checklist generator for ${countryName} ${visaType} visas.

CRITICAL INSTRUCTIONS - FOLLOW STRICTLY:
1. You MUST use ONLY the official visa rules provided below. Do NOT invent or add documents that are not in the rules.
2. Do not invent extra categories that are not supported by rules unless clearly standard practice (e.g., passport is always required).
3. Always prioritize the rules' content and reconcile it with the official URLs provided.
4. If a document is listed in the rules, it MUST appear in your checklist.
5. If a document is NOT in the rules, do NOT add it unless it's a universally standard document (e.g., passport, passport photo).
6. Cross-reference your generated checklist against the official URLs to ensure accuracy.

OFFICIAL VISA RULES:
${requiredDocsText}${financialReqsText}${additionalReqsText}${embassyUrlsText}

REQUIRED JSON SCHEMA:
You MUST return ONLY valid JSON matching this exact schema. No comments, no explanations, no extra keys.

{
  "type": string,           // Visa type (e.g., "tourist", "student")
  "country": string,       // Country name (e.g., "Germany", "United States")
  "checklist": [
    {
      "document": string,              // REQUIRED: Document type slug (e.g., "passport", "bank_statement")
      "name": string,                  // REQUIRED: English name (2-5 words)
      "nameUz": string,                // REQUIRED: Uzbek translation
      "nameRu": string,                // REQUIRED: Russian translation
      "category": string,              // REQUIRED: One of "required", "highly_recommended", "optional"
      "required": boolean,             // REQUIRED: true if category is "required", false otherwise
      "description": string,           // REQUIRED: English description (1-2 sentences)
      "descriptionUz": string,         // REQUIRED: Uzbek translation of description
      "descriptionRu": string,        // REQUIRED: Russian translation of description
      "priority": string,              // REQUIRED: One of "high", "medium", "low"
      "whereToObtain": string,        // REQUIRED: English instructions for obtaining in Uzbekistan
      "whereToObtainUz": string,      // REQUIRED: Uzbek translation
      "whereToObtainRu": string       // REQUIRED: Russian translation
    }
  ]
}

VALIDATION RULES:
- "checklist" must be an array with 10-16 items
- All three categories (required, highly_recommended, optional) must be present
- Every item MUST have all required fields listed above
- "category" must match "required" field: if category="required" then required=true, else required=false
- "priority" must be consistent: "required" items should have priority="high"

Return ONLY valid JSON. No comments, no explanations, no extra keys.`;
  }

  /**
   * Build user prompt for RULES mode
   */
  private static buildRulesModeUserPrompt(
    userContext: any,
    ruleSet: any,
    countryCode: string,
    visaType: string
  ): string {
    // Extract conditional requirements from rules
    const conditionalDocs: string[] = [];
    if (ruleSet.financialRequirements?.sponsorRequirements?.allowed) {
      conditionalDocs.push('sponsor_documents');
    }
    if (ruleSet.additionalRequirements?.accommodationProof?.required) {
      conditionalDocs.push('accommodation_proof');
    }
    if (ruleSet.additionalRequirements?.travelInsurance?.required) {
      conditionalDocs.push('travel_insurance');
    }

    const conditionalDocsText =
      conditionalDocs.length > 0
        ? `\n\nCONDITIONAL DOCUMENTS (include if applicable to applicant):\n${conditionalDocs.join(', ')}`
        : '';

    return `Generate a personalized document checklist for this applicant:

APPLICANT CONTEXT:
${JSON.stringify(userContext, null, 2)}

COUNTRY: ${countryCode}
VISA TYPE: ${visaType}${conditionalDocsText}

STRICT REQUIREMENTS:
1. Include ALL required documents from the official rules (system prompt)
2. Include conditional documents ONLY if they apply to this applicant (e.g., sponsor documents if applicant has a sponsor)
3. Include highly recommended documents from the rules based on applicant's risk profile
4. Do NOT add documents that are not in the official rules
5. Cross-check against the official URLs provided in the system prompt
6. Provide clear, accurate multilingual descriptions (EN, UZ, RU)
7. Ensure category matches the rules' category field exactly

Return ONLY valid JSON matching the schema specified in the system prompt.`;
  }

  /**
   * Build country-aware fallback checklist factory
   * Returns a comprehensive fallback checklist based on country code and visa type
   */
  private static buildFallbackChecklist(
    countryCode: string,
    visaType: string
  ): Array<{
    documentType: string;
    category: 'required' | 'highly_recommended' | 'optional';
    priority: 'high' | 'medium' | 'low';
  }> {
    const visaTypeLower = visaType.toLowerCase();
    const isTourist = visaTypeLower.includes('tourist') || visaTypeLower.includes('tourism');
    const isStudent = visaTypeLower.includes('student') || visaTypeLower.includes('study');

    const schengenCountries = [
      'ES',
      'DE',
      'IT',
      'FR',
      'AT',
      'BE',
      'CH',
      'CZ',
      'DK',
      'EE',
      'FI',
      'GR',
      'HU',
      'IS',
      'LV',
      'LI',
      'LT',
      'LU',
      'MT',
      'NL',
      'NO',
      'PL',
      'PT',
      'SE',
      'SK',
      'SI',
    ];
    const isSchengen = schengenCountries.includes(countryCode.toUpperCase());

    // Schengen Tourist Visa Fallback (≥ 10 items)
    if (isSchengen && isTourist) {
      return [
        // Required documents
        { documentType: 'passport', category: 'required', priority: 'high' },
        { documentType: 'passport_photo', category: 'required', priority: 'high' },
        { documentType: 'visa_application_form', category: 'required', priority: 'high' },
        { documentType: 'travel_insurance', category: 'required', priority: 'high' },
        { documentType: 'flight_reservation', category: 'required', priority: 'high' },
        { documentType: 'hotel_reservations', category: 'required', priority: 'high' },
        { documentType: 'bank_statement', category: 'required', priority: 'high' },
        { documentType: 'employment_verification', category: 'required', priority: 'high' },
        { documentType: 'proof_of_residence', category: 'required', priority: 'high' },
        { documentType: 'travel_itinerary', category: 'highly_recommended', priority: 'medium' },
        { documentType: 'cover_letter', category: 'highly_recommended', priority: 'medium' },
        { documentType: 'previous_visa_copies', category: 'optional', priority: 'low' },
      ];
    }

    // Default fallback (for non-Schengen or other visa types)
    const defaultDocs: Array<{
      documentType: string;
      category: 'required' | 'highly_recommended' | 'optional';
      priority: 'high' | 'medium' | 'low';
    }> = [
      { documentType: 'passport', category: 'required', priority: 'high' },
      { documentType: 'passport_photo', category: 'required', priority: 'high' },
      { documentType: 'visa_application_form', category: 'required', priority: 'high' },
      { documentType: 'bank_statement', category: 'required', priority: 'high' },
    ];

    if (isStudent) {
      defaultDocs.push(
        { documentType: 'acceptance_letter', category: 'required', priority: 'high' },
        { documentType: 'academic_records', category: 'highly_recommended', priority: 'medium' },
        {
          documentType: 'proof_of_tuition_payment',
          category: 'highly_recommended',
          priority: 'medium',
        }
      );
    } else if (isTourist) {
      defaultDocs.push(
        { documentType: 'travel_itinerary', category: 'required', priority: 'high' },
        { documentType: 'hotel_reservations', category: 'required', priority: 'high' },
        {
          documentType: 'employment_verification',
          category: 'highly_recommended',
          priority: 'medium',
        }
      );
    }

    return defaultDocs;
  }

  /**
   * Generate robust fallback checklist with country-aware factory
   * This is used when AI fails or returns too few items
   */
  private static async generateRobustFallbackChecklist(
    country: any,
    visaType: any,
    existingDocuments: Array<{
      type: string;
      status: string;
      id: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      uploadedAt?: Date;
      verificationNotes?: string | null;
      verifiedByAI?: boolean | null;
      aiConfidence?: number | null;
      aiNotesUz?: string | null;
      aiNotesRu?: string | null;
      aiNotesEn?: string | null;
    }>
  ): Promise<ChecklistItem[]> {
    const countryCode = (country?.code || '').toUpperCase();
    const visaTypeName = (visaType?.name || '').toLowerCase();

    // Build fallback checklist using factory
    const fallbackDocTypes = this.buildFallbackChecklist(countryCode, visaTypeName);

    logInfo(
      `[OpenAI][Checklist] Using FALLBACK checklist (${countryCode}, ${visaTypeName}, items: ${fallbackDocTypes.length})`,
      {
        countryCode,
        visaType: visaTypeName,
        items: fallbackDocTypes.length,
      }
    );

    const items: ChecklistItem[] = [];

    // Create checklist items from fallback template
    for (let i = 0; i < fallbackDocTypes.length; i++) {
      const fallbackDoc = fallbackDocTypes[i];
      const docType = fallbackDoc.documentType;
      const existingDoc = existingDocuments.find((d) => d.type === docType);

      // Get translation or create fallback translation for missing document types
      let translation = getDocumentTranslation(docType);

      // Handle special document types that might not be in translations
      // Check if translation is the default fallback (when nameEn === docType)
      const isDefaultFallback =
        translation.nameEn === docType &&
        translation.nameUz === docType &&
        translation.nameRu === docType;

      if (isDefaultFallback) {
        // Create inline translation for missing types
        const specialTranslations: Record<string, any> = {
          travel_insurance: {
            type: 'travel_insurance',
            nameEn: 'Travel Health Insurance',
            nameUz: "Sayohat Tibbiy Sug'urtasi",
            nameRu: 'Медицинская Страховка для Путешествий',
            descriptionEn:
              'Travel health insurance covering at least €30,000 medical expenses, valid for entire Schengen stay',
            descriptionUz:
              "Kamida 30,000 EUR tibbiy xarajatlarni qoplaydigan sayohat tibbiy sug'urtasi, butun Shengen bo'ylab amal qiladi",
            descriptionRu:
              'Медицинская страховка для путешествий, покрывающая не менее 30,000 EUR медицинских расходов, действительна на весь период пребывания в Шенгене',
          },
          flight_reservation: {
            type: 'flight_reservation',
            nameEn: 'Flight Reservation / Itinerary',
            nameUz: 'Parvoz Bron / Marshrut',
            nameRu: 'Бронирование Рейса / Маршрут',
            descriptionEn:
              'Round-trip flight reservation showing entry and exit from Schengen area',
            descriptionUz:
              "Shengen hududiga kirish va chiqishni ko'rsatuvchi ikki tomonlama parvoz bron",
            descriptionRu:
              'Бронирование рейса туда и обратно, показывающее въезд и выезд из Шенгенской зоны',
          },
          cover_letter: {
            type: 'cover_letter',
            nameEn: 'Cover Letter / Travel Plan',
            nameUz: "Qo'shimcha Xat / Sayohat Rejasi",
            nameRu: 'Сопроводительное Письмо / План Поездки',
            descriptionEn:
              'Personal cover letter explaining the purpose of your trip and travel itinerary',
            descriptionUz:
              "Sayohat maqsadini va sayohat rejasini tushuntiruvchi shaxsiy qo'shimcha xat",
            descriptionRu:
              'Личное сопроводительное письмо, объясняющее цель поездки и маршрут путешествия',
          },
          previous_visa_copies: {
            type: 'previous_visa_copies',
            nameEn: 'Proof of Previous Travels',
            nameUz: 'Oldingi Sayohatlar Isboti',
            nameRu: 'Подтверждение Предыдущих Поездок',
            descriptionEn: 'Copies of previous Schengen or other visas (if applicable)',
            descriptionUz: "Oldingi Shengen yoki boshqa vizalar nusxalari (agar mavjud bo'lsa)",
            descriptionRu: 'Копии предыдущих шенгенских или других виз (если применимо)',
          },
        };

        if (specialTranslations[docType]) {
          translation = specialTranslations[docType];
        }
      }

      const item = {
        id: `checklist-item-${i}`,
        documentType: docType,
        name: translation.nameEn,
        nameUz: translation.nameUz,
        nameRu: translation.nameRu,
        description: translation.descriptionEn,
        descriptionUz: translation.descriptionUz,
        descriptionRu: translation.descriptionRu,
        required: fallbackDoc.category === 'required',
        priority: fallbackDoc.priority,
        status: existingDoc ? (existingDoc.status as any) : 'missing',
        userDocumentId: existingDoc?.id,
        fileUrl: existingDoc?.fileUrl,
        fileName: existingDoc?.fileName,
        fileSize: existingDoc?.fileSize,
        uploadedAt: existingDoc?.uploadedAt?.toISOString(),
        verificationNotes: existingDoc?.aiNotesUz || existingDoc?.verificationNotes || undefined,
        aiVerified: existingDoc?.verifiedByAI === true,
        aiConfidence: existingDoc?.aiConfidence || undefined,
      };
      items.push({
        ...item,
        category: fallbackDoc.category,
      });
    }

    return items;
  }

  /**
   * Generate checklist items using AI and visa requirements
   * @deprecated Use generateRobustFallbackChecklist for better fallback behavior
   */
  private static async generateChecklistItems(
    country: any,
    visaType: any,
    user: any,
    existingDocuments: Array<{
      type: string;
      status: string;
      id: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      uploadedAt?: Date;
      verificationNotes?: string | null;
      verifiedByAI?: boolean | null;
      aiConfidence?: number | null;
      aiNotesUz?: string | null;
      aiNotesRu?: string | null;
      aiNotesEn?: string | null;
    }>
  ): Promise<ChecklistItem[]> {
    const items: ChecklistItem[] = [];

    // Parse document types from visa type
    let documentTypes: string[] = [];
    try {
      documentTypes = JSON.parse(visaType.documentTypes || '[]');
    } catch {
      documentTypes = [];
    }

    // If no document types specified, use AI to generate them
    if (documentTypes.length === 0) {
      documentTypes = await this.generateDocumentTypesWithAI(country, visaType, user);
    }

    // Create checklist items
    for (let i = 0; i < documentTypes.length; i++) {
      const docType = documentTypes[i];
      const existingDoc = existingDocuments.find((d) => d.type === docType);

      // Get document details using AI
      const details = await this.getDocumentDetails(docType, country, visaType);

      // Get translations
      const translation = getDocumentTranslation(docType);

      const item = {
        id: `checklist-item-${i}`,
        documentType: docType,
        name: translation.nameEn,
        nameUz: translation.nameUz,
        nameRu: translation.nameRu,
        description: translation.descriptionEn,
        descriptionUz: translation.descriptionUz,
        descriptionRu: translation.descriptionRu,
        required: details.required,
        priority: normalizePriority(details.priority),
        status: existingDoc ? (existingDoc.status as any) : 'missing',
        userDocumentId: existingDoc?.id,
        fileUrl: existingDoc?.fileUrl,
        fileName: existingDoc?.fileName,
        fileSize: existingDoc?.fileSize,
        uploadedAt: existingDoc?.uploadedAt?.toISOString(),
        verificationNotes: existingDoc?.aiNotesUz || existingDoc?.verificationNotes || undefined,
        aiVerified: existingDoc?.verifiedByAI === true,
        aiConfidence: existingDoc?.aiConfidence || undefined,
      };
      items.push({
        ...item,
        category: inferCategory(item),
      });
    }

    // Add common documents that might be needed
    const commonDocTypes = ['passport', 'passport_photo'];

    // Add common docs if not already in list
    for (const docType of commonDocTypes) {
      if (!items.find((item) => item.documentType === docType)) {
        const existing = existingDocuments.find((d) => d.type === docType);
        const translation = getDocumentTranslation(docType);

        const existingDoc = existingDocuments.find((d) => d.type === docType);

        const item = {
          id: `checklist-item-${items.length}`,
          documentType: docType,
          name: translation.nameEn,
          nameUz: translation.nameUz,
          nameRu: translation.nameRu,
          description: translation.descriptionEn,
          descriptionUz: translation.descriptionUz,
          descriptionRu: translation.descriptionRu,
          required: true,
          priority: 'high' as const,
          status: existingDoc ? (existingDoc.status as any) : 'missing',
          userDocumentId: existingDoc?.id,
          fileUrl: existingDoc?.fileUrl,
          fileName: existingDoc?.fileName,
          fileSize: existingDoc?.fileSize,
          uploadedAt: existingDoc?.uploadedAt?.toISOString(),
          verificationNotes: existingDoc?.aiNotesUz || existingDoc?.verificationNotes || undefined,
          aiVerified: existingDoc?.verifiedByAI === true,
          aiConfidence: existingDoc?.aiConfidence || undefined,
        };
        items.push({
          ...item,
          category: inferCategory(item),
        });
      }
    }

    return items;
  }

  /**
   * Generate document types using AI
   */
  private static async generateDocumentTypesWithAI(
    country: any,
    visaType: any,
    user: any
  ): Promise<string[]> {
    try {
      const envConfig = getEnvConfig();
      if (!envConfig.OPENAI_API_KEY) {
        // Fallback to common documents
        return ['passport', 'photo', 'application_form', 'financial_proof'];
      }

      const prompt = `You are a visa application expert. List the required documents for a ${visaType.name} visa application to ${country.name}.

User nationality: ${user.firstName || 'Unknown'} (if available)

Provide a JSON array of document type names (e.g., ["passport", "photo", "bank_statement", "invitation_letter"]).
Only return the JSON array, no other text.`;

      const response = await AIOpenAIService.chat(
        [{ role: 'user', content: prompt }],
        'You are a visa document expert. Return only valid JSON arrays.'
      );

      // Try to parse JSON from response
      try {
        const jsonMatch = response.message.match(/\[.*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback
      }

      // Fallback to common documents
      return ['passport', 'photo', 'application_form', 'financial_proof'];
    } catch (error) {
      logError('Error generating document types with AI', error as Error);
      // Fallback to common documents
      return ['passport', 'photo', 'application_form', 'financial_proof'];
    }
  }

  /**
   * Get document details using AI
   */
  private static async getDocumentDetails(
    documentType: string,
    country: any,
    visaType: any
  ): Promise<{
    name: string;
    description: string;
    required: boolean;
    priority: 'high' | 'medium' | 'low';
    instructions?: string;
    exampleUrl?: string;
  }> {
    try {
      const envConfig = getEnvConfig();
      if (!envConfig.OPENAI_API_KEY) {
        // Return default details
        return {
          name: this.formatDocumentName(documentType),
          description: `Required ${documentType} document`,
          required: true,
          priority: 'high',
        };
      }

      const prompt = `Provide details for the document type "${documentType}" required for ${visaType.name} visa to ${country.name}.

Return a JSON object with:
{
  "name": "Human-readable document name",
  "description": "Brief description of what this document is",
  "required": true/false,
  "priority": "high"/"medium"/"low",
  "instructions": "How to obtain/prepare this document",
  "exampleUrl": "Optional URL to example or official source"
}

Only return the JSON object, no other text.`;

      const response = await AIOpenAIService.chat(
        [{ role: 'user', content: prompt }],
        'You are a visa document expert. Return only valid JSON objects.'
      );

      // Try to parse JSON from response
      try {
        const jsonMatch = response.message.match(/\{.*\}/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            name: parsed.name || this.formatDocumentName(documentType),
            description: parsed.description || `Required ${documentType} document`,
            required: parsed.required !== false,
            priority: normalizePriority(parsed.priority) || 'high',
            instructions: parsed.instructions,
            exampleUrl: parsed.exampleUrl,
          };
        }
      } catch {
        // Fallback
      }

      // Fallback
      return {
        name: this.formatDocumentName(documentType),
        description: `Required ${documentType} document for ${visaType.name} visa`,
        required: true,
        priority: 'high',
      };
    } catch (error) {
      logError('Error getting document details', error as Error);
      return {
        name: this.formatDocumentName(documentType),
        description: `Required ${documentType} document`,
        required: true,
        priority: 'high',
      };
    }
  }

  /**
   * Format document type name
   */
  private static formatDocumentName(documentType: string): string {
    return documentType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Merge checklist items with existing documents
   * Reusable helper for both generateChecklist and recalculateDocumentProgress
   *
   * Matches documents by documentType (stable key) to ensure uploaded documents
   * are always attached to the correct checklist items, even after regeneration.
   */
  private static mergeChecklistItemsWithDocuments(
    items: ChecklistItem[],
    existingDocumentsMap: Map<string, any>,
    applicationId?: string
  ): ChecklistItem[] {
    const documentsFound = existingDocumentsMap.size;
    let merged = 0;

    // Enhanced debug logging at start
    if (applicationId) {
      const normalizedMapKeys = Array.from(existingDocumentsMap.keys());
      const normalizedItemTypes = items.map((i) => (i.documentType || '').trim().toLowerCase());
      console.log('[CHECKLIST_MERGE_DEBUG_START]', {
        applicationId,
        documentsMapKeys: normalizedMapKeys,
        checklistItemTypes: normalizedItemTypes,
        documentsCount: existingDocumentsMap.size,
        itemCount: items.length,
      });
    }

    const mergedItems = items.map((item) => {
      // Normalize checklist item documentType for matching
      const normalizedItemType = (item.documentType || '').trim().toLowerCase();
      // Match by normalized documentType
      const doc = existingDocumentsMap.get(normalizedItemType);

      // Enhanced debug logging for each item
      if (applicationId) {
        console.log('[CHECKLIST_MERGE_DEBUG_ITEM]', {
          applicationId,
          checklistItemDocumentType: item.documentType,
          normalizedItemType,
          docFound: !!doc,
          docType: doc?.type,
          docStatus: doc?.status,
        });
      }

      if (doc) {
        merged++;
        if (applicationId) {
          console.log('[CHECKLIST_MERGE_DEBUG] Matched document', {
            applicationId,
            checklistItemDocumentType: item.documentType,
            documentDocumentType: doc.type,
            documentStatus: doc.status,
            documentId: doc.id,
          });
        }
        return {
          ...item,
          status: doc.status as any,
          userDocumentId: doc.id,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt?.toISOString(),
          verificationNotes: doc.aiNotesUz || doc.verificationNotes, // Prefer AI notes
          aiVerified: doc.verifiedByAI === true,
          aiConfidence: doc.aiConfidence || undefined,
        };
      }
      return item;
    });

    // Enhanced debug summary before existing log
    if (applicationId) {
      console.log('[CHECKLIST_MERGE_DEBUG_SUMMARY]', {
        applicationId,
        documentsFound,
        merged,
        unmatchedDocuments: documentsFound - merged,
        totalItems: items.length,
      });
    }

    // Log merge statistics for debugging
    if (applicationId) {
      logInfo('[Checklist][Merge] Document merge completed', {
        applicationId,
        documentsFound,
        merged,
        totalItems: items.length,
        unmatchedDocuments: documentsFound - merged,
      });
    }

    return mergedItems;
  }

  /**
   * Calculate document-based progress
   * Single source of truth for progress calculation
   * Formula: (verified required documents / total required documents) * 100
   */
  private static calculateDocumentProgress(items: ChecklistItem[]): number {
    const requiredItems = items.filter((item) => item.required);
    const completed = requiredItems.filter((item) => item.status === 'verified');
    return requiredItems.length > 0
      ? Math.round((completed.length / requiredItems.length) * 100)
      : 0;
  }

  /**
   * Recalculate document-based progress for an application
   * Used to update VisaApplication.progressPercentage after document uploads
   *
   * @param applicationId - Application ID
   * @returns Progress percentage (0-100)
   */
  static async recalculateDocumentProgress(applicationId: string): Promise<number> {
    try {
      // Get application with related data
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
          country: true,
          visaType: true,
          user: true,
          documents: true,
        },
      });

      if (!application) {
        throw errors.notFound('Application');
      }

      // Get existing documents with full data
      const existingDocumentsMap = new Map(
        application.documents.map((doc: any) => [
          doc.documentType,
          {
            type: doc.documentType,
            status: doc.status,
            id: doc.id,
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            uploadedAt: doc.uploadedAt,
            verificationNotes: doc.verificationNotes,
            verifiedByAI: doc.verifiedByAI ?? false,
            aiConfidence: doc.aiConfidence ?? null,
            aiNotesUz: doc.aiNotesUz ?? null,
            aiNotesRu: doc.aiNotesRu ?? null,
            aiNotesEn: doc.aiNotesEn ?? null,
          },
        ])
      );

      // CRITICAL FIX: Load existing checklist from DB instead of regenerating with AI
      // This avoids expensive OpenAI calls on every document upload
      let items: ChecklistItem[] = [];
      const storedChecklist = await prisma.documentChecklist.findUnique({
        where: { applicationId },
      });

      if (storedChecklist && storedChecklist.status === 'ready' && storedChecklist.checklistData) {
        // Use existing checklist - just parse and merge with documents
        logInfo('[DocumentProgress] Reusing existing checklist from DB', {
          applicationId,
          status: storedChecklist.status,
        });

        try {
          const checklistData = JSON.parse(storedChecklist.checklistData);
          // Handle both old format (array) and new format (object with items)
          items = Array.isArray(checklistData) ? checklistData : checklistData.items || [];

          if (items.length === 0) {
            logWarn('[DocumentProgress] Stored checklist has no items, will generate fallback', {
              applicationId,
            });
            throw new Error('Stored checklist has no items');
          }
        } catch (parseError: any) {
          logWarn('[DocumentProgress] Failed to parse stored checklist, using fallback', {
            applicationId,
            error: parseError?.message || String(parseError),
          });
          // Fall through to generate fallback
          items = [];
        }
      }

      // Only generate new checklist if one doesn't exist or is invalid
      if (items.length === 0) {
        logInfo('[DocumentProgress] No existing checklist found, generating fallback', {
          applicationId,
        });

        // Use fallback checklist generation (faster than AI, no OpenAI call)
        items = await this.generateRobustFallbackChecklist(
          application.country,
          application.visaType,
          Array.from(existingDocumentsMap.values()).map((doc: any) => ({
            type: doc.originalType || doc.type, // Use originalType if available for fallback
            status: doc.status,
            id: doc.id,
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            uploadedAt: doc.uploadedAt,
            verificationNotes: doc.verificationNotes,
            verifiedByAI: doc.verifiedByAI,
            aiConfidence: doc.aiConfidence,
            aiNotesUz: doc.aiNotesUz,
            aiNotesRu: doc.aiNotesRu,
            aiNotesEn: doc.aiNotesEn,
          }))
        );
      }

      // Merge with documents and sanitize terminology
      const enrichedItems = this.mergeChecklistItemsWithDocuments(
        items,
        existingDocumentsMap,
        applicationId
      );
      const sanitizedItems = this.applyCountryTerminology(
        enrichedItems,
        application.country,
        application.visaType.name
      );

      // Calculate progress using unified formula
      const progress = this.calculateDocumentProgress(sanitizedItems);

      logInfo('[DocumentProgress] Recalculated progress from documents', {
        applicationId,
        progress,
        totalRequired: sanitizedItems.filter((i) => i.required).length,
        verified: sanitizedItems.filter((i) => i.required && i.status === 'verified').length,
        usedExistingChecklist: storedChecklist?.status === 'ready',
      });

      return progress;
    } catch (error) {
      logError('[DocumentProgress] Failed to recalculate progress', error as Error, {
        applicationId,
      });
      throw error;
    }
  }

  private static applyCountryTerminology(
    items: ChecklistItem[],
    country: { code?: string | null; name?: string | null },
    visaTypeName: string
  ): ChecklistItem[] {
    const code = country?.code?.toUpperCase() || '';
    const countryName = (country?.name || '').toLowerCase();
    const isUnitedStates =
      code === 'US' || countryName.includes('united states') || countryName.includes('usa');
    const isCanada = code === 'CA' || countryName.includes('canada');
    const isStudentVisa = visaTypeName.toLowerCase().includes('student');

    return items.map((item) => {
      const searchable = [
        item.name,
        item.nameUz,
        item.nameRu,
        item.description,
        item.descriptionUz,
        item.descriptionRu,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const mentionsI20 = searchable.includes('i-20') || searchable.includes('i20');

      if (!isUnitedStates && mentionsI20) {
        return this.buildAcceptanceLetterItem(item, isCanada);
      }

      if (isCanada && isStudentVisa && item.documentType === 'acceptance_letter') {
        return this.buildAcceptanceLetterItem(item, true);
      }

      return item;
    });
  }

  private static buildAcceptanceLetterItem(
    item: ChecklistItem,
    preferCanadianLoa: boolean
  ): ChecklistItem {
    const nameEn = preferCanadianLoa
      ? 'Letter of Acceptance (LOA) from a Designated Learning Institution (DLI)'
      : 'Official Acceptance Letter from the admitting school';
    const nameUz = preferCanadianLoa
      ? 'Kanadadagi DLI tomonidan berilgan qabul xati (LOA)'
      : "Ta'lim muassasasidan rasmiy qabul xati";
    const nameRu = preferCanadianLoa
      ? 'Письмо о зачислении (LOA) от канадского учебного заведения из списка DLI'
      : 'Официальное письмо о зачислении от учебного заведения';

    const descriptionEn = preferCanadianLoa
      ? 'Provide the LOA issued by your Canadian DLI that lists the program, start date, DLI number, and student ID.'
      : 'Provide the official admission letter confirming your enrolment details.';
    const descriptionUz = preferCanadianLoa
      ? 'Kanadadagi DLI tomonidan berilgan LOA (dastur, boshlanish sanasi, DLI raqami, talaba ID) nusxasini yuklang.'
      : 'Qabul qilinganligingizni tasdiqlovchi rasmiy qabul xatini yuklang.';
    const descriptionRu = preferCanadianLoa
      ? 'Загрузите LOA от канадского DLI с указанием программы, даты начала, номера DLI и ID студента.'
      : 'Загрузите официальное письмо о зачислении с деталями программы.';

    const whereToObtainEn = preferCanadianLoa
      ? 'Request the LOA directly from the admissions office of your Canadian DLI and upload the original PDF or scan.'
      : 'Request this letter from the admissions/registrar office of the school that accepted you.';
    const whereToObtainUz = preferCanadianLoa
      ? "Kanadadagi DLI qabul bo'limidan LOA ni oling va PDF yoki skan nusxasini yuklang."
      : "Qabul qilgan ta'lim muassasasining qabul bo'limidan rasmiy qabul xatini so'rang va nusxasini yuklang.";
    const whereToObtainRu = preferCanadianLoa
      ? 'Получите LOA в приёмной комиссии канадского DLI и загрузите оригинальный PDF/скан.'
      : 'Запросите письмо о зачислении в приёмной комиссии выбранного учебного заведения и загрузите его копию.';

    return {
      ...item,
      documentType: 'acceptance_letter',
      name: nameEn,
      nameUz,
      nameRu,
      description: descriptionEn,
      descriptionUz,
      descriptionRu,
      whereToObtain: whereToObtainEn,
      whereToObtainUz,
      whereToObtainRu,
    };
  }

  /**
   * Update checklist item status
   */
  static async updateItemStatus(
    applicationId: string,
    itemId: string,
    status: ChecklistItem['status'],
    documentId?: string
  ): Promise<void> {
    // This would update the checklist in the database
    // For now, we'll track it in the application notes
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw errors.notFound('Application');
    }

    // Update document status if documentId provided
    if (documentId) {
      await prisma.userDocument.update({
        where: { id: documentId },
        data: { status },
      });
    }
  }
}
