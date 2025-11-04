import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface DashboardMetrics {
  totalUsers: number;
  totalApplications: number;
  totalRevenue: number;
  totalDocumentsVerified: number;
  applicationsBreakdown: {
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    expired: number;
  };
  paymentBreakdown: {
    pending: number;
    completed: number;
    failed: number;
    refunded: number;
  };
  revenueByCountry: Array<{
    country: string;
    revenue: number;
    applicationCount: number;
  }>;
  documentStats: {
    pendingVerification: number;
    verificationRate: number;
    averageUploadTime: number;
  };
}

export interface UserData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  applicationCount: number;
  documentCount: number;
  totalSpent: number;
  createdAt: Date;
}

export interface ApplicationData {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  countryName: string;
  visaTypeName: string;
  status: string;
  progressPercentage: number;
  documentCount: number;
  verifiedDocuments: number;
  paymentStatus: string;
  paymentAmount: number;
  submissionDate: Date | null;
  createdAt: Date;
}

export interface PaymentData {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  countryName: string;
  paidAt: Date | null;
  createdAt: Date;
}

export interface DocumentVerificationQueue {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  documentName: string;
  documentType: string;
  applicationCountry: string;
  status: string;
  uploadedAt: Date;
}

class AdminService {
  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      // Get counts
      const totalUsers = await prisma.user.count();
      const totalApplications = await prisma.visaApplication.count();

      // Get payment stats
      const payments = await prisma.payment.findMany({
        select: { status: true, amount: true },
      });

      const totalRevenue = payments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0);

      // Application breakdown
      const appBreakdown = await prisma.visaApplication.groupBy({
        by: ["status"],
        _count: true,
      });

      const applicationsBreakdown = {
        draft: appBreakdown.find((a) => a.status === "draft")?._count || 0,
        submitted: appBreakdown.find((a) => a.status === "submitted")?._count || 0,
        approved: appBreakdown.find((a) => a.status === "approved")?._count || 0,
        rejected: appBreakdown.find((a) => a.status === "rejected")?._count || 0,
        expired: appBreakdown.find((a) => a.status === "expired")?._count || 0,
      };

      // Payment breakdown
      const paymentBreakdown = {
        pending: payments.filter((p) => p.status === "pending").length,
        completed: payments.filter((p) => p.status === "completed").length,
        failed: payments.filter((p) => p.status === "failed").length,
        refunded: payments.filter((p) => p.status === "refunded").length,
      };

      // Revenue by country
      const revenueByCountry = await prisma.visaApplication.groupBy({
        by: ["countryId"],
        _count: true,
      });

      const enrichedRevenue = await Promise.all(
        revenueByCountry.map(async (item) => {
          const country = await prisma.country.findUnique({
            where: { id: item.countryId },
            select: { name: true },
          });

          const applications = await prisma.visaApplication.findMany({
            where: { countryId: item.countryId },
            include: { payment: true },
          });

          const countryRevenue = applications
            .filter((a) => a.payment?.status === "completed")
            .reduce((sum, a) => sum + (a.payment?.amount || 0), 0);

          return {
            country: country?.name || "Unknown",
            revenue: countryRevenue,
            applicationCount: item._count,
          };
        })
      );

      // Document stats
      const totalDocuments = await prisma.userDocument.count();
      const verifiedDocuments = await prisma.userDocument.count({
        where: { status: "verified" },
      });

      const pendingVerification = await prisma.userDocument.count({
        where: { status: "pending" },
      });

      const verificationRate =
        totalDocuments > 0 ? (verifiedDocuments / totalDocuments) * 100 : 0;

      const documentStats = {
        pendingVerification,
        verificationRate: Math.round(verificationRate * 100) / 100,
        averageUploadTime: 0, // Could be calculated from timestamps
      };

      const totalDocumentsVerified = verifiedDocuments;

      return {
        totalUsers,
        totalApplications,
        totalRevenue,
        totalDocumentsVerified,
        applicationsBreakdown,
        paymentBreakdown,
        revenueByCountry: enrichedRevenue.sort((a, b) => b.revenue - a.revenue).slice(0, 10),
        documentStats,
      };
    } catch (error) {
      console.error("Error getting dashboard metrics:", error);
      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  async getUsers(skip: number = 0, take: number = 20): Promise<{ data: UserData[]; total: number }> {
    try {
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
            visaApplications: true,
            documents: true,
            payments: true,
          },
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count(),
      ]);

      const data = users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        applicationCount: user.visaApplications.length,
        documentCount: user.documents.length,
        totalSpent: user.payments.reduce((sum, p) => sum + (p.status === "completed" ? p.amount : 0), 0),
        createdAt: user.createdAt,
      }));

      return { data, total };
    } catch (error) {
      console.error("Error getting users:", error);
      throw error;
    }
  }

  /**
   * Get user by ID with full details
   */
  async getUserDetails(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          visaApplications: {
            include: {
              country: true,
              visaType: true,
              payment: true,
              documents: true,
            },
          },
          payments: true,
          activityLog: true,
          preferences: true,
        },
      });

      if (!user) {
        return null;
      }

      return {
        ...user,
        password: undefined, // Never return password
        applicationCount: user.visaApplications.length,
        totalSpent: user.payments.reduce((sum, p) => sum + (p.status === "completed" ? p.amount : 0), 0),
      };
    } catch (error) {
      console.error("Error getting user details:", error);
      throw error;
    }
  }

  /**
   * Get all applications with details
   */
  async getApplications(skip: number = 0, take: number = 20): Promise<{ data: ApplicationData[]; total: number }> {
    try {
      const [applications, total] = await Promise.all([
        prisma.visaApplication.findMany({
          include: {
            user: true,
            country: true,
            visaType: true,
            payment: true,
            documents: true,
          },
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.visaApplication.count(),
      ]);

      const data = applications.map((app) => ({
        id: app.id,
        userId: app.userId,
        userEmail: app.user.email,
        userName: `${app.user.firstName || ""} ${app.user.lastName || ""}`.trim() || "Unknown",
        countryName: app.country.name,
        visaTypeName: app.visaType.name,
        status: app.status,
        progressPercentage: app.progressPercentage,
        documentCount: app.documents.length,
        verifiedDocuments: app.documents.filter((d) => d.status === "verified").length,
        paymentStatus: app.payment?.status || "no_payment",
        paymentAmount: app.payment?.amount || 0,
        submissionDate: app.submissionDate,
        createdAt: app.createdAt,
      }));

      return { data, total };
    } catch (error) {
      console.error("Error getting applications:", error);
      throw error;
    }
  }

  /**
   * Get all payments with details
   */
  async getPayments(skip: number = 0, take: number = 20): Promise<{ data: PaymentData[]; total: number }> {
    try {
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          include: {
            user: true,
            application: {
              include: { country: true },
            },
          },
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.payment.count(),
      ]);

      const data = payments.map((payment) => ({
        id: payment.id,
        userId: payment.userId,
        userEmail: payment.user.email,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        countryName: payment.application.country.name,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      }));

      return { data, total };
    } catch (error) {
      console.error("Error getting payments:", error);
      throw error;
    }
  }

  /**
   * Get document verification queue
   */
  async getDocumentVerificationQueue(skip: number = 0, take: number = 20) {
    try {
      const [documents, total] = await Promise.all([
        prisma.userDocument.findMany({
          include: {
            user: true,
            application: {
              include: { country: true },
            },
          },
          where: { status: "pending" },
          skip,
          take,
          orderBy: { uploadedAt: "asc" },
        }),
        prisma.userDocument.count({ where: { status: "pending" } }),
      ]);

      const data = documents.map((doc) => ({
        id: doc.id,
        userId: doc.userId,
        userEmail: doc.user.email,
        userName: `${doc.user.firstName || ""} ${doc.user.lastName || ""}`.trim() || "Unknown",
        documentName: doc.documentName,
        documentType: doc.documentType,
        applicationCountry: doc.application.country.name,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
      }));

      return { data, total };
    } catch (error) {
      console.error("Error getting document verification queue:", error);
      throw error;
    }
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(applicationId: string, status: string) {
    try {
      const application = await prisma.visaApplication.update({
        where: { id: applicationId },
        data: {
          status,
          approvalDate: status === "approved" ? new Date() : undefined,
        },
        include: {
          user: true,
          country: true,
          visaType: true,
        },
      });

      return application;
    } catch (error) {
      console.error("Error updating application status:", error);
      throw error;
    }
  }

  /**
   * Verify or reject document
   */
  async updateDocumentStatus(documentId: string, status: "verified" | "rejected", notes?: string) {
    try {
      const document = await prisma.userDocument.update({
        where: { id: documentId },
        data: {
          status,
          verificationNotes: notes,
        },
        include: {
          user: true,
          application: true,
        },
      });

      return document;
    } catch (error) {
      console.error("Error updating document status:", error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: string) {
    try {
      if (!["user", "admin", "super_admin"].includes(role)) {
        throw new Error("Invalid role");
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      return user;
    } catch (error) {
      console.error("Error updating user role:", error);
      throw error;
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newUsersLast30Days = await prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      });

      const applicationsLast30Days = await prisma.visaApplication.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      });

      const documentsUploadedLast30Days = await prisma.userDocument.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      });

      const paymentsLast30Days = await prisma.payment.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: "completed",
        },
        select: { amount: true },
      });

      const revenueLastMonth = paymentsLast30Days.reduce((sum, p) => sum + p.amount, 0);

      // Get top countries
      const topCountries = await prisma.visaApplication.groupBy({
        by: ["countryId"],
        _count: true,
        orderBy: { _count: { id: "desc" } },
        take: 5,
      });

      const topCountriesData = await Promise.all(
        topCountries.map(async (item) => {
          const country = await prisma.country.findUnique({
            where: { id: item.countryId },
            select: { name: true, flagEmoji: true },
          });
          return {
            name: country?.name || "Unknown",
            flagEmoji: country?.flagEmoji || "",
            applications: item._count,
          };
        })
      );

      return {
        newUsersLast30Days,
        applicationsLast30Days,
        documentsUploadedLast30Days,
        revenueLastMonth,
        topCountries: topCountriesData,
      };
    } catch (error) {
      console.error("Error getting analytics summary:", error);
      throw error;
    }
  }
}

export default new AdminService();