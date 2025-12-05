/**
 * Embassy Source Service
 * Manages embassy/consulate source URLs for visa rules extraction
 */

import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';

const prisma = new PrismaClient();

/**
 * Embassy Source Service
 */
export class EmbassySourceService {
  /**
   * List all sources with optional filtering
   */
  static async listSources(filters?: {
    countryCode?: string;
    visaType?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = {};

      if (filters?.countryCode) {
        where.countryCode = filters.countryCode.toUpperCase();
      }
      if (filters?.visaType) {
        where.visaType = filters.visaType.toLowerCase();
      }
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const [sources, total] = await Promise.all([
        prisma.embassySource.findMany({
          where,
          orderBy: [
            { priority: 'desc' },
            { countryCode: 'asc' },
            { visaType: 'asc' },
            { createdAt: 'desc' },
          ],
          take: filters?.limit || 100,
          skip: filters?.offset || 0,
        }),
        prisma.embassySource.count({ where }),
      ]);

      return {
        sources,
        total,
        limit: filters?.limit || 100,
        offset: filters?.offset || 0,
      };
    } catch (error) {
      logError('[EmbassySource] Error listing sources', error as Error, filters);
      throw error;
    }
  }

  /**
   * Get source by ID
   */
  static async getSourceById(sourceId: string) {
    try {
      const source = await prisma.embassySource.findUnique({
        where: { id: sourceId },
        include: {
          ruleSets: {
            orderBy: { version: 'desc' },
            take: 5, // Last 5 rule sets from this source
          },
        },
      });

      return source;
    } catch (error) {
      logError('[EmbassySource] Error getting source by ID', error as Error, {
        sourceId,
      });
      throw error;
    }
  }

  /**
   * Add a new embassy source
   */
  static async addSource(params: {
    countryCode: string;
    visaType: string;
    url: string;
    name?: string;
    description?: string;
    priority?: number;
    fetchInterval?: number;
    metadata?: any;
  }) {
    try {
      const source = await prisma.embassySource.create({
        data: {
          countryCode: params.countryCode.toUpperCase(),
          visaType: params.visaType.toLowerCase(),
          url: params.url,
          name: params.name || `${params.countryCode} ${params.visaType} - ${params.url}`,
          description: params.description,
          priority: params.priority || 0,
          fetchInterval: params.fetchInterval || 86400, // 24 hours
          metadata: params.metadata as any,
          isActive: true,
        },
      });

      logInfo('[EmbassySource] Source added', {
        id: source.id,
        countryCode: source.countryCode,
        visaType: source.visaType,
        url: source.url,
      });

      return source;
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        logWarn('[EmbassySource] Source already exists', {
          countryCode: params.countryCode,
          visaType: params.visaType,
          url: params.url,
        });
        throw new Error('Source with this country, visa type, and URL already exists');
      }

      logError('[EmbassySource] Error adding source', error as Error, params);
      throw error;
    }
  }

  /**
   * Update source status
   */
  static async updateSourceStatus(
    sourceId: string,
    updates: {
      isActive?: boolean;
      lastFetchedAt?: Date;
      lastStatus?: 'success' | 'failed' | 'pending';
      lastError?: string | null;
    }
  ) {
    try {
      const source = await prisma.embassySource.update({
        where: { id: sourceId },
        data: {
          ...updates,
          lastFetchedAt: updates.lastFetchedAt || undefined,
        },
      });

      logInfo('[EmbassySource] Source status updated', {
        sourceId,
        updates,
      });

      return source;
    } catch (error) {
      logError('[EmbassySource] Error updating source status', error as Error, {
        sourceId,
        updates,
      });
      throw error;
    }
  }

  /**
   * Get all active sources that need to be fetched
   * (sources that haven't been fetched recently or have failed)
   * 
   * CHANGED: Now properly checks each source's fetchInterval instead of hardcoded 24 hours
   */
  static async getSourcesNeedingFetch(): Promise<
    Array<{
      id: string;
      countryCode: string;
      visaType: string;
      url: string;
      name: string | null;
      priority: number;
      metadata: any;
      fetchInterval: number;
    }>
  > {
    try {
      const now = new Date();
      
      // First, get all active sources
      const allSources = await prisma.embassySource.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          countryCode: true,
          visaType: true,
          url: true,
          name: true,
          priority: true,
          metadata: true,
          fetchInterval: true,
          lastFetchedAt: true,
          lastStatus: true,
        },
        orderBy: [
          { priority: 'desc' },
          { lastFetchedAt: 'asc' }, // Fetch oldest first
        ],
      });

      // Filter sources that need fetching based on their individual fetchInterval
      const sourcesNeedingFetch = allSources.filter((source) => {
        // Never fetched - always needs fetch
        if (source.lastFetchedAt === null) {
          return true;
        }

        // Last fetch failed - always retry
        if (source.lastStatus === 'failed') {
          return true;
        }

        // Check if last fetch was more than fetchInterval seconds ago
        const fetchIntervalMs = source.fetchInterval * 1000; // Convert seconds to milliseconds
        const timeSinceLastFetch = now.getTime() - source.lastFetchedAt.getTime();
        
        return timeSinceLastFetch >= fetchIntervalMs;
      });

      logInfo('[EmbassySource] Found sources needing fetch', {
        total: allSources.length,
        needingFetch: sourcesNeedingFetch.length,
      });

      // Return only the fields needed for job enqueueing
      return sourcesNeedingFetch.map((source) => ({
        id: source.id,
        countryCode: source.countryCode,
        visaType: source.visaType,
        url: source.url,
        name: source.name,
        priority: source.priority,
        metadata: source.metadata,
        fetchInterval: source.fetchInterval,
      }));
    } catch (error) {
      logError('[EmbassySource] Error getting sources needing fetch', error as Error);
      throw error;
    }
  }

  /**
   * Delete a source (soft delete by setting isActive = false)
   */
  static async deleteSource(sourceId: string) {
    try {
      const source = await prisma.embassySource.update({
        where: { id: sourceId },
        data: { isActive: false },
      });

      logInfo('[EmbassySource] Source deactivated', { sourceId });

      return source;
    } catch (error) {
      logError('[EmbassySource] Error deleting source', error as Error, {
        sourceId,
      });
      throw error;
    }
  }

  /**
   * Update source metadata
   */
  static async updateSource(
    sourceId: string,
    updates: {
      name?: string;
      description?: string;
      url?: string;
      priority?: number;
      fetchInterval?: number;
      metadata?: any;
    }
  ) {
    try {
      const source = await prisma.embassySource.update({
        where: { id: sourceId },
        data: updates,
      });

      logInfo('[EmbassySource] Source updated', { sourceId, updates });

      return source;
    } catch (error) {
      logError('[EmbassySource] Error updating source', error as Error, {
        sourceId,
        updates,
      });
      throw error;
    }
  }
}

