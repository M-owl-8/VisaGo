/**
 * Payment Gateway Integration Service
 * Handles integration with 4 payment gateways:
 * 1. Payme - Uzbekistan's leading payment provider
 * 2. Click - Central Asia payment system
 * 3. Uzum - Mobile payment service
 * 4. Stripe - International payment processor
 */

import axios, { AxiosInstance } from "axios";
import { apiClient } from "./api";

export interface PaymentGatewayConfig {
  name: string;
  id: "payme" | "click" | "uzum" | "stripe";
  baseUrl: string;
  icon: string;
  description: string;
  supportedCurrencies: string[];
  supportsRefunds: boolean;
  testMode: boolean;
}

export interface PaymentRequest {
  applicationId: string;
  amount: number;
  currency: string;
  paymentMethod: "payme" | "click" | "uzum" | "stripe";
  returnUrl: string;
  callbackUrl?: string;
}

export interface PaymentResponse {
  transactionId: string;
  paymentUrl: string;
  status: "pending" | "processing" | "completed" | "failed";
  gateway: string;
  redirectData?: {
    merchantTransId?: string;
    sessionId?: string;
    orderId?: string;
  };
}

export interface PaymentStatusResponse {
  transactionId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  amount: number;
  currency: string;
  gateway: string;
  verificationData?: {
    verified: boolean;
    verificationCode?: string;
    message?: string;
  };
}

export interface PaymentHistory {
  id: string;
  transactionId: string;
  applicationId: string;
  amount: number;
  currency: string;
  gateway: "payme" | "click" | "uzum" | "stripe";
  status: "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded";
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  receiptUrl?: string;
}

class PaymentGatewayService {
  private gatewayConfigs: Map<string, PaymentGatewayConfig>;
  private pollingIntervals: Map<string, ReturnType<typeof setInterval>>;

  constructor() {
    this.gatewayConfigs = new Map();
    this.pollingIntervals = new Map();
    this.initializeGateways();
  }

  private initializeGateways(): void {
    // Payme Configuration
    this.gatewayConfigs.set("payme", {
      name: "Payme",
      id: "payme",
      baseUrl: "https://checkout.payme.uz",
      icon: "💳",
      description: "Pay with Payme wallet or card",
      supportedCurrencies: ["UZS", "USD"],
      supportsRefunds: true,
      testMode: true,
    });

    // Click Configuration
    this.gatewayConfigs.set("click", {
      name: "Click",
      id: "click",
      baseUrl: "https://api.click.uz",
      icon: "🏦",
      description: "Central Asian payment system",
      supportedCurrencies: ["UZS", "USD"],
      supportsRefunds: true,
      testMode: true,
    });

    // Uzum Configuration
    this.gatewayConfigs.set("uzum", {
      name: "Uzum",
      id: "uzum",
      baseUrl: "https://api.uzum.uz",
      icon: "📱",
      description: "Mobile payment service",
      supportedCurrencies: ["UZS"],
      supportsRefunds: true,
      testMode: true,
    });

    // Stripe Configuration
    this.gatewayConfigs.set("stripe", {
      name: "Stripe",
      id: "stripe",
      baseUrl: "https://api.stripe.com",
      icon: "💰",
      description: "International payment processor",
      supportedCurrencies: ["USD", "EUR", "GBP", "UZS"],
      supportsRefunds: true,
      testMode: true,
    });
  }

  /**
   * Get all available payment gateways
   */
  getAvailableGateways(): PaymentGatewayConfig[] {
    return Array.from(this.gatewayConfigs.values());
  }

  /**
   * Get specific gateway configuration
   */
  getGatewayConfig(gatewayId: string): PaymentGatewayConfig | undefined {
    return this.gatewayConfigs.get(gatewayId);
  }

  /**
   * Initiate payment with selected gateway
   */
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Call backend to initialize payment
      const response = await apiClient.initiatePayment(
        request.applicationId,
        request.returnUrl,
        request.paymentMethod
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "Failed to initiate payment");
      }

      return {
        transactionId: response.data.transactionId,
        paymentUrl: response.data.paymentUrl,
        status: "pending",
        gateway: request.paymentMethod,
        redirectData: {
          merchantTransId: response.data.merchantTransId,
          sessionId: response.data.sessionId,
          orderId: response.data.orderId,
        },
      };
    } catch (error: any) {
      console.error(`Payment initiation failed for ${request.paymentMethod}:`, error);
      throw error;
    }
  }

  /**
   * Check payment status with specific gateway
   */
  async checkPaymentStatus(
    transactionId: string,
    gateway: string
  ): Promise<PaymentStatusResponse> {
    try {
      const response = await apiClient.verifyPayment(transactionId);

      if (!response.success || !response.data) {
        throw new Error("Payment verification failed");
      }

      return {
        transactionId,
        status: response.data.status || "pending",
        amount: response.data.amount,
        currency: response.data.currency,
        gateway,
        verificationData: {
          verified: response.data.verified || false,
          verificationCode: response.data.verificationCode,
          message: response.data.message,
        },
      };
    } catch (error: any) {
      console.error(`Failed to check payment status for ${gateway}:`, error);
      throw error;
    }
  }

  /**
   * Start polling for payment status
   * Polls every 2 seconds for 2 minutes (120 seconds total)
   */
  startPaymentPolling(
    transactionId: string,
    gateway: string,
    onStatusChange: (status: PaymentStatusResponse) => void,
    onTimeout?: () => void
  ): string {
    const pollId = `${transactionId}-${Date.now()}`;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes at 2-second intervals

    const interval = setInterval(async () => {
      attempts++;

      try {
        const status = await this.checkPaymentStatus(transactionId, gateway);

        // Call the callback with updated status
        onStatusChange(status);

        // Stop polling if payment is completed or failed
        if (status.status === "completed" || status.status === "failed" || status.status === "cancelled") {
          this.stopPaymentPolling(pollId);
        }

        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          this.stopPaymentPolling(pollId);
          if (onTimeout) {
            onTimeout();
          }
        }
      } catch (error) {
        console.error(`Polling error for ${transactionId}:`, error);
        // Continue polling even on errors
      }
    }, 2000); // Poll every 2 seconds

    this.pollingIntervals.set(pollId, interval);
    return pollId;
  }

  /**
   * Stop payment polling
   */
  stopPaymentPolling(pollId: string): void {
    const interval = this.pollingIntervals.get(pollId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(pollId);
    }
  }

  /**
   * Stop all active polling
   */
  stopAllPolling(): void {
    this.pollingIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.pollingIntervals.clear();
  }

  /**
   * Get payment history for user
   */
  async getPaymentHistory(): Promise<PaymentHistory[]> {
    try {
      const response = await apiClient.getUserPayments();

      if (!response.success || !response.data) {
        return [];
      }

      return response.data.map((payment: any) => ({
        id: payment.id,
        transactionId: payment.transactionId || payment.id,
        applicationId: payment.applicationId,
        amount: payment.amount,
        currency: payment.currency || "USD",
        gateway: payment.paymentMethod,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        completedAt: payment.paidAt,
        receiptUrl: payment.receiptUrl,
      }));
    } catch (error: any) {
      console.error("Failed to fetch payment history:", error);
      return [];
    }
  }

  /**
   * Get specific payment details
   */
  async getPaymentDetails(transactionId: string): Promise<PaymentHistory | null> {
    try {
      const response = await apiClient.getPayment(transactionId);

      if (!response.success || !response.data) {
        return null;
      }

      const payment = response.data;
      return {
        id: payment.id,
        transactionId: payment.transactionId || payment.id,
        applicationId: payment.applicationId,
        amount: payment.amount,
        currency: payment.currency || "USD",
        gateway: payment.paymentMethod,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        completedAt: payment.paidAt,
        receiptUrl: payment.receiptUrl,
      };
    } catch (error: any) {
      console.error("Failed to fetch payment details:", error);
      return null;
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(transactionId: string): Promise<boolean> {
    try {
      const response = await apiClient.cancelPayment(transactionId);
      return response.success;
    } catch (error: any) {
      console.error("Failed to cancel payment:", error);
      return false;
    }
  }

  /**
   * Request refund for payment
   */
  async requestRefund(transactionId: string, reason: string): Promise<boolean> {
    try {
      // This would call a backend endpoint for refunds
      // For now, we'll use the cancel endpoint
      const cancelled = await this.cancelPayment(transactionId);
      return cancelled;
    } catch (error: any) {
      console.error("Failed to request refund:", error);
      return false;
    }
  }

  /**
   * Format payment amount for display
   */
  formatAmount(amount: number, currency: string): string {
    const currencySymbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      UZS: "сўм",
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol} ${amount.toFixed(2)}`;
  }

  /**
   * Validate payment request
   */
  validatePaymentRequest(request: PaymentRequest): { valid: boolean; error?: string } {
    if (!request.applicationId) {
      return { valid: false, error: "Application ID is required" };
    }

    if (!request.amount || request.amount <= 0) {
      return { valid: false, error: "Amount must be greater than 0" };
    }

    if (!request.paymentMethod) {
      return { valid: false, error: "Payment method is required" };
    }

    if (!request.returnUrl) {
      return { valid: false, error: "Return URL is required" };
    }

    const gateway = this.gatewayConfigs.get(request.paymentMethod);
    if (!gateway) {
      return { valid: false, error: `Unknown payment method: ${request.paymentMethod}` };
    }

    if (!gateway.supportedCurrencies.includes(request.currency)) {
      return {
        valid: false,
        error: `${gateway.name} does not support ${request.currency}`,
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const paymentGatewayService = new PaymentGatewayService();