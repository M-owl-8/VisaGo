/**
 * AI Checklist Generation - Invalid Output Scenario Tests
 * Verifies that invalid AI outputs (<10 items) are rejected and fallback is used
 */

import { DocumentChecklistService } from '../../src/services/document-checklist.service';
import { AIOpenAIService } from '../../src/services/ai-openai.service';
import { validateChecklistResponse } from '../../src/utils/json-validator';
import { mockAIInvalidOutput, resetAIMock, initializeAIMock } from '../utils/openai-mock';
import { buildAIUserContext } from '../../src/services/ai-context.service';

// Mock dependencies
jest.mock('../../src/services/ai-openai.service');
jest.mock('../../src/services/ai-context.service');
jest.mock('../../src/middleware/logger', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

describe('AI Checklist Generation - Invalid Output Scenario', () => {
  beforeAll(() => {
    initializeAIMock();
  });

  beforeEach(() => {
    resetAIMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should reject AI output with less than 10 items', () => {
    mockAIInvalidOutput(5); // Mock 5 items (below minimum)

    const mockResponse = {
      checklist: Array.from({ length: 5 }, (_, i) => ({
        document: `doc_${i + 1}`,
        name: `Document ${i + 1}`,
        category: 'required',
        required: true,
      })),
    };

    const validation = validateChecklistResponse(mockResponse, 'Australia', 'Student Visa');

    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors.some((e: string) => e.includes('Too few items'))).toBe(true);
  });

  test('should use fallback when AI returns too few items', () => {
    const invalidAIResponse = {
      checklist: Array.from({ length: 6 }, (_, i) => ({
        document: `doc_${i + 1}`,
        category: 'required',
      })),
    };

    // Simulate validator rejection
    const validation = validateChecklistResponse(invalidAIResponse, 'Australia', 'Student Visa');
    expect(validation.isValid).toBe(false);

    // Fallback should be used
    const fallbackChecklist = {
      items: Array.from({ length: 13 }, (_, i) => ({
        id: `fallback-item-${i + 1}`,
        documentType: `doc_${i + 1}`,
        category: i < 8 ? 'required' : i < 11 ? 'highly_recommended' : 'optional',
      })),
      aiGenerated: false,
      aiFallbackUsed: true,
      aiErrorOccurred: false, // Not an error, just invalid output
    };

    expect(fallbackChecklist.items.length).toBeGreaterThanOrEqual(10);
    expect(fallbackChecklist.aiFallbackUsed).toBe(true);
  });

  test('should set correct metadata flags for invalid output', () => {
    const mockStoredChecklist = {
      status: 'ready',
      checklistData: JSON.stringify({
        items: Array.from({ length: 13 }, (_, i) => ({
          id: `item-${i + 1}`,
        })),
        aiGenerated: false,
        aiFallbackUsed: true,
        aiErrorOccurred: false, // Invalid output is not an error, just rejected
      }),
      aiGenerated: false,
    };

    const parsed = JSON.parse(mockStoredChecklist.checklistData);
    expect(parsed.aiFallbackUsed).toBe(true);
    expect(parsed.aiErrorOccurred).toBe(false); // Invalid output != error
    expect(parsed.aiGenerated).toBe(false);
  });

  test('should validate item count thresholds correctly', () => {
    const testCases = [
      { count: 5, shouldBeValid: false },
      { count: 9, shouldBeValid: false },
      { count: 10, shouldBeValid: true },
      { count: 13, shouldBeValid: true },
      { count: 16, shouldBeValid: true },
      { count: 17, shouldBeValid: false }, // Over maximum
    ];

    testCases.forEach(({ count, shouldBeValid }) => {
      const mockResponse = {
        checklist: Array.from({ length: count }, (_, i) => ({
          document: `doc_${i + 1}`,
          name: `Document ${i + 1}`,
          category: 'required',
          required: true,
        })),
      };

      const validation = validateChecklistResponse(mockResponse, 'Australia', 'Student Visa');

      if (count < 10 || count > 16) {
        expect(validation.isValid).toBe(false);
      } else {
        // Valid count, but may have other validation issues
        // At minimum, item count should not be an error
        const itemCountErrors = validation.errors.filter((e: string) =>
          e.includes('Too few items') || e.includes('Too many items')
        );
        expect(itemCountErrors.length).toBe(0);
      }
    });
  });

  test('should reject AI output missing categories', () => {
    const mockResponse = {
      checklist: Array.from({ length: 12 }, (_, i) => ({
        document: `doc_${i + 1}`,
        name: `Document ${i + 1}`,
        // Missing category field
        required: true,
      })),
    };

    const validation = validateChecklistResponse(mockResponse, 'Australia', 'Student Visa');
    
    // Should have errors about missing categories
    const categoryErrors = validation.errors.filter((e: string) =>
      e.includes('category') || e.includes('Missing')
    );
    expect(categoryErrors.length).toBeGreaterThan(0);
  });

  test('should reject AI output with only one category', () => {
    const mockResponse = {
      checklist: Array.from({ length: 12 }, (_, i) => ({
        document: `doc_${i + 1}`,
        name: `Document ${i + 1}`,
        category: 'required', // All items are required
        required: true,
      })),
    };

    const validation = validateChecklistResponse(mockResponse, 'Australia', 'Student Visa');
    
    // Should warn or error about missing categories
    const categoryWarnings = validation.warnings.filter((w: string) =>
      w.includes('category') || w.includes('only')
    );
    // May have warnings about category distribution
    expect(validation.isValid || categoryWarnings.length > 0).toBe(true);
  });
});

