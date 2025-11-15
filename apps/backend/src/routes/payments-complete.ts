import express, { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { PaymentGatewayService, PaymentMethod } from "../services/payment-gateway.service";
import { authenticateToken } from "../middleware/auth";
import { isPaymentFrozen, getPaymentFreezeStatus, getPaymentFreezeMessage } from "../utils/payment-freeze";
import crypto from "crypto";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Initialize Payment Gateway Router
// Only include gateways with complete configuration (all required fields present)
const paymentGatewayConfig: any = {};

// Payme - only if both merchantId and apiKey are set
if (process.env.PAYME_MERCHANT_ID && process.env.PAYME_API_KEY) {
  paymentGatewayConfig.payme = {
    merchantId: process.env.PAYME_MERCHANT_ID,
    apiKey: process.env.PAYME_API_KEY,
    apiUrl: process.env.PAYME_API_URL || "https://checkout.test.payme.uz",
  };
}

// Click - only if merchantId, serviceId, and apiKey are set
if (process.env.CLICK_MERCHANT_ID && process.env.CLICK_SERVICE_ID && process.env.CLICK_API_KEY) {
  paymentGatewayConfig.click = {
    merchantId: process.env.CLICK_MERCHANT_ID,
    serviceId: process.env.CLICK_SERVICE_ID,
    apiKey: process.env.CLICK_API_KEY,
    apiUrl: process.env.CLICK_API_URL || "https://api.click.uz/v2",
  };
}

// Uzum - only if serviceId and apiKey are set
if (process.env.UZUM_SERVICE_ID && process.env.UZUM_API_KEY) {
  paymentGatewayConfig.uzum = {
    serviceId: process.env.UZUM_SERVICE_ID,
    apiKey: process.env.UZUM_API_KEY,
    apiUrl: process.env.UZUM_API_URL || "https://api.uzum.uz/api/merchant",
  };
}

// Stripe - only if apiKey is set
if (process.env.STRIPE_API_KEY) {
  paymentGatewayConfig.stripe = {
    apiKey: process.env.STRIPE_API_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  };
}

const paymentGatewayService = new PaymentGatewayService(paymentGatewayConfig, prisma);

// ============================================================================
// GET ENDPOINTS
// ============================================================================

/**
 * GET /api/payments/freeze-status
 * Get payment freeze status (public endpoint)
 */
router.get("/freeze-status", (req: Request, res: Response) => {
  try {
    const freezeStatus = getPaymentFreezeStatus();
    return res.json({
      success: true,
      data: {
        isFrozen: freezeStatus.isFrozen,
        message: freezeStatus.message,
        freezeStartDate: freezeStatus.freezeStartDate?.toISOString(),
        freezeEndDate: freezeStatus.freezeEndDate?.toISOString(),
        daysRemaining: freezeStatus.daysRemaining,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: "Failed to fetch freeze status" },
    });
  }
});

/**
 * GET /api/payments/methods
 * Get available payment methods
 */
router.get("/methods", (req: Request, res: Response) => {
  try {
    // Check if payments are frozen
    const freezeStatus = getPaymentFreezeStatus();
    
    if (freezeStatus.isFrozen) {
      return res.json({
        success: true,
        data: [],
        frozen: true,
        message: freezeStatus.message || "Payments are currently free!",
        freezeEndDate: freezeStatus.freezeEndDate?.toISOString(),
        daysRemaining: freezeStatus.daysRemaining,
      });
    }

    const methods = paymentGatewayService.getAvailableMethods();
    const methodDetails = methods.map((method) => ({
      id: method,
      name: getPaymentMethodName(method),
      description: getPaymentMethodDescription(method),
      icon: getPaymentMethodIcon(method),
    }));

    return res.json({
      success: true,
      data: methodDetails,
      frozen: false,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: "Failed to fetch payment methods" },
    });
  }
});

/**
 * GET /api/payments/:id
 * Get payment details by payment ID
 */
router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            visaType: {
              include: {
                country: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: { message: "Payment not found" },
      });
    }

    // Verify ownership
    if (payment.userId !== userId && (req as any).userRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: { message: "Unauthorized" },
      });
    }

    return res.json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    console.error("Error fetching payment:", error);
    return res.status(500).json({
      success: false,
      error: { message: "Failed to fetch payment details" },
    });
  }
});

/**
 * GET /api/payments
 * List user's payments
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { limit = 20, offset = 0, status } = req.query;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          application: {
            select: {
              id: true,
              status: true,
              visaType: {
                select: {
                  name: true,
                  country: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.payment.count({ where }),
    ]);

    return res.json({
      success: true,
      data: payments,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error: any) {
    console.error("Error listing payments:", error);
    return res.status(500).json({
      success: false,
      error: { message: "Failed to list payments" },
    });
  }
});

// ============================================================================
// POST ENDPOINTS
// ============================================================================

/**
 * POST /api/payments/initiate
 * Initiate a payment for a visa application
 * Body: { applicationId, returnUrl, paymentMethod? }
 */
router.post(
  "/initiate",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if payments are frozen
      if (isPaymentFrozen()) {
        const freezeStatus = getPaymentFreezeStatus();
        return res.status(200).json({
          success: true,
          data: {
            frozen: true,
            message: freezeStatus.message || "Payments are currently free!",
            freezeEndDate: freezeStatus.freezeEndDate?.toISOString(),
            daysRemaining: freezeStatus.daysRemaining,
          },
          // Return success but indicate payment is not needed
          paymentRequired: false,
        });
      }

      const { applicationId, returnUrl, paymentMethod = "mock" } = req.body;
      const userId = (req as any).userId;

      // Validate input
      if (!applicationId || !returnUrl) {
        return res.status(400).json({
          success: false,
          error: { message: "applicationId and returnUrl are required" },
        });
      }

      // Get application with visa type details
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
          visaType: true,
          user: true,
        },
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          error: { message: "Application not found" },
        });
      }

      // Verify ownership
      if (application.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: { message: "Unauthorized" },
        });
      }

      // Check if payment already exists
      const existingPayment = await prisma.payment.findUnique({
        where: { applicationId },
      });

      if (existingPayment && existingPayment.status === "completed") {
        return res.status(400).json({
          success: false,
          error: { message: "Payment already completed for this application" },
        });
      }

      try {
        const result = await paymentGatewayService.initiatePayment(
          paymentMethod as PaymentMethod,
          {
            userId,
            applicationId,
            amount: application.visaType.fee,
            returnUrl,
            description: `Visa fee for ${application.visaType.name}`,
            userEmail: application.user.email,
          }
        );

        return res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        console.error("Payment initiation error:", error);
        return res.status(error.statusCode || 500).json({
          success: false,
          error: {
            message: error.message || "Failed to initiate payment",
            code: error.code,
          },
        });
      }
    } catch (error: any) {
      console.error("Error in payment initiation:", error);
      return res.status(500).json({
        success: false,
        error: { message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/payments/confirm
 * Confirm payment after user returns from payment gateway
 * Body: { transactionId, sessionId, paymentMethod }
 */
router.post(
  "/confirm",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { transactionId, sessionId, paymentMethod = "mock" } = req.body;
      const userId = (req as any).userId;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: { message: "transactionId is required" },
        });
      }

      // Find payment
      const payment = await prisma.payment.findUnique({
        where: { transactionId },
        include: {
          application: true,
          user: true,
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: { message: "Payment not found" },
        });
      }

      // Verify ownership
      if (payment.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: { message: "Unauthorized" },
        });
      }

      try {
        // Verify payment with gateway
        const isVerified = await paymentGatewayService.verifyPayment(
          transactionId,
          paymentMethod as PaymentMethod
        );

        if (isVerified) {
          // Update payment status
          const updatedPayment = await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "completed",
              paidAt: new Date(),
            },
          });

          // Update application status
          await prisma.visaApplication.update({
            where: { id: payment.applicationId },
            data: {
              status: "submitted", // Move to next status
            },
          });

          return res.json({
            success: true,
            data: updatedPayment,
            message: "Payment confirmed successfully",
          });
        } else {
          // Update payment status to failed
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "failed",
            },
          });

          return res.status(400).json({
            success: false,
            error: { message: "Payment verification failed" },
          });
        }
      } catch (error: any) {
        console.error("Payment verification error:", error);
        return res.status(error.statusCode || 500).json({
          success: false,
          error: {
            message: error.message || "Failed to confirm payment",
          },
        });
      }
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      return res.status(500).json({
        success: false,
        error: { message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/payments/:id/refund
 * Refund a payment
 * Body: { reason?, amount? }
 */
router.post(
  "/:id/refund",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason, amount } = req.body;
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;

      // Find payment
      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          user: true,
          application: true,
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: { message: "Payment not found" },
        });
      }

      // Verify ownership or admin
      if (payment.userId !== userId && userRole !== "admin") {
        return res.status(403).json({
          success: false,
          error: { message: "Unauthorized" },
        });
      }

      // Check if payment can be refunded
      if (
        payment.status !== "completed" &&
        payment.status !== "partially_refunded"
      ) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Cannot refund a ${payment.status} payment`,
          },
        });
      }

      try {
        const refundAmount = amount || payment.amount;

        // Create refund record
        const refund = await prisma.refund.create({
          data: {
            paymentId: payment.id,
            amount: refundAmount,
            reason,
            status: "pending",
            initiatedBy: "user",
          },
        });

        // Update payment status
        const newStatus =
          refundAmount === payment.amount ? "refunded" : "partially_refunded";
        const newRefundedAmount =
          (payment.refundedAmount || 0) + refundAmount;

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: newStatus,
            refundedAmount: newRefundedAmount,
          },
        });

        return res.json({
          success: true,
          data: refund,
          message: "Refund initiated successfully",
        });
      } catch (error: any) {
        console.error("Refund error:", error);
        return res.status(error.statusCode || 500).json({
          success: false,
          error: {
            message: error.message || "Failed to process refund",
          },
        });
      }
    } catch (error: any) {
      console.error("Error processing refund:", error);
      return res.status(500).json({
        success: false,
        error: { message: "Internal server error" },
      });
    }
  }
);

// ============================================================================
// WEBHOOK ENDPOINTS
// ============================================================================

/**
 * POST /api/payments/webhooks/payme
 * Payme payment gateway webhook
 */
router.post("/webhooks/payme", async (req: Request, res: Response) => {
  try {
    const { detail, ...payload } = req.body;
    const signature = req.headers["x-payme-signature"] as string;

    // Process webhook
    const result = await paymentGatewayService.processWebhook(
      "payme",
      detail || payload,
      signature,
      `payme_${Date.now()}`
    );

    return res.json(result);
  } catch (error: any) {
    console.error("Payme webhook error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/webhooks/click
 * Click payment gateway webhook
 */
router.post("/webhooks/click", async (req: Request, res: Response) => {
  try {
    const { detail, ...payload } = req.body;
    const signature = req.headers["x-click-signature"] as string;

    const result = await paymentGatewayService.processWebhook(
      "click",
      detail || payload,
      signature,
      `click_${Date.now()}`
    );

    return res.json(result);
  } catch (error: any) {
    console.error("Click webhook error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/webhooks/uzum
 * Uzum payment gateway webhook
 */
router.post("/webhooks/uzum", async (req: Request, res: Response) => {
  try {
    const { detail, ...payload } = req.body;
    const signature = req.headers["x-uzum-signature"] as string;

    const result = await paymentGatewayService.processWebhook(
      "uzum",
      detail || payload,
      signature,
      `uzum_${Date.now()}`
    );

    return res.json(result);
  } catch (error: any) {
    console.error("Uzum webhook error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/webhooks/stripe
 * Stripe payment gateway webhook
 */
router.post("/webhooks/stripe", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["stripe-signature"] as string;
    const body = (req as any).rawBody || JSON.stringify(req.body);

    const result = await paymentGatewayService.processWebhook(
      "stripe",
      req.body,
      signature,
      `stripe_${req.body.id}`
    );

    return res.json(result);
  } catch (error: any) {
    console.error("Stripe webhook error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/webhooks/mock
 * Mock payment webhook (for testing)
 * Body: { transactionId, eventType }
 */
router.post("/webhooks/mock", async (req: Request, res: Response) => {
  try {
    const { transactionId, eventType = "payment.success" } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: { message: "transactionId is required" },
      });
    }

    const result = await paymentGatewayService.processWebhook(
      "mock",
      {
        transactionId,
        eventType,
      },
      undefined,
      `mock_${transactionId}`
    );

    return res.json(result);
  } catch (error: any) {
    console.error("Mock webhook error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /api/payments/admin/reconciliation
 * Payment reconciliation status
 */
router.get("/admin/reconciliation", authenticateToken, async (req, res) => {
  try {
    // Verify admin
    if ((req as any).userRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: { message: "Admin access required" },
      });
    }

    // Get payment statistics
    const stats = await prisma.payment.groupBy({
      by: ["status"],
      _count: true,
      _sum: {
        amount: true,
      },
    });

    const totalPayments = await prisma.payment.count();
    const totalRevenue = await prisma.payment.aggregate({
      where: { status: "completed" },
      _sum: { amount: true },
    });

    return res.json({
      success: true,
      data: {
        stats,
        totalPayments,
        totalRevenue: totalRevenue._sum.amount || 0,
        lastUpdated: new Date(),
      },
    });
  } catch (error: any) {
    console.error("Error getting reconciliation data:", error);
    return res.status(500).json({
      success: false,
      error: { message: "Failed to get reconciliation data" },
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPaymentMethodName(method: string): string {
  const names: Record<string, string> = {
    payme: "Payme",
    click: "Click",
    uzum: "Uzum Money",
    stripe: "Stripe",
    mock: "Test Payment (Mock)",
  };
  return names[method] || method;
}

function getPaymentMethodDescription(method: string): string {
  const descriptions: Record<string, string> = {
    payme: "Popular payment system in Central Asia",
    click: "Mobile payment system",
    uzum: "Uzbekistan payment provider",
    stripe: "International credit/debit card payments",
    mock: "Mock payment for testing and development",
  };
  return descriptions[method] || "";
}

function getPaymentMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    payme: "💳",
    click: "📱",
    uzum: "💰",
    stripe: "💳",
    mock: "🧪",
  };
  return icons[method] || "💳";
}

export default router;