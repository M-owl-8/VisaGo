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
  private stripe?: Stripe;
  private priceId: string;
  private successUrl: string;
  private cancelUrl: string;
  private enabled = false;
  private disabledReason?: string;

  constructor(prisma: PrismaClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    this.priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID || '';
    this.successUrl =
      process.env.STRIPE_SUCCESS_URL ||
      `${process.env.FRONTEND_URL || ''}/dashboard?payment=success`;
    this.cancelUrl =
      process.env.STRIPE_CANCEL_URL || `${process.env.FRONTEND_URL || ''}/payment?canceled=true`;

    if (!secretKey) {
      this.disabledReason = 'STRIPE_SECRET_KEY is not configured';
    }
    if (!this.priceId) {
      this.disabledReason = this.disabledReason || 'STRIPE_SUBSCRIPTION_PRICE_ID is not configured';
    }

    this.prisma = prisma;
    // Use Stripe default API version to avoid type mismatches on SDK upgrades
    if (secretKey && this.priceId) {
      this.stripe = new Stripe(secretKey);
      this.enabled = true;
    }
  }

  async createCheckoutSession(
    userId: string,
    returnUrl?: string
  ): Promise<CreateCheckoutSessionResult> {
    this.ensureEnabled();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Reuse or create customer
    if (!this.stripe) throw new Error('Stripe not initialized');

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
    this.ensureEnabled();
    return this.prisma.userSubscription.findUnique({ where: { userId } });
  }

  async cancelSubscription(userId: string): Promise<boolean> {
    this.ensureEnabled();
    if (!this.stripe) throw new Error('Stripe not initialized');
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
    this.ensureEnabled();
    if (!this.stripe) throw new Error('Stripe not initialized');
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
    this.ensureEnabled();
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
    this.ensureEnabled();
    if (!this.stripe) return { ok: false, error: 'Stripe not initialized' };
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
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
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
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
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
      const subAny = stripeSub as any;
      const periodStartSeconds = subAny.current_period_start ?? subAny.currentPeriodStart;
      const periodEndSeconds = subAny.current_period_end ?? subAny.currentPeriodEnd;
      currentPeriodStart = periodStartSeconds ? new Date(periodStartSeconds * 1000) : undefined;
      currentPeriodEnd = periodEndSeconds ? new Date(periodEndSeconds * 1000) : undefined;
      cancelAtPeriodEnd = subAny.cancel_at_period_end ?? subAny.cancelAtPeriodEnd ?? false;
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

  private getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | undefined {
    const invAny = invoice as any;
    return (
      invAny.subscriptionId ||
      (typeof invAny.subscription === 'string' ? invAny.subscription : invAny.subscription?.id)
    );
  }

  private ensureEnabled() {
    if (!this.enabled) {
      throw new Error(this.disabledReason || 'Stripe subscriptions are disabled');
    }
  }
}
