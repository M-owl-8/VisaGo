import { db as prisma } from '../db';

export interface ActivityLogFilters {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminLogFilters {
  page?: number;
  pageSize?: number;
  entityType?: string;
  action?: string;
  performedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AIInteractionFilters {
  page?: number;
  pageSize?: number;
  taskType?: string;
  model?: string;
  userId?: string;
  applicationId?: string;
  countryCode?: string;
  dateFrom?: string;
  dateTo?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminActionLogInput {
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  reason?: string;
  changes?: Record<string, any>;
}

class AdminLogService {
  /**
   * Get activity logs with pagination and filters
   */
  async getActivityLogs(filters: ActivityLogFilters): Promise<PaginatedResponse<any>> {
    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        userId: item.userId,
        user: item.user,
        action: item.action,
        details: item.details ? JSON.parse(item.details) : null,
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        createdAt: item.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get admin logs with pagination and filters
   */
  async getAdminLogs(filters: AdminLogFilters): Promise<PaginatedResponse<any>> {
    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.performedBy) {
      where.performedBy = filters.performedBy;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const [items, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.adminLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        changes: item.changes ? JSON.parse(item.changes) : null,
        performedBy: item.performedBy,
        reason: item.reason,
        createdAt: item.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get AI interactions with pagination and filters
   */
  async getAIInteractions(filters: AIInteractionFilters): Promise<PaginatedResponse<any>> {
    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters.taskType) {
      where.taskType = filters.taskType;
    }

    if (filters.model) {
      where.model = filters.model;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.applicationId) {
      where.applicationId = filters.applicationId;
    }

    if (filters.countryCode) {
      where.countryCode = filters.countryCode;
    }

    if (filters.success !== undefined) {
      where.success = filters.success;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const [items, total] = await Promise.all([
      prisma.aIInteraction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.aIInteraction.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        taskType: item.taskType,
        model: item.model,
        promptVersion: item.promptVersion,
        source: item.source,
        requestPayload: item.requestPayload,
        responsePayload: item.responsePayload,
        success: item.success,
        errorMessage: item.errorMessage,
        countryCode: item.countryCode,
        visaType: item.visaType,
        ruleSetId: item.ruleSetId,
        applicationId: item.applicationId,
        userId: item.userId,
        modelVersionId: item.modelVersionId,
        latencyMs: item.latencyMs,
        createdAt: item.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Record an admin action for audit purposes.
   */
  async recordAdminAction(input: AdminActionLogInput): Promise<void> {
    const { action, entityType, entityId, performedBy, reason, changes } = input;

    await prisma.adminLog.create({
      data: {
        action,
        entityType,
        entityId,
        performedBy,
        reason,
        changes: changes ? JSON.stringify(changes) : null,
      },
    });
  }
}

export default new AdminLogService();
