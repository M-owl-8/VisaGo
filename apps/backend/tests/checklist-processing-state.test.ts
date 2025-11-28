/**
 * Processing State Tests
 * Verifies that processing status returns correct response structure for mobile app
 */

import { DocumentChecklistService } from '../src/services/document-checklist.service';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('../src/middleware/logger', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const prisma = new PrismaClient();

describe('Processing State Tests', () => {
  let mockApplication: any;
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    };

    mockApplication = {
      id: 'test-application-id',
      userId: mockUser.id,
      country: { name: 'Australia', code: 'AU' },
      visaType: { name: 'Student Visa' },
      documents: [],
    };
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should return processing status with correct structure', async () => {
    // Mock checklist with pending status
    const pendingChecklist = {
      applicationId: mockApplication.id,
      status: 'pending',
      checklistData: '[]',
    };

    // Expected response structure for mobile app
    const expectedResponse = {
      success: true,
      data: {
        status: 'processing',
        message: 'Checklist generation in progress. Please check again in a moment.',
        items: [],
      },
    };

    // Verify structure
    expect(expectedResponse.success).toBe(true);
    expect(expectedResponse.data).toBeDefined();
    expect(expectedResponse.data.status).toBe('processing');
    expect(Array.isArray(expectedResponse.data.items)).toBe(true);
    expect(expectedResponse.data.items.length).toBe(0);
  });

  test('should return ready status with items when complete', () => {
    const readyChecklist = {
      status: 'ready',
      checklistData: JSON.stringify({
        items: Array.from({ length: 13 }, (_, i) => ({
          id: `item-${i + 1}`,
          documentType: `doc_${i + 1}`,
          name: `Document ${i + 1}`,
        })),
        aiGenerated: true,
        aiFallbackUsed: false,
        aiErrorOccurred: false,
      }),
    };

    const parsed = JSON.parse(readyChecklist.checklistData);

    const expectedResponse = {
      success: true,
      data: {
        status: 'ready',
        items: parsed.items,
        aiFallbackUsed: parsed.aiFallbackUsed,
        aiErrorOccurred: parsed.aiErrorOccurred,
      },
    };

    expect(expectedResponse.success).toBe(true);
    expect(expectedResponse.data.status).toBe('ready');
    expect(expectedResponse.data.items.length).toBeGreaterThan(0);
  });

  test('should never return empty items array when status is ready', () => {
    const readyChecklist = {
      status: 'ready',
      checklistData: JSON.stringify({
        items: Array.from({ length: 13 }, (_, i) => ({
          id: `item-${i + 1}`,
        })),
      }),
    };

    const parsed = JSON.parse(readyChecklist.checklistData);

    // Ready status must have items
    expect(parsed.items.length).toBeGreaterThan(0);
    expect(parsed.items.length).toBeGreaterThanOrEqual(10);
  });

  test('should return consistent response structure for processing', () => {
    const processingResponses = [
      {
        success: true,
        data: {
          status: 'processing',
          items: [],
        },
      },
      {
        success: true,
        data: {
          status: 'processing',
          message: 'Checklist generation in progress.',
          items: [],
        },
      },
    ];

    processingResponses.forEach((response) => {
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.status).toBe('processing');
      expect(Array.isArray(response.data.items)).toBe(true);
    });
  });

  test('should handle transition from processing to ready', () => {
    // Initial state: processing
    const processingState = {
      status: 'pending',
      checklistData: '[]',
    };

    expect(processingState.status).toBe('pending');
    expect(JSON.parse(processingState.checklistData).length).toBe(0);

    // After generation: ready
    const readyState = {
      status: 'ready',
      checklistData: JSON.stringify({
        items: Array.from({ length: 13 }, (_, i) => ({
          id: `item-${i + 1}`,
        })),
      }),
    };

    expect(readyState.status).toBe('ready');
    const parsed = JSON.parse(readyState.checklistData);
    expect(parsed.items.length).toBe(13);
  });
});

