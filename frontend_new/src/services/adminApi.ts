import {apiClient} from './api';

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
  createdAt: string;
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
  submissionDate: string | null;
  createdAt: string;
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
  paidAt: string | null;
  createdAt: string;
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
  uploadedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export const adminApi = {
  getDashboard: async (): Promise<DashboardMetrics> => {
    const response = await apiClient.get('/api/admin/dashboard');
    return response.data;
  },

  getUsers: async (params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedResponse<UserData>> => {
    const response = await apiClient.get('/api/admin/users', {params});
    return response.data;
  },

  getUserDetails: async (userId: string): Promise<any> => {
    const response = await apiClient.get(`/api/admin/users/${userId}`);
    return response.data;
  },

  updateUserRole: async (
    userId: string,
    role: string,
  ): Promise<{message: string; user: any}> => {
    const response = await apiClient.patch(`/api/admin/users/${userId}/role`, {
      role,
    });
    return response.data;
  },

  getApplications: async (params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedResponse<ApplicationData>> => {
    const response = await apiClient.get('/api/admin/applications', {params});
    return response.data;
  },

  updateApplicationStatus: async (
    applicationId: string,
    status: string,
  ): Promise<{message: string; application: any}> => {
    const response = await apiClient.patch(
      `/api/admin/applications/${applicationId}/status`,
      {status},
    );
    return response.data;
  },

  getPayments: async (params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedResponse<PaymentData>> => {
    const response = await apiClient.get('/api/admin/payments', {params});
    return response.data;
  },

  getDocumentVerificationQueue: async (params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedResponse<DocumentVerificationQueue>> => {
    const response = await apiClient.get(
      '/api/admin/documents/verification-queue',
      {params},
    );
    return response.data;
  },

  updateDocumentStatus: async (
    documentId: string,
    status: 'verified' | 'rejected',
    notes?: string,
  ): Promise<{message: string; document: any}> => {
    const response = await apiClient.patch(
      `/api/admin/documents/${documentId}/verify`,
      {status, notes},
    );
    return response.data;
  },

  getAnalytics: async (): Promise<any> => {
    const response = await apiClient.get('/api/admin/analytics');
    return response.data;
  },

  getAnalyticsMetrics: async (days?: number): Promise<any> => {
    const response = await apiClient.get('/api/admin/analytics/metrics', {
      params: {days},
    });
    return response.data;
  },

  getConversionFunnel: async (): Promise<any> => {
    const response = await apiClient.get(
      '/api/admin/analytics/conversion-funnel',
    );
    return response.data;
  },

  getUserAcquisition: async (): Promise<any> => {
    const response = await apiClient.get(
      '/api/admin/analytics/user-acquisition',
    );
    return response.data;
  },

  getEventBreakdown: async (days?: number): Promise<any> => {
    const response = await apiClient.get('/api/admin/analytics/events', {
      params: {days},
    });
    return response.data;
  },
};
