/**
 * Document Checklist Service
 * AI-powered document checklist generation for visa applications
 */

import { PrismaClient } from '@prisma/client';
import { getEnvConfig } from '../config/env';
import { errors } from '../utils/errors';
import { logError, logInfo } from '../middleware/logger';
import AIOpenAIService from './ai-openai.service';
import { getDocumentTranslation } from '../data/document-translations';
import { buildAIUserContext } from './ai-context.service';

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
  required: boolean;
  priority: 'high' | 'medium' | 'low';
  status: 'missing' | 'pending' | 'verified' | 'rejected';
  userDocumentId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  verificationNotes?: string;
  aiVerified?: boolean;
  aiConfidence?: number;
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
}

/**
 * Document Checklist Service
 * Generates AI-powered document checklists
 */
export class DocumentChecklistService {
  /**
   * Generate document checklist for an application
   *
   * @param applicationId - Application ID
   * @param userId - User ID (for verification)
   * @returns Document checklist
   */
  static async generateChecklist(
    applicationId: string,
    userId: string
  ): Promise<DocumentChecklist> {
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

      // Verify ownership
      if (application.userId !== userId) {
        throw errors.forbidden();
      }

      // Get existing documents with full data for AI verification
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

      // Generate checklist items - AI-first approach
      let items: ChecklistItem[] = [];
      let aiGenerated = false;

      try {
        // Build AI user context with questionnaire summary
        const userContext = await buildAIUserContext(userId, applicationId);

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

            return {
              id: `checklist-item-${index}`,
              documentType: docType,
              name: aiItem.name || aiItem.document || 'Unknown Document',
              nameUz: aiItem.nameUz || aiItem.name || aiItem.document || "Noma'lum hujjat",
              nameRu: aiItem.nameRu || aiItem.name || aiItem.document || 'Неизвестный документ',
              description: aiItem.description || '',
              descriptionUz: aiItem.descriptionUz || aiItem.description || '',
              descriptionRu: aiItem.descriptionRu || aiItem.description || '',
              required: aiItem.required !== undefined ? aiItem.required : true,
              priority: (aiItem.priority || (aiItem.required ? 'high' : 'medium')) as
                | 'high'
                | 'medium'
                | 'low',
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
          });

          aiGenerated = true;
          logInfo('[Checklist][AI] Using AI-generated checklist', {
            applicationId,
            itemCount: items.length,
            country: application.country.name,
            visaType: application.visaType.name,
          });
        } else {
          throw new Error('AI returned empty checklist');
        }
      } catch (aiError: any) {
        // Fallback to static documentTypes if AI fails
        logError('[Checklist][AI] Failed, falling back to static documentTypes', aiError as Error, {
          applicationId,
          country: application.country.name,
          visaType: application.visaType.name,
        });

        items = await this.generateChecklistItems(
          application.country,
          application.visaType,
          application.user,
          Array.from(existingDocumentsMap.values())
        );
      }

      // Merge full document data including AI verification (if not already done by AI path)
      const enrichedItems = this.mergeChecklistItemsWithDocuments(items, existingDocumentsMap);

      // Calculate progress using unified formula
      const progress = this.calculateDocumentProgress(enrichedItems);
      const totalRequired = enrichedItems.filter((item) => item.required).length;
      const completed = enrichedItems.filter(
        (item) => item.required && item.status === 'verified'
      ).length;

      logInfo('Document checklist generated', {
        applicationId,
        totalItems: enrichedItems.length,
        totalRequired,
        completed,
        progress,
        aiGenerated,
      });

      return {
        applicationId,
        countryId: application.countryId,
        visaTypeId: application.visaTypeId,
        items: enrichedItems,
        totalRequired,
        completed,
        progress,
        generatedAt: new Date().toISOString(),
        aiGenerated,
      };
    } catch (error) {
      logError('Error generating document checklist', error as Error, {
        applicationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate checklist items using AI and visa requirements
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

      items.push({
        id: `checklist-item-${i}`,
        documentType: docType,
        name: translation.nameEn,
        nameUz: translation.nameUz,
        nameRu: translation.nameRu,
        description: translation.descriptionEn,
        descriptionUz: translation.descriptionUz,
        descriptionRu: translation.descriptionRu,
        required: details.required,
        priority: details.priority,
        status: existingDoc ? (existingDoc.status as any) : 'missing',
        userDocumentId: existingDoc?.id,
        fileUrl: existingDoc?.fileUrl,
        fileName: existingDoc?.fileName,
        fileSize: existingDoc?.fileSize,
        uploadedAt: existingDoc?.uploadedAt?.toISOString(),
        verificationNotes: existingDoc?.aiNotesUz || existingDoc?.verificationNotes || undefined,
        aiVerified: existingDoc?.verifiedByAI === true,
        aiConfidence: existingDoc?.aiConfidence || undefined,
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

        items.push({
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
            priority: parsed.priority || 'high',
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
   */
  private static mergeChecklistItemsWithDocuments(
    items: ChecklistItem[],
    existingDocumentsMap: Map<string, any>
  ): ChecklistItem[] {
    return items.map((item) => {
      const doc = existingDocumentsMap.get(item.documentType);
      if (doc) {
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

            return {
              id: `checklist-item-${index}`,
              documentType: docType,
              name: aiItem.name || aiItem.document || 'Unknown Document',
              nameUz: aiItem.nameUz || aiItem.name || aiItem.document || "Noma'lum hujjat",
              nameRu: aiItem.nameRu || aiItem.name || aiItem.document || 'Неизвестный документ',
              description: aiItem.description || '',
              descriptionUz: aiItem.descriptionUz || aiItem.description || '',
              descriptionRu: aiItem.descriptionRu || aiItem.description || '',
              required: aiItem.required !== undefined ? aiItem.required : true,
              priority: (aiItem.priority || (aiItem.required ? 'high' : 'medium')) as
                | 'high'
                | 'medium'
                | 'low',
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
          });
        } else {
          throw new Error('AI returned empty checklist');
        }
      } catch (aiError: any) {
        // Fallback to static documentTypes if AI fails
        logError(
          '[DocumentProgress] AI checklist generation failed, using fallback',
          aiError as Error,
          {
            applicationId,
          }
        );

        items = await this.generateChecklistItems(
          application.country,
          application.visaType,
          application.user,
          Array.from(existingDocumentsMap.values())
        );
      }

      // Merge with documents
      const enrichedItems = this.mergeChecklistItemsWithDocuments(items, existingDocumentsMap);

      // Calculate progress using unified formula
      const progress = this.calculateDocumentProgress(enrichedItems);

      logInfo('[DocumentProgress] Recalculated progress from documents', {
        applicationId,
        progress,
        totalRequired: enrichedItems.filter((i) => i.required).length,
        verified: enrichedItems.filter((i) => i.required && i.status === 'verified').length,
      });

      return progress;
    } catch (error) {
      logError('[DocumentProgress] Failed to recalculate progress', error as Error, {
        applicationId,
      });
      throw error;
    }
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
