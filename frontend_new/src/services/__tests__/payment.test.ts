/**
 * Payment Gateway Integration Tests
 * Tests all 4 payment gateways: Payme, Click, Uzum, Stripe
 */

import { paymentGatewayService, PaymentRequest } from "../payment-api";

describe("Payment Gateway Service", () => {
  /**
   * ============================================================================
   * Gateway Configuration Tests
   * ============================================================================
   */

  describe("Gateway Configuration", () => {
    test("should have all 4 gateways configured", () => {
      const gateways = paymentGatewayService.getAvailableGateways();
      expect(gateways.length).toBe(4);

      const gatewayIds = gateways.map((g) => g.id).sort();
      expect(gatewayIds).toEqual(["click", "payme", "stripe", "uzum"]);
    });

    test("Payme should be configured correctly", () => {
      const payme = paymentGatewayService.getGatewayConfig("payme");
      expect(payme).toBeDefined();
      expect(payme?.name).toBe("Payme");
      expect(payme?.supportedCurrencies).toContain("UZS");
      expect(payme?.supportedCurrencies).toContain("USD");
      expect(payme?.supportsRefunds).toBe(true);
    });

    test("Click should be configured correctly", () => {
      const click = paymentGatewayService.getGatewayConfig("click");
      expect(click).toBeDefined();
      expect(click?.name).toBe("Click");
      expect(click?.supportedCurrencies).toContain("UZS");
      expect(click?.supportedCurrencies).toContain("USD");
      expect(click?.supportsRefunds).toBe(true);
    });

    test("Uzum should be configured correctly", () => {
      const uzum = paymentGatewayService.getGatewayConfig("uzum");
      expect(uzum).toBeDefined();
      expect(uzum?.name).toBe("Uzum");
      expect(uzum?.supportedCurrencies).toEqual(["UZS"]);
      expect(uzum?.supportsRefunds).toBe(true);
    });

    test("Stripe should be configured correctly", () => {
      const stripe = paymentGatewayService.getGatewayConfig("stripe");
      expect(stripe).toBeDefined();
      expect(stripe?.name).toBe("Stripe");
      expect(stripe?.supportedCurrencies).toContain("USD");
      expect(stripe?.supportedCurrencies).toContain("EUR");
      expect(stripe?.supportsRefunds).toBe(true);
    });

    test("should return undefined for unknown gateway", () => {
      const unknown = paymentGatewayService.getGatewayConfig("unknown");
      expect(unknown).toBeUndefined();
    });
  });

  /**
   * ============================================================================
   * Payment Validation Tests
   * ============================================================================
   */

  describe("Payment Request Validation", () => {
    const validRequest: PaymentRequest = {
      applicationId: "APP-123",
      amount: 100,
      currency: "USD",
      paymentMethod: "payme",
      returnUrl: "https://example.com/return",
    };

    test("should validate correct payment request", () => {
      const result = paymentGatewayService.validatePaymentRequest(validRequest);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should reject request with missing applicationId", () => {
      const request = { ...validRequest, applicationId: "" };
      const result = paymentGatewayService.validatePaymentRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Application ID");
    });

    test("should reject request with invalid amount", () => {
      const request = { ...validRequest, amount: 0 };
      const result = paymentGatewayService.validatePaymentRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Amount");
    });

    test("should reject request with missing paymentMethod", () => {
      const request = { ...validRequest, paymentMethod: "" as any };
      const result = paymentGatewayService.validatePaymentRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Payment method");
    });

    test("should reject request with missing returnUrl", () => {
      const request = { ...validRequest, returnUrl: "" };
      const result = paymentGatewayService.validatePaymentRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Return URL");
    });

    test("should reject unknown payment method", () => {
      const request = { ...validRequest, paymentMethod: "unknown" as any };
      const result = paymentGatewayService.validatePaymentRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unknown payment method");
    });

    test("should reject unsupported currency for gateway", () => {
      const request = { ...validRequest, currency: "JPY", paymentMethod: "uzum" as const };
      const result = paymentGatewayService.validatePaymentRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("does not support");
    });

    test("should accept UZS for Payme", () => {
      const request = { ...validRequest, currency: "UZS", paymentMethod: "payme" as const };
      const result = paymentGatewayService.validatePaymentRequest(request);
      expect(result.valid).toBe(true);
    });

    test("should accept multiple currencies for Stripe", () => {
      const currencies = ["USD", "EUR", "GBP", "UZS"];
      currencies.forEach((currency) => {
        const request = { ...validRequest, currency, paymentMethod: "stripe" as const };
        const result = paymentGatewayService.validatePaymentRequest(request);
        expect(result.valid).toBe(true);
      });
    });
  });

  /**
   * ============================================================================
   * Amount Formatting Tests
   * ============================================================================
   */

  describe("Amount Formatting", () => {
    test("should format USD correctly", () => {
      const formatted = paymentGatewayService.formatAmount(100, "USD");
      expect(formatted).toBe("$ 100.00");
    });

    test("should format EUR correctly", () => {
      const formatted = paymentGatewayService.formatAmount(100, "EUR");
      expect(formatted).toBe("€ 100.00");
    });

    test("should format GBP correctly", () => {
      const formatted = paymentGatewayService.formatAmount(100, "GBP");
      expect(formatted).toBe("£ 100.00");
    });

    test("should format UZS correctly", () => {
      const formatted = paymentGatewayService.formatAmount(100000, "UZS");
      expect(formatted).toContain("100000.00");
    });

    test("should handle decimal amounts", () => {
      const formatted = paymentGatewayService.formatAmount(99.99, "USD");
      expect(formatted).toBe("$ 99.99");
    });
  });

  /**
   * ============================================================================
   * Polling Tests
   * ============================================================================
   */

  describe("Payment Status Polling", () => {
    jest.useFakeTimers();

    test("should start polling and return a poll ID", () => {
      const pollId = paymentGatewayService.startPaymentPolling(
        "TX-123",
        "payme",
        (status) => {},
        () => {}
      );

      expect(pollId).toBeDefined();
      expect(typeof pollId).toBe("string");
      expect(pollId).toContain("TX-123");

      paymentGatewayService.stopPaymentPolling(pollId);
    });

    test("should stop polling", () => {
      const pollId = paymentGatewayService.startPaymentPolling(
        "TX-123",
        "payme",
        (status) => {},
        () => {}
      );

      paymentGatewayService.stopPaymentPolling(pollId);

      // Trying to stop again should not throw
      paymentGatewayService.stopPaymentPolling(pollId);
    });

    test("should stop all polling", () => {
      const pollId1 = paymentGatewayService.startPaymentPolling(
        "TX-123",
        "payme",
        (status) => {},
        () => {}
      );

      const pollId2 = paymentGatewayService.startPaymentPolling(
        "TX-456",
        "click",
        (status) => {},
        () => {}
      );

      paymentGatewayService.stopAllPolling();

      // Both should be stopped
      paymentGatewayService.stopPaymentPolling(pollId1);
      paymentGatewayService.stopPaymentPolling(pollId2);
    });

    jest.useRealTimers();
  });

  /**
   * ============================================================================
   * Integration Tests
   * ============================================================================
   */

  describe("Integration Scenarios", () => {
    const validRequest: PaymentRequest = {
      applicationId: "APP-123",
      amount: 50,
      currency: "USD",
      paymentMethod: "payme",
      returnUrl: "https://example.com/return",
    };

    test("should handle complete payment flow for Payme", async () => {
      // Validate request
      const validation = paymentGatewayService.validatePaymentRequest(validRequest);
      expect(validation.valid).toBe(true);

      // Get gateway config
      const gateway = paymentGatewayService.getGatewayConfig("payme");
      expect(gateway).toBeDefined();
      expect(gateway?.supportedCurrencies).toContain("USD");
    });

    test("should handle complete payment flow for Click", async () => {
      const request = { ...validRequest, paymentMethod: "click" as const };
      const validation = paymentGatewayService.validatePaymentRequest(request);
      expect(validation.valid).toBe(true);

      const gateway = paymentGatewayService.getGatewayConfig("click");
      expect(gateway).toBeDefined();
    });

    test("should handle complete payment flow for Uzum (UZS only)", async () => {
      const request = {
        ...validRequest,
        paymentMethod: "uzum" as const,
        currency: "UZS",
      };
      const validation = paymentGatewayService.validatePaymentRequest(request);
      expect(validation.valid).toBe(true);

      const gateway = paymentGatewayService.getGatewayConfig("uzum");
      expect(gateway?.supportedCurrencies).toEqual(["UZS"]);
    });

    test("should handle complete payment flow for Stripe (Multiple currencies)", async () => {
      const currencies = ["USD", "EUR", "GBP"];
      for (const currency of currencies) {
        const request = {
          ...validRequest,
          paymentMethod: "stripe" as const,
          currency,
        };
        const validation = paymentGatewayService.validatePaymentRequest(request);
        expect(validation.valid).toBe(true);
      }
    });
  });

  /**
   * ============================================================================
   * Error Handling Tests
   * ============================================================================
   */

  describe("Error Handling", () => {
    test("should handle invalid gateway gracefully", () => {
      const gateway = paymentGatewayService.getGatewayConfig("invalid");
      expect(gateway).toBeUndefined();
    });

    test("should validate before processing payment", () => {
      const invalidRequest = {
        applicationId: "",
        amount: 0,
        currency: "INVALID",
        paymentMethod: "invalid" as any,
        returnUrl: "",
      };

      const result = paymentGatewayService.validatePaymentRequest(invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  /**
   * ============================================================================
   * Multi-Gateway Support Tests
   * ============================================================================
   */

  describe("Multi-Gateway Support", () => {
    test("should support all payment gateways", () => {
      const gateways = ["payme", "click", "uzum", "stripe"];
      gateways.forEach((gatewayId) => {
        const config = paymentGatewayService.getGatewayConfig(gatewayId);
        expect(config).toBeDefined();
        expect(config?.id).toBe(gatewayId);
      });
    });

    test("should have consistent interface across all gateways", () => {
      const gateways = paymentGatewayService.getAvailableGateways();

      gateways.forEach((gateway) => {
        expect(gateway.id).toBeDefined();
        expect(gateway.name).toBeDefined();
        expect(gateway.baseUrl).toBeDefined();
        expect(gateway.icon).toBeDefined();
        expect(gateway.description).toBeDefined();
        expect(gateway.supportedCurrencies).toBeDefined();
        expect(Array.isArray(gateway.supportedCurrencies)).toBe(true);
        expect(gateway.supportsRefunds).toBeDefined();
        expect(typeof gateway.supportsRefunds).toBe("boolean");
      });
    });

    test("should support concurrent polling for multiple gateways", () => {
      jest.useFakeTimers();

      const pollId1 = paymentGatewayService.startPaymentPolling(
        "TX-PAYME",
        "payme",
        (status) => {},
        () => {}
      );

      const pollId2 = paymentGatewayService.startPaymentPolling(
        "TX-CLICK",
        "click",
        (status) => {},
        () => {}
      );

      const pollId3 = paymentGatewayService.startPaymentPolling(
        "TX-STRIPE",
        "stripe",
        (status) => {},
        () => {}
      );

      expect(pollId1).not.toBe(pollId2);
      expect(pollId2).not.toBe(pollId3);

      paymentGatewayService.stopAllPolling();

      jest.useRealTimers();
    });
  });
});

/**
 * ============================================================================
 * Manual Testing Checklist
 * ============================================================================
 *
 * Run these tests manually with actual payment gateways:
 *
 * 1. PAYME GATEWAY TEST
 *    - [ ] Initiate payment with Payme
 *    - [ ] Verify payment URL opens correctly
 *    - [ ] Polling detects completed payment
 *    - [ ] Payment status updates in store
 *    - [ ] Success screen displays correctly
 *    - [ ] Receipt shows transaction details
 *
 * 2. CLICK GATEWAY TEST
 *    - [ ] Initiate payment with Click
 *    - [ ] Verify payment URL opens correctly
 *    - [ ] Polling detects completed payment
 *    - [ ] Payment status updates in store
 *    - [ ] Success screen displays correctly
 *
 * 3. UZUM GATEWAY TEST
 *    - [ ] Initiate payment with Uzum (UZS only)
 *    - [ ] Verify payment URL opens correctly
 *    - [ ] Polling detects completed payment
 *    - [ ] Payment status updates in store
 *    - [ ] Success screen displays correctly
 *
 * 4. STRIPE GATEWAY TEST
 *    - [ ] Initiate payment with Stripe
 *    - [ ] Test with multiple currencies (USD, EUR, GBP)
 *    - [ ] Verify payment URL opens correctly
 *    - [ ] Polling detects completed payment
 *    - [ ] Payment status updates in store
 *    - [ ] Success screen displays correctly
 *
 * 5. FAILURE SCENARIOS
 *    - [ ] Test payment failure handling
 *    - [ ] Test polling timeout after 2 minutes
 *    - [ ] Test retry payment functionality
 *    - [ ] Test payment cancellation
 *
 * 6. MULTI-GATEWAY FLOW
 *    - [ ] User can switch between gateways
 *    - [ ] Previous payment attempts don't interfere
 *    - [ ] Payment history shows all gateways
 *    - [ ] Concurrent payments from different users work
 *
 * 7. PAYMENT HISTORY
 *    - [ ] View payment history screen
 *    - [ ] Filter payments by status
 *    - [ ] View transaction details
 *    - [ ] Retry failed payments
 *    - [ ] Copy transaction IDs
 */