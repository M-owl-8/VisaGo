"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsService = void 0;
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
const document_checklist_service_1 = require("./document-checklist.service");
const logger_1 = require("../middleware/logger");
const prisma = new client_1.PrismaClient();
class ApplicationsService {
    /**
     * Get all applications for a user
     */
    static async getUserApplications(userId) {
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
        return applications.map((app) => {
            const allCheckpoints = app.checkpoints || [];
            const completedCount = allCheckpoints.filter((cp) => cp.isCompleted).length;
            const checkpointProgress = allCheckpoints.length > 0 ? Math.round((completedCount / allCheckpoints.length) * 100) : 0;
            // Calculate document-based progress (primary source of truth)
            // Count verified documents vs total required documents
            const documents = app.documents || [];
            const verifiedDocuments = documents.filter((doc) => doc.status === 'verified').length;
            const documentProgress = documents.length > 0 ? Math.round((verifiedDocuments / documents.length) * 100) : 0;
            // Use document progress if available, otherwise fallback to checkpoint progress
            // If app.progressPercentage exists in DB (from previous calculation), use it if higher
            const dbProgress = app.progressPercentage !== undefined && app.progressPercentage !== null
                ? app.progressPercentage
                : null;
            // Priority: documentProgress > dbProgress > checkpointProgress
            const progressPercentage = documentProgress > 0
                ? documentProgress
                : dbProgress !== null
                    ? dbProgress
                    : checkpointProgress;
            return {
                ...app,
                progressPercentage,
            };
        });
    }
    /**
     * Get single application
     */
    static async getApplication(applicationId, userId) {
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
            throw errors_1.errors.notFound('Application');
        }
        // Verify ownership
        if (application.userId !== userId) {
            throw errors_1.errors.forbidden();
        }
        return application;
    }
    /**
     * Create new visa application
     */
    static async createApplication(userId, data) {
        // Verify country and visa type exist
        const country = await prisma.country.findUnique({
            where: { id: data.countryId },
        });
        if (!country) {
            throw errors_1.errors.notFound('Country');
        }
        const visaType = await prisma.visaType.findUnique({
            where: { id: data.visaTypeId },
        });
        if (!visaType) {
            throw errors_1.errors.notFound('Visa Type');
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
            throw errors_1.errors.conflict('Active application for this country already exists');
        }
        const application = await prisma.visaApplication.create({
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
        // Ensure canonical Application row exists (shadow) with legacy mapping
        await prisma.application.upsert({
            where: { id: application.id },
            update: {
                userId,
                countryId: data.countryId,
                visaTypeId: data.visaTypeId,
                status: 'draft',
                metadata: data.notes || null,
                legacyVisaApplicationId: application.id,
            },
            create: {
                id: application.id,
                userId,
                countryId: data.countryId,
                visaTypeId: data.visaTypeId,
                status: 'draft',
                metadata: data.notes || null,
                legacyVisaApplicationId: application.id,
            },
        });
        return application;
    }
    /**
     * Update application status
     */
    static async updateApplicationStatus(applicationId, userId, status) {
        const application = await prisma.visaApplication.findUnique({
            where: { id: applicationId },
        });
        if (!application) {
            throw errors_1.errors.notFound('Application');
        }
        if (application.userId !== userId) {
            throw errors_1.errors.forbidden();
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
        return updated;
    }
    /**
     * Update application progress based on verified documents
     * This is called after document uploads to keep progressPercentage in sync with document status
     *
     * @param applicationId - Application ID
     */
    static async updateProgressFromDocuments(applicationId) {
        try {
            // Recalculate progress from documents using the same logic as checklist generation
            const documentProgress = await document_checklist_service_1.DocumentChecklistService.recalculateDocumentProgress(applicationId);
            // Option B: Keep checkpoint progress but ensure document progress is at least as high
            // Get current checkpoint progress
            const allCheckpoints = await prisma.checkpoint.findMany({
                where: { applicationId },
            });
            const completedCount = allCheckpoints.filter((c) => c.isCompleted).length;
            const checkpointProgress = allCheckpoints.length > 0 ? Math.round((completedCount / allCheckpoints.length) * 100) : 0;
            // Use max of both to ensure progress never goes backward
            const finalProgress = Math.max(checkpointProgress, documentProgress);
            await prisma.visaApplication.update({
                where: { id: applicationId },
                data: { progressPercentage: finalProgress },
            });
            (0, logger_1.logInfo)('[DocumentProgress] Updated application progress from documents', {
                applicationId,
                documentProgress,
                checkpointProgress,
                finalProgress,
            });
        }
        catch (error) {
            (0, logger_1.logError)('[DocumentProgress] Failed to update progress from documents', error, {
                applicationId,
            });
            // Don't throw - this is non-blocking
        }
    }
    /**
     * Update checkpoint status
     */
    static async updateCheckpoint(applicationId, userId, checkpointId, isCompleted) {
        // Verify application ownership
        const application = await prisma.visaApplication.findUnique({
            where: { id: applicationId },
        });
        if (!application) {
            throw errors_1.errors.notFound('Application');
        }
        if (application.userId !== userId) {
            throw errors_1.errors.forbidden();
        }
        const checkpoint = await prisma.checkpoint.findUnique({
            where: { id: checkpointId },
        });
        if (!checkpoint || checkpoint.applicationId !== applicationId) {
            throw errors_1.errors.notFound('Checkpoint');
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
        const completedCount = allCheckpoints.filter((c) => c.isCompleted).length;
        const checkpointProgress = allCheckpoints.length > 0 ? Math.round((completedCount / allCheckpoints.length) * 100) : 0;
        // Also get document-based progress and use max of both
        try {
            const documentProgress = await document_checklist_service_1.DocumentChecklistService.recalculateDocumentProgress(applicationId);
            const finalProgress = Math.max(checkpointProgress, documentProgress);
            await prisma.visaApplication.update({
                where: { id: applicationId },
                data: { progressPercentage: finalProgress },
            });
        }
        catch (error) {
            // If document progress calculation fails, just use checkpoint progress
            (0, logger_1.logError)('[DocumentProgress] Failed to recalc in updateCheckpoint, using checkpoint only', error, {
                applicationId,
            });
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
    static async deleteApplication(applicationId, userId) {
        const application = await prisma.visaApplication.findUnique({
            where: { id: applicationId },
        });
        if (!application) {
            throw errors_1.errors.notFound('Application');
        }
        if (application.userId !== userId) {
            throw errors_1.errors.forbidden();
        }
        await prisma.visaApplication.delete({
            where: { id: applicationId },
        });
        return { success: true, message: 'Application deleted' };
    }
}
exports.ApplicationsService = ApplicationsService;
//# sourceMappingURL=applications.service.js.map