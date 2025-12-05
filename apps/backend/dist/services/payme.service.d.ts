import { PrismaClient } from '@prisma/client';
interface PaymeConfig {
    merchantId: string;
    apiKey: string;
    apiUrl: string;
}
interface CreatePaymentParams {
    userId: string;
    applicationId: string;
    amount: number;
    returnUrl: string;
    description?: string;
}
export declare class PaymeService {
    private config;
    private prisma;
    constructor(config: PaymeConfig, prisma: PrismaClient);
    /**
     * Generate merchant transaction ID
     */
    private generateMerchantTransId;
    /**
     * Create a payment link
     */
    createPayment(params: CreatePaymentParams): Promise<{
        paymentUrl: string;
        merchantTransId: string;
        transactionId: string;
    }>;
    /**
     * Generate signature for Payme requests
     */
    private generateSignature;
    /**
     * Check transaction status via API
     */
    checkTransaction(merchantTransId: string): Promise<any>;
    /**
     * Process webhook from Payme
     */
    processWebhook(webhookData: any, signature: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Verify payment completion (polling fallback)
     */
    verifyPayment(transactionId: string): Promise<boolean>;
    /**
     * Get payment details
     */
    getPayment(paymentId: string): Promise<any>;
    /**
     * Get user payments
     */
    getUserPayments(userId: string): Promise<any[]>;
    /**
     * Cancel payment
     */
    cancelPayment(paymentId: string): Promise<boolean>;
}
export {};
//# sourceMappingURL=payme.service.d.ts.map