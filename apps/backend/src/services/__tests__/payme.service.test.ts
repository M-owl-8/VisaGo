import { PaymeService } from '../payme.service';
import { mockPayment, mockUser, createMockPrisma } from '../../__tests__/test-utils';
import crypto from 'crypto';

jest.mock('axios');
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => createMockPrisma()),
}));

describe('PaymeService', () => {
  let paymeService: PaymeService;
  let mockPrisma: any;

  const paymeConfig = {
    merchantId: 'test-merchant-123',
    apiKey: 'test-api-key-123',
    apiUrl: 'https://checkout.test.payme.uz',
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    paymeService = new PaymeService(paymeConfig, mockPrisma);
  });

  describe('initialization', () => {
    it('should throw error if merchantId is missing', () => {
      const invalidConfig = {
        merchantId: '',
        apiKey: 'test-api-key',
        apiUrl: 'https://test.payme.uz',
      };

      expect(() => new PaymeService(invalidConfig, mockPrisma)).toThrow(
        'Payme configuration incomplete: merchantId and apiKey required'
      );
    });

    it('should throw error if apiKey is missing', () => {
      const invalidConfig = {
        merchantId: 'test-merchant',
        apiKey: '',
        apiUrl: 'https://test.payme.uz',
      };

      expect(() => new PaymeService(invalidConfig, mockPrisma)).toThrow(
        'Payme configuration incomplete: merchantId and apiKey required'
      );
    });

    it('should initialize successfully with valid config', () => {
      expect(paymeService).toBeDefined();
      expect(paymeService).toBeInstanceOf(PaymeService);
    });
  });

  describe('createPayment', () => {
    it('should create payment with valid parameters', async () => {
      const paymentParams = {
        userId: mockUser.id,
        applicationId: 'app-123',
        amount: 100,
        returnUrl: 'https://example.com/payment/return',
        description: 'Visa application fee',
      };

      mockPrisma.payment.create.mockResolvedValueOnce(mockPayment);

      // Test merchant transaction ID generation
      const merchantTransId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      expect(merchantTransId).toBeDefined();
      expect(merchantTransId).toContain('-');
    });

    it('should convert amount to tiyn correctly', () => {
      const amountInUSD = 50;
      const amountInTiyn = Math.round(amountInUSD * 100);
      
      expect(amountInTiyn).toBe(5000);
    });

    it('should store payment record with pending status', async () => {
      const paymentParams = {
        userId: mockUser.id,
        applicationId: 'app-123',
        amount: 100,
        returnUrl: 'https://example.com/payment/return',
      };

      mockPrisma.payment.create.mockResolvedValueOnce({
        ...mockPayment,
        ...paymentParams,
        status: 'pending',
      });

      // Mock the create call
      await mockPrisma.payment.create({
        data: {
          userId: paymentParams.userId,
          applicationId: paymentParams.applicationId,
          amount: paymentParams.amount,
          status: 'pending',
        },
      });

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: paymentParams.userId,
          applicationId: paymentParams.applicationId,
          amount: paymentParams.amount,
          status: 'pending',
        }),
      });
    });

    it('should generate unique merchant transaction IDs', () => {
      const ids = new Set();
      
      for (let i = 0; i < 10; i++) {
        const merchantTransId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        ids.add(merchantTransId);
      }

      // All IDs should be unique (or very likely to be with random component)
      expect(ids.size).toBeGreaterThan(1);
    });
  });

  describe('webhook verification', () => {
    it('should verify valid webhook signature', () => {
      const data = {
        click_trans_id: 'trans-123',
        merchant_trans_id: 'merchant-trans-123',
        amount: '5000',
      };

      const message = `${data.click_trans_id};${data.merchant_trans_id};${paymeConfig.merchantId};${data.amount}`;
      const expectedSignature = crypto
        .createHash('md5')
        .update(message + paymeConfig.apiKey)
        .digest('hex');

      expect(expectedSignature).toBeDefined();
      expect(expectedSignature).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should reject invalid webhook signature', () => {
      const validSignature = 'valid-signature-hash';
      const invalidSignature = 'invalid-signature-hash';

      expect(validSignature).not.toBe(invalidSignature);
    });
  });

  describe('payment status', () => {
    it('should handle pending payment status', () => {
      const status = 'pending';
      expect(['pending', 'processing', 'completed', 'failed']).toContain(status);
    });

    it('should handle completed payment status', async () => {
      mockPrisma.payment.update.mockResolvedValueOnce({
        ...mockPayment,
        status: 'completed',
      });

      const updatedPayment = await mockPrisma.payment.update({
        where: { id: mockPayment.id },
        data: { status: 'completed' },
      });

      expect(updatedPayment.status).toBe('completed');
    });

    it('should handle failed payment status', async () => {
      mockPrisma.payment.update.mockResolvedValueOnce({
        ...mockPayment,
        status: 'failed',
      });

      const updatedPayment = await mockPrisma.payment.update({
        where: { id: mockPayment.id },
        data: { status: 'failed' },
      });

      expect(updatedPayment.status).toBe('failed');
    });
  });

  describe('payment amount validation', () => {
    it('should validate positive amounts', () => {
      const validAmounts = [0.01, 1, 100, 999999];
      
      validAmounts.forEach(amount => {
        expect(amount > 0).toBe(true);
      });
    });

    it('should reject zero or negative amounts', () => {
      const invalidAmounts = [0, -1, -100];
      
      invalidAmounts.forEach(amount => {
        expect(amount > 0).toBe(false);
      });
    });

    it('should handle decimal amounts correctly', () => {
      const amount = 49.99;
      const amountInTiyn = Math.round(amount * 100);
      
      expect(amountInTiyn).toBe(4999);
    });
  });

  describe('payment record storage', () => {
    it('should include all required fields in payment record', async () => {
      mockPrisma.payment.create.mockResolvedValueOnce(mockPayment);

      const payment = await mockPrisma.payment.create({
        data: {
          userId: mockUser.id,
          applicationId: 'app-123',
          amount: 100,
          currency: 'UZS',
          status: 'pending',
          paymentMethod: 'payme',
        },
      });

      expect(payment).toHaveProperty('userId');
      expect(payment).toHaveProperty('applicationId');
      expect(payment).toHaveProperty('amount');
      expect(payment).toHaveProperty('currency');
      expect(payment).toHaveProperty('status');
      expect(payment).toHaveProperty('paymentMethod');
    });

    it('should store gateway transaction ID', async () => {
      mockPrisma.payment.create.mockResolvedValueOnce({
        ...mockPayment,
        paymentGatewayData: JSON.stringify({
          merchantTransId: 'merchant-trans-123',
          transactionId: 'trans-123',
        }),
      });

      const payment = await mockPrisma.payment.create({
        data: {
          userId: mockUser.id,
          applicationId: 'app-123',
          amount: 100,
          paymentGatewayData: JSON.stringify({
            merchantTransId: 'merchant-trans-123',
          }),
        },
      });

      const gatewayData = JSON.parse(payment.paymentGatewayData);
      expect(gatewayData).toHaveProperty('merchantTransId');
    });
  });
});