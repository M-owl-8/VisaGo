import { apiClient } from './client';
import { API_BASE_URL } from './config';

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

export interface LogResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  action: string;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AIInteraction {
  id: string;
  taskType: string;
  model: string;
  promptVersion: string | null;
  source: string | null;
  requestPayload: string;
  responsePayload: string | null;
  success: boolean;
  errorMessage: string | null;
  countryCode: string | null;
  visaType: string | null;
  ruleSetId: string | null;
  applicationId: string | null;
  userId: string | null;
  modelVersionId: string | null;
  latencyMs: number | null;
  createdAt: string;
}

class AdminApiClient {
  private getAuthHeaders(): Record<string, string> {
    if (typeof window === 'undefined') {
      return {};
    }
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getDashboard(): Promise<DashboardMetrics> {
    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
    }
    return response.json();
  }

  async getUsers(params?: { skip?: number; take?: number }): Promise<PaginatedResponse<UserData>> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.take) queryParams.append('take', params.take.toString());

    const response = await fetch(`${API_BASE_URL}/api/admin/users?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }
    return response.json();
  }

  async getUserDetails(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch user details: ${response.statusText}`);
    }
    return response.json();
  }

  async updateUserRole(userId: string, role: string): Promise<{ message: string; user: any }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update user role: ${response.statusText}`);
    }
    return response.json();
  }

  async getApplications(params?: { skip?: number; take?: number }): Promise<PaginatedResponse<ApplicationData>> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.take) queryParams.append('take', params.take.toString());

    const response = await fetch(`${API_BASE_URL}/api/admin/applications?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch applications: ${response.statusText}`);
    }
    return response.json();
  }

  async updateApplicationStatus(applicationId: string, status: string): Promise<{ message: string; application: any }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update application status: ${response.statusText}`);
    }
    return response.json();
  }

  async getPayments(params?: { skip?: number; take?: number }): Promise<PaginatedResponse<PaymentData>> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.take) queryParams.append('take', params.take.toString());

    const response = await fetch(`${API_BASE_URL}/api/admin/payments?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch payments: ${response.statusText}`);
    }
    return response.json();
  }

  async getDocumentVerificationQueue(params?: { skip?: number; take?: number }): Promise<PaginatedResponse<DocumentVerificationQueue>> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.take) queryParams.append('take', params.take.toString());

    const response = await fetch(`${API_BASE_URL}/api/admin/documents/verification-queue?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch document queue: ${response.statusText}`);
    }
    return response.json();
  }

  async updateDocumentStatus(documentId: string, status: 'verified' | 'rejected', notes?: string): Promise<{ message: string; document: any }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/documents/${documentId}/verify`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status, notes }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update document status: ${response.statusText}`);
    }
    return response.json();
  }

  async getAnalytics(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.statusText}`);
    }
    return response.json();
  }

  async getAnalyticsMetrics(days?: number): Promise<any> {
    const queryParams = new URLSearchParams();
    if (days) queryParams.append('days', days.toString());

    const response = await fetch(`${API_BASE_URL}/api/admin/analytics/metrics?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch analytics metrics: ${response.statusText}`);
    }
    return response.json();
  }

  async getConversionFunnel(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics/conversion-funnel`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch conversion funnel: ${response.statusText}`);
    }
    return response.json();
  }

  async getUserAcquisition(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics/user-acquisition`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch user acquisition: ${response.statusText}`);
    }
    return response.json();
  }

  async getActivityLogs(params?: {
    page?: number;
    pageSize?: number;
    userId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<LogResponse<ActivityLog>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

    const response = await fetch(`${API_BASE_URL}/api/admin/activity-logs?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch activity logs: ${response.statusText}`);
    }
    return response.json();
  }

  async getAIInteractions(params?: {
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
  }): Promise<LogResponse<AIInteraction>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.taskType) queryParams.append('taskType', params.taskType);
    if (params?.model) queryParams.append('model', params.model);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.applicationId) queryParams.append('applicationId', params.applicationId);
    if (params?.countryCode) queryParams.append('countryCode', params.countryCode);
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.success !== undefined) queryParams.append('success', params.success.toString());

    const response = await fetch(`${API_BASE_URL}/api/admin/ai-interactions?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch AI interactions: ${response.statusText}`);
    }
    return response.json();
  }
}

export const adminApi = new AdminApiClient();

