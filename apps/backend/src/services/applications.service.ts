import { PrismaClient } from "@prisma/client";
import { errors } from "../utils/errors";

const prisma = new PrismaClient();

export class ApplicationsService {
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
          orderBy: { order: "asc" },
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
        createdAt: "asc",
      },
    });

    // Calculate progress percentage for each application
    return applications.map((app: any) => {
      const allCheckpoints = app.checkpoints || [];
      const completedCount = allCheckpoints.filter((cp: any) => cp.isCompleted).length;
      const progressPercentage = allCheckpoints.length > 0
        ? Math.round((completedCount / allCheckpoints.length) * 100)
        : 0;

      return {
        ...app,
        progressPercentage,
      };
    });
  }

  /**
   * Get single application
   */
  static async getApplication(applicationId: string, userId: string) {
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
      throw errors.notFound("Application");
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
      throw errors.notFound("Country");
    }

    const visaType = await prisma.visaType.findUnique({
      where: { id: data.visaTypeId },
    });

    if (!visaType) {
      throw errors.notFound("Visa Type");
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
      throw errors.conflict("Active application for this country already exists");
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
  static async updateApplicationStatus(
    applicationId: string,
    userId: string,
    status: string
  ) {
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw errors.notFound("Application");
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

    return updated;
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
      throw errors.notFound("Application");
    }

    if (application.userId !== userId) {
      throw errors.forbidden();
    }

    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id: checkpointId },
    });

    if (!checkpoint || checkpoint.applicationId !== applicationId) {
      throw errors.notFound("Checkpoint");
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

    const completedCount = allCheckpoints.filter((c: any): boolean => c.isCompleted).length;
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
  static async deleteApplication(applicationId: string, userId: string) {
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw errors.notFound("Application");
    }

    if (application.userId !== userId) {
      throw errors.forbidden();
    }

    await prisma.visaApplication.delete({
      where: { id: applicationId },
    });

    return { success: true, message: "Application deleted" };
  }
}