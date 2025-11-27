import crypto from 'crypto';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

interface UzumConfig {
  serviceId: string;
  apiKey: string;
  apiUrl: string; // https://api.uzum.uz/api/merchant for production
}

interface CreatePaymentParams {
  userId: string;
  applicationId: string;
  amount: number;
  returnUrl: string;
  description?: string;
}

/**
 * Uzum Payment Gateway Service
 * Uzum is a digital payment platform for Uzbekistan
 * Documentation: https://uzum.uz/merchant
 */
export class UzumService {
  private config: UzumConfig;
  private prisma: PrismaClient;

  constructor(config: UzumConfig, prisma: PrismaClient) {
    this.config = config;
    this.prisma = prisma;

    if (!config.serviceId || !config.apiKey) {
      throw new Error('Uzum configuration incomplete: serviceId and apiKey required');
    }
  }

  /**
   * Generate merchant transaction ID
   */
  private generateMerchantTransId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a payment session
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
          currency: 'UZS',
          status: 'pending',
          paymentMethod: 'uzum',
          orderId: merchantTransId,
          paymentGatewayData: JSON.stringify({
            merchantTransId,
            createdAt: new Date().toISOString(),
            description: params.description,
          }),
        },
      });

      // Create payment session via Uzum API
      const payload = {
        service_id: this.config.serviceId,
        amount: amountInTiyn,
        transaction_param: merchantTransId,
        return_url: params.returnUrl,
        description: params.description || 'Visa Application Payment',
        language: 'en',
      };

      const signature = this.generateSignature(JSON.stringify(payload));

      const response = await axios.post(`${this.config.apiUrl}/create-payment-session`, payload, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'X-Sign': signature,
          'Content-Type': 'application/json',
        },
      });

      if (!response.data.session_id) {
        throw new Error('Failed to create Uzum payment session');
      }

      // Build payment URL
      const paymentUrl = `${this.config.apiUrl.replace('/api/merchant', '')}/checkout/${response.data.session_id}`;

      return {
        paymentUrl,
        merchantTransId,
        transactionId: payment.id,
      };
    } catch (error) {
      console.error('Error creating Uzum payment:', error);
      throw error;
    }
  }

  /**
   * Generate signature for Uzum requests
   */
  private generateSignature(data: string): string {
    return crypto.createHmac('sha256', this.config.apiKey).update(data).digest('hex');
  }

  /**
   * Check transaction status via API
   */
  async checkTransaction(merchantTransId: string): Promise<any> {
    try {
      const payload = {
        service_id: this.config.serviceId,
        transaction_param: merchantTransId,
      };

      const signature = this.generateSignature(JSON.stringify(payload));

      const response = await axios.post(`${this.config.apiUrl}/check-payment-session`, payload, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'X-Sign': signature,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Error checking Uzum transaction:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Process webhook from Uzum
   */
  async processWebhook(webhookData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { transaction_param, status, sign } = webhookData;

      // Verify signature
      const dataToSign = `${transaction_param}${this.config.apiKey}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.apiKey)
        .update(dataToSign)
        .digest('hex');

      if (sign !== expectedSignature) {
        return {
          success: false,
          error: 'Invalid signature',
        };
      }

      // Find payment
      const payment = await this.prisma.payment.findFirst({
        where: {
          orderId: transaction_param,
          paymentMethod: 'uzum',
        },
      });

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found',
        };
      }

      // Uzum status codes: "pending" | "completed" | "failed" | "cancelled"
      if (status === 'completed') {
        // Payment completed
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'completed',
            transactionId: webhookData.uzum_trans_id,
            paidAt: new Date(),
            paymentGatewayData: JSON.stringify(webhookData),
          },
        });

        // Update visa application status
        await this.prisma.visaApplication.update({
          where: { id: payment.applicationId },
          data: {
            status: 'submitted',
          },
        });

        console.log(`Uzum payment completed: ${payment.id}`);
        return { success: true };
      }

      if (status === 'failed' || status === 'cancelled') {
        // Payment failed or cancelled
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'failed',
            paymentGatewayData: JSON.stringify(webhookData),
          },
        });

        console.log(`Uzum payment failed/cancelled: ${payment.id}`);
        return { success: true };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error processing Uzum webhook:', error);
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

      if (payment.status === 'completed') {
        return true;
      }

      // Check with Uzum API
      if (payment.orderId) {
        const result = await this.checkTransaction(payment.orderId);

        if (result.success && result.status === 'completed') {
          await this.prisma.payment.update({
            where: { id: transactionId },
            data: {
              status: 'completed',
              transactionId: result.uzum_trans_id,
              paidAt: new Date(),
            },
          });

          await this.prisma.visaApplication.update({
            where: { id: payment.applicationId },
            data: {
              status: 'submitted',
            },
          });

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error verifying Uzum payment:', error);
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

      if (!payment || payment.status !== 'pending') {
        return false;
      }

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'failed' },
      });

      return true;
    } catch (error) {
      console.error('Error canceling Uzum payment:', error);
      return false;
    }
  }
}
