/**
 * Test Helpers and Utilities
 * Common utilities for writing tests
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

/**
 * Create a mock Express request
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    userId: undefined,
    user: undefined,
    ...overrides,
  } as Partial<Request>;
}

/**
 * Create a mock Express response
 */
export function createMockResponse(): Partial<Response> {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    statusCode: 200,
  };
  return res;
}

/**
 * Create a mock Prisma client
 */
export function createMockPrismaClient(): Partial<PrismaClient> {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    visaApplication: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    chatSession: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    chatMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  } as any;
}

/**
 * Wait for a specified time (useful for testing timeouts)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a test user object
 */
export function createTestUser(overrides: any = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: 'hashed-password',
    emailVerified: true,
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test visa application object
 */
export function createTestApplication(overrides: any = {}) {
  return {
    id: 'test-application-id',
    userId: 'test-user-id',
    countryId: 'test-country-id',
    visaTypeId: 'test-visa-type-id',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test payment object
 */
export function createTestPayment(overrides: any = {}) {
  return {
    id: 'test-payment-id',
    userId: 'test-user-id',
    applicationId: 'test-application-id',
    amount: 100.00,
    currency: 'USD',
    status: 'pending',
    paymentMethod: 'stripe',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Mock environment variables for testing
 */
export function mockEnv(env: Record<string, string>) {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv, ...env };
  });
  afterEach(() => {
    process.env = originalEnv;
  });
}

/**
 * Assert that an error response has the correct structure
 */
export function expectErrorResponse(res: any, status: number, code?: string) {
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalled();
  const response = res.json.mock.calls[0][0];
  expect(response.success).toBe(false);
  expect(response.error).toBeDefined();
  expect(response.error.status).toBe(status);
  if (code) {
    expect(response.error.code).toBe(code);
  }
}

/**
 * Assert that a success response has the correct structure
 */
export function expectSuccessResponse(res: any, status: number = 200) {
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalled();
  const response = res.json.mock.calls[0][0];
  expect(response.success).toBe(true);
  expect(response.data).toBeDefined();
}








