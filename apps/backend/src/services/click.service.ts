import crypto from "crypto";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

interface ClickConfig {
  merchantId: string;
  serviceId: string;
  apiKey: string;
  apiUrl: string; // https://api.click.uz/v2 for production
}

interface CreatePaymentParams {
  userId: string;
  applicationId: string;
  amount: number;
  returnUrl: string;
  description?: string;
}

/**
 * Click Payment Gateway Service
 * Click is a payment gateway for Uzbekistan
 * Documentation: https://click.uz/docs
 */
export class ClickService {
  private config: ClickConfig;
  private prisma: PrismaClient;

  constructor(config: ClickConfig, prisma: PrismaClient) {
    this.config = config;
    this.prisma = prisma;

    if (!config.merchantId || !config.serviceId || !config.apiKey) {
      throw new Error(
        "Click configuration incomplete: merchantId, serviceId, and apiKey required"
      );
    }
  }

  /**
   * Generate merchant transaction ID
   */
  private generateMerchantTransId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a payment link
   */
  async createPayment(params: CreatePaymentParams): Promise<{
    paymentUrl: string;
    merchantTransId: string;
    transactionId: string;
  }> {
    const merchantTransId = this.generateMerchantTransId();
    const amountInTiyn = Math.round(params.amount * 100); // Convert USD to tiyn

    try {
      // Save payment record
      const payment = await this.prisma.payment.create({
        data: {
          userId: params.userId,
          applicationId: params.applicationId,
          amount: params.amount,
          currency: "UZS",
          status: "pending",
          paymentMethod: "click",
          orderId: merchantTransId,
          paymentGatewayData: JSON.stringify({
            merchantTransId,
            createdAt: new Date().toISOString(),
            description: params.description,
            serviceId: this.config.serviceId,
          }),
        },
      });

      // Build Click payment URL
      const paymentUrl = this.buildPaymentUrl(
        merchantTransId,
        amountInTiyn,
        params.returnUrl,
        params.description
      );

      return {
        paymentUrl,
        merchantTransId,
        transactionId: payment.id,
      };
    } catch (error) {
      console.error("Error creating Click payment:", error);
      throw error;
    }
  }

  /**
   * Build Click payment URL
   */
  private buildPaymentUrl(
    merchantTransId: string,
    amount: number,
    returnUrl: string,
    description?: string
  ): string {
    const params = new URLSearchParams({
      service_id: this.config.serviceId,
      merchant_id: this.config.merchantId,
      amount: amount.toString(),
      transaction_param: merchantTransId,
      return_url: returnUrl,
      description: description || "Visa Application Payment",
    });

    // For Click, we generate a simple checkout URL
    return `${this.config.apiUrl}/checkout/pay/${this.config.serviceId}?${params.toString()}`;
  }

  /**
   * Generate signature for Click API requests
   */
  private generateSignature(data: string): string {
    return crypto
      .createHmac("sha256", this.config.apiKey)
      .update(data)
      .digest("hex");
  }

  /**
   * Check transaction status via API
   */
  async checkTransaction(merchantTransId: string): Promise<any> {
    try {
      const payload = {
        service_id: parseInt(this.config.serviceId),
        merchant_id: parseInt(this.config.merchantId),
        transaction_param: merchantTransId,
      };

      const response = await axios.post(
        `${this.config.apiUrl}/merchant/trans/status`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error checking Click transaction:", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Process webhook from Click
   */
  async processWebhook(webhookData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { merchant_trans_id, status, sign } = webhookData;

      // Verify signature
      const dataToSign = `${merchant_trans_id}${this.config.apiKey}`;
      const expectedSignature = crypto
        .createHmac("sha256", this.config.apiKey)
        .update(dataToSign)
        .digest("hex");

      if (sign !== expectedSignature) {
        return {
          success: false,
          error: "Invalid signature",
        };
      }

      // Find payment
      const payment = await this.prisma.payment.findFirst({
        where: {
          orderId: merchant_trans_id,
          paymentMethod: "click",
        },
      });

      if (!payment) {
        return {
          success: false,
          error: "Payment not found",
        };
      }

      // Click status codes: 0 = pending, 1 = completed, -1 = failed
      if (status === 1) {
        // Payment completed
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "completed",
            transactionId: webhookData.click_trans_id,
            paidAt: new Date(),
            paymentGatewayData: JSON.stringify(webhookData),
          },
        });

        // Update visa application status
        await this.prisma.visaApplication.update({
          where: { id: payment.applicationId },
          data: {
            status: "submitted",
          },
        });

        console.log(`Click payment completed: ${payment.id}`);
        return { success: true };
      }

      if (status === -1) {
        // Payment failed
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "failed",
            paymentGatewayData: JSON.stringify(webhookData),
          },
        });

        console.log(`Click payment failed: ${payment.id}`);
        return { success: true };
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error processing Click webhook:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify payment completion
   */
  async verifyPayment(transactionId: string): Promise<boolean> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: transactionId },
      });

      if (!payment) {
        return false;
      }

      if (payment.status === "completed") {
        return true;
      }

      // Check with Click API
      if (payment.orderId) {
        const result = await this.checkTransaction(payment.orderId);

        if (result.success && result.data) {
          const transaction = result.data;

          if (transaction.status === 1) {
            // Status 1 = completed
            await this.prisma.payment.update({
              where: { id: transactionId },
              data: {
                status: "completed",
                transactionId: transaction.click_trans_id,
                paidAt: new Date(),
              },
            });

            await this.prisma.visaApplication.update({
              where: { id: payment.applicationId },
              data: {
                status: "submitted",
              },
            });

            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error("Error verifying Click payment:", error);
      return false;
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string): Promise<any> {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        application: true,
      },
    });
  }

  /**
   * Cancel payment
   */
  async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment || payment.status !== "pending") {
        return false;
      }

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: "failed" },
      });

      return true;
    } catch (error) {
      console.error("Error canceling Click payment:", error);
      return false;
    }
  }
}