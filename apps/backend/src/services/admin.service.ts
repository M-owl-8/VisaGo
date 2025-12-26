import { db as prisma } from '../db';

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
   * Get all users with pagination
   */
  async getUsers(
    skip: number = 0,
    take: number = 20
  ): Promise<{ data: UserData[]; total: number }> {
    try {
      console.log(`[AdminService] Fetching users - skip: ${skip}, take: ${take}`);

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
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count(),
      ]);

      console.log(`[AdminService] Found ${users.length} users (total: ${total})`);

      const data = users.map((user: any): any => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        applicationCount: user.visaApplications.length,
        documentCount: user.documents.length,
        totalSpent: user.payments.reduce(
          (sum: any, p: any): any => sum + (p.status === 'completed' ? p.amount : 0),
          0
        ),
        createdAt: user.createdAt,
      }));

      console.log(`[AdminService] Returning ${data.length} users`);
      return { data, total };
    } catch (error) {
      console.error('[AdminService] Error getting users:', error);
      if (error instanceof Error) {
        console.error('[AdminService] Error message:', error.message);
        console.error('[AdminService] Error stack:', error.stack);
      }
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
        totalSpent: user.payments.reduce(
          (sum: any, p: any): any => sum + (p.status === 'completed' ? p.amount : 0),
          0
        ),
      };
    } catch (error) {
      console.error('Error getting user details:', error);
      throw error;
    }
  }

  /**
   * Get all applications with details
   */
  async getApplications(
    skip: number = 0,
    take: number = 20
  ): Promise<{ data: ApplicationData[]; total: number }> {
    try {
      console.log(`[AdminService] Fetching applications - skip: ${skip}, take: ${take}`);

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
          orderBy: { createdAt: 'desc' },
        }),
        prisma.visaApplication.count(),
      ]);

      console.log(`[AdminService] Found ${applications.length} applications (total: ${total})`);

      const data = applications.map((app: any): any => ({
        id: app.id,
        userId: app.userId,
        userEmail: app.user.email,
        userName: `${app.user.firstName || ''} ${app.user.lastName || ''}`.trim() || 'Unknown',
        countryName: app.country.name,
        visaTypeName: app.visaType.name,
        status: app.status,
        progressPercentage: app.progressPercentage,
        documentCount: app.documents.length,
        verifiedDocuments: app.documents.filter((d: any): any => d.status === 'verified').length,
        paymentStatus: app.payment?.status || 'no_payment',
        paymentAmount: app.payment?.amount || 0,
        submissionDate: app.submissionDate,
        createdAt: app.createdAt,
      }));

      console.log(`[AdminService] Returning ${data.length} applications`);
      return { data, total };
    } catch (error) {
      console.error('[AdminService] Error getting applications:', error);
      if (error instanceof Error) {
        console.error('[AdminService] Error message:', error.message);
        console.error('[AdminService] Error stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * Get all payments with details
   */
  async getPayments(
    skip: number = 0,
    take: number = 20
  ): Promise<{ data: PaymentData[]; total: number }> {
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
          orderBy: { createdAt: 'desc' },
        }),
        prisma.payment.count(),
      ]);

      const data = payments.map((payment: any): any => ({
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
      console.error('Error getting payments:', error);
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
          where: { status: 'pending' },
          skip,
          take,
          orderBy: { uploadedAt: 'asc' },
        }),
        prisma.userDocument.count({ where: { status: 'pending' } }),
      ]);

      const data = documents.map((doc: any): any => ({
        id: doc.id,
        userId: doc.userId,
        userEmail: doc.user.email,
        userName: `${doc.user.firstName || ''} ${doc.user.lastName || ''}`.trim() || 'Unknown',
        documentName: doc.documentName,
        documentType: doc.documentType,
        applicationCountry: doc.application.country.name,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
      }));

      return { data, total };
    } catch (error) {
      console.error('Error getting document verification queue:', error);
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
          status: status as any,
          approvalDate: status === 'approved' ? new Date() : undefined,
        },
        include: {
          user: true,
          country: true,
          visaType: true,
        },
      });

      return application;
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  }

  /**
   * Verify or reject document
   */
  async updateDocumentStatus(documentId: string, status: 'verified' | 'rejected', notes?: string) {
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
      console.error('Error updating document status:', error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: string) {
    try {
      if (!['user', 'admin', 'super_admin'].includes(role)) {
        throw new Error('Invalid role');
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      return user;
    } catch (error) {
      console.error('Error updating user role:', error);
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
          status: 'completed',
        },
        select: { amount: true },
      });

      const revenueLastMonth = paymentsLast30Days.reduce(
        (sum: any, p: any): any => sum + p.amount,
        0
      );

      // Get top countries
      const topCountries = await prisma.visaApplication.groupBy({
        by: ['countryId'],
        _count: true,
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      });

      const topCountriesData = await Promise.all(
        topCountries.map(async (item: any): Promise<any> => {
          const country = await prisma.country.findUnique({
            where: { id: item.countryId },
            select: { name: true, flagEmoji: true },
          });
          return {
            name: country?.name || 'Unknown',
            flagEmoji: country?.flagEmoji || '',
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
      console.error('Error getting analytics summary:', error);
      throw error;
    }
  }
}

export default new AdminService();
