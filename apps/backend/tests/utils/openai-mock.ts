/**
 * OpenAI Mock Utilities for Testing
 * Provides mock functions to simulate OpenAI API responses
 */

import { OpenAI } from 'openai';

export interface MockAIChecklistItem {
  document: string;
  name: string;
  nameUz: string;
  nameRu: string;
  category: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
  priority: 'high' | 'medium' | 'low';
  description: string;
  descriptionUz: string;
  descriptionRu: string;
  whereToObtain: string;
  whereToObtainUz: string;
  whereToObtainRu: string;
}

let mockOpenAI: any = null;
let mockImplementation: (() => Promise<any>) | null = null;

/**
 * Initialize OpenAI mock
 */
export function initializeAIMock() {
  mockOpenAI = {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  };
  return mockOpenAI;
}

/**
 * Mock AI success response with valid checklist
 */
export function mockAISuccess(itemsCount: number = 13): void {
  const items: MockAIChecklistItem[] = [];
  
  // Generate items with proper distribution
  const requiredCount = Math.floor(itemsCount * 0.6); // ~60% required
  const highlyRecommendedCount = Math.floor(itemsCount * 0.3); // ~30% highly_recommended
  const optionalCount = itemsCount - requiredCount - highlyRecommendedCount; // Rest optional

  for (let i = 0; i < requiredCount; i++) {
    items.push({
      document: `required_doc_${i + 1}`,
      name: `Required Document ${i + 1}`,
      nameUz: `Majburiy Hujjat ${i + 1}`,
      nameRu: `Обязательный Документ ${i + 1}`,
      category: 'required',
      required: true,
      priority: 'high',
      description: `Required document ${i + 1} description`,
      descriptionUz: `Majburiy hujjat ${i + 1} tavsifi`,
      descriptionRu: `Описание обязательного документа ${i + 1}`,
      whereToObtain: `Obtain from source ${i + 1}`,
      whereToObtainUz: `Manba ${i + 1} dan oling`,
      whereToObtainRu: `Получите из источника ${i + 1}`,
    });
  }

  for (let i = 0; i < highlyRecommendedCount; i++) {
    items.push({
      document: `recommended_doc_${i + 1}`,
      name: `Recommended Document ${i + 1}`,
      nameUz: `Tavsiya Etilgan Hujjat ${i + 1}`,
      nameRu: `Рекомендуемый Документ ${i + 1}`,
      category: 'highly_recommended',
      required: false,
      priority: 'medium',
      description: `Recommended document ${i + 1} description`,
      descriptionUz: `Tavsiya etilgan hujjat ${i + 1} tavsifi`,
      descriptionRu: `Описание рекомендуемого документа ${i + 1}`,
      whereToObtain: `Obtain from source ${i + 1}`,
      whereToObtainUz: `Manba ${i + 1} dan oling`,
      whereToObtainRu: `Получите из источника ${i + 1}`,
    });
  }

  for (let i = 0; i < optionalCount; i++) {
    items.push({
      document: `optional_doc_${i + 1}`,
      name: `Optional Document ${i + 1}`,
      nameUz: `Ixtiyoriy Hujjat ${i + 1}`,
      nameRu: `Необязательный Документ ${i + 1}`,
      category: 'optional',
      required: false,
      priority: 'low',
      description: `Optional document ${i + 1} description`,
      descriptionUz: `Ixtiyoriy hujjat ${i + 1} tavsifi`,
      descriptionRu: `Описание необязательного документа ${i + 1}`,
      whereToObtain: `Obtain from source ${i + 1}`,
      whereToObtainUz: `Manba ${i + 1} dan oling`,
      whereToObtainRu: `Получите из источника ${i + 1}`,
    });
  }

  const mockResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            type: 'Student Visa',
            country: 'Australia',
            checklist: items,
          }),
        },
      },
    ],
    usage: {
      prompt_tokens: 1000,
      completion_tokens: 2000,
      total_tokens: 3000,
    },
  };

  if (mockOpenAI) {
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
  } else {
    mockImplementation = () => Promise.resolve(mockResponse);
  }
}

/**
 * Mock AI timeout error
 */
export function mockAITimeout(): void {
  const timeoutError = new Error('Request timed out.');
  timeoutError.name = 'TimeoutError';

  if (mockOpenAI) {
    mockOpenAI.chat.completions.create.mockRejectedValue(timeoutError);
  } else {
    mockImplementation = () => Promise.reject(timeoutError);
  }
}

/**
 * Mock AI invalid output (too few items)
 */
export function mockAIInvalidOutput(itemsCount: number = 5): void {
  const items: MockAIChecklistItem[] = [];
  
  for (let i = 0; i < itemsCount; i++) {
    items.push({
      document: `doc_${i + 1}`,
      name: `Document ${i + 1}`,
      nameUz: `Hujjat ${i + 1}`,
      nameRu: `Документ ${i + 1}`,
      category: 'required',
      required: true,
      priority: 'high',
      description: `Document ${i + 1} description`,
      descriptionUz: `Hujjat ${i + 1} tavsifi`,
      descriptionRu: `Описание документа ${i + 1}`,
      whereToObtain: `Obtain from source ${i + 1}`,
      whereToObtainUz: `Manba ${i + 1} dan oling`,
      whereToObtainRu: `Получите из источника ${i + 1}`,
    });
  }

  const mockResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            type: 'Student Visa',
            country: 'Australia',
            checklist: items,
          }),
        },
      },
    ],
    usage: {
      prompt_tokens: 1000,
      completion_tokens: 500,
      total_tokens: 1500,
    },
  };

  if (mockOpenAI) {
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
  } else {
    mockImplementation = () => Promise.resolve(mockResponse);
  }
}

/**
 * Mock AI invalid JSON response
 */
export function mockAIInvalidJSON(): void {
  const mockResponse = {
    choices: [
      {
        message: {
          content: 'This is not valid JSON { invalid syntax',
        },
      },
    ],
    usage: {
      prompt_tokens: 1000,
      completion_tokens: 100,
      total_tokens: 1100,
    },
  };

  if (mockOpenAI) {
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
  } else {
    mockImplementation = () => Promise.resolve(mockResponse);
  }
}

/**
 * Reset AI mock
 */
export function resetAIMock(): void {
  if (mockOpenAI) {
    mockOpenAI.chat.completions.create.mockReset();
  }
  mockImplementation = null;
}

/**
 * Get mock OpenAI instance
 */
export function getMockOpenAI(): any {
  return mockOpenAI;
}

/**
 * Get mock implementation function
 */
export function getMockImplementation(): (() => Promise<any>) | null {
  return mockImplementation;
}

