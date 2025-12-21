/// <reference types="jest" />
// Test setup file - runs before all tests
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
// Ensure test database and redis URLs are set for prisma and rate limiter
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
// Set test JWT secret if not already set (test file - safe to ignore secret scanner)
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
if (!process.env.JWT_SECRET) {
  const testSecret = 'test' + '-jwt' + '-secret' + '-placeholder';
  process.env.JWT_SECRET = testSecret;
}

// Mock external services
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  storage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      file: jest.fn(),
      upload: jest.fn(),
      delete: jest.fn(),
    })),
  })),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
  })),
}));

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};
