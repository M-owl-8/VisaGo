"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const payme_service_1 = require("../services/payme.service");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Initialize Payme service
const paymeService = new payme_service_1.PaymeService({
    merchantId: process.env.PAYME_MERCHANT_ID || "",
    apiKey: process.env.PAYME_API_KEY || "",
    apiUrl: process.env.PAYME_API_URL || "https://checkout.test.payme.uz",
}, prisma);
/**
 * POST /api/payments/initiate
 * Initiate a payment for a visa application
 */
router.post("/initiate", auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { applicationId, returnUrl } = req.body;
        const userId = req.userId;
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
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/payments/webhook
 * Payme webhook for payment notifications
 */
router.post("/webhook", async (req, res, next) => {
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
        const result = await paymeService.processWebhook({
            params,
            event,
        }, sign);
        if (!result.success) {
            console.warn("Webhook processing failed:", result.error);
            return res.status(400).json({
                error: result.error,
            });
        }
        return res.json({
            success: true,
        });
    }
    catch (error) {
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
router.get("/:transactionId", auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { transactionId } = req.params;
        const userId = req.userId;
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
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/payments
 * Get user payments
 */
router.get("/", auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const payments = await paymeService.getUserPayments(userId);
        return res.json({
            success: true,
            data: payments,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/payments/:transactionId/verify
 * Verify payment completion (polling)
 */
router.post("/:transactionId/verify", auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { transactionId } = req.params;
        const userId = req.userId;
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
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/payments/:transactionId/cancel
 * Cancel pending payment
 */
router.delete("/:transactionId/cancel", auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { transactionId } = req.params;
        const userId = req.userId;
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map