import express, { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { PaymeService } from "../services/payme.service";
import { authenticateToken } from "../middleware/auth";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Initialize Payme service
const paymeService = new PaymeService(
  {
    merchantId: process.env.PAYME_MERCHANT_ID || "",
    apiKey: process.env.PAYME_API_KEY || "",
    apiUrl: process.env.PAYME_API_URL || "https://checkout.test.payme.uz",
  },
  prisma
);

/**
 * POST /api/payments/initiate
 * Initiate a payment for a visa application
 */
router.post(
  "/initiate",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { applicationId, returnUrl } = req.body;
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

      // Check user ownership
      if (application.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: { message: "Unauthorized" },
        });
      }

      // Check if already paid
      const existingPayment = await prisma.payment.findUnique({
        where: { applicationId },
      });

      if (existingPayment && existingPayment.status === "completed") {
        return res.status(400).json({
          success: false,
          error: { message: "Payment already completed for this application" },
        });
      }

      // Create payment
      const paymentResult = await paymeService.createPayment({
        userId,
        applicationId,
        amount: application.visaType.fee,
        returnUrl,
        description: `${application.visaType.name} Visa Fee - ${application.user.email}`,
      });

      return res.json({
        success: true,
        data: {
          paymentUrl: paymentResult.paymentUrl,
          transactionId: paymentResult.transactionId,
          merchantTransId: paymentResult.merchantTransId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/payments/webhook
 * Payme webhook for payment notifications
 */
router.post("/webhook", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { params, sign, event } = req.body;

    // Verify webhook structure
    if (!params || !sign) {
      return res.status(400).json({
        success: false,
        error: "Invalid webhook structure",
      });
    }

    // Process webhook
    const result = await paymeService.processWebhook(
      {
        params,
        event,
      },
      sign
    );

    if (!result.success) {
      console.warn("Webhook processing failed:", result.error);
      return res.status(400).json({
        error: result.error,
      });
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/payments/:transactionId
 * Get payment details
 */
router.get(
  "/:transactionId",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transactionId } = req.params;
      const userId = (req as any).userId;

      const payment = await paymeService.getPayment(transactionId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: { message: "Payment not found" },
        });
      }

      if (payment.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: { message: "Unauthorized" },
        });
      }

      return res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/payments
 * Get user payments
 */
router.get("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const payments = await paymeService.getUserPayments(userId);

    return res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/:transactionId/verify
 * Verify payment completion (polling)
 */
router.post(
  "/:transactionId/verify",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transactionId } = req.params;
      const userId = (req as any).userId;

      const payment = await paymeService.getPayment(transactionId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: { message: "Payment not found" },
        });
      }

      if (payment.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: { message: "Unauthorized" },
        });
      }

      const isVerified = await paymeService.verifyPayment(transactionId);

      return res.json({
        success: true,
        data: {
          verified: isVerified,
          status: isVerified ? "completed" : "pending",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/payments/:transactionId/cancel
 * Cancel pending payment
 */
router.delete(
  "/:transactionId/cancel",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transactionId } = req.params;
      const userId = (req as any).userId;

      const payment = await paymeService.getPayment(transactionId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: { message: "Payment not found" },
        });
      }

      if (payment.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: { message: "Unauthorized" },
        });
      }

      const cancelled = await paymeService.cancelPayment(transactionId);

      if (!cancelled) {
        return res.status(400).json({
          success: false,
          error: { message: "Cannot cancel non-pending payment" },
        });
      }

      return res.json({
        success: true,
        data: { message: "Payment cancelled" },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;