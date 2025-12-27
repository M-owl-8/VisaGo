import Stripe from 'stripe';
import { PrismaClient, UserSubscription } from '@prisma/client';

type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired';

export interface CreateCheckoutSessionResult {
  url: string;
  sessionId: string;
  stripeCustomerId?: string;
}

export class SubscriptionService {
  private prisma: PrismaClient;
  private stripe: Stripe;
  private priceId: string;
  private successUrl: string;
  private cancelUrl: string;

  constructor(prisma: PrismaClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    this.priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID || '';
    this.successUrl =
      process.env.STRIPE_SUCCESS_URL ||
      `${process.env.FRONTEND_URL || ''}/dashboard?payment=success`;
    this.cancelUrl =
      process.env.STRIPE_CANCEL_URL || `${process.env.FRONTEND_URL || ''}/payment?canceled=true`;

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    if (!this.priceId) {
      throw new Error('STRIPE_SUBSCRIPTION_PRICE_ID is not configured');
    }

    this.prisma = prisma;
    this.stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
  }

  async createCheckoutSession(
    userId: string,
    returnUrl?: string
  ): Promise<CreateCheckoutSessionResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Reuse or create customer
    let stripeCustomerId = user.stripeCustomerId as any;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [
        {
          price: this.priceId,
          quantity: 1,
        },
      ],
      success_url: returnUrl || this.successUrl,
      cancel_url: this.cancelUrl,
      subscription_data: {
        metadata: {
          userId,
        },
      },
      metadata: {
        userId,
      },
    });

    return { url: session.url || '', sessionId: session.id, stripeCustomerId };
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    return this.prisma.userSubscription.findUnique({ where: { userId } });
  }

  async cancelSubscription(userId: string): Promise<boolean> {
    const sub = await this.getUserSubscription(userId);
    if (!sub || !sub.stripeSubscriptionId) return false;

    await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    await this.prisma.userSubscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true, status: 'canceled', canceledAt: new Date() },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'canceled' },
    });
    return true;
  }

  async reactivateSubscription(userId: string): Promise<boolean> {
    const sub = await this.getUserSubscription(userId);
    if (!sub || !sub.stripeSubscriptionId) return false;

    await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
    await this.prisma.userSubscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: false, status: 'active' },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'active' },
    });
    return true;
  }

  async checkAccess(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
    if (!user) return false;
    if (user.subscriptionStatus === 'grandfathered') return true;
    const sub = user.subscription;
    if (!sub) return false;
    return (
      sub.status === 'active' &&
      !!sub.currentPeriodEnd &&
      new Date(sub.currentPeriodEnd) > new Date()
    );
  }

  private mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active':
      case 'trialing':
      case 'past_due':
      case 'canceled':
      case 'unpaid':
      case 'incomplete':
      case 'incomplete_expired':
        return status;
      default:
        return 'active';
    }
  }

  async handleWebhook(
    rawBody: Buffer | string,
    signature: string
  ): Promise<{ ok: boolean; error?: string }> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return { ok: false, error: 'Missing STRIPE_WEBHOOK_SECRET' };

    const raw = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(raw, signature, webhookSecret);
    } catch (err: any) {
      return { ok: false, error: `Webhook signature verification failed: ${err.message}` };
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }

    return { ok: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id;

    if (!userId || !subscriptionId || !customerId) return;

    await this.upsertSubscription(userId, subscriptionId, customerId);
  }

  private async handleSubscriptionEvent(subscription: Stripe.Subscription) {
    const userId = (subscription.metadata as any)?.userId;
    const subscriptionId = subscription.id;
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    if (!subscriptionId || !customerId) return;

    // Try to derive userId from customer if not in metadata
    let finalUserId = userId;
    if (!finalUserId) {
      const existing = await this.prisma.userSubscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
      });
      finalUserId = existing?.userId;
    }
    if (!finalUserId) return;

    await this.upsertSubscription(finalUserId, subscriptionId, customerId, subscription);
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
    if (!subscriptionId) return;

    await this.prisma.userSubscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: 'active' },
    });
    const sub = await this.prisma.userSubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (sub) {
      await this.prisma.user.update({
        where: { id: sub.userId },
        data: { subscriptionStatus: 'active' },
      });
    }
  }

  private async handleInvoiceFailed(invoice: Stripe.Invoice) {
    const subscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
    if (!subscriptionId) return;
    await this.prisma.userSubscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: 'past_due' },
    });
  }

  private async upsertSubscription(
    userId: string,
    stripeSubscriptionId: string,
    stripeCustomerId: string,
    stripeSub?: Stripe.Subscription
  ) {
    let currentPeriodStart: Date | undefined;
    let currentPeriodEnd: Date | undefined;
    let cancelAtPeriodEnd = false;
    let status: SubscriptionStatus = 'active';

    if (stripeSub) {
      currentPeriodStart = stripeSub.current_period_start
        ? new Date(stripeSub.current_period_start * 1000)
        : undefined;
      currentPeriodEnd = stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : undefined;
      cancelAtPeriodEnd = stripeSub.cancel_at_period_end || false;
      status = this.mapStatus(stripeSub.status);
    }

    await this.prisma.userSubscription.upsert({
      where: { userId },
      update: {
        stripeSubscriptionId,
        stripeCustomerId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        metadata: stripeSub ? JSON.stringify(stripeSub) : undefined,
      },
      create: {
        userId,
        stripeSubscriptionId,
        stripeCustomerId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        metadata: stripeSub ? JSON.stringify(stripeSub) : undefined,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: status === 'canceled' ? 'canceled' : 'active',
      },
    });
  }
}
