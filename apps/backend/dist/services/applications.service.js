"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsService = void 0;
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
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
                    orderBy: { order: "asc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return applications;
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
                    orderBy: { order: "asc" },
                },
            },
        });
        if (!application) {
            throw errors_1.errors.notFound("Application");
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
            throw errors_1.errors.notFound("Country");
        }
        const visaType = await prisma.visaType.findUnique({
            where: { id: data.visaTypeId },
        });
        if (!visaType) {
            throw errors_1.errors.notFound("Visa Type");
        }
        // Check if application already exists
        const existing = await prisma.visaApplication.findFirst({
            where: {
                userId,
                countryId: data.countryId,
                visaTypeId: data.visaTypeId,
                status: { in: ["draft", "submitted"] },
            },
        });
        if (existing) {
            throw errors_1.errors.conflict("Active application for this country already exists");
        }
        const application = await prisma.visaApplication.create({
            data: {
                userId,
                countryId: data.countryId,
                visaTypeId: data.visaTypeId,
                status: "draft",
                notes: data.notes,
                // Create default checkpoints based on visa type
                checkpoints: {
                    create: [
                        {
                            order: 1,
                            title: "Application Started",
                            description: "Begin visa application process",
                            isCompleted: true,
                            completedAt: new Date(),
                        },
                        {
                            order: 2,
                            title: "Document Preparation",
                            description: "Gather and prepare required documents",
                            isCompleted: false,
                        },
                        {
                            order: 3,
                            title: "Application Submission",
                            description: "Submit application to embassy",
                            isCompleted: false,
                        },
                        {
                            order: 4,
                            title: "Application Review",
                            description: "Embassy reviews application",
                            isCompleted: false,
                        },
                        {
                            order: 5,
                            title: "Visa Decision",
                            description: "Receive visa approval/rejection",
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
            throw errors_1.errors.notFound("Application");
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
     * Update checkpoint status
     */
    static async updateCheckpoint(applicationId, userId, checkpointId, isCompleted) {
        // Verify application ownership
        const application = await prisma.visaApplication.findUnique({
            where: { id: applicationId },
        });
        if (!application) {
            throw errors_1.errors.notFound("Application");
        }
        if (application.userId !== userId) {
            throw errors_1.errors.forbidden();
        }
        const checkpoint = await prisma.checkpoint.findUnique({
            where: { id: checkpointId },
        });
        if (!checkpoint || checkpoint.applicationId !== applicationId) {
            throw errors_1.errors.notFound("Checkpoint");
        }
        const updated = await prisma.checkpoint.update({
            where: { id: checkpointId },
            data: {
                isCompleted,
                completedAt: isCompleted ? new Date() : null,
            },
        });
        // Update application progress
        const allCheckpoints = await prisma.checkpoint.findMany({
            where: { applicationId },
        });
        const completedCount = allCheckpoints.filter((c) => c.isCompleted).length;
        const progressPercentage = Math.round((completedCount / allCheckpoints.length) * 100);
        await prisma.visaApplication.update({
            where: { id: applicationId },
            data: { progressPercentage },
        });
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
            throw errors_1.errors.notFound("Application");
        }
        if (application.userId !== userId) {
            throw errors_1.errors.forbidden();
        }
        await prisma.visaApplication.delete({
            where: { id: applicationId },
        });
        return { success: true, message: "Application deleted" };
    }
}
exports.ApplicationsService = ApplicationsService;
//# sourceMappingURL=applications.service.js.map