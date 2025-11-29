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
  private requestQueue: Map<string, Promise<any>> = new Map();
  private lastRequestTime: Map<string, number> = new Map();
  private readonly MIN_REQUEST_INTERVAL = 100; // Minimum 100ms between requests to same endpoint
  private pendingRequests: Map<string, Promise<any>> = new Map(); // Deduplicate concurrent requests

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add token and implement request throttling
    this.api.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Log request for debugging (only in development, rate-limited)
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          const logKey = `api-request-${config.method}-${config.url}`;
          const lastLog = (window as any).__apiRequestLogs?.[logKey] || 0;
          if (Date.now() - lastLog > 1000) { // Only log once per second per endpoint
            if (!(window as any).__apiRequestLogs) {
              (window as any).__apiRequestLogs = {};
            }
            (window as any).__apiRequestLogs[logKey] = Date.now();
            console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
          }
        }

        // Throttle requests to prevent 429 errors
        const endpoint = `${config.method?.toUpperCase()}_${config.url}`;
        const lastTime = this.lastRequestTime.get(endpoint) || 0;
        const now = Date.now();
        const timeSinceLastRequest = now - lastTime;

        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
          // If request is too soon, wait a bit
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(config);
            }, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
          });
        }

        this.lastRequestTime.set(endpoint, now);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        // Only log in development, rate-limited
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          const logKey = `api-response-${response.config.method}-${response.config.url}`;
          const lastLog = (window as any).__apiResponseLogs?.[logKey] || 0;
          if (Date.now() - lastLog > 1000) {
            if (!(window as any).__apiResponseLogs) {
              (window as any).__apiResponseLogs = {};
            }
            (window as any).__apiResponseLogs[logKey] = Date.now();
            // Only log errors or first success
            if (response.status >= 400) {
              console.warn(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
            }
          }
        }
        return response;
      },
      async (error: AxiosError) => {
        // Log errors for debugging (rate-limited to prevent spam)
        if (typeof window !== 'undefined') {
          const errorKey = error.config ? `api-error-${error.config.method}-${error.config.url}` : 'api-error-unknown';
          const lastErrorLog = (window as any).__apiErrorLogs?.[errorKey] || 0;
          if (Date.now() - lastErrorLog > 5000) { // Only log same error once per 5 seconds
            if (!(window as any).__apiErrorLogs) {
              (window as any).__apiErrorLogs = {};
            }
            (window as any).__apiErrorLogs[errorKey] = Date.now();
            console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'Network Error'}`);
          }
        }

        if (error.response?.status === 401) {
          // Token expired or invalid - clear auth
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            // Redirect to login will be handled by auth guard
          }
        }
        
        // Handle 429 rate limit errors with user-friendly message
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const message = retryAfter
            ? `Too many requests. Please wait ${retryAfter} seconds before trying again.`
            : 'Too many requests. Please wait a moment before trying again.';
          
          // Create a more user-friendly error
          const rateLimitError = new Error(message);
          (rateLimitError as any).isRateLimit = true;
          (rateLimitError as any).retryAfter = retryAfter ? parseInt(retryAfter, 10) : 5;
          return Promise.reject(rateLimitError);
        }

        // Handle network errors (no response)
        if (!error.response) {
          console.error('[API Error] Network error - no response from server', {
            message: error.message,
            code: error.code,
            requestURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown',
          });
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
    // Deduplicate concurrent requests
    const requestKey = `getChatHistory-${applicationId || 'general'}-${limit || 50}-${offset || 0}`;
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    const requestPromise = (async () => {
      try {
        const params: any = {};
        if (applicationId) params.applicationId = applicationId;
        if (limit) params.limit = limit;
        if (offset) params.offset = offset;

        const response = await this.api.get('/chat/history', { params });
        return response.data;
      } finally {
        // Remove from pending after a short delay to allow deduplication
        setTimeout(() => {
          this.pendingRequests.delete(requestKey);
        }, 100);
      }
    })();

    this.pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
  }

  async getChatSessions(limit: number = 20, offset: number = 0): Promise<ApiResponse> {
    const response = await this.api.get('/chat/sessions', {
      params: { limit, offset },
    });
    return response.data;
  }

  async getChatSessionDetails(sessionId: string, limit: number = 100): Promise<ApiResponse> {
    const response = await this.api.get(`/chat/sessions/${sessionId}`, {
      params: { limit },
    });
    return response.data;
  }

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  async getUserProfile(): Promise<ApiResponse> {
    // Deduplicate concurrent requests
    const requestKey = 'getUserProfile';
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    const requestPromise = (async () => {
      try {
        const response = await this.api.get('/users/me');
        return response.data;
      } finally {
        // Remove from pending after a short delay to allow deduplication
        setTimeout(() => {
          this.pendingRequests.delete(requestKey);
        }, 100);
      }
    })();

    this.pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
  }

  async getUserApplications(userId: string): Promise<ApiResponse> {
    // Deduplicate concurrent requests
    const requestKey = `getUserApplications-${userId}`;
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    const requestPromise = (async () => {
      try {
        const response = await this.api.get(`/users/${userId}/applications`);
        return response.data;
      } finally {
        // Remove from pending after a short delay to allow deduplication
        setTimeout(() => {
          this.pendingRequests.delete(requestKey);
        }, 100);
      }
    })();

    this.pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
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
