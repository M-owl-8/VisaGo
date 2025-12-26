/**
 * Document Catalog Service
 * Provides access to the global document catalog
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DocumentCatalogService {
  private static cache = new Map<string, { value: any; expires: number }>();
  private static cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  private static getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.value as T;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCache<T>(key: string, value: T) {
    this.cache.set(key, { value, expires: Date.now() + this.cacheTTL });
  }

  /**
   * Get all active documents from the catalog
   */
  static async getAllActive() {
    const cacheKey = 'documentCatalog:allActive';
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const docs = await prisma.documentCatalog.findMany({
      where: { isActive: true },
      orderBy: { documentType: 'asc' },
    });

    this.setCache(cacheKey, docs);
    return docs;
  }

  /**
   * Get a document by its documentType
   */
  static async getByDocumentType(documentType: string) {
    const cacheKey = `documentCatalog:type:${documentType}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const doc = await prisma.documentCatalog.findUnique({
      where: { documentType },
    });
    if (doc) this.setCache(cacheKey, doc);
    return doc;
  }

  /**
   * Get a document by its ID
   */
  static async getById(id: string) {
    const cacheKey = `documentCatalog:id:${id}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const doc = await prisma.documentCatalog.findUnique({
      where: { id },
    });
    if (doc) this.setCache(cacheKey, doc);
    return doc;
  }
}
