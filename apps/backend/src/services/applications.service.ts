import { PrismaClient } from '@prisma/client';
import { errors } from '../utils/errors';
import { DocumentChecklistService } from './document-checklist.service';
import { logError, logInfo, logWarn } from '../middleware/logger';
import { chatService } from './chat.service';

const prisma = new PrismaClient();

export class ApplicationsService {
  /**
   * Ensure a canonical Application row exists for the given legacy VisaApplication id.
   * If missing, create a shadow Application that mirrors the legacy record and links via legacyVisaApplicationId.
   * Returns the Application row or null if legacy not found.
   */
  private static async ensureApplicationShadow(applicationId: string) {
    const existing = await prisma.application.findUnique({ where: { id: applicationId } });
    if (existing) {
      return existing;
    }

    const legacy = await prisma.visaApplication.findUnique({ where: { id: applicationId } });
    if (!legacy) {
      return null;
    }

    logWarn('[ApplicationsService] Creating shadow Application for legacy VisaApplication', {
      applicationId,
    });

    return prisma.application.create({
      data: {
        id: legacy.id,
        userId: legacy.userId,
        countryId: legacy.countryId,
        visaTypeId: legacy.visaTypeId,
        legacyVisaApplicationId: legacy.id,
        status: legacy.status,
        submissionDate: legacy.submissionDate,
        approvalDate: legacy.approvalDate,
        expiryDate: legacy.expiryDate,
        metadata: legacy.notes || null,
      },
    });
  }

  /**
   * Get all applications for a user
   */
  static async getUserApplications(userId: string) {
    const applications = await prisma.visaApplication.findMany({
      where: { userId },
      include: {
        country: true,
        visaType: true,
        checkpoints: {
          orderBy: { order: 'asc' },
        },
        documents: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      // Order by creation date ascending (oldest first)
      // This ensures applications appear in chronological order (first created = first in list)
      orderBy: {
        createdAt: 'asc',
      },
    });

    // HIGH PRIORITY FIX: Calculate progress based on documents first (primary source), then checkpoints (fallback)
    // Document-based progress is more accurate as it reflects actual document upload status
    // This ensures progress percentage correctly reflects document completion, not just checkpoint completion
    return Promise.all(
      applications.map(async (app: any) => {
        // Maintain canonical shadow for downstream services
        await this.ensureApplicationShadow(app.id);

      const allCheckpoints = app.checkpoints || [];
      const completedCount = allCheckpoints.filter((cp: any) => cp.isCompleted).length;
      const checkpointProgress =
        allCheckpoints.length > 0 ? Math.round((completedCount / allCheckpoints.length) * 100) : 0;

      // Calculate document-based progress (primary source of truth)
      // Count verified documents vs total required documents
      const documents = app.documents || [];
      const verifiedDocuments = documents.filter((doc: any) => doc.status === 'verified').length;
      const documentProgress =
        documents.length > 0 ? Math.round((verifiedDocuments / documents.length) * 100) : 0;

      // Use document progress if available, otherwise fallback to checkpoint progress
      // If app.progressPercentage exists in DB (from previous calculation), use it if higher
      const dbProgress =
        app.progressPercentage !== undefined && app.progressPercentage !== null
          ? app.progressPercentage
          : null;

      // Priority: documentProgress > dbProgress > checkpointProgress
      const progressPercentage =
        documentProgress > 0
          ? documentProgress
          : dbProgress !== null
            ? dbProgress
            : checkpointProgress;

        return {
          ...app,
          progressPercentage,
        };
      })
    );
  }

  /**
   * Get single application
   */
  static async getApplication(applicationId: string, userId: string) {
    await this.ensureApplicationShadow(applicationId);

    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: {
        country: true,
        visaType: true,
        checkpoints: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!application) {
      throw errors.notFound('Application');
    }

    // Verify ownership
    if (application.userId !== userId) {
      throw errors.forbidden();
    }

    return application;
  }

  /**
   * Create new visa application
   */
  static async createApplication(
    userId: string,
    data: {
      countryId: string;
      visaTypeId: string;
      notes?: string;
    }
  ) {
    // Verify country and visa type exist
    const country = await prisma.country.findUnique({
      where: { id: data.countryId },
    });

    if (!country) {
      throw errors.notFound('Country');
    }

    const visaType = await prisma.visaType.findUnique({
      where: { id: data.visaTypeId },
    });

    if (!visaType) {
      throw errors.notFound('Visa Type');
    }

    // Check if application already exists
    const existing = await prisma.visaApplication.findFirst({
      where: {
        userId,
        countryId: data.countryId,
        visaTypeId: data.visaTypeId,
        status: { in: ['draft', 'submitted'] },
      },
    });

    if (existing) {
      throw errors.conflict('Active application for this country already exists');
    }

    const application = await prisma.$transaction(async (tx) => {
      const legacy = await tx.visaApplication.create({
        data: {
          userId,
          countryId: data.countryId,
          visaTypeId: data.visaTypeId,
          status: 'draft',
          notes: data.notes,
          // Create default checkpoints based on visa type
          checkpoints: {
            create: [
              {
                order: 1,
                title: 'Application Started',
                description: 'Begin visa application process',
                isCompleted: true,
                completedAt: new Date(),
              },
              {
                order: 2,
                title: 'Document Preparation',
                description: 'Gather and prepare required documents',
                isCompleted: false,
              },
              {
                order: 3,
                title: 'Application Submission',
                description: 'Submit application to embassy',
                isCompleted: false,
              },
              {
                order: 4,
                title: 'Application Review',
                description: 'Embassy reviews application',
                isCompleted: false,
              },
              {
                order: 5,
                title: 'Visa Decision',
                description: 'Receive visa approval/rejection',
                isCompleted: false,
              },
            ],
          },
        },
        include: {
          country: true,
          visaType: true,
          checkpoints: true,
        },
      });

      // Shadow canonical Application (same id) for downstream services
      await tx.application.upsert({
        where: { id: legacy.id },
        update: {
          userId,
          countryId: data.countryId,
          visaTypeId: data.visaTypeId,
          status: 'draft',
          metadata: data.notes || null,
          legacyVisaApplicationId: legacy.id,
          submissionDate: null,
          approvalDate: null,
          expiryDate: null,
        },
        create: {
          id: legacy.id,
          userId,
          countryId: data.countryId,
          visaTypeId: data.visaTypeId,
          status: 'draft',
          metadata: data.notes || null,
          legacyVisaApplicationId: legacy.id,
        },
      });

      return legacy;
    });

    // Non-blocking: create chat session attached to this application
    try {
      // Explicitly bypass type narrowing to avoid build-time type resolution issues
      const service = chatService as any;
      await service.createSessionForApplication(
        userId,
        application.id,
        application.country,
        application.visaType
      );
      logInfo('[ApplicationsService] Chat session created for application', {
        applicationId: application.id,
        userId,
      });
    } catch (sessionError: any) {
      logWarn('[ApplicationsService] Failed to create chat session (non-blocking)', {
        applicationId: application.id,
        userId,
        error: sessionError instanceof Error ? sessionError.message : String(sessionError),
      });
    }

    return application;
  }

  /**
   * Update application status
   */
  static async updateApplicationStatus(applicationId: string, userId: string, status: string) {
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw errors.notFound('Application');
    }

    if (application.userId !== userId) {
      throw errors.forbidden();
    }

    const updated = await prisma.visaApplication.update({
      where: { id: applicationId },
      data: { status },
      include: {
        country: true,
        visaType: true,
        checkpoints: true,
      },
    });

    // Keep shadow Application in sync (best-effort)
    try {
      await this.ensureApplicationShadow(applicationId);
      await prisma.application.update({
        where: { id: applicationId },
        data: { status },
      });
    } catch (syncError) {
      logWarn('[ApplicationsService] Failed to sync Application status (non-blocking)', {
        applicationId,
        error: syncError instanceof Error ? syncError.message : String(syncError),
      });
    }

    return updated;
  }

  /**
   * Update application progress based on verified documents
   * This is called after document uploads to keep progressPercentage in sync with document status
   *
   * @param applicationId - Application ID
   */
  static async updateProgressFromDocuments(applicationId: string): Promise<void> {
    try {
      // Recalculate progress from documents using the same logic as checklist generation
      const documentProgress =
        await DocumentChecklistService.recalculateDocumentProgress(applicationId);

      // Option B: Keep checkpoint progress but ensure document progress is at least as high
      // Get current checkpoint progress
      const allCheckpoints = await prisma.checkpoint.findMany({
        where: { applicationId },
      });
      const completedCount = allCheckpoints.filter((c: any) => c.isCompleted).length;
      const checkpointProgress =
        allCheckpoints.length > 0 ? Math.round((completedCount / allCheckpoints.length) * 100) : 0;

      // Use max of both to ensure progress never goes backward
      const finalProgress = Math.max(checkpointProgress, documentProgress);

      await prisma.visaApplication.update({
        where: { id: applicationId },
        data: { progressPercentage: finalProgress },
      });

      logInfo('[DocumentProgress] Updated application progress from documents', {
        applicationId,
        documentProgress,
        checkpointProgress,
        finalProgress,
      });
    } catch (error) {
      logError('[DocumentProgress] Failed to update progress from documents', error as Error, {
        applicationId,
      });
      // Don't throw - this is non-blocking
    }
  }

  /**
   * Update checkpoint status
   */
  static async updateCheckpoint(
    applicationId: string,
    userId: string,
    checkpointId: string,
    isCompleted: boolean
  ) {
    // Verify application ownership
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw errors.notFound('Application');
    }

    if (application.userId !== userId) {
      throw errors.forbidden();
    }

    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id: checkpointId },
    });

    if (!checkpoint || checkpoint.applicationId !== applicationId) {
      throw errors.notFound('Checkpoint');
    }

    const updated = await prisma.checkpoint.update({
      where: { id: checkpointId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    // Update application progress (checkpoint-based)
    const allCheckpoints = await prisma.checkpoint.findMany({
      where: { applicationId },
    });

    const completedCount = allCheckpoints.filter((c: any): boolean => c.isCompleted).length;
    const checkpointProgress =
      allCheckpoints.length > 0 ? Math.round((completedCount / allCheckpoints.length) * 100) : 0;

    // Also get document-based progress and use max of both
    try {
      const documentProgress =
        await DocumentChecklistService.recalculateDocumentProgress(applicationId);
      const finalProgress = Math.max(checkpointProgress, documentProgress);

      await prisma.visaApplication.update({
        where: { id: applicationId },
        data: { progressPercentage: finalProgress },
      });
    } catch (error) {
      // If document progress calculation fails, just use checkpoint progress
      logError(
        '[DocumentProgress] Failed to recalc in updateCheckpoint, using checkpoint only',
        error as Error,
        {
          applicationId,
        }
      );
      await prisma.visaApplication.update({
        where: { id: applicationId },
        data: { progressPercentage: checkpointProgress },
      });
    }

    return updated;
  }

  /**
   * Delete application
   */
  static async deleteApplication(applicationId: string, userId: string) {
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw errors.notFound('Application');
    }

    if (application.userId !== userId) {
      throw errors.forbidden();
    }

    await prisma.$transaction(async (tx) => {
      await tx.visaApplication.delete({
        where: { id: applicationId },
      });

      // Delete shadow Application if exists
      const shadow = await tx.application.findUnique({ where: { id: applicationId } });
      if (shadow) {
        await tx.application.delete({ where: { id: applicationId } });
      }
    });

    return { success: true, message: 'Application deleted' };
  }
}
