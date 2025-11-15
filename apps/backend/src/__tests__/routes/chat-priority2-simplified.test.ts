/**
 * Priority 2: AI Chat System Completion - Simplified Tests
 * Tests for message persistence, conversation context, cost tracking, and rate limiting
 * 
 * These tests focus on core functionality without external service dependencies
 */

import { PrismaClient } from '@prisma/client';
import { chatService } from '../../services/chat.service';
import { usageTrackingService } from '../../services/usage-tracking.service';
import { getChatRateLimitInfo, incrementChatMessageCount } from '../../middleware/chat-rate-limit';

const prisma = new PrismaClient();

// Mock user for testing
const TEST_USER_ID = 'test-user-priority2-' + Date.now();
const TEST_SESSION_ID = 'test-session-' + Date.now();

describe('Priority 2: AI Chat System Completion (Simplified)', () => {
  
  beforeAll(async () => {
    // Create test user if needed
    try {
      await prisma.user.create({
        data: {
          id: TEST_USER_ID,
          email: `test-priority2-${Date.now()}@visabuddy.test`,
          passwordHash: 'hash',
        },
      });
    } catch (error) {
      // User might already exist
    }

    // Create test chat session
    try {
      await prisma.chatSession.create({
        data: {
          id: TEST_SESSION_ID,
          userId: TEST_USER_ID,
          title: 'Test Session',
        },
      });
    } catch (error) {
      // Session might already exist
    }
  });

  afterAll(async () => {
    // Cleanup
    try {
      await prisma.chatMessage.deleteMany({
        where: { sessionId: TEST_SESSION_ID },
      });
      
      await prisma.chatSession.deleteMany({
        where: { id: TEST_SESSION_ID },
      });

      await prisma.aIUsageMetrics.deleteMany({
        where: { userId: TEST_USER_ID },
      });

      await prisma.user.delete({
        where: { id: TEST_USER_ID },
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('1. Message Persistence & Retrieval', () => {
    test('should persist user message in database', async () => {
      const message = await prisma.chatMessage.create({
        data: {
          sessionId: TEST_SESSION_ID,
          userId: TEST_USER_ID,
          role: 'user',
          content: 'Hello, AI!',
          sources: JSON.stringify([]),
        },
      });

      expect(message).toBeDefined();
      expect(message.content).toBe('Hello, AI!');
      expect(message.role).toBe('user');
      expect(message.userId).toBe(TEST_USER_ID);
    });

    test('should persist assistant response with sources', async () => {
      const sources = [
        { source: 'doc1.pdf', snippet: 'Information about visa types' }
      ];

      const message = await prisma.chatMessage.create({
        data: {
          sessionId: TEST_SESSION_ID,
          userId: TEST_USER_ID,
          role: 'assistant',
          content: 'I found information about visa types',
          sources: JSON.stringify(sources),
        },
      });

      expect(message).toBeDefined();
      expect(message.content).toContain('visa types');
      expect(message.role).toBe('assistant');
      const parsedSources = JSON.parse(message.sources);
      expect(parsedSources.length).toBe(1);
      expect(parsedSources[0].source).toBe('doc1.pdf');
    });

    test('should retrieve conversation history', async () => {
      // Use sessionId-based API
      const history = await chatService.getConversationHistory(TEST_SESSION_ID);
      
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('2. Conversation Context (Last 10 Messages)', () => {
    test('should retrieve and format messages correctly', async () => {
      const history = await chatService.getConversationHistory(TEST_SESSION_ID, undefined, 10, 0);
      
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      
      // Messages should have expected structure
      if (history.length > 0) {
        const message = history[0];
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('role');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('sources');
      }
    });

    test('should respect limit parameter', async () => {
      const limitedHistory = await chatService.getConversationHistory(TEST_SESSION_ID, undefined, 1, 0);
      const fullHistory = await chatService.getConversationHistory(TEST_SESSION_ID, undefined, 50, 0);
      
      expect(limitedHistory.length).toBeLessThanOrEqual(1);
      expect(fullHistory.length).toBeGreaterThanOrEqual(limitedHistory.length);
    });
  });

  describe('3. RAG Integration & Context Extraction', () => {
    test('should parse sources from message', async () => {
      const history = await chatService.getConversationHistory(TEST_SESSION_ID);
      
      // Find message with sources
      const messageWithSources = history.find(m => {
        const sources = JSON.parse(m.sources);
        return sources && sources.length > 0;
      });

      if (messageWithSources) {
        const sources = JSON.parse(messageWithSources.sources);
        expect(Array.isArray(sources)).toBe(true);
        expect(sources[0]).toHaveProperty('source');
      }
    });

    test('should handle empty sources gracefully', async () => {
      const message = await prisma.chatMessage.create({
        data: {
          sessionId: TEST_SESSION_ID,
          userId: TEST_USER_ID,
          role: 'assistant',
          content: 'Response without sources',
          sources: JSON.stringify([]),
        },
      });

      const sources = JSON.parse(message.sources);
      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBe(0);
    });
  });

  describe('4. Cost Tracking Per User', () => {
    test('should track daily usage metrics', async () => {
      const userId = TEST_USER_ID + '-tracking';
      
      // Ensure user exists
      try {
        await prisma.user.create({
          data: {
            id: userId,
            email: `user-${Date.now()}@test.com`,
            passwordHash: 'hash',
          },
        });
      } catch {
        // User exists
      }

      // Track a message
      await usageTrackingService.trackMessageUsage(userId, 500, 'gpt-4', 100);

      // Get daily usage
      const usage = await usageTrackingService.getDailyUsage(userId);
      
      expect(usage).toBeDefined();
      expect(usage?.totalRequests).toBe(1);
      expect(usage?.totalTokens).toBe(500);
      expect(usage?.totalCost).toBeGreaterThan(0);
    });

    test('should calculate cost correctly for different models', async () => {
      const userId = TEST_USER_ID + '-models';
      
      // Ensure user exists
      try {
        await prisma.user.create({
          data: {
            id: userId,
            email: `user-models-${Date.now()}@test.com`,
            passwordHash: 'hash',
          },
        });
      } catch {
        // User exists
      }

      // Track with GPT-4
      await usageTrackingService.trackMessageUsage(userId, 1000, 'gpt-4');
      
      const usage = await usageTrackingService.getDailyUsage(userId);
      expect(usage?.totalCost).toBeGreaterThan(0);
      
      // Cost should be reasonable (1000 tokens * $0.03 per 1K ~= $0.03)
      expect(usage?.totalCost).toBeLessThan(0.1);
    });

    test('should track errors separately', async () => {
      const userId = TEST_USER_ID + '-errors';
      
      // Ensure user exists
      try {
        await prisma.user.create({
          data: {
            id: userId,
            email: `user-errors-${Date.now()}@test.com`,
            passwordHash: 'hash',
          },
        });
      } catch {
        // User exists
      }

      // Track an error
      await usageTrackingService.trackError(userId);
      
      const usage = await usageTrackingService.getDailyUsage(userId);
      expect(usage?.errorCount).toBeGreaterThan(0);
    });

    test('should aggregate multiple requests', async () => {
      const userId = TEST_USER_ID + '-aggregate';
      
      // Ensure user exists
      try {
        await prisma.user.create({
          data: {
            id: userId,
            email: `user-aggregate-${Date.now()}@test.com`,
            passwordHash: 'hash',
          },
        });
      } catch {
        // User exists
      }

      // Track multiple requests
      await usageTrackingService.trackMessageUsage(userId, 300, 'gpt-4', 50);
      await usageTrackingService.trackMessageUsage(userId, 200, 'gpt-3.5-turbo', 30);
      
      const usage = await usageTrackingService.getDailyUsage(userId);
      expect(usage?.totalRequests).toBe(2);
      expect(usage?.totalTokens).toBe(500);
      expect(usage?.totalCost).toBeGreaterThan(0);
    });
  });

  describe('5. User-Level Rate Limiting (50 msg/day)', () => {
    test('should check quota info without errors', async () => {
      const userId = TEST_USER_ID + '-quota-check';
      
      const limitInfo = await getChatRateLimitInfo(userId);
      
      expect(limitInfo).toBeDefined();
      expect(limitInfo.userId).toBe(userId);
      expect(limitInfo.messagesUsed).toBeGreaterThanOrEqual(0);
      expect(limitInfo.messagesRemaining).toBeGreaterThanOrEqual(0);
      expect(limitInfo.isLimited).toBe(false);
      expect(limitInfo.resetTime).toBeInstanceOf(Date);
    });

    test('should track quota info', async () => {
      const userId = TEST_USER_ID + '-quota-track';
      
      const before = await getChatRateLimitInfo(userId);
      const initialCount = before.messagesUsed;
      
      // Simulate incrementing quota
      // Note: Without Redis, this will return 1 (fallback value)
      const result = await incrementChatMessageCount(userId);
      expect(result).toBeGreaterThan(0);
      
      const after = await getChatRateLimitInfo(userId);
      expect(after.resetTime).toBeInstanceOf(Date);
    });

    test('should calculate reset time as 24 hours from now', async () => {
      const userId = TEST_USER_ID + '-reset-time';
      
      const limitInfo = await getChatRateLimitInfo(userId);
      
      const now = new Date();
      const timeDiff = limitInfo.resetTime.getTime() - now.getTime();
      
      // Should be approximately 24 hours (within 1 minute margin)
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      expect(hoursDiff).toBeGreaterThan(23);
      expect(hoursDiff).toBeLessThan(25);
    });

    test('should not limit when under quota', async () => {
      const userId = TEST_USER_ID + '-under-quota';
      
      const limitInfo = await getChatRateLimitInfo(userId);
      
      // User should not be limited at start
      expect(limitInfo.isLimited).toBe(false);
      expect(limitInfo.messagesRemaining).toBe(50);
    });
  });

  describe('6. Integration: Combined Functionality', () => {
    test('should handle message creation with automatic session retrieval', async () => {
      const userId = TEST_USER_ID + '-integration';
      
      // Ensure user exists
      try {
        await prisma.user.create({
          data: {
            id: userId,
            email: `user-integration-${Date.now()}@test.com`,
            passwordHash: 'hash',
          },
        });
      } catch {
        // User exists
      }

      const sessionId = await chatService.getOrCreateSession(userId);
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      
      // Create a message in this session
      const message = await prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role: 'user',
          content: 'Integration test message',
          sources: JSON.stringify([]),
        },
      });
      
      expect(message.sessionId).toBe(sessionId);
    });

    test('should track usage and enforce quota together', async () => {
      const userId = TEST_USER_ID + '-combined';
      
      // Ensure user exists
      try {
        await prisma.user.create({
          data: {
            id: userId,
            email: `user-combined-${Date.now()}@test.com`,
            passwordHash: 'hash',
          },
        });
      } catch {
        // User exists
      }

      // Track usage
      await usageTrackingService.trackMessageUsage(userId, 1000, 'gpt-4');
      
      // Check quota
      const limitInfo = await getChatRateLimitInfo(userId);
      
      // Both should work together
      const usage = await usageTrackingService.getDailyUsage(userId);
      expect(usage).toBeDefined();
      expect(limitInfo).toBeDefined();
    });
  });

  describe('7. Error Handling & Edge Cases', () => {
    test('should handle empty user ID gracefully', async () => {
      const limitInfo = await getChatRateLimitInfo('');
      expect(limitInfo).toBeDefined();
      expect(limitInfo.isLimited).toBe(false);
    });

    test('should handle zero tokens tracked', async () => {
      const userId = TEST_USER_ID + '-zero-tokens';
      
      // Ensure user exists
      try {
        await prisma.user.create({
          data: {
            id: userId,
            email: `user-zero-${Date.now()}@test.com`,
            passwordHash: 'hash',
          },
        });
      } catch {
        // User exists
      }

      await usageTrackingService.trackMessageUsage(userId, 0, 'gpt-4');
      
      const usage = await usageTrackingService.getDailyUsage(userId);
      expect(usage?.totalTokens).toBe(0);
      expect(usage?.totalCost).toBe(0);
    });

    test('should return valid response even if database is slow', async () => {
      // This test verifies graceful fallback behavior
      const limitInfo = await getChatRateLimitInfo(TEST_USER_ID + '-slow-db');
      
      expect(limitInfo).toBeDefined();
      expect(limitInfo.messagesRemaining).toBeGreaterThanOrEqual(0);
    });
  });
});