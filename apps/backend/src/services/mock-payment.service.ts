import { PrismaClient } from '@prisma/client';

interface MockPaymentConfig {
  defaultSuccessRate?: number; // 0-1, default 0.95
  delayMs?: number; // Simulate network delay
}

interface MockPaymentParams {
  userId: string;
  applicationId: string;
  amount: number;
  returnUrl: string;
  description?: string;
  userEmail: string;
  simulateFailure?: boolean; // Force failure for testing
}

interface MockWebhookPayload {
  webhookId: string;
  eventType: string;
  transactionId: string;
  status: string;
  timestamp: number;
  signature: string;
  data: Record<string, any>;
}

/**
 * Mock Payment Service for Development & Testing
 * Simulates payment gateway responses without requiring real API keys
 * Useful for local development, CI/CD, and testing error scenarios
 */
export class MockPaymentService {
  private prisma: PrismaClient;
  private config: MockPaymentConfig;
  private processedTransactions: Map<string, any> = new Map();
  private webhookQueue: MockWebhookPayload[] = [];

  constructor(config: MockPaymentConfig = {}, prisma: PrismaClient) {
    this.config = {
      defaultSuccessRate: 0.95,
      delayMs: 500,
      ...config,
    };
    this.prisma = prisma;
  }

  /**
   * Simulate payment creation
   * Returns mock payment URL and session ID
   */
  async createPayment(params: MockPaymentParams): Promise<{
    paymentUrl: string;
    sessionId: string;
    transactionId: string;
    success: boolean;
    mockData: {
      willSucceed: boolean;
      delayMs: number;
    };
  }> {
    // Simulate network delay
    if (this.config.delayMs) {
      await this.sleep(this.config.delayMs);
    }

    const transactionId = this.generateTransactionId();
    const sessionId = `mock_session_${transactionId}`;
    const willSucceed = params.simulateFailure
      ? false
      : Math.random() < (this.config.defaultSuccessRate || 0.95);

    // Save transaction for tracking
    this.processedTransactions.set(transactionId, {
      ...params,
      transactionId,
      sessionId,
      status: 'pending',
      willSucceed,
      createdAt: new Date(),
    });

    // Store in database for webhook simulation
    await this.prisma.payment.create({
      data: {
        userId: params.userId,
        applicationId: params.applicationId,
        amount: params.amount,
        currency: 'USD',
        status: 'pending',
        paymentMethod: 'mock',
        transactionId,
        orderId: params.applicationId,
        paymentGatewayData: JSON.stringify({
          provider: 'mock',
          sessionId,
          createdAt: new Date().toISOString(),
          description: params.description,
          userEmail: params.userEmail,
          willSucceed,
          mockMetadata: {
            simulatedFailure: params.simulateFailure || false,
            delayMs: this.config.delayMs,
          },
        }),
      },
    });

    // Mock payment URL with simulation params
    const mockUrl = `${params.returnUrl}?provider=mock&sessionId=${sessionId}&transactionId=${transactionId}&simulate=${willSucceed ? 'success' : 'failure'}`;

    return {
      paymentUrl: mockUrl,
      sessionId,
      transactionId,
      success: true,
      mockData: {
        willSucceed,
        delayMs: this.config.delayMs || 0,
      },
    };
  }

  /**
   * Confirm payment - in mock, this finalizes the transaction
   */
  async confirmPayment(transactionId: string): Promise<{
    success: boolean;
    status: string;
    transactionId: string;
    message: string;
  }> {
    const transaction = this.processedTransactions.get(transactionId);

    if (!transaction) {
      return {
        success: false,
        status: 'not_found',
        transactionId,
        message: 'Transaction not found',
      };
    }

    // Simulate network delay
    if (this.config.delayMs) {
      await this.sleep(this.config.delayMs);
    }

    const finalStatus = transaction.willSucceed ? 'completed' : 'failed';
    const paymentStatus = transaction.willSucceed ? 'completed' : 'failed';

    // Update transaction
    transaction.status = finalStatus;
    transaction.confirmedAt = new Date();
    this.processedTransactions.set(transactionId, transaction);

    // Update in database
    const payment = await this.prisma.payment.update({
      where: { transactionId },
      data: {
        status: paymentStatus,
        paidAt: transaction.willSucceed ? new Date() : null,
        paymentGatewayData: JSON.stringify({
          ...transaction,
          confirmedAt: new Date().toISOString(),
        }),
      },
    });

    // Queue webhook
    if (transaction.willSucceed) {
      this.queueWebhook({
        webhookId: `mock_webhook_${this.generateRandomString()}`,
        eventType: 'payment.success',
        transactionId,
        status: 'completed',
        timestamp: Date.now(),
        signature: this.generateMockSignature(),
        data: {
          amount: transaction.amount,
          userId: transaction.userId,
          applicationId: transaction.applicationId,
          paidAt: new Date().toISOString(),
        },
      });
    } else {
      this.queueWebhook({
        webhookId: `mock_webhook_${this.generateRandomString()}`,
        eventType: 'payment.failed',
        transactionId,
        status: 'failed',
        timestamp: Date.now(),
        signature: this.generateMockSignature(),
        data: {
          amount: transaction.amount,
          userId: transaction.userId,
          applicationId: transaction.applicationId,
          failureReason: 'mock_simulated_failure',
        },
      });
    }

    return {
      success: transaction.willSucceed,
      status: finalStatus,
      transactionId,
      message: transaction.willSucceed
        ? 'Payment confirmed successfully'
        : 'Payment confirmation failed',
    };
  }

  /**
   * Get mock payment details
   */
  async getPayment(transactionId: string) {
    return this.processedTransactions.get(transactionId);
  }

  /**
   * List all pending webhooks (for manual testing)
   */
  getPendingWebhooks(): MockWebhookPayload[] {
    return [...this.webhookQueue];
  }

  /**
   * Process next webhook in queue (for testing webhook handlers)
   */
  async processNextWebhook(): Promise<MockWebhookPayload | null> {
    const webhook = this.webhookQueue.shift();
    if (webhook) {
      await this.sleep(this.config.delayMs || 0);
    }
    return webhook || null;
  }

  /**
   * Process all pending webhooks
   */
  async processAllWebhooks(): Promise<MockWebhookPayload[]> {
    const processed = [];
    while (this.webhookQueue.length > 0) {
      const webhook = await this.processNextWebhook();
      if (webhook) processed.push(webhook);
    }
    return processed;
  }

  /**
   * Clear all mock data (for test cleanup)
   */
  clearMockData(): void {
    this.processedTransactions.clear();
    this.webhookQueue = [];
  }

  /**
   * Get mock service statistics
   */
  getStats() {
    return {
      totalTransactions: this.processedTransactions.size,
      pendingWebhooks: this.webhookQueue.length,
      transactions: Array.from(this.processedTransactions.values()),
    };
  }

  /**
   * Simulate payment webhook (for testing webhook handlers)
   */
  async simulateWebhookCallback(
    transactionId: string,
    eventType: 'payment.success' | 'payment.failed' = 'payment.success'
  ): Promise<MockWebhookPayload> {
    const transaction = this.processedTransactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const webhook: MockWebhookPayload = {
      webhookId: `mock_webhook_${this.generateRandomString()}`,
      eventType,
      transactionId,
      status: eventType === 'payment.success' ? 'completed' : 'failed',
      timestamp: Date.now(),
      signature: this.generateMockSignature(),
      data: {
        transactionId,
        amount: transaction.amount,
        userId: transaction.userId,
        applicationId: transaction.applicationId,
        timestamp: new Date().toISOString(),
        providerData: {
          provider: 'mock',
          sessionId: transaction.sessionId,
        },
      },
    };

    this.queueWebhook(webhook);
    return webhook;
  }

  /**
   * Simulate payment refund
   */
  async refundPayment(
    transactionId: string,
    amount?: number
  ): Promise<{
    success: boolean;
    refundId: string;
    amount: number;
    originalAmount: number;
  }> {
    const transaction = this.processedTransactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'completed') {
      throw new Error(`Cannot refund a ${transaction.status} payment`);
    }

    const refundAmount = amount || transaction.amount;
    const refundId = `mock_refund_${this.generateTransactionId()}`;

    // Simulate network delay
    if (this.config.delayMs) {
      await this.sleep(this.config.delayMs);
    }

    // Update transaction
    transaction.refunded = true;
    transaction.refundId = refundId;
    transaction.refundAmount = refundAmount;
    transaction.refundedAt = new Date();
    this.processedTransactions.set(transactionId, transaction);

    // Queue webhook
    this.queueWebhook({
      webhookId: `mock_webhook_${this.generateRandomString()}`,
      eventType: 'refund.completed',
      transactionId,
      status: 'refunded',
      timestamp: Date.now(),
      signature: this.generateMockSignature(),
      data: {
        refundId,
        originalTransactionId: transactionId,
        amount: refundAmount,
        refundedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      refundId,
      amount: refundAmount,
      originalAmount: transaction.amount,
    };
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<{
    status: string;
    amount: number;
    paidAt?: Date;
    refunded: boolean;
    refundAmount: number;
  }> {
    const transaction = this.processedTransactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    return {
      status: transaction.status,
      amount: transaction.amount,
      paidAt: transaction.confirmedAt,
      refunded: transaction.refunded || false,
      refundAmount: transaction.refundAmount || 0,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private queueWebhook(webhook: MockWebhookPayload): void {
    this.webhookQueue.push(webhook);
  }

  private generateTransactionId(): string {
    return `mock_${Date.now()}_${this.generateRandomString(8)}`;
  }

  private generateRandomString(length: number = 12): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateMockSignature(): string {
    return `mock_sig_${this.generateRandomString(32)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
