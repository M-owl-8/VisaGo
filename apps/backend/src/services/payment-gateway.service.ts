import { PrismaClient } from '@prisma/client';
import { PaymeService } from './payme.service';
import { ClickService } from './click.service';
import { UzumService } from './uzum.service';
import { StripeService } from './stripe.service';
import { MockPaymentService } from './mock-payment.service';
import {
  PaymentError,
  PaymentErrorCode,
  PaymentErrorSeverity,
  PaymentErrorClassifier,
} from './payment-errors';
import { PaymentAuditLogger, PaymentAuditAction } from './payment-audit-logger';
import { PaymentRetry, DEFAULT_RETRY_CONFIG, RetryConfig } from './payment-retry';
import { WebhookSecurityService } from './webhook-security';

export type PaymentMethod = 'payme' | 'click' | 'uzum' | 'stripe' | 'mock';
export type FallbackStrategy = 'sequential' | 'random';

interface PaymentGatewayConfig {
  payme?: {
    merchantId: string;
    apiKey: string;
    apiUrl: string;
  };
  click?: {
    merchantId: string;
    serviceId: string;
    apiKey: string;
    apiUrl: string;
  };
  uzum?: {
    serviceId: string;
    apiKey: string;
    apiUrl: string;
  };
  stripe?: {
    apiKey: string;
    webhookSecret: string;
  };
  retryConfig?: RetryConfig;
  fallbackStrategy?: FallbackStrategy;
  primaryMethod?: PaymentMethod;
}

interface CreatePaymentParams {
  userId: string;
  applicationId: string;
  amount: number;
  returnUrl: string;
  description?: string;
  userEmail?: string;
}

/**
 * Payment Gateway Router Service
 * Routes payment requests to the appropriate gateway with error handling,
 * retry logic, and fallback mechanisms
 */
export class PaymentGatewayService {
  private paymeService: PaymeService | null = null;
  private clickService: ClickService | null = null;
  private uzumService: UzumService | null = null;
  private stripeService: StripeService | null = null;
  private mockService: MockPaymentService | null = null;
  private prisma: PrismaClient;
  private auditLogger: PaymentAuditLogger;
  private retryService: PaymentRetry;
  private webhookSecurity: WebhookSecurityService;
  private retryConfig: RetryConfig;
  private fallbackStrategy: FallbackStrategy;
  private primaryMethod: PaymentMethod;

  constructor(config: PaymentGatewayConfig, prisma: PrismaClient) {
    this.prisma = prisma;
    this.auditLogger = new PaymentAuditLogger(prisma);
    this.webhookSecurity = new WebhookSecurityService(prisma);
    this.retryConfig = config.retryConfig || DEFAULT_RETRY_CONFIG;
    this.retryService = new PaymentRetry(this.auditLogger, this.retryConfig);
    this.fallbackStrategy = config.fallbackStrategy || 'sequential';
    this.primaryMethod = config.primaryMethod || 'payme';

    // Initialize available payment gateways
    // Only initialize if config is complete (has all required fields)
    if (config.payme && config.payme.merchantId && config.payme.apiKey) {
      try {
        this.paymeService = new PaymeService(config.payme, prisma);
      } catch (error) {
        console.warn(
          '⚠️  Payme service initialization skipped:',
          error instanceof Error ? error.message : error
        );
      }
    }

    if (config.click && config.click.merchantId && config.click.apiKey) {
      try {
        this.clickService = new ClickService(config.click, prisma);
      } catch (error) {
        console.warn(
          '⚠️  Click service initialization skipped:',
          error instanceof Error ? error.message : error
        );
      }
    }

    if (config.uzum && config.uzum.serviceId && config.uzum.apiKey) {
      try {
        this.uzumService = new UzumService(config.uzum, prisma);
      } catch (error) {
        console.warn(
          '⚠️  Uzum service initialization skipped:',
          error instanceof Error ? error.message : error
        );
      }
    }

    if (config.stripe && config.stripe.apiKey) {
      try {
        this.stripeService = new StripeService(config.stripe, prisma);
      } catch (error) {
        console.warn(
          '⚠️  Stripe service initialization skipped:',
          error instanceof Error ? error.message : error
        );
      }
    }

    // Always enable mock service for development/testing
    if (process.env.NODE_ENV === 'development' || process.env.ENABLE_MOCK_PAYMENTS === 'true') {
      this.mockService = new MockPaymentService({}, prisma);
    }
  }

  /**
   * Get available payment methods
   */
  getAvailableMethods(): PaymentMethod[] {
    const methods: PaymentMethod[] = [];

    if (this.paymeService) methods.push('payme');
    if (this.clickService) methods.push('click');
    if (this.uzumService) methods.push('uzum');
    if (this.stripeService) methods.push('stripe');
    if (this.mockService) methods.push('mock');

    return methods;
  }

  /**
   * Get payment gateway service by method
   */
  private getGateway(method: PaymentMethod): any {
    switch (method) {
      case 'payme':
        if (!this.paymeService)
          throw new PaymentError(
            PaymentErrorCode.MISSING_CONFIGURATION,
            'Payme gateway not configured',
            PaymentErrorSeverity.HIGH,
            500,
            false
          );
        return this.paymeService;
      case 'click':
        if (!this.clickService)
          throw new PaymentError(
            PaymentErrorCode.MISSING_CONFIGURATION,
            'Click gateway not configured',
            PaymentErrorSeverity.HIGH,
            500,
            false
          );
        return this.clickService;
      case 'uzum':
        if (!this.uzumService)
          throw new PaymentError(
            PaymentErrorCode.MISSING_CONFIGURATION,
            'Uzum gateway not configured',
            PaymentErrorSeverity.HIGH,
            500,
            false
          );
        return this.uzumService;
      case 'stripe':
        if (!this.stripeService)
          throw new PaymentError(
            PaymentErrorCode.MISSING_CONFIGURATION,
            'Stripe gateway not configured',
            PaymentErrorSeverity.HIGH,
            500,
            false
          );
        return this.stripeService;
      case 'mock':
        if (!this.mockService)
          throw new PaymentError(
            PaymentErrorCode.MISSING_CONFIGURATION,
            'Mock payment gateway not available',
            PaymentErrorSeverity.HIGH,
            500,
            false
          );
        return this.mockService;
      default:
        throw new PaymentError(
          PaymentErrorCode.UNKNOWN_ERROR,
          `Unknown payment method: ${method}`,
          PaymentErrorSeverity.LOW,
          400,
          false
        );
    }
  }

  /**
   * Get available fallback methods in order
   */
  private getFallbackMethods(primaryMethod: PaymentMethod): PaymentMethod[] {
    const available = this.getAvailableMethods();
    const fallbacks = available.filter((m) => m !== primaryMethod);

    if (this.fallbackStrategy === 'random') {
      // Shuffle array
      return fallbacks.sort(() => Math.random() - 0.5);
    }

    // Sequential: prefer uzum, click, stripe as fallbacks
    return fallbacks.sort((a, b) => {
      const order = { uzum: 0, click: 1, stripe: 2, payme: 3 };
      return (order[a as keyof typeof order] || 999) - (order[b as keyof typeof order] || 999);
    });
  }

  /**
   * Initiate payment with retry and fallback logic
   */
  async initiatePayment(
    method: PaymentMethod,
    params: CreatePaymentParams
  ): Promise<{
    paymentUrl: string;
    transactionId: string;
    [key: string]: any;
  }> {
    const traceId = this.auditLogger.generateTraceId();

    try {
      await this.auditLogger.logPaymentInitiated(traceId, method, params);

      // Validate stripe requires email
      if (method === 'stripe' && !params.userEmail) {
        throw new PaymentError(
          PaymentErrorCode.INVALID_AMOUNT,
          'User email is required for Stripe payments',
          PaymentErrorSeverity.LOW,
          400,
          false
        );
      }

      // Try primary method with retry
      try {
        const gateway = this.getGateway(method);
        return await this.retryService.executeWithRetry(
          traceId,
          method,
          () => gateway.createPayment(params),
          `Payment initiation via ${method}`
        );
      } catch (error: any) {
        const paymentError =
          error instanceof PaymentError
            ? error
            : PaymentErrorClassifier.classifyNetworkError(error);

        await this.auditLogger.logPaymentError(
          traceId,
          method,
          paymentError.code,
          paymentError.severity,
          paymentError.message,
          paymentError.statusCode
        );

        // If primary method fails, try fallbacks
        if (paymentError.retryable || this.getAvailableMethods().length > 1) {
          return await this.initiatePaymentWithFallback(traceId, method, params, paymentError);
        }

        throw paymentError;
      }
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }
      throw PaymentErrorClassifier.classifyNetworkError(error);
    }
  }

  /**
   * Initiate payment with fallback to alternative gateways
   */
  private async initiatePaymentWithFallback(
    traceId: string,
    primaryMethod: PaymentMethod,
    params: CreatePaymentParams,
    primaryError: PaymentError
  ): Promise<any> {
    const fallbackMethods = this.getFallbackMethods(primaryMethod);

    for (const fallbackMethod of fallbackMethods) {
      try {
        await this.auditLogger.logFallbackInitiated(
          traceId,
          primaryMethod,
          fallbackMethod,
          primaryError.message
        );

        const gateway = this.getGateway(fallbackMethod);
        const result = await this.retryService.executeWithRetry(
          traceId,
          fallbackMethod,
          () => gateway.createPayment(params),
          `Payment initiation via ${fallbackMethod} (fallback)`
        );

        return result;
      } catch (error: any) {
        const fallbackError =
          error instanceof PaymentError
            ? error
            : PaymentErrorClassifier.classifyNetworkError(error);

        console.warn(
          `[Payment Gateway] Fallback to ${fallbackMethod} failed:`,
          fallbackError.message
        );
        // Continue to next fallback
      }
    }

    // All methods failed
    throw primaryError;
  }

  /**
   * Verify payment completion with error handling
   */
  async verifyPayment(transactionId: string, method: PaymentMethod): Promise<boolean> {
    const traceId = this.auditLogger.generateTraceId();

    try {
      const gateway = this.getGateway(method);
      return await this.retryService.executeWithRetry(
        traceId,
        method,
        () => gateway.verifyPayment(transactionId),
        `Payment verification`
      );
    } catch (error) {
      const paymentError =
        error instanceof PaymentError ? error : PaymentErrorClassifier.classifyNetworkError(error);

      await this.auditLogger.logPaymentError(
        traceId,
        method,
        paymentError.code,
        paymentError.severity,
        paymentError.message,
        paymentError.statusCode
      );

      throw paymentError;
    }
  }

  /**
   * Get payment details
   */
  async getPayment(transactionId: string): Promise<any> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: transactionId },
        include: {
          user: true,
          application: true,
        },
      });

      if (!payment) {
        throw new PaymentError(
          PaymentErrorCode.APPLICATION_NOT_FOUND,
          'Payment not found',
          PaymentErrorSeverity.LOW,
          404,
          false
        );
      }

      return payment;
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentError(
        PaymentErrorCode.UNKNOWN_ERROR,
        'Failed to fetch payment details',
        PaymentErrorSeverity.HIGH,
        500,
        true
      );
    }
  }

  /**
   * Process webhook with security and idempotency checks
   */
  async processWebhook(
    method: PaymentMethod,
    data: any,
    signature?: string,
    webhookId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const traceId = this.auditLogger.generateTraceId();

    try {
      // Generate webhook ID if not provided
      const finalWebhookId = webhookId || `${method}-${Date.now()}`;

      await this.auditLogger.logWebhookReceived(traceId, method, finalWebhookId);

      // Check for duplicate webhook
      const isDuplicate = await this.webhookSecurity.isWebhookDuplicate(
        finalWebhookId,
        method,
        data.transaction_id || data.id || ''
      );

      if (isDuplicate) {
        await this.auditLogger.log({
          action: PaymentAuditAction.WEBHOOK_DUPLICATE_DETECTED,
          paymentMethod: method,
          message: `Duplicate webhook detected and skipped`,
          details: { webhookId: finalWebhookId },
          requestTrace: traceId,
        });

        return { success: true }; // Return success to stop gateway retries
      }

      // Verify webhook signature
      if (!(await this.verifyWebhookSignature(method, data, signature))) {
        await this.auditLogger.logWebhookVerificationFailed(traceId, method, 'Invalid signature');

        const error = PaymentErrorClassifier.classifyWebhookError(
          new Error('Signature verification failed'),
          method
        );

        await this.webhookSecurity.recordWebhookAttempt(
          finalWebhookId,
          method,
          data.transaction_id || data.id || '',
          data.event_type || 'payment',
          data,
          signature || '',
          false,
          'Signature verification failed'
        );

        return {
          success: false,
          error: error.message,
        };
      }

      await this.auditLogger.log({
        action: PaymentAuditAction.WEBHOOK_VERIFIED,
        paymentMethod: method,
        message: `Webhook signature verified`,
        details: {},
        requestTrace: traceId,
      });

      // Process webhook
      const gateway = this.getGateway(method);
      const result = await this.retryService.executeWithRetry(
        traceId,
        method,
        () => {
          switch (method) {
            case 'payme':
              return gateway.processWebhook(data, signature);
            case 'click':
              return gateway.processWebhook(data);
            case 'uzum':
              return gateway.processWebhook(data);
            case 'stripe':
              return gateway.processWebhook(data, signature);
            default:
              throw new Error(`Unknown payment method: ${method}`);
          }
        },
        `Webhook processing`
      );

      // Record successful webhook processing
      await this.webhookSecurity.recordWebhookAttempt(
        finalWebhookId,
        method,
        data.transaction_id || data.id || '',
        data.event_type || 'payment',
        data,
        signature || '',
        true
      );

      await this.auditLogger.log({
        action: PaymentAuditAction.WEBHOOK_PROCESSED,
        paymentMethod: method,
        transactionId: data.transaction_id || data.id,
        message: `Webhook processed successfully`,
        details: { result },
        requestTrace: traceId,
      });

      // Ensure result matches expected return type
      if (result && typeof result === 'object' && 'success' in result) {
        return result as { success: boolean; error?: string };
      }

      return { success: true };
    } catch (error: any) {
      const paymentError =
        error instanceof PaymentError
          ? error
          : PaymentErrorClassifier.classifyWebhookError(error, method);

      console.error(`[Payment Gateway] Webhook processing failed for ${method}:`, error);

      return {
        success: false,
        error: paymentError.message,
      };
    }
  }

  /**
   * Verify webhook signature based on payment method
   */
  private async verifyWebhookSignature(
    method: PaymentMethod,
    data: any,
    signature?: string
  ): Promise<boolean> {
    if (!signature) {
      return false;
    }

    try {
      switch (method) {
        case 'payme':
          return this.webhookSecurity.verifyPaymeSignature(
            data.params,
            signature,
            process.env.PAYME_API_KEY || ''
          );
        case 'click':
          return this.webhookSecurity.verifyClickSignature(
            data,
            signature,
            process.env.CLICK_API_KEY || ''
          );
        case 'uzum':
          return this.webhookSecurity.verifyUzumSignature(
            data,
            signature,
            process.env.UZUM_API_KEY || ''
          );
        case 'stripe':
          return this.webhookSecurity.verifyStripeSignature(
            data,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET || ''
          );
        default:
          return false;
      }
    } catch (error) {
      console.error(`[Payment Gateway] Signature verification error for ${method}:`, error);
      return false;
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(transactionId: string): Promise<boolean> {
    const traceId = this.auditLogger.generateTraceId();

    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: transactionId },
      });

      if (!payment) {
        throw new PaymentError(
          PaymentErrorCode.APPLICATION_NOT_FOUND,
          'Payment not found',
          PaymentErrorSeverity.LOW,
          404,
          false
        );
      }

      const method = payment.paymentMethod as PaymentMethod;
      const gateway = this.getGateway(method);

      return await this.retryService.executeWithRetry(
        traceId,
        method,
        () => gateway.cancelPayment(transactionId),
        `Payment cancellation`
      );
    } catch (error) {
      const paymentError =
        error instanceof PaymentError ? error : PaymentErrorClassifier.classifyNetworkError(error);

      throw paymentError;
    }
  }

  /**
   * Get user payments
   */
  async getUserPayments(userId: string): Promise<any[]> {
    try {
      return await this.prisma.payment.findMany({
        where: { userId },
        include: {
          application: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new PaymentError(
        PaymentErrorCode.UNKNOWN_ERROR,
        'Failed to fetch user payments',
        PaymentErrorSeverity.HIGH,
        500,
        true
      );
    }
  }

  /**
   * Create refund (for gateways that support it)
   */
  async createRefund(transactionId: string, reason?: string): Promise<boolean> {
    const traceId = this.auditLogger.generateTraceId();

    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: transactionId },
      });

      if (!payment) {
        throw new PaymentError(
          PaymentErrorCode.APPLICATION_NOT_FOUND,
          'Payment not found',
          PaymentErrorSeverity.LOW,
          404,
          false
        );
      }

      const method = payment.paymentMethod as PaymentMethod;

      // Currently only Stripe supports refunds
      if (method === 'stripe' && this.stripeService) {
        return await this.retryService.executeWithRetry(
          traceId,
          method,
          () => this.stripeService!.createRefund(transactionId, reason),
          `Refund processing`
        );
      }

      throw new PaymentError(
        PaymentErrorCode.REFUND_NOT_SUPPORTED,
        `Refunds are not supported for ${method}`,
        PaymentErrorSeverity.LOW,
        400,
        false
      );
    } catch (error) {
      const paymentError =
        error instanceof PaymentError ? error : PaymentErrorClassifier.classifyNetworkError(error);

      throw paymentError;
    }
  }

  /**
   * Get payment method info
   */
  getMethodInfo(method: PaymentMethod): {
    name: string;
    description: string;
    supportedCurrencies: string[];
    supportsRefunds: boolean;
  } {
    const methodInfoMap = {
      mock: {
        name: 'Mock Payment',
        description: 'Development/testing payment provider',
        supportedCurrencies: ['USD', 'UZS', 'EUR'],
        supportsRefunds: true,
      },
      payme: {
        name: 'Payme',
        description: 'Popular payment gateway in Uzbekistan',
        supportedCurrencies: ['UZS'],
        supportsRefunds: false,
      },
      click: {
        name: 'Click',
        description: 'Click payment system for Central Asia',
        supportedCurrencies: ['UZS'],
        supportsRefunds: false,
      },
      uzum: {
        name: 'Uzum',
        description: 'Digital payment platform in Uzbekistan',
        supportedCurrencies: ['UZS'],
        supportsRefunds: false,
      },
      stripe: {
        name: 'Stripe',
        description: 'International payment processing',
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        supportsRefunds: true,
      },
    };

    return methodInfoMap[method];
  }

  /**
   * Get audit logger for external use
   */
  getAuditLogger(): PaymentAuditLogger {
    return this.auditLogger;
  }

  /**
   * Get webhook security service for external use
   */
  getWebhookSecurity(): WebhookSecurityService {
    return this.webhookSecurity;
  }
}
