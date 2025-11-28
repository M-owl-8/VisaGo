import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from './config';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    status: number;
    message: string;
    code?: string;
  };
  message?: string;
}

class ApiClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add token
    this.api.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - clear auth
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            // Redirect to login will be handled by auth guard
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/auth/register', {
        email,
        password,
        firstName,
        lastName,
      });
      return response.data;
    } catch (error: any) {
      // Handle network errors
      if (!error.response) {
        const networkError: ApiResponse = {
          success: false,
          error: {
            status: 0,
            message:
              error.message ||
              'Network error. Please check your internet connection and try again.',
            code: 'NETWORK_ERROR',
          },
        };
        return networkError;
      }

      // Handle API errors
      const code =
        error.response?.data?.error?.code || error.response?.data?.code || 'UNKNOWN_ERROR';
      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'An unknown error occurred. Please try again.';

      return {
        success: false,
        error: {
          status: error.response?.status || 400,
          message,
          code,
        },
      };
    }
  }

  async login(email: string, password: string): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/auth/login', {
        email,
        password,
      });
      return response.data;
    } catch (error: any) {
      // Handle network errors
      if (!error.response) {
        const networkError: ApiResponse = {
          success: false,
          error: {
            status: 0,
            message:
              error.message ||
              'Network error. Please check your internet connection and try again.',
            code: 'NETWORK_ERROR',
          },
        };
        return networkError;
      }

      // Handle API errors
      const code =
        error.response?.data?.error?.code || error.response?.data?.code || 'UNKNOWN_ERROR';
      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Login failed. Please try again.';

      return {
        success: false,
        error: {
          status: error.response?.status || 400,
          message,
          code,
        },
      };
    }
  }

  async getCurrentUser(): Promise<ApiResponse> {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/auth/logout');
      return response.data;
    } catch (error) {
      return { success: true };
    }
  }

  async updateProfile(updates: any): Promise<ApiResponse> {
    const response = await this.api.put('/auth/me', updates);
    return response.data;
  }

  async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await this.api.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    const response = await this.api.post('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  }

  // ============================================================================
  // APPLICATIONS ENDPOINTS
  // ============================================================================

  async getApplications(): Promise<ApiResponse> {
    const response = await this.api.get('/applications');
    return response.data;
  }

  async getApplication(id: string): Promise<ApiResponse> {
    const response = await this.api.get(`/applications/${id}`);
    return response.data;
  }

  async getDocumentChecklist(applicationId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/document-checklist/${applicationId}`);
    return response.data;
  }

  async generateApplicationWithAI(questionnaireData: any): Promise<ApiResponse> {
    // Accept both legacy format and v2 format
    // Backend expects legacy format for validation but can use full v2 structure
    const response = await this.api.post('/applications/ai-generate', {
      questionnaireData,
    });
    return response.data;
  }

  // ============================================================================
  // DOCUMENT ENDPOINTS
  // ============================================================================

  async uploadDocument(
    applicationId: string,
    documentType: string,
    file: File
  ): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('applicationId', applicationId);
    formData.append('documentType', documentType);
    formData.append('file', file);

    const response = await this.api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for file uploads
    });
    return response.data;
  }

  async getApplicationDocuments(applicationId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/documents/application/${applicationId}`);
    return response.data;
  }

  // ============================================================================
  // CHAT ENDPOINTS
  // ============================================================================

  async sendMessage(
    content: string,
    applicationId?: string,
    conversationHistory?: any[]
  ): Promise<ApiResponse> {
    try {
      const transformedHistory = (conversationHistory || []).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await this.api.post(
        '/chat',
        {
          query: content,
          content: content,
          applicationId: applicationId,
          conversationHistory: transformedHistory,
        },
        {
          timeout: 30000,
        }
      );

      if (!response.data || !response.data.success || !response.data.data) {
        throw new Error(response.data?.error?.message || 'Invalid response from backend');
      }

      const aiData = response.data.data;

      return {
        success: true,
        data: {
          message: aiData.message,
          sources: aiData.sources || [],
          tokens_used: aiData.tokens_used || 0,
          model: aiData.model || 'deepseek-reasoner',
          id: aiData.id || `assistant-${Date.now()}`,
          applicationContext: aiData.applicationContext,
        },
      };
    } catch (error: any) {
      // Handle 429 rate limit errors
      if (error.response?.status === 429) {
        const errorMessage =
          error.response?.data?.error?.message ||
          'You\'re sending messages too quickly. Please wait a few seconds and try again.';
        return {
          success: false,
          error: {
            status: 429,
            message: errorMessage,
            code: 'RATE_LIMIT_EXCEEDED',
          },
        };
      }

      // Re-throw other errors to be handled by the store
      throw error;
    }
  }

  async getChatHistory(
    applicationId?: string,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse> {
    const params: any = {};
    if (applicationId) params.applicationId = applicationId;
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;

    const response = await this.api.get('/chat/history', { params });
    return response.data;
  }

  async getChatSessions(limit: number = 20, offset: number = 0): Promise<ApiResponse> {
    const response = await this.api.get('/chat/sessions', {
      params: { limit, offset },
    });
    return response.data;
  }

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  async getUserProfile(): Promise<ApiResponse> {
    const response = await this.api.get('/users/me');
    return response.data;
  }

  async getUserApplications(userId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/users/${userId}/applications`);
    return response.data;
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<ApiResponse> {
    const response = await this.api.patch(`/users/${userId}/preferences`, preferences);
    return response.data;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  handleError(error: any): string {
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An error occurred. Please try again.';
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
