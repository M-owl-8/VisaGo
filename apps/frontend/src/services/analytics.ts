import api from "./api";

export type AnalyticsEventType =
  | "signup"
  | "visa_selected"
  | "payment_completed"
  | "document_uploaded"
  | "chat_message"
  | "login"
  | "app_opened";

export type AnalyticsSource = "email" | "google" | "organic" | "referral";

export interface AnalyticsEventPayload {
  eventType: AnalyticsEventType;
  source?: AnalyticsSource;
  metadata?: Record<string, any>;
}

class AnalyticsService {
  private baseURL = "/api";

  /**
   * Track an event
   */
  async trackEvent(payload: AnalyticsEventPayload): Promise<void> {
    try {
      // Send to backend
      await api.post("/analytics/track", payload);

      // Also log locally for debugging
      console.log("[Analytics]", payload.eventType, payload.metadata);
    } catch (error) {
      console.error("Error tracking event:", error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Track user signup
   */
  async trackSignup(source: AnalyticsSource = "email"): Promise<void> {
    await this.trackEvent({
      eventType: "signup",
      source,
    });
  }

  /**
   * Track visa selection
   */
  async trackVisaSelected(country: string, visaType: string): Promise<void> {
    await this.trackEvent({
      eventType: "visa_selected",
      metadata: {
        country,
        visaType,
      },
    });
  }

  /**
   * Track payment completion
   */
  async trackPaymentCompleted(amount: number, method: string, country: string): Promise<void> {
    await this.trackEvent({
      eventType: "payment_completed",
      metadata: {
        amount,
        method,
        country,
      },
    });
  }

  /**
   * Track document upload
   */
  async trackDocumentUploaded(documentType: string, applicationId: string): Promise<void> {
    await this.trackEvent({
      eventType: "document_uploaded",
      metadata: {
        documentType,
        applicationId,
      },
    });
  }

  /**
   * Track chat message
   */
  async trackChatMessage(sessionId: string, characterCount: number): Promise<void> {
    await this.trackEvent({
      eventType: "chat_message",
      metadata: {
        sessionId,
        characterCount,
      },
    });
  }

  /**
   * Track login
   */
  async trackLogin(method: string = "email"): Promise<void> {
    await this.trackEvent({
      eventType: "login",
      metadata: {
        method,
      },
    });
  }

  /**
   * Track app opened
   */
  async trackAppOpened(): Promise<void> {
    await this.trackEvent({
      eventType: "app_opened",
    });
  }

  /**
   * Get metrics for a period
   */
  async getMetrics(days: number = 30): Promise<any> {
    try {
      const response = await api.get(`/admin/analytics/metrics?days=${days}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching metrics:", error);
      throw error;
    }
  }

  /**
   * Get conversion funnel
   */
  async getConversionFunnel(): Promise<any> {
    try {
      const response = await api.get("/admin/analytics/conversion-funnel");
      return response.data;
    } catch (error) {
      console.error("Error fetching conversion funnel:", error);
      throw error;
    }
  }

  /**
   * Get user acquisition breakdown
   */
  async getUserAcquisition(): Promise<Record<string, number>> {
    try {
      const response = await api.get("/admin/analytics/user-acquisition");
      return response.data;
    } catch (error) {
      console.error("Error fetching user acquisition:", error);
      throw error;
    }
  }

  /**
   * Get event breakdown
   */
  async getEventBreakdown(days: number = 30): Promise<Record<string, number>> {
    try {
      const response = await api.get(`/admin/analytics/events?days=${days}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching event breakdown:", error);
      throw error;
    }
  }
}

export default new AnalyticsService();