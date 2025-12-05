"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymeService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
class PaymeService {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        // Only validate config if not in development with mock payments enabled
        // During payment freeze, credentials may not be needed
        if (!config.merchantId || !config.apiKey) {
            // Check if payments are frozen - if so, allow incomplete config
            const { isPaymentFrozen } = require('../utils/payment-freeze');
            if (!isPaymentFrozen() && process.env.NODE_ENV === 'production') {
                throw new Error('Payme configuration incomplete: merchantId and apiKey required');
            }
            // In development or when frozen, allow incomplete config but log warning
            console.warn('⚠️  Payme configuration incomplete - payments may not work until configured');
        }
    }
    /**
     * Generate merchant transaction ID
     */
    generateMerchantTransId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Create a payment link
     */
    async createPayment(params) {
        const merchantTransId = this.generateMerchantTransId();
        const amountInTiyn = Math.round(params.amount * 100); // Convert USD to tiyn
        try {
            // Save payment record with pending status
            const payment = await this.prisma.payment.create({
                data: {
                    userId: params.userId,
                    applicationId: params.applicationId,
                    amount: params.amount,
                    currency: 'UZS', // Payme works in UZS
                    status: 'pending',
                    paymentMethod: 'payme',
                    orderId: merchantTransId,
                    paymentGatewayData: JSON.stringify({
                        merchantTransId,
                        createdAt: new Date().toISOString(),
                        description: params.description,
                    }),
                },
            });
            // Build payment URL for Payme checkout
            const params_str = Buffer.from(JSON.stringify({
                account: {
                    application_id: params.applicationId,
                },
                amount: amountInTiyn,
                currency: 'UZS',
                order_id: merchantTransId,
                merchant_trans_id: merchantTransId,
                return_url: params.returnUrl,
                description: params.description || 'Visa Application Payment',
            })).toString('base64');
            const signature = this.generateSignature(params_str);
            const paymentUrl = `${this.config.apiUrl}?sign=${signature}&params=${params_str}`;
            return {
                paymentUrl,
                merchantTransId,
                transactionId: payment.id,
            };
        }
        catch (error) {
            console.error('Error creating Payme payment:', error);
            throw error;
        }
    }
    /**
     * Generate signature for Payme requests
     */
    generateSignature(params) {
        const key = `${params};${this.config.apiKey}`;
        return crypto_1.default.createHash('md5').update(key).digest('hex');
    }
    /**
     * Check transaction status via API
     */
    async checkTransaction(merchantTransId) {
        try {
            const payload = {
                jsonrpc: '2.0',
                method: 'CheckTransaction',
                params: {
                    account: {
                        order_id: merchantTransId,
                    },
                },
                id: Date.now().toString(),
            };
            const response = await axios_1.default.post(`${this.config.apiUrl}/api`, payload, {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${this.config.merchantId}:${this.config.apiKey}`).toString('base64')}`,
                    'Content-Type': 'application/json',
                },
            });
            return response.data;
        }
        catch (error) {
            console.error('Error checking Payme transaction:', error.response?.data || error.message);
            throw error;
        }
    }
    /**
     * Process webhook from Payme
     */
    async processWebhook(webhookData, signature) {
        try {
            // Verify webhook signature
            const params = Buffer.from(webhookData.params).toString('utf-8');
            const expectedSignature = this.generateSignature(webhookData.params);
            if (signature !== expectedSignature) {
                return {
                    success: false,
                    error: 'Invalid signature',
                };
            }
            const decodedParams = JSON.parse(params);
            const merchantTransId = decodedParams.order_id || decodedParams.merchant_trans_id;
            // Find payment by merchant transaction ID
            const payment = await this.prisma.payment.findFirst({
                where: {
                    orderId: merchantTransId,
                },
            });
            if (!payment) {
                return {
                    success: false,
                    error: 'Payment not found',
                };
            }
            // Handle different webhook events
            if (webhookData.event === 'PaymentSuccess') {
                // Update payment status to completed
                await this.prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: 'completed',
                        transactionId: decodedParams.transaction_id || decodedParams.order_id,
                        paidAt: new Date(),
                        paymentGatewayData: JSON.stringify(decodedParams),
                    },
                });
                // Update visa application status
                await this.prisma.visaApplication.update({
                    where: { id: payment.applicationId },
                    data: {
                        status: 'submitted',
                    },
                });
                console.log(`Payment completed: ${payment.id}`);
                return { success: true };
            }
            if (webhookData.event === 'PaymentFailed') {
                await this.prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: 'failed',
                        paymentGatewayData: JSON.stringify(decodedParams),
                    },
                });
                console.log(`Payment failed: ${payment.id}`);
                return { success: true };
            }
            return { success: true };
        }
        catch (error) {
            console.error('Error processing webhook:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    /**
     * Verify payment completion (polling fallback)
     */
    async verifyPayment(transactionId) {
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { id: transactionId },
            });
            if (!payment) {
                return false;
            }
            // If payment is already completed, return true
            if (payment.status === 'completed') {
                return true;
            }
            // Check with Payme API
            if (payment.orderId) {
                const result = await this.checkTransaction(payment.orderId);
                if (result.result && result.result.transactions && result.result.transactions.length > 0) {
                    const transaction = result.result.transactions[0];
                    if (transaction.state === 2) {
                        // State 2 = completed
                        await this.prisma.payment.update({
                            where: { id: transactionId },
                            data: {
                                status: 'completed',
                                transactionId: transaction.id,
                                paidAt: new Date(),
                            },
                        });
                        await this.prisma.visaApplication.update({
                            where: { id: payment.applicationId },
                            data: {
                                status: 'submitted',
                            },
                        });
                        return true;
                    }
                }
            }
            return false;
        }
        catch (error) {
            console.error('Error verifying payment:', error);
            return false;
        }
    }
    /**
     * Get payment details
     */
    async getPayment(paymentId) {
        return this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                user: true,
                application: true,
            },
        });
    }
    /**
     * Get user payments
     */
    async getUserPayments(userId) {
        return this.prisma.payment.findMany({
            where: { userId },
            include: {
                application: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    /**
     * Cancel payment
     */
    async cancelPayment(paymentId) {
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { id: paymentId },
            });
            if (!payment || payment.status !== 'pending') {
                return false;
            }
            await this.prisma.payment.update({
                where: { id: paymentId },
                data: { status: 'failed' },
            });
            return true;
        }
        catch (error) {
            console.error('Error canceling payment:', error);
            return false;
        }
    }
}
exports.PaymeService = PaymeService;
//# sourceMappingURL=payme.service.js.map