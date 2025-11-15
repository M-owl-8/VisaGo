/**
 * Document Checklist Service
 * AI-powered document checklist generation for visa applications
 */

import { PrismaClient } from "@prisma/client";
import { getEnvConfig } from "../config/env";
import { errors } from "../utils/errors";
import { logError, logInfo } from "../middleware/logger";
import AIOpenAIService from "./ai-openai.service";
import { getDocumentTranslation } from "../data/document-translations";

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
  priority: "high" | "medium" | "low";
  status: "missing" | "pending" | "verified" | "rejected";
  userDocumentId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  verificationNotes?: string;
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
        throw errors.notFound("Application");
      }

      // Verify ownership
      if (application.userId !== userId) {
        throw errors.forbidden();
      }

      // Get existing documents
      const existingDocuments = application.documents.map((doc) => ({
        type: doc.documentType,
        status: doc.status,
        id: doc.id,
      }));

      // Generate checklist items
      const items = await this.generateChecklistItems(
        application.country,
        application.visaType,
        application.user,
        existingDocuments
      );

      // Calculate progress
      const totalRequired = items.filter((item) => item.required).length;
      const completed = items.filter(
        (item) => item.status === "verified"
      ).length;
      const progress = totalRequired > 0 ? (completed / totalRequired) * 100 : 0;

      logInfo("Document checklist generated", {
        applicationId,
        totalItems: items.length,
        totalRequired,
        completed,
        progress,
      });

      return {
        applicationId,
        countryId: application.countryId,
        visaTypeId: application.visaTypeId,
        items,
        totalRequired,
        completed,
        progress,
        generatedAt: new Date().toISOString(),
        aiGenerated: true,
      };
    } catch (error) {
      logError("Error generating document checklist", error as Error, {
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
    existingDocuments: Array<{ type: string; status: string; id: string }>
  ): Promise<ChecklistItem[]> {
    const items: ChecklistItem[] = [];

    // Parse document types from visa type
    let documentTypes: string[] = [];
    try {
      documentTypes = JSON.parse(visaType.documentTypes || "[]");
    } catch {
      documentTypes = [];
    }

    // If no document types specified, use AI to generate them
    if (documentTypes.length === 0) {
      documentTypes = await this.generateDocumentTypesWithAI(
        country,
        visaType,
        user
      );
    }

    // Create checklist items
    for (let i = 0; i < documentTypes.length; i++) {
      const docType = documentTypes[i];
      const existing = existingDocuments.find((d) => d.type === docType);

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
        status: existing ? existing.status as any : "missing",
        userDocumentId: existing?.id,
      });
    }

    // Add common documents that might be needed
    const commonDocTypes = ["passport", "passport_photo"];

    // Add common docs if not already in list
    for (const docType of commonDocTypes) {
      if (!items.find((item) => item.documentType === docType)) {
        const existing = existingDocuments.find((d) => d.type === docType);
        const translation = getDocumentTranslation(docType);
        
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
          priority: "high" as const,
          status: existing ? (existing.status as any) : "missing",
          userDocumentId: existing?.id,
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
        return ["passport", "photo", "application_form", "financial_proof"];
      }

      const prompt = `You are a visa application expert. List the required documents for a ${visaType.name} visa application to ${country.name}.

User nationality: ${user.firstName || "Unknown"} (if available)

Provide a JSON array of document type names (e.g., ["passport", "photo", "bank_statement", "invitation_letter"]).
Only return the JSON array, no other text.`;

      const response = await AIOpenAIService.chat(
        [{ role: "user", content: prompt }],
        "You are a visa document expert. Return only valid JSON arrays."
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
      return ["passport", "photo", "application_form", "financial_proof"];
    } catch (error) {
      logError("Error generating document types with AI", error as Error);
      // Fallback to common documents
      return ["passport", "photo", "application_form", "financial_proof"];
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
    priority: "high" | "medium" | "low";
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
          priority: "high",
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
        [{ role: "user", content: prompt }],
        "You are a visa document expert. Return only valid JSON objects."
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
            priority: parsed.priority || "high",
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
        priority: "high",
      };
    } catch (error) {
      logError("Error getting document details", error as Error);
      return {
        name: this.formatDocumentName(documentType),
        description: `Required ${documentType} document`,
        required: true,
        priority: "high",
      };
    }
  }

  /**
   * Format document type name
   */
  private static formatDocumentName(documentType: string): string {
    return documentType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Update checklist item status
   */
  static async updateItemStatus(
    applicationId: string,
    itemId: string,
    status: ChecklistItem["status"],
    documentId?: string
  ): Promise<void> {
    // This would update the checklist in the database
    // For now, we'll track it in the application notes
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw errors.notFound("Application");
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

