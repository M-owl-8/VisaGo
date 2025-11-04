import { PrismaClient } from "@prisma/client";
import { CacheService } from "./cache.service";

const prisma = new PrismaClient();

export interface AnalyticsEventPayload {
  userId?: string;
  eventType: "signup" | "visa_selected" | "payment_completed" | "document_uploaded" | "chat_message" | "login" | "app_opened";
  source?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AnalyticsMetrics {
  period: string;
  totalSignups: number;
  totalVisaSelections: number;
  totalPayments: number;
  totalRevenue: number;
  totalDocuments: number;
  totalMessages: number;
  activeUsers: number;
  newUsers: number;
  conversionRate: number;
  topCountries: Array<{ name: string; count: number }>;
  topVisaTypes: Array<{ name: string; count: number }>;
  paymentMethodBreakdown: Record<string, number>;
  dailyTrends: Array<{
    date: string;
    signups: number;
    payments: number;
    revenue: number;
    activeUsers: number;
  }>;
}

class AnalyticsService {
  /**
   * Track an event in the analytics system
   */
  async trackEvent(payload: AnalyticsEventPayload): Promise<void> {
    try {
      // Insert event into database
      await prisma.analyticsEvent.create({
        data: {
          userId: payload.userId,
          eventType: payload.eventType,
          source: payload.source,
          metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
          ipAddress: payload.ipAddress,
          userAgent: payload.userAgent,
        },
      });

      // Invalidate daily metrics cache for today
      const today = new Date().toISOString().split("T")[0];
      CacheService.del(`daily_metrics:${today}`);
    } catch (error) {
      console.error("Error tracking event:", error);
      // Don't throw - analytics errors shouldn't break the app
    }
  }

  /**
   * Get real-time metrics for the last 30 days
   */
  async getMetrics(days: number = 30): Promise<AnalyticsMetrics> {
    try {
      const cacheKey = `metrics:${days}`;
      const cached = CacheService.get<AnalyticsMetrics>(cacheKey);
      if (cached) {
        return cached;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      // Get events for the period
      const events = await prisma.analyticsEvent.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Get payments for revenue calculation
      const payments = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: "completed",
        },
        include: {
          application: {
            include: {
              country: true,
              visaType: true,
            },
          },
        },
      });

      // Calculate metrics
      const signups = events.filter((e: any) => e.eventType === "signup").length;
      const visaSelections = events.filter((e: any) => e.eventType === "visa_selected").length;
      const paymentEvents = events.filter((e: any) => e.eventType === "payment_completed").length;
      const documents = events.filter((e: any) => e.eventType === "document_uploaded").length;
      const messages = events.filter((e: any) => e.eventType === "chat_message").length;
      const activeUsers = new Set(events.map((e: any) => e.userId)).size;
      const uniqueSignupUsers = new Set(
        events.filter((e: any) => e.eventType === "signup").map((e: any) => e.userId)
      ).size;

      const totalRevenue = payments.reduce((sum: any, p: any) => sum + p.amount, 0);
      const conversionRate = signups > 0 ? (paymentEvents / signups) * 100 : 0;

      // Get top countries
      const topCountries = await this.getTopCountries(startDate, endDate);
      const topVisaTypes = await this.getTopVisaTypes(startDate, endDate);
      const paymentMethodBreakdown = await this.getPaymentMethodBreakdown(startDate, endDate);
      const dailyTrends = await this.getDailyTrends(startDate, endDate);

      const metrics: AnalyticsMetrics = {
        period: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
        totalSignups: signups,
        totalVisaSelections: visaSelections,
        totalPayments: paymentEvents,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalDocuments: documents,
        totalMessages: messages,
        activeUsers,
        newUsers: uniqueSignupUsers,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        topCountries,
        topVisaTypes,
        paymentMethodBreakdown,
        dailyTrends,
      };

      // Cache for 1 hour
      CacheService.set(cacheKey, metrics, 3600);
      return metrics;
    } catch (error) {
      console.error("Error getting metrics:", error);
      throw error;
    }
  }

  /**
   * Get top countries by applications
   */
  private async getTopCountries(startDate: Date, endDate: Date) {
    const countries = await prisma.visaApplication.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        country: true,
      },
    });

    const countryMap: Record<string, number> = {};
    countries.forEach((app: any) => {
      countryMap[app.country.name] = (countryMap[app.country.name] || 0) + 1;
    });

    return Object.entries(countryMap)
      .map(([name, count]: [string, number]) => ({ name, count }))
      .sort((a: { name: string; count: number }, b: { name: string; count: number }) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get top visa types by applications
   */
  private async getTopVisaTypes(startDate: Date, endDate: Date) {
    const visaTypes = await prisma.visaApplication.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        visaType: true,
      },
    });

    const typeMap: Record<string, number> = {};
    visaTypes.forEach((app: any) => {
      typeMap[app.visaType.name] = (typeMap[app.visaType.name] || 0) + 1;
    });

    return Object.entries(typeMap)
      .map(([name, count]: any) => ({ name, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get payment method breakdown
   */
  private async getPaymentMethodBreakdown(startDate: Date, endDate: Date) {
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: "completed",
      },
    });

    const breakdown: Record<string, number> = {};
    payments.forEach((p: any) => {
      breakdown[p.paymentMethod] = (breakdown[p.paymentMethod] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Get daily trends for the period
   */
  private async getDailyTrends(startDate: Date, endDate: Date) {
    const trends = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = await prisma.analyticsEvent.findMany({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      const dayPayments = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
          status: "completed",
        },
      });

      const signups = dayEvents.filter((e: any) => e.eventType === "signup").length;
      const payments = dayPayments.length;
      const revenue = dayPayments.reduce((sum: any, p: any) => sum + p.amount, 0);
      const activeUsers = new Set(dayEvents.map((e: any) => e.userId)).size;

      trends.push({
        date: dayStart.toISOString().split("T")[0],
        signups,
        payments,
        revenue: parseFloat(revenue.toFixed(2)),
        activeUsers,
      });

      current.setDate(current.getDate() + 1);
    }

    return trends;
  }

  /**
   * Get conversion funnel data
   */
  async getConversionFunnel(): Promise<{
    signups: number;
    visaSelections: number;
    paymentsStarted: number;
    paymentsCompleted: number;
    documentsUploaded: number;
    conversionRates: Record<string, number>;
  }> {
    try {
      const cacheKey = "conversion_funnel";
      const cached = CacheService.get<{
        signups: number;
        visaSelections: number;
        paymentsStarted: number;
        paymentsCompleted: number;
        documentsUploaded: number;
        conversionRates: Record<string, number>;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get last 90 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const signups = await prisma.analyticsEvent.count({
        where: {
          eventType: "signup",
          createdAt: { gte: startDate },
        },
      });

      const visaSelections = await prisma.analyticsEvent.count({
        where: {
          eventType: "visa_selected",
          createdAt: { gte: startDate },
        },
      });

      const payments = await prisma.payment.findMany({
        where: {
          createdAt: { gte: startDate },
        },
      });

      const paymentsStarted = payments.filter((p: any) => p.status !== "pending").length;
      const paymentsCompleted = payments.filter((p: any) => p.status === "completed").length;

      const documents = await prisma.analyticsEvent.count({
        where: {
          eventType: "document_uploaded",
          createdAt: { gte: startDate },
        },
      });

      const funnel = {
        signups,
        visaSelections,
        paymentsStarted,
        paymentsCompleted,
        documentsUploaded: documents,
        conversionRates: {
          signupToVisa: signups > 0 ? parseFloat(((visaSelections / signups) * 100).toFixed(2)) : 0,
          visaToPayment: visaSelections > 0 ? parseFloat(((paymentsStarted / visaSelections) * 100).toFixed(2)) : 0,
          paymentToCompleted:
            paymentsStarted > 0 ? parseFloat(((paymentsCompleted / paymentsStarted) * 100).toFixed(2)) : 0,
        },
      };

      // Cache for 2 hours
      CacheService.set(cacheKey, funnel, 7200);
      return funnel;
    } catch (error) {
      console.error("Error getting conversion funnel:", error);
      throw error;
    }
  }

  /**
   * Get user acquisition breakdown by source
   */
  async getUserAcquisition(): Promise<Record<string, number>> {
    try {
      const cacheKey = "user_acquisition";
      const cached = CacheService.get<Record<string, number>>(cacheKey);
      if (cached) {
        return cached;
      }

      const sources = await prisma.analyticsEvent.groupBy({
        by: ["source"],
        where: {
          eventType: "signup",
        },
        _count: {
          userId: true,
        },
      });

      const breakdown: Record<string, number> = {};
      sources.forEach((source: any) => {
        if (source.source) {
          breakdown[source.source] = source._count.userId;
        }
      });

      // Cache for 6 hours
      CacheService.set(cacheKey, breakdown, 21600);
      return breakdown;
    } catch (error) {
      console.error("Error getting user acquisition:", error);
      throw error;
    }
  }

  /**
   * Calculate daily metrics and cache them (for batch processing)
   */
  async calculateDailyMetrics(date: Date = new Date()): Promise<void> {
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const signups = await prisma.analyticsEvent.count({
        where: {
          eventType: "signup",
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });

      const visaSelections = await prisma.analyticsEvent.count({
        where: {
          eventType: "visa_selected",
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });

      const payments = await prisma.payment.findMany({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          status: "completed",
        },
      });

      const documents = await prisma.analyticsEvent.count({
        where: {
          eventType: "document_uploaded",
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });

      const messages = await prisma.analyticsEvent.count({
        where: {
          eventType: "chat_message",
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });

      const activeUsers = await prisma.analyticsEvent.findMany({
        distinct: ["userId"],
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });

      const newUsers = await prisma.analyticsEvent.count({
        where: {
          eventType: "signup",
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });

      const totalRevenue = payments.reduce((sum: any, p: any) => sum + p.amount, 0);
      const conversionRate = signups > 0 ? (payments.length / signups) * 100 : 0;

      // Upsert daily metrics
      await prisma.dailyMetrics.upsert({
        where: { date: dayStart },
        create: {
          date: dayStart,
          totalSignups: signups,
          totalVisaSelections: visaSelections,
          totalPayments: payments.length,
          totalRevenue,
          totalDocuments: documents,
          totalMessages: messages,
          activeUsers: activeUsers.length,
          newUsers,
          conversionRate,
        },
        update: {
          totalSignups: signups,
          totalVisaSelections: visaSelections,
          totalPayments: payments.length,
          totalRevenue,
          totalDocuments: documents,
          totalMessages: messages,
          activeUsers: activeUsers.length,
          newUsers,
          conversionRate,
        },
      });
    } catch (error) {
      console.error("Error calculating daily metrics:", error);
      throw error;
    }
  }

  /**
   * Get event count by type
   */
  async getEventBreakdown(days: number = 30): Promise<Record<string, number>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const events = await prisma.analyticsEvent.groupBy({
        by: ["eventType"],
        where: {
          createdAt: { gte: startDate },
        },
        _count: {
          id: true,
        },
      });

      const breakdown: Record<string, number> = {};
      events.forEach((event) => {
        breakdown[event.eventType] = event._count.id;
      });

      return breakdown;
    } catch (error) {
      console.error("Error getting event breakdown:", error);
      throw error;
    }
  }
}

export default new AnalyticsService();