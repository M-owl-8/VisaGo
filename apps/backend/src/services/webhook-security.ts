/**
 * Webhook Security & Idempotency Service
 * Prevents duplicate webhook processing and validates webhook signatures
 */

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

export interface WebhookRecord {
  id?: string;
  webhookId: string; // Unique ID from gateway (event ID, webhook ID, etc)
  paymentMethod: string;
  transactionId: string;
  eventType: string;
  signature: string;
  body: Record<string, any>;
  status: "pending" | "processed" | "failed";
  attempts: number;
  lastAttemptAt?: Date;
  processedAt?: Date;
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WebhookSecurityService {
  // In-memory cache for recent webhooks (TTL: 1 hour)
  private webhookCache: Map<string, { timestamp: number; processed: boolean }> = new Map();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(private prisma: PrismaClient) {
    // Clean up old cache entries every 30 minutes
    setInterval(() => this.cleanupCache(), 30 * 60 * 1000);
  }

  /**
   * Generate webhook fingerprint for deduplication
   */
  generateWebhookFingerprint(
    webhookId: string,
    paymentMethod: string,
    transactionId: string
  ): string {
    return crypto
      .createHash("sha256")
      .update(`${paymentMethod}:${webhookId}:${transactionId}`)
      .digest("hex");
  }

  /**
   * Check if webhook has already been processed (idempotency check)
   */
  async isWebhookDuplicate(
    webhookId: string,
    paymentMethod: string,
    transactionId: string
  ): Promise<boolean> {
    const fingerprint = this.generateWebhookFingerprint(
      webhookId,
      paymentMethod,
      transactionId
    );

    // Check in-memory cache first
    const cached = this.webhookCache.get(fingerprint);
    if (cached) {
      return cached.processed;
    }

    // Check database for processed webhooks (beyond cache TTL)
    // This prevents reprocessing even after app restart
    try {
      const existing = await this.prisma.webhookIdempotency.findUnique({
        where: { fingerprint },
      });

      if (existing && existing.status === "processed") {
        // Re-cache it
        this.webhookCache.set(fingerprint, {
          timestamp: Date.now(),
          processed: true,
        });
        return true;
      }
    } catch (error) {
      console.error("[Webhook Security] Database lookup failed:", error);
      // Don't fail webhook processing due to DB error
    }

    return false;
  }

  /**
   * Record webhook processing attempt
   */
  async recordWebhookAttempt(
    webhookId: string,
    paymentMethod: string,
    transactionId: string,
    eventType: string,
    body: Record<string, any>,
    signature: string,
    success: boolean = false,
    error?: string
  ): Promise<void> {
    const fingerprint = this.generateWebhookFingerprint(
      webhookId,
      paymentMethod,
      transactionId
    );

    try {
      // Try to update existing record, create if doesn't exist
      await this.prisma.webhookIdempotency.upsert({
        where: { fingerprint },
        create: {
          fingerprint,
          webhookId,
          paymentMethod,
          transactionId,
          eventType,
          signature,
          body: body as any,
          status: success ? "processed" : "pending",
          attempts: 1,
          lastAttemptAt: new Date(),
          processedAt: success ? new Date() : undefined,
          error,
        },
        update: {
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          status: success ? "processed" : "pending",
          processedAt: success ? new Date() : undefined,
          error: error || undefined,
        },
      });

      // Update in-memory cache
      this.webhookCache.set(fingerprint, {
        timestamp: Date.now(),
        processed: success,
      });
    } catch (error) {
      console.error("[Webhook Security] Failed to record webhook attempt:", error);
      // Don't fail webhook processing due to logging error
    }
  }

  /**
   * Verify Payme webhook signature
   */
  verifyPaymeSignature(
    params: string, // base64 encoded params
    sign: string, // provided signature
    apiKey: string
  ): boolean {
    try {
      // Payme signature: base64(SHA256(params_str + api_key))
      const message = params + apiKey;
      const expectedSign = crypto
        .createHash("sha256")
        .update(message)
        .digest("base64");

      return expectedSign === sign;
    } catch (error) {
      console.error("[Webhook Security] Payme signature verification failed:", error);
      return false;
    }
  }

  /**
   * Verify Click webhook signature
   */
  verifyClickSignature(
    data: Record<string, any>,
    sign: string,
    merchantKey: string
  ): boolean {
    try {
      // Click signature: MD5(click_trans_id + sign_string + merchant_key)
      // sign_string format varies, typically numeric fields in order
      const signString = [
        data.click_trans_id,
        data.service_id,
        data.merchant_trans_id || "",
        data.amount,
        data.action,
        data.error,
        data.merchant_prepare_id || "",
      ]
        .map(v => (v !== undefined && v !== null ? v.toString() : ""))
        .join(";");

      const message = `${data.click_trans_id};${signString};${merchantKey}`;
      const expectedSign = crypto
        .createHash("md5")
        .update(message)
        .digest("hex");

      return expectedSign === sign;
    } catch (error) {
      console.error("[Webhook Security] Click signature verification failed:", error);
      return false;
    }
  }

  /**
   * Verify Uzum webhook signature
   */
  verifyUzumSignature(
    data: Record<string, any>,
    sign: string,
    apiKey: string
  ): boolean {
    try {
      // Uzum signature: SHA256(merchant_id + transaction_id + amount + api_key)
      const signString = [
        data.merchant_id,
        data.transaction_id,
        data.amount,
      ].join(";");

      const message = signString + apiKey;
      const expectedSign = crypto
        .createHash("sha256")
        .update(message)
        .digest("hex");

      return expectedSign.toLowerCase() === sign.toLowerCase();
    } catch (error) {
      console.error("[Webhook Security] Uzum signature verification failed:", error);
      return false;
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyStripeSignature(
    body: string | Buffer, // raw body
    signature: string,
    webhookSecret: string
  ): boolean {
    try {
      // Stripe signature format: t=timestamp,v1=signature
      const parts = signature.split(",");
      const timestamp = parts[0].split("=")[1];
      const providedSignature = parts[1].split("=")[1];

      // Create signed content: timestamp.body
      const signedContent = `${timestamp}.${body}`;

      // Compute expected signature
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(signedContent)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error("[Webhook Security] Stripe signature verification failed:", error);
      return false;
    }
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.webhookCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL_MS) {
        this.webhookCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Webhook Security] Cleaned up ${cleaned} old cache entries`);
    }
  }

  /**
   * Get webhook cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.webhookCache.size,
      maxSize: 10000, // reasonable limit for 1-hour TTL
    };
  }
}