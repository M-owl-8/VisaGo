/**
 * Document Checklist Service
 * AI-powered document checklist generation for visa applications
 */
// Change summary (2025-11-24): Added OpenAI latency warnings and enforced country-specific terminology (e.g., LOA vs I-20).

import { PrismaClient } from '@prisma/client';
import { getEnvConfig } from '../config/env';
import { errors } from '../utils/errors';
import { logError, logInfo, logWarn } from '../middleware/logger';
import AIOpenAIService from './ai-openai.service';
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

      let items: ChecklistItem[] = [];
      let aiGenerated = false;
      let aiFallbackUsed = false;
      let aiErrorOccurred = false;

      try {
        // Build AI user context with questionnaire summary
        const userContext = await buildAIUserContext(userId, applicationId);

        logInfo('[Checklist][AI] Requesting OpenAI checklist', {
          applicationId,
          country: application.country.name,
          visaType: application.visaType.name,
        });
        const aiStart = Date.now();

        // Call AI to generate checklist as primary source
        let aiChecklist: any = null;
        let aiError: Error | null = null;

        try {
          aiChecklist = await AIOpenAIService.generateChecklist(
            userContext,
            application.country.name,
            application.visaType.name
          );
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
            logWarn('[Checklist][AI] Weak AI result - too few items, using fallback', {
              applicationId,
              country: application.country.name,
              visaType: application.visaType.name,
              aiItemCount: items.length,
              reason: 'too_few_items',
              threshold: MIN_AI_ITEMS,
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
          logWarn('[Checklist][AI] AI returned empty or invalid checklist, using fallback', {
            applicationId,
            country: application.country.name,
            visaType: application.visaType.name,
            hasChecklist: !!aiChecklist,
            checklistLength: aiChecklist?.checklist?.length || 0,
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
        const existingDocumentsMap = new Map(
          (application.documents || []).map((doc: any) => [
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
    const existingDocumentsMap = new Map(
      documents.map((doc: any) => [
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
   * Generate robust fallback checklist with 7-10 items based on country/visa type
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
    const items: ChecklistItem[] = [];
    const countryName = (country?.name || '').toLowerCase();
    const countryCode = (country?.code || '').toUpperCase();
    const visaTypeName = (visaType?.name || '').toLowerCase();
    const isStudent = visaTypeName.includes('student') || visaTypeName.includes('study');
    const isTourist = visaTypeName.includes('tourist') || visaTypeName.includes('tourism');
    const isSchengen = [
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
    ].includes(countryCode);
    const isCanada = countryCode === 'CA';
    const isUnitedStates = countryCode === 'US';

    // Core documents (always included)
    const coreDocs = ['passport', 'passport_photo', 'visa_application_form', 'bank_statement'];

    // Additional documents based on visa type and country
    const additionalDocs: string[] = [];

    if (isStudent) {
      if (isCanada) {
        additionalDocs.push('acceptance_letter'); // LOA for Canada
      } else if (isUnitedStates) {
        additionalDocs.push('i20_form');
      } else {
        additionalDocs.push('acceptance_letter');
      }
      additionalDocs.push('academic_records', 'proof_of_tuition_payment');
    }

    if (isTourist || !isStudent) {
      additionalDocs.push('travel_itinerary', 'hotel_reservations');
    }

    // Country-specific additions
    if (isSchengen) {
      // Schengen requires travel medical insurance (use medical_certificate as proxy)
      additionalDocs.push('medical_certificate');
    }

    // Combine all document types
    const allDocTypes = [...coreDocs, ...additionalDocs];

    // Create checklist items
    for (let i = 0; i < allDocTypes.length; i++) {
      const docType = allDocTypes[i];
      const existingDoc = existingDocuments.find((d) => d.type === docType);
      const translation = getDocumentTranslation(docType);

      // Skip if translation not available (shouldn't happen, but safety check)
      if (!translation) {
        continue;
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
        required: true, // All fallback items are required
        priority: i < coreDocs.length ? 'high' : 'medium',
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

    const mergedItems = items.map((item) => {
      // Match by documentType (stable key, not AI-generated name)
      const doc = existingDocumentsMap.get(item.documentType);
      if (doc) {
        merged++;
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

      // Generate checklist items using same AI-first flow as generateChecklist
      let items: ChecklistItem[] = [];

      try {
        // Build AI user context with questionnaire summary
        const userContext = await buildAIUserContext(application.userId, applicationId);

        // Call AI to generate checklist as primary source
        const aiChecklist = await AIOpenAIService.generateChecklist(
          userContext,
          application.country.name,
          application.visaType.name
        );

        // Parse AI response into ChecklistItem[]
        if (
          aiChecklist.checklist &&
          Array.isArray(aiChecklist.checklist) &&
          aiChecklist.checklist.length > 0
        ) {
          items = aiChecklist.checklist.map((aiItem: any, index: number) => {
            const docType =
              aiItem.document ||
              aiItem.name?.toLowerCase().replace(/\s+/g, '_') ||
              `document_${index}`;
            const existingDoc = existingDocumentsMap.get(docType);

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
              status: existingDoc ? (existingDoc.status as any) : 'missing',
              userDocumentId: existingDoc?.id,
              fileUrl: existingDoc?.fileUrl,
              fileName: existingDoc?.fileName,
              fileSize: existingDoc?.fileSize,
              uploadedAt: existingDoc?.uploadedAt?.toISOString(),
              verificationNotes:
                existingDoc?.aiNotesUz || existingDoc?.verificationNotes || undefined,
              aiVerified: existingDoc?.verifiedByAI === true,
              aiConfidence: existingDoc?.aiConfidence || undefined,
            };
            return {
              ...item,
              category: aiItem.category ?? inferCategory(item),
            };
          });

          // Validate AI result - if too few items, use fallback
          const MIN_AI_ITEMS = 10; // Stricter minimum: 10 items required
          if (items.length < MIN_AI_ITEMS) {
            logWarn('[DocumentProgress] Weak AI result - too few items, using fallback', {
              applicationId,
              aiItemCount: items.length,
              reason: 'too_few_items',
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
          }
        } else {
          throw new Error('AI returned empty checklist');
        }
      } catch (aiError: any) {
        // Fallback to robust checklist if AI fails
        logWarn('[DocumentProgress] AI checklist generation failed, using fallback', {
          applicationId,
          reason: 'ai_error',
          errorMessage: aiError?.message || String(aiError),
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
