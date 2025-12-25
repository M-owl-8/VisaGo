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

  // Evaluation API
  getEvaluationMetrics: async (): Promise<any> => {
    const response = await apiClient.get('/api/admin/evaluation/metrics');
    return response.data;
  },

  runEvaluation: async (): Promise<any> => {
    const response = await apiClient.post('/api/admin/evaluation/run');
    return response.data;
  },

  // Visa Rules API
  getVisaRules: async (params?: {
    countryCode?: string;
    visaType?: string;
  }): Promise<{ruleSets: any[]}> => {
    const response = await apiClient.get('/api/admin/visa-rules', {params});
    // API returns { data: { ruleSets: [...] } }
    return response.data?.data || response.data;
  },

  getVisaRule: async (ruleId: string): Promise<any> => {
    const response = await apiClient.get(`/api/admin/visa-rules/${ruleId}`);
    return response.data;
  },

  updateVisaRule: async (
    ruleId: string,
    data: {isApproved?: boolean; documents?: any; data?: any},
  ): Promise<any> => {
    const response = await apiClient.patch(
      `/api/admin/visa-rules/${ruleId}`,
      data,
    );
    return response.data;
  },

  getVisaRuleCandidates: async (params?: {
    countryCode?: string;
    visaType?: string;
    status?: string;
  }): Promise<{candidates: any[]}> => {
    const response = await apiClient.get('/api/admin/visa-rules/candidates', {
      params,
    });
    return response.data;
  },

  getVisaRuleCandidate: async (candidateId: string): Promise<any> => {
    const response = await apiClient.get(
      `/api/admin/visa-rules/candidates/${candidateId}`,
    );
    return response.data;
  },

  approveVisaRuleCandidate: async (
    candidateId: string,
  ): Promise<{message: string; ruleSet: any}> => {
    const response = await apiClient.post(
      `/api/admin/visa-rules/candidates/${candidateId}/approve`,
    );
    return response.data;
  },

  rejectVisaRuleCandidate: async (
    candidateId: string,
    notes?: string,
  ): Promise<{message: string}> => {
    const response = await apiClient.post(
      `/api/admin/visa-rules/candidates/${candidateId}/reject`,
      {notes},
    );
    return response.data;
  },

  // Activity Logs API
  getActivityLogs: async (params?: {
    page?: number;
    pageSize?: number;
    userId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{items: any[]; total: number}> => {
    const response = await apiClient.get('/api/admin/activity-logs', {params});
    return response.data;
  },

  // AI Interactions API
  getAIInteractions: async (params?: {
    skip?: number;
    take?: number;
    userId?: string;
    applicationId?: string;
  }): Promise<PaginatedResponse<any>> => {
    const response = await apiClient.get('/api/admin/ai-interactions', {
      params,
    });
    return response.data;
  },

  // Checklist Stats API
  getChecklistStats: async (params?: {
    countryCode?: string;
    visaType?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any> => {
    const response = await apiClient.get('/api/admin/checklist-stats', {
      params,
    });
    // API returns { success: true, data: {...} }
    return response.data?.data || response.data;
  },
};
