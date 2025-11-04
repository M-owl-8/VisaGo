"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const payment_gateway_service_1 = require("../services/payment-gateway.service");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Initialize Payment Gateway Router
const paymentGatewayService = new payment_gateway_service_1.PaymentGatewayService({
    payme: process.env.PAYME_MERCHANT_ID
        ? {
            merchantId: process.env.PAYME_MERCHANT_ID,
            apiKey: process.env.PAYME_API_KEY || "",
            apiUrl: process.env.PAYME_API_URL || "https://checkout.test.payme.uz",
        }
        : undefined,
    click: process.env.CLICK_MERCHANT_ID
        ? {
            merchantId: process.env.CLICK_MERCHANT_ID,
            serviceId: process.env.CLICK_SERVICE_ID || "",
            apiKey: process.env.CLICK_API_KEY || "",
            apiUrl: process.env.CLICK_API_URL || "https://api.click.uz/v2",
        }
        : undefined,
    uzum: process.env.UZUM_SERVICE_ID
        ? {
            serviceId: process.env.UZUM_SERVICE_ID,
            apiKey: process.env.UZUM_API_KEY || "",
            apiUrl: process.env.UZUM_API_URL || "https://api.uzum.uz/api/merchant",
        }
        : undefined,
    stripe: process.env.STRIPE_API_KEY
        ? {
            apiKey: process.env.STRIPE_API_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
        }
        : undefined,
}, prisma);
/**
 * GET /api/payments/methods
 * Get available payment methods
 */
router.get("/methods", (req, res) => {
    try {
        const methods = paymentGatewayService.getAvailableMethods();
        const methodDetails = methods.map((method) => ({
            id: method,
            ...paymentGatewayService.getMethodInfo(method),
        }));
        return res.json({
            success: true,
            data: methodDetails,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { message: "Failed to fetch payment methods" },
        });
    }
});
/**
 * POST /api/payments/initiate
 * Initiate a payment for a visa application
 * Body: { applicationId, returnUrl, paymentMethod? }
 */
router.post("/initiate", auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { applicationId, returnUrl, paymentMethod = "payme" } = req.body;
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
        // Validate payment method
        const availableMethods = paymentGatewayService.getAvailableMethods();
        if (!availableMethods.includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                error: { message: `Payment method '${paymentMethod}' is not available` },
            });
        }
        // Create payment
        const paymentResult = await paymentGatewayService.initiatePayment(paymentMethod, {
            userId,
            applicationId,
            amount: application.visaType.fee,
            returnUrl,
            description: `${application.visaType.name} Visa Fee - ${application.user.email}`,
            userEmail: application.user.email,
        });
        return res.json({
            success: true,
            data: {
                paymentUrl: paymentResult.paymentUrl,
                transactionId: paymentResult.transactionId,
                sessionId: paymentResult.sessionId,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/payments/webhook/payme
 * Payme webhook for payment notifications
 */
router.post("/webhook/payme", async (req, res, next) => {
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
        const result = await paymentGatewayService.processWebhook("payme", {
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
        console.error("Payme webhook error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * POST /api/payments/webhook/click
 * Click webhook for payment notifications
 */
router.post("/webhook/click", async (req, res, next) => {
    try {
        const result = await paymentGatewayService.processWebhook("click", req.body);
        if (!result.success) {
            console.warn("Click webhook processing failed:", result.error);
            return res.status(400).json({
                error: result.error,
            });
        }
        return res.json({
            success: true,
        });
    }
    catch (error) {
        console.error("Click webhook error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * POST /api/payments/webhook/uzum
 * Uzum webhook for payment notifications
 */
router.post("/webhook/uzum", async (req, res, next) => {
    try {
        const result = await paymentGatewayService.processWebhook("uzum", req.body);
        if (!result.success) {
            console.warn("Uzum webhook processing failed:", result.error);
            return res.status(400).json({
                error: result.error,
            });
        }
        return res.json({
            success: true,
        });
    }
    catch (error) {
        console.error("Uzum webhook error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * POST /api/payments/webhook/stripe
 * Stripe webhook for payment notifications
 */
router.post("/webhook/stripe", express_1.default.raw({ type: "application/json" }), async (req, res, next) => {
    try {
        const signature = req.headers["stripe-signature"];
        if (!signature) {
            return res.status(400).json({
                success: false,
                error: "Missing Stripe signature",
            });
        }
        // Process webhook with raw body
        const result = await paymentGatewayService.processWebhook("stripe", req.body, signature);
        if (!result.success) {
            console.warn("Stripe webhook processing failed:", result.error);
            return res.status(400).json({
                error: result.error,
            });
        }
        return res.json({
            success: true,
        });
    }
    catch (error) {
        console.error("Stripe webhook error:", error);
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
        const payment = await paymentGatewayService.getPayment(transactionId);
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
        const payments = await paymentGatewayService.getUserPayments(userId);
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
        const payment = await paymentGatewayService.getPayment(transactionId);
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
        const isVerified = await paymentGatewayService.verifyPayment(transactionId, payment.paymentMethod);
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
        const payment = await paymentGatewayService.getPayment(transactionId);
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
        const cancelled = await paymentGatewayService.cancelPayment(transactionId);
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