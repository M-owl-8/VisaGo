import axios, { AxiosInstance, AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../store/auth";
import { Platform } from "react-native";

// Determine API URL based on environment
const getApiBaseUrl = (): string => {
  // TEMPORARILY HARDCODED TO USE LOCAL BACKEND (SECURITY DISABLED)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
  
  // Check if process is available
  if (typeof process === 'undefined') {
    // In Android emulator, use 10.0.2.2 instead of localhost
    if (Platform.OS === 'android') {
      return __DEV__ ? 'http://10.0.2.2:3000' : 'https://visabuddy-backend-production.up.railway.app';
    }
    // Fallback to localhost in development, production URL otherwise
    return __DEV__ ? 'http://localhost:3000' : 'https://visabuddy-backend-production.up.railway.app';
  }

  // If explicitly set via environment variable, use it
  if (process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (process.env?.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Production Railway URL
  return "https://visabuddy-backend-production.up.railway.app";
};

const API_BASE_URL = getApiBaseUrl();
console.log('🌐 API Base URL:', API_BASE_URL);

const CSRF_TOKEN_STORAGE_KEY = "@csrf_token";
const SESSION_ID_STORAGE_KEY = "@session_id";
const SAFE_HTTP_METHODS = new Set(["get", "head", "options"]);

let cachedSessionId: string | null = null;
let cachedCsrfToken: string | null = null;
let securityTokensLoaded = false;
let securityTokensLoading: Promise<void> | null = null;

const ensureSecurityTokensLoaded = async (): Promise<void> => {
  if (securityTokensLoaded) {
    return;
  }

  if (!securityTokensLoading) {
    securityTokensLoading = (async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          SESSION_ID_STORAGE_KEY,
          CSRF_TOKEN_STORAGE_KEY,
        ]);

        const sessionEntry = entries.find(
          ([key]) => key === SESSION_ID_STORAGE_KEY
        );
        const csrfEntry = entries.find(
          ([key]) => key === CSRF_TOKEN_STORAGE_KEY
        );

        cachedSessionId = sessionEntry?.[1] || null;
        cachedCsrfToken = csrfEntry?.[1] || null;

        // If no tokens exist, fetch them from the server
        if (!cachedSessionId || !cachedCsrfToken) {
          try {
            console.log('🔐 Fetching initial security tokens from server...');
            console.log('📍 Requesting:', `${API_BASE_URL}/health`);
            const response = await axios.get(`${API_BASE_URL}/health`, {
              timeout: 5000,
            });
            console.log('✅ Response received! Status:', response.status);
            
            // Log all headers for debugging
            console.log('📋 Response headers:', JSON.stringify(response.headers, null, 2));
            
            const sessionId = response.headers['x-session-id'];
            const csrfToken = response.headers['x-csrf-token'];
            
            console.log('🔍 Extracted tokens:', { sessionId, csrfToken });
            
            if (sessionId) {
              cachedSessionId = sessionId;
              await AsyncStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
              console.log('✅ Session ID obtained:', sessionId);
            } else {
              console.warn('⚠️ No Session ID in response headers');
            }
            
            if (csrfToken) {
              cachedCsrfToken = csrfToken;
              await AsyncStorage.setItem(CSRF_TOKEN_STORAGE_KEY, csrfToken);
              console.log('✅ CSRF token obtained');
            } else {
              console.warn('⚠️ No CSRF token in response headers');
            }
          } catch (fetchError: any) {
            console.error('❌ Failed to fetch security tokens!');
            console.error('Error message:', fetchError.message);
            console.error('Error code:', fetchError.code);
            console.error('Is network error?', fetchError.isAxiosError && !fetchError.response);
            if (fetchError.config) {
              console.error('Request URL:', fetchError.config.url);
            }
          }
        }
      } catch (error) {
        console.warn("Failed to load security tokens", error);
        cachedSessionId = null;
        cachedCsrfToken = null;
      } finally {
        securityTokensLoaded = true;
        securityTokensLoading = null;
      }
    })();
  }

  const loadingPromise = securityTokensLoading;
  if (loadingPromise) {
    await loadingPromise;
  }
};

const persistToken = async (
  key: string,
  value: string | null
): Promise<void> => {
  try {
    if (value === null) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn(`Failed to persist ${key}`, error);
  }
};

const updateSessionIdCache = async (
  newSessionId?: string | null
): Promise<void> => {
  if (typeof newSessionId === "undefined") {
    return;
  }

  const normalized = newSessionId?.trim() || null;

  if (!normalized) {
    if (cachedSessionId !== null) {
      cachedSessionId = null;
      await persistToken(SESSION_ID_STORAGE_KEY, null);
    }
    return;
  }

  if (cachedSessionId === normalized) {
    return;
  }

  cachedSessionId = normalized;
  await persistToken(SESSION_ID_STORAGE_KEY, normalized);
};

const updateCsrfTokenCache = async (newToken?: string | null): Promise<void> => {
  if (typeof newToken === "undefined") {
    return;
  }

  const normalized = newToken?.trim() || null;

  if (!normalized) {
    if (cachedCsrfToken !== null) {
      cachedCsrfToken = null;
      await persistToken(CSRF_TOKEN_STORAGE_KEY, null);
    }
    return;
  }

  if (cachedCsrfToken === normalized) {
    return;
  }

  cachedCsrfToken = normalized;
  await persistToken(CSRF_TOKEN_STORAGE_KEY, normalized);
};

const clearSecurityContext = async (): Promise<void> => {
  await Promise.all([
    updateSessionIdCache(null),
    updateCsrfTokenCache(null),
  ]);
};

const getHeaderValue = (
  headers: any,
  headerName: string
): string | undefined => {
  if (!headers) {
    return undefined;
  }

  if (typeof headers.get === "function") {
    const value = headers.get(headerName);
    return typeof value === "string" ? value : undefined;
  }

  const normalized = headerName.toLowerCase();
  const key = Object.keys(headers).find(
    (headerKey) => headerKey.toLowerCase() === normalized
  );

  if (!key) {
    return undefined;
  }

  const value = headers[key];

  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
};

const setHeaderValue = (headers: any, name: string, value: string): void => {
  if (!headers || !value) {
    return;
  }

  if (typeof headers.set === "function") {
    headers.set(name, value);
  } else {
    headers[name] = value;
  }
};

const removeHeaderValue = (headers: any, name: string): void => {
  if (!headers) {
    return;
  }

  if (typeof headers.delete === "function") {
    headers.delete(name);
  } else if (headers[name] !== undefined) {
    delete headers[name];
  }
};

interface ApiResponse<T = any> {
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
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add token
    this.api.interceptors.request.use(
      async (config) => {
        try {
          await ensureSecurityTokensLoaded();

          if (!config.headers) {
            config.headers = {};
          }

          const headers: any = config.headers;

          const authToken = await AsyncStorage.getItem("@auth_token");
          if (authToken) {
            setHeaderValue(headers, "Authorization", `Bearer ${authToken}`);
          } else {
            removeHeaderValue(headers, "Authorization");
          }

          if (cachedSessionId) {
            setHeaderValue(headers, "X-Session-Id", cachedSessionId);
          } else {
            removeHeaderValue(headers, "X-Session-Id");
          }

          const method = (config.method || "get").toLowerCase();
          if (!SAFE_HTTP_METHODS.has(method)) {
            if (cachedCsrfToken) {
              setHeaderValue(headers, "X-CSRF-Token", cachedCsrfToken);
            } else {
              removeHeaderValue(headers, "X-CSRF-Token");
            }
          } else {
            removeHeaderValue(headers, "X-CSRF-Token");
          }
        } catch (error) {
          console.error("Error preparing request headers:", error);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      async (response) => {
        const sessionId = getHeaderValue(response.headers, "x-session-id");
        const csrfToken = getHeaderValue(response.headers, "x-csrf-token");

        await Promise.all([
          updateSessionIdCache(sessionId),
          updateCsrfTokenCache(csrfToken),
        ]);

        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.headers) {
          const sessionId = getHeaderValue(
            error.response.headers,
            "x-session-id"
          );
          const csrfToken = getHeaderValue(
            error.response.headers,
            "x-csrf-token"
          );
          await Promise.all([
            updateSessionIdCache(sessionId),
            updateCsrfTokenCache(csrfToken),
          ]);
        }

        const errorCode =
          (error.response?.data as any)?.error?.code ?? undefined;

        if (
          error.response?.status === 403 &&
          (errorCode === "CSRF_TOKEN_INVALID" ||
            errorCode === "CSRF_TOKEN_MISSING")
        ) {
          await updateCsrfTokenCache(null);
        }

        if (error.response?.status === 401) {
          // Token expired or invalid - handle gracefully
          const authState = useAuthStore.getState();
          const isChatEndpoint = error.config?.url?.includes('/chat');
          const isAIGenerateEndpoint = error.config?.url?.includes('/ai-generate');
          
          // For chat and AI endpoints, don't log warnings or logout - let them handle it
          if (isChatEndpoint || isAIGenerateEndpoint) {
            // Silently handle 401 for chat/AI endpoints - they'll show appropriate messages
            return Promise.reject(error);
          }
          
          // For other endpoints, check if we should logout
          if (authState.isSignedIn) {
            // Check if the error is specifically about authentication
            const errorMessage = (error.response?.data as any)?.error?.message || '';
            const errorCode = (error.response?.data as any)?.error?.code || '';
            
            // Only logout if it's a clear authentication failure
            if (
              errorMessage.includes('token') || 
              errorMessage.includes('unauthorized') || 
              errorMessage.includes('authentication') ||
              errorCode === 'UNAUTHORIZED' ||
              errorCode === 'INVALID_TOKEN'
            ) {
              console.warn('Authentication failed - logging out');
              await AsyncStorage.removeItem("@auth_token");
              authState.logout();
            } else {
              // For other 401s, just warn but don't logout
              console.warn('Authentication failed - token may be expired');
            }
          }
        }
        
        // Log 404 errors for debugging (but don't treat as critical)
        if (error.response?.status === 404) {
          const url = error.config?.url || 'unknown';
          console.warn(`404 Not Found: ${url} - Backend route may not be available or backend server may not be running`);
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * ============================================================================
   * AUTHENTICATION ENDPOINTS
   * ============================================================================
   */

  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<ApiResponse> {
    const response = await this.api.post("/auth/register", {
      email,
      password,
      firstName,
      lastName,
    });
    return response.data;
  }

  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await this.api.post("/auth/login", {
      email,
      password,
    });
    return response.data;
  }

  async loginWithGoogle(
    googleId: string,
    email: string,
    firstName?: string,
    lastName?: string,
    avatar?: string
  ): Promise<ApiResponse> {
    const response = await this.api.post("/auth/google", {
      googleId,
      email,
      firstName,
      lastName,
      avatar,
    });
    return response.data;
  }

  async getCurrentUser(): Promise<ApiResponse> {
    const response = await this.api.get("/auth/me");
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.api.post("/auth/logout");
      return response.data;
    } catch (error) {
      // Even if logout endpoint fails, consider it successful for client-side logout
      return { success: true };
    }
  }

  async updateProfile(updates: any): Promise<ApiResponse> {
    const response = await this.api.put("/auth/me", updates);
    return response.data;
  }

  async clearSecurityTokens(): Promise<void> {
    await clearSecurityContext();
  }

  async refreshToken(): Promise<ApiResponse> {
    const response = await this.api.post("/auth/refresh");
    return response.data;
  }

  async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await this.api.post("/auth/forgot-password", { email });
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    const response = await this.api.post("/auth/reset-password", { token, password });
    return response.data;
  }

  /**
   * ============================================================================
   * COUNTRIES & VISA TYPES ENDPOINTS
   * ============================================================================
   */

  async getCountries(search?: string): Promise<ApiResponse> {
    const params = search ? { search } : {};
    const response = await this.api.get("/countries", { params });
    return response.data;
  }

  async getPopularCountries(): Promise<ApiResponse> {
    const response = await this.api.get("/countries/popular");
    return response.data;
  }

  async getCountry(id: string): Promise<ApiResponse> {
    const response = await this.api.get(`/countries/${id}`);
    return response.data;
  }

  async getCountryByCode(code: string): Promise<ApiResponse> {
    const response = await this.api.get(`/countries/code/${code}`);
    return response.data;
  }

  async getVisaTypes(countryId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/countries/${countryId}/visa-types`);
    return response.data;
  }

  // New methods for visa type first flow
  async getAllVisaTypes(search?: string): Promise<ApiResponse> {
    const params = search ? { search } : {};
    const response = await this.api.get("/visa-types", { params });
    return response.data;
  }

  async getPopularVisaTypes(): Promise<ApiResponse> {
    const response = await this.api.get("/visa-types/popular");
    return response.data;
  }

  async getCountriesByVisaType(visaTypeName: string): Promise<ApiResponse> {
    const encodedName = encodeURIComponent(visaTypeName);
    const response = await this.api.get(`/visa-types/${encodedName}`);
    return response.data;
  }

  async getVisaTypeByNameAndCountry(visaTypeName: string, countryId: string): Promise<ApiResponse> {
    const encodedName = encodeURIComponent(visaTypeName);
    const response = await this.api.get(`/visa-types/${encodedName}/countries/${countryId}`);
    return response.data;
  }

  /**
   * ============================================================================
   * VISA APPLICATIONS ENDPOINTS
   * ============================================================================
   */

  async getApplications(): Promise<ApiResponse> {
    const response = await this.api.get("/applications");
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

  async createApplication(
    countryId: string,
    visaTypeId: string,
    notes?: string
  ): Promise<ApiResponse> {
    const response = await this.api.post("/applications", {
      countryId,
      visaTypeId,
      notes,
    });
    return response.data;
  }

  async generateApplicationWithAI(questionnaireData: {
    purpose: string;
    country?: string;
    duration: string;
    traveledBefore: boolean;
    currentStatus: string;
    hasInvitation: boolean;
    financialSituation: string;
    maritalStatus: string;
    hasChildren: string;
    englishLevel: string;
  }): Promise<ApiResponse> {
    const response = await this.api.post("/applications/ai-generate", {
      questionnaireData,
    });
    return response.data;
  }

  async updateApplicationStatus(id: string, status: string): Promise<ApiResponse> {
    const response = await this.api.put(`/applications/${id}/status`, { status });
    return response.data;
  }

  async updateCheckpoint(
    applicationId: string,
    checkpointId: string,
    status: string
  ): Promise<ApiResponse> {
    const response = await this.api.put(
      `/applications/${applicationId}/checkpoints/${checkpointId}`,
      { status }
    );
    return response.data;
  }

  async deleteApplication(id: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/applications/${id}`);
    return response.data;
  }

  /**
   * ============================================================================
   * PAYMENT ENDPOINTS
   * ============================================================================
   */

  async getPaymentMethods(): Promise<ApiResponse> {
    const response = await this.api.get("/payments/methods");
    return response.data;
  }

  async getPaymentFreezeStatus(): Promise<ApiResponse> {
    const response = await this.api.get("/payments/freeze-status");
    return response.data;
  }

  async initiatePayment(
    applicationId: string,
    returnUrl: string,
    paymentMethod: string = "payme"
  ): Promise<ApiResponse> {
    const response = await this.api.post("/payments/initiate", {
      applicationId,
      returnUrl,
      paymentMethod,
    });
    return response.data;
  }

  async getPayment(transactionId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/payments/${transactionId}`);
    return response.data;
  }

  async getUserPayments(): Promise<ApiResponse> {
    const response = await this.api.get("/payments");
    return response.data;
  }

  async verifyPayment(transactionId: string): Promise<ApiResponse> {
    const response = await this.api.post(`/payments/${transactionId}/verify`);
    return response.data;
  }

  async cancelPayment(transactionId: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/payments/${transactionId}/cancel`);
    return response.data;
  }

  /**
   * ============================================================================
   * DOCUMENT ENDPOINTS
   * ============================================================================
   */

  async uploadDocument(
    applicationId: string,
    documentType: string,
    file: any
  ): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append("applicationId", applicationId);
    formData.append("documentType", documentType);
    formData.append("file", file);

    const response = await this.api.post("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  async getDocuments(): Promise<ApiResponse> {
    const response = await this.api.get("/documents");
    return response.data;
  }

  async getApplicationDocuments(applicationId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/documents/application/${applicationId}`);
    return response.data;
  }

  async getRequiredDocuments(applicationId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/documents/application/${applicationId}/required`);
    return response.data;
  }

  async updateDocumentStatus(
    documentId: string,
    status: "pending" | "verified" | "rejected",
    verificationNotes?: string
  ): Promise<ApiResponse> {
    const response = await this.api.patch(`/documents/${documentId}/status`, {
      status,
      verificationNotes,
    });
    return response.data;
  }

  async getDocument(documentId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/documents/${documentId}`);
    return response.data;
  }

  async deleteDocument(documentId: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/documents/${documentId}`);
    return response.data;
  }

  async getDocumentStats(): Promise<ApiResponse> {
    const response = await this.api.get("/documents/stats/overview");
    return response.data;
  }

  /**
   * ============================================================================
   * CHAT ENDPOINTS
   * ============================================================================
   */

  async sendMessage(
    content: string,
    applicationId?: string,
    conversationHistory?: any[]
  ): Promise<ApiResponse> {
    const response = await this.api.post("/chat/send", {
      content,
      applicationId,
      conversationHistory,
    });
    return response.data;
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

    const response = await this.api.get("/chat/history", { params });
    return response.data;
  }

  async searchDocuments(query: string, country?: string, visaType?: string): Promise<ApiResponse> {
    const response = await this.api.post("/chat/search", { 
      query, 
      country, 
      visaType,
      limit: 5 
    });
    return response.data;
  }

  async clearChatHistory(applicationId?: string): Promise<ApiResponse> {
    const params: any = {};
    if (applicationId) params.applicationId = applicationId;

    const response = await this.api.delete("/chat/history", { params });
    return response.data;
  }

  async getChatStats(): Promise<ApiResponse> {
    const response = await this.api.get("/chat/stats");
    return response.data;
  }

  async getChatSessions(limit: number = 20, offset: number = 0): Promise<ApiResponse> {
    const response = await this.api.get("/chat/sessions", {
      params: { limit, offset },
    });
    return response.data;
  }

  async getSessionDetails(sessionId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/chat/sessions/${sessionId}`);
    return response.data;
  }

  async renameSession(sessionId: string, title: string): Promise<ApiResponse> {
    const response = await this.api.patch(`/chat/sessions/${sessionId}`, { title });
    return response.data;
  }

  async deleteSession(sessionId: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  }

  async addMessageFeedback(
    messageId: string,
    feedback: "thumbs_up" | "thumbs_down"
  ): Promise<ApiResponse> {
    const response = await this.api.post(`/chat/messages/${messageId}/feedback`, {
      feedback,
    });
    return response.data;
  }

  /**
   * ============================================================================
   * USER PROFILE ENDPOINTS
   * ============================================================================
   */

  async getUserProfile(): Promise<ApiResponse> {
    const response = await this.api.get("/users/me");
    return response.data;
  }

  async updateUserProfile(userId: string, data: any): Promise<ApiResponse> {
    const response = await this.api.patch(`/users/${userId}`, data);
    return response.data;
  }

  async getUserApplications(userId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/users/${userId}/applications`);
    return response.data;
  }

  async getUserPaymentHistory(userId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/users/${userId}/payments`);
    return response.data;
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<ApiResponse> {
    const response = await this.api.patch(`/users/${userId}/preferences`, preferences);
    return response.data;
  }

  /**
   * ============================================================================
   * UTILITY METHODS
   * ============================================================================
   */

  /**
   * Handle API errors in a standardized way
   */
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
    return "An error occurred. Please try again.";
  }

  /**
   * Check if API is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data.status === "ok";
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

export default apiClient;