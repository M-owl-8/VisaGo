import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

interface StripeConfig {
  apiKey: string;
  webhookSecret: string;
}

interface CreatePaymentParams {
  userId: string;
  applicationId: string;
  amount: number;
  returnUrl: string;
  description?: string;
  userEmail: string;
}

/**
 * Stripe Payment Gateway Service
 * Stripe provides international payment processing
 * Documentation: https://stripe.com/docs
 */
export class StripeService {
  private stripe: Stripe;
  private config: StripeConfig;
  private prisma: PrismaClient;

  constructor(config: StripeConfig, prisma: PrismaClient) {
    this.config = config;
    this.prisma = prisma;

    if (!config.apiKey) {
      throw new Error("Stripe configuration incomplete: apiKey required");
    }

    this.stripe = new Stripe(config.apiKey);
  }

  /**
   * Create a payment session (Stripe Checkout)
   */
  async createPayment(params: CreatePaymentParams): Promise<{
    paymentUrl: string;
    sessionId: string;
    transactionId: string;
  }> {
    try {
      // Save payment record
      const payment = await this.prisma.payment.create({
        data: {
          userId: params.userId,
          applicationId: params.applicationId,
          amount: params.amount,
          currency: "USD",
          status: "pending",
          paymentMethod: "stripe",
          orderId: params.applicationId, // Use application ID as order ID
          paymentGatewayData: JSON.stringify({
            createdAt: new Date().toISOString(),
            description: params.description,
            userEmail: params.userEmail,
          }),
        },
      });

      // Create Stripe Checkout Session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: params.userEmail,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Visa Application Fee",
                description: params.description || "Visa Application",
                images: [], // Optional: add your logo
              },
              unit_amount: Math.round(params.amount * 100), // Amount in cents
            },
            quantity: 1,
          },
        ],
        success_url: `${params.returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: `${params.returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=cancelled`,
        metadata: {
          userId: params.userId,
          applicationId: params.applicationId,
          paymentId: payment.id,
        },
      });

      // Update payment with Stripe session ID
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentGatewayData: JSON.stringify({
            stripeSessionId: session.id,
            createdAt: new Date().toISOString(),
            description: params.description,
            userEmail: params.userEmail,
          }),
        },
      });

      return {
        paymentUrl: session.url || "",
        sessionId: session.id,
        transactionId: payment.id,
      };
    } catch (error) {
      console.error("Error creating Stripe payment:", error);
      throw error;
    }
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error("Error retrieving Stripe session:", error);
      return null;
    }
  }

  /**
   * Process webhook from Stripe
   */
  async processWebhook(
    body: Buffer,
    signature: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.config.webhookSecret
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        // Find payment by session ID
        const payments = await this.prisma.payment.findMany({
          where: {
            paymentMethod: "stripe",
            paymentGatewayData: {
              contains: session.id,
            },
          },
        });

        if (payments.length === 0) {
          return {
            success: false,
            error: "Payment not found",
          };
        }

        const payment = payments[0];

        // Get full payment intent details
        if (session.payment_intent) {
          const paymentIntent = await this.stripe.paymentIntents.retrieve(
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent.id
          );

          if (paymentIntent.status === "succeeded") {
            // Get charge details if available
            const intentData = paymentIntent as any;
            let chargeId: string | null = null;
            let receiptUrl: string | null = null;
            
            if (intentData.charges?.data?.[0]) {
              chargeId = intentData.charges.data[0].id;
              receiptUrl = intentData.charges.data[0].receipt_url;
            }

            // Update payment status
            await this.prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: "completed",
                transactionId: paymentIntent.id,
                paidAt: new Date(),
                paymentGatewayData: JSON.stringify({
                  ...JSON.parse(payment.paymentGatewayData || "{}"),
                  stripePaymentIntentId: paymentIntent.id,
                  chargeId: chargeId,
                  receiptUrl: receiptUrl,
                }),
              },
            });

            // Update visa application status
            await this.prisma.visaApplication.update({
              where: { id: payment.applicationId },
              data: {
                status: "submitted",
              },
            });

            console.log(`Stripe payment completed: ${payment.id}`);
            return { success: true };
          }
        }
      }

      if (event.type === "charge.failed") {
        const charge = event.data.object as Stripe.Charge;

        // Find payment by charge ID
        const payments = await this.prisma.payment.findMany({
          where: {
            paymentMethod: "stripe",
            paymentGatewayData: {
              contains: charge.id,
            },
          },
        });

        if (payments.length > 0) {
          const payment = payments[0];
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "failed",
              paymentGatewayData: JSON.stringify({
                ...JSON.parse(payment.paymentGatewayData || "{}"),
                failureReason: charge.failure_message,
              }),
            },
          });

          console.log(`Stripe payment failed: ${payment.id}`);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error processing Stripe webhook:", error);
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

      // Try to get session from payment gateway data
      const gatewayData = JSON.parse(payment.paymentGatewayData || "{}");

      if (gatewayData.stripeSessionId) {
        const session = await this.getSession(gatewayData.stripeSessionId);

        if (session && session.payment_status === "paid") {
          // Update payment status
          await this.prisma.payment.update({
            where: { id: transactionId },
            data: {
              status: "completed",
              paidAt: new Date(),
            },
          });

          // Update visa application
          await this.prisma.visaApplication.update({
            where: { id: payment.applicationId },
            data: {
              status: "submitted",
            },
          });

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Error verifying Stripe payment:", error);
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
      console.error("Error canceling Stripe payment:", error);
      return false;
    }
  }

  /**
   * Create refund
   */
  async createRefund(paymentId: string, reason?: string): Promise<boolean> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment || !payment.transactionId) {
        return false;
      }

      // Create refund for the payment intent
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.transactionId,
        reason: (reason as any) || "requested_by_customer",
      });

      // Update payment status
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "refunded",
          paymentGatewayData: JSON.stringify({
            ...JSON.parse(payment.paymentGatewayData || "{}"),
            refundId: refund.id,
            refundedAt: new Date().toISOString(),
          }),
        },
      });

      console.log(`Stripe refund created: ${refund.id}`);
      return true;
    } catch (error) {
      console.error("Error creating Stripe refund:", error);
      return false;
    }
  }
}