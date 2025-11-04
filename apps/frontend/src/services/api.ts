import axios, { AxiosInstance, AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../store/auth";
import { Platform } from "react-native";

// Determine API URL based on environment
const getApiBaseUrl = (): string => {
  // If explicitly set via environment variable, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Production Railway URL
  return "https://visabuddy-backend-production.up.railway.app";
};

const API_BASE_URL = getApiBaseUrl();

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
          const token = await AsyncStorage.getItem("@auth_token");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error("Error retrieving token:", error);
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
          // Token expired or invalid
          await AsyncStorage.removeItem("@auth_token");
          useAuthStore.getState().logout();
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

  async refreshToken(): Promise<ApiResponse> {
    const response = await this.api.post("/auth/refresh");
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