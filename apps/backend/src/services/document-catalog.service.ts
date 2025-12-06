/**
 * Document Catalog Service
 * Provides access to the global document catalog
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DocumentCatalogService {
  /**
   * Get all active documents from the catalog
   */
  static async getAllActive() {
    return prisma.documentCatalog.findMany({
      where: { isActive: true },
      orderBy: { documentType: 'asc' },
    });
  }

  /**
   * Get a document by its documentType
   */
  static async getByDocumentType(documentType: string) {
    return prisma.documentCatalog.findUnique({
      where: { documentType },
    });
  }

  /**
   * Get a document by its ID
   */
  static async getById(id: string) {
    return prisma.documentCatalog.findUnique({
      where: { id },
    });
  }
}
