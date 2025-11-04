import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';
import { PaymentAuditLogger, PaymentAuditAction } from './payment-audit-logger';
import { PaymentError, PaymentErrorCode, PaymentErrorSeverity } from './payment-errors';

interface RefundRequest {
  paymentId: string;
  amount?: number; // If not provided, full refund
  reason: string;
  initiatedBy: 'user' | 'admin' | 'system';
  notes?: string;
}

interface RefundResult {
  refundId: string;
  paymentId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  gateway: string;
  gatewayRefundId?: string;
  createdAt: Date;
  error?: string;
}

export class PaymentRefundService {
  private prisma: PrismaClient;
  private auditLogger: PaymentAuditLogger;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.auditLogger = new PaymentAuditLogger(prisma);
  }

  /**
   * Initiate a refund for a payment
   */
  async initiateRefund(request: RefundRequest): Promise<RefundResult> {
    const traceId = this.auditLogger.generateTraceId();

    try {
      // Fetch payment details
      const payment = await this.prisma.payment.findUnique({
        where: { id: request.paymentId },
        include: { user: true },
      });

      if (!payment) {
        throw new PaymentError(
          PaymentErrorCode.APPLICATION_NOT_FOUND,
          `Payment ${request.paymentId} not found`,
          PaymentErrorSeverity.HIGH,
          404,
          false
        );
      }

      // Validate refund eligibility
      this.validateRefundEligibility(payment);

      // Calculate refund amount
      const refundAmount = request.amount || payment.amount;
      if (refundAmount > payment.amount) {
        throw new PaymentError(
          PaymentErrorCode.INVALID_AMOUNT,
          `Refund amount ${refundAmount} exceeds payment amount ${payment.amount}`,
          PaymentErrorSeverity.LOW,
          400,
          false
        );
      }

      // Create refund record
      const refund = await this.prisma.refund.create({
        data: {
          paymentId: request.paymentId,
          amount: refundAmount,
          reason: request.reason,
          initiatedBy: request.initiatedBy,
          notes: request.notes,
          status: 'pending',
        },
      });

      // Log refund initiation
      await this.auditLogger.logPaymentInitiated(traceId, 'refund', {
        applicationId: request.paymentId,
        userId: payment.user?.id,
        amount: refundAmount,
        currency: payment.currency || 'USD',
      });

      // Process refund based on gateway
      const result = await this.processRefund(payment, refund, traceId);

      return result;
    } catch (error) {
      const paymentError = error instanceof PaymentError
        ? error
        : new PaymentError(
            PaymentErrorCode.UNKNOWN_ERROR,
            `Refund initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            PaymentErrorSeverity.MEDIUM,
            500,
            false
          );

      // Log error
      await this.auditLogger.logPaymentError(
        traceId,
        'refund',
        paymentError.code,
        paymentError.severity,
        paymentError.message,
        paymentError.statusCode,
        { refundRequest: request }
      );

      throw paymentError;
    }
  }

  /**
   * Process refund through appropriate gateway
   */
  private async processRefund(
    payment: any,
    refund: any,
    traceId: string
  ): Promise<RefundResult> {
    try {
      let gatewayRefundId: string | undefined;
      let status: 'completed' | 'processing' | 'failed' = 'processing';

      switch (payment.paymentMethod.toLowerCase()) {
        case 'payme':
          gatewayRefundId = await this.refundPayme(payment, refund, traceId);
          break;
        case 'click':
          gatewayRefundId = await this.refundClick(payment, refund, traceId);
          break;
        case 'uzum':
          gatewayRefundId = await this.refundUzum(payment, refund, traceId);
          break;
        case 'stripe':
          gatewayRefundId = await this.refundStripe(payment, refund, traceId);
          break;
        default:
          throw new PaymentError(
            PaymentErrorCode.UNKNOWN_ERROR,
            `Refund not supported for gateway: ${payment.paymentMethod}`,
            PaymentErrorSeverity.MEDIUM,
            400,
            false
          );
      }

      // Update refund status
      const updatedRefund = await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: status,
          gatewayRefundId,
          processedAt: new Date(),
        },
      });

      // Update payment status to partially/fully refunded
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: refund.amount === payment.amount ? 'refunded' : 'partially_refunded',
          refundedAmount: {
            increment: refund.amount,
          },
        },
      });

      // Log successful refund
      await this.auditLogger.logOperationCompleted(
        traceId,
        payment.paymentMethod,
        PaymentAuditAction.REFUND_COMPLETED,
        Date.now(),
        refund.id
      );

      return {
        refundId: updatedRefund.id,
        paymentId: payment.id,
        amount: updatedRefund.amount,
        status: updatedRefund.status as any,
        gateway: payment.paymentMethod,
        gatewayRefundId,
        createdAt: updatedRefund.createdAt,
      };
    } catch (error) {
      // Update refund to failed
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'failed', failureReason: error instanceof Error ? error.message : 'Unknown error' },
      });

      throw error;
    }
  }

  /**
   * Refund through Payme gateway
   */
  private async refundPayme(payment: any, refund: any, traceId: string): Promise<string> {
    try {
      const merchantId = process.env.PAYME_MERCHANT_ID;
      const apiKey = process.env.PAYME_API_KEY;
      const apiUrl = process.env.PAYME_API_URL || 'https://checkout.test.payme.uz';

      if (!merchantId || !apiKey) {
        throw new Error('Payme credentials not configured');
      }

      // Payme API call for refund (ReverseTransaction)
      const response = await axios.post(
        `${apiUrl}/api/payment/reversetransaction`,
        {
          jsonrpc: '2.0',
          method: 'ReverseTransaction',
          params: {
            merchant_trans_id: payment.gatewayTransactionId,
          },
          id: traceId,
        },
        {
          headers: {
            'X-Auth': `${merchantId}:${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      if (response.data.error) {
        throw new Error(`Payme refund failed: ${JSON.stringify(response.data.error)}`);
      }

      return response.data.result?.transaction;
    } catch (error) {
      throw new PaymentError(
        PaymentErrorCode.GATEWAY_ERROR,
        `Payme refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        PaymentErrorSeverity.HIGH,
        500,
        false
      );
    }
  }

  /**
   * Refund through Click gateway
   */
  private async refundClick(payment: any, refund: any, traceId: string): Promise<string> {
    try {
      const merchantId = process.env.CLICK_MERCHANT_ID;
      const apiKey = process.env.CLICK_API_KEY;
      const apiUrl = process.env.CLICK_API_URL || 'https://api.click.uz/v2';

      if (!merchantId || !apiKey) {
        throw new Error('Click credentials not configured');
      }

      // Click API call for reversal
      const response = await axios.post(
        `${apiUrl}/merchant/reversal/`,
        {
          click_trans_id: parseInt(payment.gatewayTransactionId),
          reason: 3, // 3 = Merchant initiated refund
        },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          auth: {
            username: merchantId,
            password: apiKey,
          },
          timeout: 15000,
        }
      );

      if (!response.data.success) {
        throw new Error(`Click refund failed: ${response.data.error_note}`);
      }

      return response.data.reversal_id.toString();
    } catch (error) {
      throw new PaymentError(
        PaymentErrorCode.GATEWAY_ERROR,
        `Click refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        PaymentErrorSeverity.HIGH,
        500,
        false
      );
    }
  }

  /**
   * Refund through Uzum gateway
   */
  private async refundUzum(payment: any, refund: any, traceId: string): Promise<string> {
    try {
      const serviceId = process.env.UZUM_SERVICE_ID;
      const apiKey = process.env.UZUM_API_KEY;
      const apiUrl = process.env.UZUM_API_URL || 'https://api.uzum.uz/api/merchant';

      if (!serviceId || !apiKey) {
        throw new Error('Uzum credentials not configured');
      }

      // Generate request signature
      const timestamp = Math.floor(Date.now() / 1000);
      const requestId = `${timestamp}-${traceId}`;
      const signatureString = `${payment.gatewayTransactionId}{${refund.amount}}${serviceId}{${requestId}}{${timestamp}}`;
      const signature = crypto
        .createHash('sha256')
        .update(signatureString + apiKey)
        .digest('hex');

      // Uzum API call for cancellation
      const response = await axios.post(
        `${apiUrl}/transactions/${payment.gatewayTransactionId}/cancel`,
        {
          amount: refund.amount,
          request_id: requestId,
          timestamp,
          signature,
        },
        {
          headers: {
            'Service-Id': serviceId,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      if (!response.data.ok) {
        throw new Error(`Uzum refund failed: ${response.data.error}`);
      }

      return response.data.transaction_id;
    } catch (error) {
      throw new PaymentError(
        PaymentErrorCode.GATEWAY_ERROR,
        `Uzum refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        PaymentErrorSeverity.HIGH,
        500,
        false
      );
    }
  }

  /**
   * Refund through Stripe gateway
   */
  private async refundStripe(payment: any, refund: any, traceId: string): Promise<string> {
    try {
      const apiKey = process.env.STRIPE_SECRET_KEY;

      if (!apiKey) {
        throw new Error('Stripe API key not configured');
      }

      // Use Stripe SDK (assuming it's installed)
      const stripe = require('stripe')(apiKey);

      const refundResult = await stripe.refunds.create({
        charge: payment.gatewayTransactionId,
        amount: Math.round(refund.amount * 100), // Convert to cents
        metadata: {
          traceId,
          reason: refund.reason,
        },
      });

      return refundResult.id;
    } catch (error) {
      throw new PaymentError(
        PaymentErrorCode.GATEWAY_ERROR,
        `Stripe refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        PaymentErrorSeverity.HIGH,
        500,
        false
      );
    }
  }

  /**
   * Validate refund eligibility
   */
  private validateRefundEligibility(payment: any): void {
    // Check if payment is in a refundable status
    const refundableStatuses = ['completed', 'partially_refunded'];
    if (!refundableStatuses.includes(payment.status)) {
      throw new PaymentError(
        PaymentErrorCode.INVALID_STATE,
        `Cannot refund payment with status: ${payment.status}`,
        PaymentErrorSeverity.MEDIUM,
        400,
        false
      );
    }

    // Check if payment is older than 180 days (typical refund window)
    const paymentDate = new Date(payment.completedAt || payment.createdAt);
    const daysSince = Math.floor(
      (Date.now() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince > 180) {
      throw new PaymentError(
        PaymentErrorCode.REFUND_WINDOW_EXPIRED,
        `Refund window expired (180 days). Payment is ${daysSince} days old`,
        PaymentErrorSeverity.MEDIUM,
        400,
        false
      );
    }
  }

  /**
   * Get refund history for a payment
   */
  async getRefundHistory(paymentId: string): Promise<any[]> {
    return this.prisma.refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get refund status
   */
  async getRefundStatus(refundId: string): Promise<any> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });

    if (!refund) {
      throw new PaymentError(
        PaymentErrorCode.REFUND_NOT_FOUND,
        `Refund ${refundId} not found`,
        PaymentErrorSeverity.LOW,
        404,
        false
      );
    }

    return refund;
  }

  /**
   * Cancel a pending refund
   */
  async cancelRefund(refundId: string, reason: string): Promise<void> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new PaymentError(
        PaymentErrorCode.REFUND_NOT_FOUND,
        `Refund ${refundId} not found`,
        PaymentErrorSeverity.LOW,
        404,
        false
      );
    }

    if (refund.status !== 'pending') {
      throw new PaymentError(
        PaymentErrorCode.INVALID_STATE,
        `Cannot cancel refund with status: ${refund.status}`,
        PaymentErrorSeverity.MEDIUM,
        400,
        false
      );
    }

    await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: 'failed',
        failureReason: reason,
      },
    });
  }
}