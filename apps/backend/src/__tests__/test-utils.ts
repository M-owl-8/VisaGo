/**
 * Test Utilities and Fixtures
 * Shared functions and data for all tests
 */

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Basic mock fixtures used by database.test
export const mockUser = {
  id: 'user-1',
  email: 'mock@example.com',
  passwordHash: 'hashed-password',
  firstName: 'Mock',
  lastName: 'User',
};

export const mockApplication = {
  id: 'app-1',
  userId: mockUser.id,
  countryId: 'country-1',
  visaTypeId: 'visa-type-1',
  status: 'draft',
};

export const mockPayment = {
  id: 'pay-1',
  userId: mockUser.id,
  applicationId: mockApplication.id,
  amount: 100,
  currency: 'USD',
  status: 'pending',
};

export const mockDocument = {
  id: 'doc-1',
  userId: mockUser.id,
  applicationId: mockApplication.id,
  documentType: 'passport',
  documentName: 'passport.pdf',
  fileUrl: 'http://example.com/passport.pdf',
  fileName: 'passport.pdf',
  fileSize: 1234,
  status: 'pending',
};

// Jest-friendly Prisma mock factory
export const createMockPrisma = () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  application: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  userDocument: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  documentChecklist: {
    create: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
});

/**
 * Test User Fixtures
 */
export const TEST_USER_FIXTURES = {
  validUser: {
    email: 'testuser@example.com',
    password: 'SecurePass123!',
    firstName: 'Test',
    lastName: 'User',
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'AdminPass123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
  },
  anotherUser: {
    email: 'another@example.com',
    password: 'AnotherPass123!',
    firstName: 'Another',
    lastName: 'User',
  },
};

/**
 * Test Payment Fixtures
 */
export const TEST_PAYMENT_FIXTURES = {
  validPayment: {
    amount: 50000,
    currency: 'UZS',
    gateway: 'stripe',
    description: 'Visa application fee',
  },
  largePayment: {
    amount: 500000,
    currency: 'UZS',
    gateway: 'payme',
    description: 'Large visa fee',
  },
  smallPayment: {
    amount: 5000,
    currency: 'UZS',
    gateway: 'click',
    description: 'Small fee',
  },
};

/**
 * Test Application Fixtures
 */
export const TEST_APPLICATION_FIXTURES = {
  validApplication: {
    visaType: 'tourist',
    countryCode: 'US',
    purpose: 'Tourism',
    estimatedDuration: 30,
  },
  businessApplication: {
    visaType: 'business',
    countryCode: 'DE',
    purpose: 'Business meeting',
    estimatedDuration: 14,
  },
};

/**
 * Generate JWT Token for Testing
 */
export const generateTestToken = (userId: string, email: string): string => {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign({ userId, email }, secret, { expiresIn: '24h' });
};

/**
 * Create Test User in Database
 */
export const createTestUser = async (userData = TEST_USER_FIXTURES.validUser) => {
  return await prisma.user.create({
    data: {
      email: userData.email,
      passwordHash: 'hashed-password', // In real tests, would use bcrypt
      firstName: userData.firstName,
      lastName: userData.lastName,
      emailVerified: true,
    },
  });
};

/**
 * Create Test Payment Record
 */
export const createTestPayment = async (
  userId: string,
  paymentData = TEST_PAYMENT_FIXTURES.validPayment
) => {
  return await prisma.payment.create({
    data: {
      userId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      gateway: paymentData.gateway,
      description: paymentData.description,
      status: 'pending',
    },
  });
};

/**
 * Create Test Application
 */
export const createTestApplication = async (
  userId: string,
  appData = TEST_APPLICATION_FIXTURES.validApplication
) => {
  return await prisma.application.create({
    data: {
      userId,
      visaType: appData.visaType,
      countryCode: appData.countryCode,
      purpose: appData.purpose,
      estimatedDuration: appData.estimatedDuration,
      status: 'draft',
    },
  });
};

/**
 * Clean Up Test Data
 */
export const cleanupTestData = async () => {
  try {
    // Delete test payments
    await prisma.payment.deleteMany({
      where: {
        user: {
          email: {
            in: Object.values(TEST_USER_FIXTURES).map((u: any) => u.email),
          },
        },
      },
    });

    // Delete test applications
    await prisma.application.deleteMany({
      where: {
        user: {
          email: {
            in: Object.values(TEST_USER_FIXTURES).map((u: any) => u.email),
          },
        },
      },
    });

    // Delete test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: Object.values(TEST_USER_FIXTURES).map((u: any) => u.email),
        },
      },
    });
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

/**
 * Setup Test Database
 */
export const setupTestDatabase = async () => {
  // Run migrations if needed
  // Reset sequences
  // Create test data
};

/**
 * Tear Down Test Database
 */
export const teardownTestDatabase = async () => {
  await cleanupTestData();
  await prisma.$disconnect();
};

/**
 * Mock Request Builder
 */
export const createMockRequest = (overrides = {}) => {
  return {
    headers: {
      'content-type': 'application/json',
      ...overrides,
    },
    body: {},
    params: {},
    query: {},
    ...overrides,
  };
};

/**
 * Mock Response Builder
 */
export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.header = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Delay for async operations
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Assert Response Status
 */
export const assertResponseStatus = (response: any, expectedStatus: number) => {
  expect(response.status).toBe(expectedStatus);
};

/**
 * Assert Response Has Property
 */
export const assertResponseHasProperty = (response: any, property: string) => {
  expect(response.body).toHaveProperty(property);
};

/**
 * Assert Response Error
 */
export const assertResponseError = (response: any, errorPattern?: string) => {
  expect(response.body).toHaveProperty('error');
  if (errorPattern) {
    expect(response.body.error).toMatch(new RegExp(errorPattern, 'i'));
  }
};

/**
 * Format Test Report
 */
export const formatTestReport = (results: any) => {
  return {
    totalTests: results.numTotalTests,
    passedTests: results.numPassedTests,
    failedTests: results.numFailedTests,
    duration: results.testResults[0]?.perfStats?.end - results.testResults[0]?.perfStats?.start,
  };
};

/**
 * Verify Email Format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Verify Password Strength
 */
export const isValidPassword = (password: string): boolean => {
  const hasMinLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);

  return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
};

/**
 * Generate Random Email
 */
export const generateRandomEmail = (): string => {
  const random = Math.random().toString(36).substring(7);
  return `test-${random}@example.com`;
};

/**
 * Generate Random String
 */
export const generateRandomString = (length: number = 10): string => {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
};
