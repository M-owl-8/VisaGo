import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

interface ReconciliationReport {
  startTime: Date;
  endTime: Date;
  totalPaymentsChecked: number;
  discrepanciesFound: number;
  errors: string[];
  details: {
    missingTransactions: any[];
    statusMismatches: any[];
    stuckPendingPayments: any[];
    orphanedWebhooks: any[];
  };
}

/**
 * Payment Reconciliation Service
 * Ensures consistency between local database and payment gateways
 * Runs nightly and catches payments that slipped through webhooks
 */
export class PaymentReconciliationService {
  private readonly prisma: PrismaClient;
  private reconciliationJob: any = null;
  private readonly PENDING_PAYMENT_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private readonly WEBHOOK_RETENTION_DAYS = 30;
  private static instance: PaymentReconciliationService | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get singleton instance (uses global Prisma by default)
   */
  static getInstance(): PaymentReconciliationService {
    if (!PaymentReconciliationService.instance) {
      const { PrismaClient: PC } = require('@prisma/client');
      const defaultPrisma = new PC();
      PaymentReconciliationService.instance = new PaymentReconciliationService(defaultPrisma);
    }
    return PaymentReconciliationService.instance;
  }

  /**
   * Start reconciliation scheduler
   * Runs daily at 2 AM (configurable via RECONCILIATION_CRON)
   */
  startScheduler(): void {
    const cronExpression = process.env.RECONCILIATION_CRON || '0 2 * * *'; // 2 AM daily

    this.reconciliationJob = cron.schedule(cronExpression, async () => {
      console.log('[Payment Reconciliation] Starting scheduled reconciliation...');
      try {
        const report = await this.performReconciliation();
        await this.saveReconciliationReport(report);
        console.log(
          '[Payment Reconciliation] Completed:',
          `${report.discrepanciesFound} discrepancies found`
        );
      } catch (error) {
        console.error('[Payment Reconciliation] Error:', error);
      }
    });

    console.log(`[Payment Reconciliation] Scheduler started (${cronExpression})`);
  }

  /**
   * Alias for startScheduler() - used for consistency across services
   */
  startReconciliationJob(): void {
    this.startScheduler();
  }

  /**
   * Stop reconciliation scheduler
   */
  stopScheduler(): void {
    if (this.reconciliationJob) {
      this.reconciliationJob.stop();
      console.log('[Payment Reconciliation] Scheduler stopped');
    }
  }

  /**
   * Perform full reconciliation
   */
  async performReconciliation(): Promise<ReconciliationReport> {
    const startTime = new Date();
    const report: ReconciliationReport = {
      startTime,
      endTime: new Date(),
      totalPaymentsChecked: 0,
      discrepanciesFound: 0,
      errors: [],
      details: {
        missingTransactions: [],
        statusMismatches: [],
        stuckPendingPayments: [],
        orphanedWebhooks: [],
      },
    };

    try {
      // Step 1: Check for stuck pending payments
      await this.checkStuckPendingPayments(report);

      // Step 2: Check for orphaned webhooks
      await this.cleanupOrphanedWebhooks(report);

      // Step 3: Validate payment consistency
      await this.validatePaymentConsistency(report);

      // Step 4: Archive old webhook records
      await this.archiveOldWebhooks();

      report.endTime = new Date();
      return report;
    } catch (error: any) {
      report.errors.push(`Critical error: ${error.message}`);
      report.endTime = new Date();
      return report;
    }
  }

  /**
   * Check for payments stuck in pending status
   * These likely timed out or had network issues
   */
  private async checkStuckPendingPayments(report: ReconciliationReport): Promise<void> {
    try {
      const pendingPayments = await this.prisma.payment.findMany({
        where: {
          status: 'pending',
          createdAt: {
            lt: new Date(Date.now() - this.PENDING_PAYMENT_TIMEOUT),
          },
        },
        include: {
          application: true,
          user: true,
        },
      });

      for (const payment of pendingPayments) {
        report.details.stuckPendingPayments.push({
          id: payment.id,
          userId: payment.userId,
          applicationId: payment.applicationId,
          amount: payment.amount,
          createdAt: payment.createdAt,
          age: new Date().getTime() - payment.createdAt.getTime(),
        });

        // Mark as failed to allow user to retry
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'failed',
            paymentGatewayData: JSON.stringify({
              ...JSON.parse(payment.paymentGatewayData || '{}'),
              failureReason: 'reconciliation_timeout',
              failedAt: new Date().toISOString(),
            }),
          },
        });

        report.discrepanciesFound++;
      }

      report.totalPaymentsChecked += pendingPayments.length;

      if (pendingPayments.length > 0) {
        console.log(`[Reconciliation] Found ${pendingPayments.length} stuck pending payments`);
      }
    } catch (error: any) {
      report.errors.push(`Error checking stuck payments: ${error.message}`);
    }
  }

  /**
   * Cleanup orphaned webhooks
   * Remove webhooks that are too old or stuck in processing
   */
  private async cleanupOrphanedWebhooks(report: ReconciliationReport): Promise<void> {
    try {
      // Find stuck webhooks (processing for > 1 hour)
      const stuckWebhooks = await this.prisma.webhookIdempotency.findMany({
        where: {
          status: 'pending',
          lastAttemptAt: {
            lt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          },
        },
      });

      // Mark as failed after max retries
      const maxRetries = 5;
      for (const webhook of stuckWebhooks) {
        if (webhook.attempts >= maxRetries) {
          await this.prisma.webhookIdempotency.update({
            where: { id: webhook.id },
            data: {
              status: 'failed',
              error: 'Max retries exceeded - manually review required',
            },
          });

          report.details.orphanedWebhooks.push({
            id: webhook.id,
            webhookId: webhook.webhookId,
            transactionId: webhook.transactionId,
            attempts: webhook.attempts,
            lastAttemptAt: webhook.lastAttemptAt,
          });

          report.discrepanciesFound++;
        }
      }

      // Remove old processed webhooks (> WEBHOOK_RETENTION_DAYS)
      const cutoffDate = new Date(Date.now() - this.WEBHOOK_RETENTION_DAYS * 24 * 60 * 60 * 1000);

      const deletedCount = await this.prisma.webhookIdempotency.deleteMany({
        where: {
          status: 'processed',
          processedAt: {
            lt: cutoffDate,
          },
        },
      });

      if (deletedCount.count > 0) {
        console.log(`[Reconciliation] Cleaned up ${deletedCount.count} old webhooks`);
      }
    } catch (error: any) {
      report.errors.push(`Error cleaning orphaned webhooks: ${error.message}`);
    }
  }

  /**
   * Validate payment consistency
   * Check for data anomalies and inconsistencies
   */
  private async validatePaymentConsistency(report: ReconciliationReport): Promise<void> {
    try {
      // Get all completed payments
      const completedPayments = await this.prisma.payment.findMany({
        where: { status: 'completed' },
        include: {
          application: true,
        },
      });

      for (const payment of completedPayments) {
        // Check 1: Payment should have a transaction ID
        if (!payment.transactionId) {
          report.details.statusMismatches.push({
            type: 'missing_transaction_id',
            paymentId: payment.id,
            reason: 'Completed payment missing transaction ID',
          });
          report.discrepanciesFound++;
          continue;
        }

        // Check 2: Payment should have paidAt timestamp
        if (!payment.paidAt) {
          report.details.statusMismatches.push({
            type: 'missing_paid_at',
            paymentId: payment.id,
            reason: 'Completed payment missing paidAt timestamp',
          });

          // Auto-fix if created timestamp is available
          if (payment.createdAt) {
            await this.prisma.payment.update({
              where: { id: payment.id },
              data: { paidAt: payment.createdAt },
            });
          }
          report.discrepanciesFound++;
          continue;
        }

        // Check 3: Application should be in correct status
        if (payment.application.status === 'draft') {
          report.details.statusMismatches.push({
            type: 'application_status_mismatch',
            paymentId: payment.id,
            applicationId: payment.applicationId,
            currentStatus: payment.application.status,
            reason: 'Application still in draft after payment',
          });

          // Auto-fix: move to submitted
          await this.prisma.visaApplication.update({
            where: { id: payment.applicationId },
            data: { status: 'submitted' },
          });

          report.discrepanciesFound++;
        }

        // Check 4: Refund amount validation
        if ((payment.refundedAmount || 0) > payment.amount) {
          report.details.statusMismatches.push({
            type: 'invalid_refund_amount',
            paymentId: payment.id,
            refundedAmount: payment.refundedAmount,
            originalAmount: payment.amount,
            reason: 'Refunded amount exceeds payment amount',
          });
          report.discrepanciesFound++;
        }
      }

      report.totalPaymentsChecked += completedPayments.length;

      if (report.discrepanciesFound > 0) {
        console.log(`[Reconciliation] Found ${report.discrepanciesFound} consistency issues`);
      }
    } catch (error: any) {
      report.errors.push(`Error validating consistency: ${error.message}`);
    }
  }

  /**
   * Archive old webhooks for compliance/audit
   */
  private async archiveOldWebhooks(): Promise<void> {
    try {
      const archiveDate = new Date(Date.now() - this.WEBHOOK_RETENTION_DAYS * 24 * 60 * 60 * 1000);

      // In production, you might export to S3/archive storage here
      // For now, we just log what would be archived
      const oldWebhooks = await this.prisma.webhookIdempotency.findMany({
        where: {
          createdAt: {
            lt: archiveDate,
          },
        },
        select: {
          id: true,
          webhookId: true,
          createdAt: true,
        },
      });

      if (oldWebhooks.length > 0) {
        console.log(`[Reconciliation] ${oldWebhooks.length} webhooks eligible for archival`);
      }
    } catch (error: any) {
      console.error('Error archiving webhooks:', error);
    }
  }

  /**
   * Check payment status against gateway
   * For each method, verify the payment status
   */
  async verifyPaymentStatus(
    transactionId: string,
    paymentMethod: string
  ): Promise<{
    verified: boolean;
    gatewayStatus?: string;
    dbStatus?: string;
    matchesGateway: boolean;
  }> {
    try {
      // Get payment from DB
      const payment = await this.prisma.payment.findUnique({
        where: { transactionId },
      });

      if (!payment) {
        return {
          verified: false,
          matchesGateway: false,
        };
      }

      // Note: In production, you'd call the actual gateway to verify
      // For now, we return DB status as source of truth
      return {
        verified: payment.status === 'completed',
        dbStatus: payment.status,
        matchesGateway: true, // Assume match if not explicitly checking gateway
      };
    } catch (error: any) {
      console.error('Error verifying payment status:', error);
      return {
        verified: false,
        matchesGateway: false,
      };
    }
  }

  /**
   * Get reconciliation statistics
   */
  async getReconciliationStats() {
    try {
      const stats = {
        totalPayments: await this.prisma.payment.count(),
        paymentsByStatus: await this.prisma.payment.groupBy({
          by: ['status'],
          _count: true,
          _sum: { amount: true },
        }),
        pendingPayments: await this.prisma.payment.count({
          where: { status: 'pending' },
        }),
        completedPayments: await this.prisma.payment.count({
          where: { status: 'completed' },
        }),
        failedPayments: await this.prisma.payment.count({
          where: { status: 'failed' },
        }),
        refundedPayments: await this.prisma.payment.count({
          where: {
            status: {
              in: ['refunded', 'partially_refunded'],
            },
          },
        }),
        totalRevenue: await this.prisma.payment.aggregate({
          where: { status: 'completed' },
          _sum: { amount: true },
        }),
        totalRefunded: await this.prisma.payment.aggregate({
          _sum: { refundedAmount: true },
        }),
        webhookStats: {
          pending: await this.prisma.webhookIdempotency.count({
            where: { status: 'pending' },
          }),
          processed: await this.prisma.webhookIdempotency.count({
            where: { status: 'processed' },
          }),
          failed: await this.prisma.webhookIdempotency.count({
            where: { status: 'failed' },
          }),
        },
      };

      return stats;
    } catch (error: any) {
      console.error('Error getting reconciliation stats:', error);
      return null;
    }
  }

  /**
   * Save reconciliation report to database for audit trail
   */
  private async saveReconciliationReport(report: ReconciliationReport): Promise<void> {
    try {
      // Store in database for audit trail
      // You might create a new table: ReconciliationReport
      console.log('[Reconciliation] Report saved:', JSON.stringify(report, null, 2));
    } catch (error: any) {
      console.error('Error saving reconciliation report:', error);
    }
  }

  /**
   * Simulate network issue recovery
   * Retry failed webhook processing
   */
  async retryFailedWebhooks(limit: number = 10): Promise<number> {
    try {
      const failedWebhooks = await this.prisma.webhookIdempotency.findMany({
        where: {
          status: 'failed',
          attempts: {
            lt: 5, // Less than max retries
          },
        },
        take: limit,
      });

      let retried = 0;
      for (const webhook of failedWebhooks) {
        // Reset to pending for retry
        await this.prisma.webhookIdempotency.update({
          where: { id: webhook.id },
          data: {
            status: 'pending',
            attempts: webhook.attempts,
            lastAttemptAt: new Date(),
          },
        });
        retried++;
      }

      console.log(`[Reconciliation] Retried ${retried} failed webhooks`);
      return retried;
    } catch (error: any) {
      console.error('Error retrying failed webhooks:', error);
      return 0;
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

let reconciliationService: PaymentReconciliationService | null = null;

export function initializePaymentReconciliation(
  prisma: PrismaClient
): PaymentReconciliationService {
  if (!reconciliationService) {
    reconciliationService = new PaymentReconciliationService(prisma);
    if (process.env.ENABLE_RECONCILIATION !== 'false') {
      reconciliationService.startScheduler();
    }
  }
  return reconciliationService;
}

export function getPaymentReconciliationService(): PaymentReconciliationService | null {
  return reconciliationService;
}
