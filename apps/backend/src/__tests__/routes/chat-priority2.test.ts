import request from 'supertest';
import express, { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatService } from '../../services/chat.service';
import { usageTrackingService } from '../../services/usage-tracking.service';
import { getChatRateLimitInfo, incrementChatMessageCount } from '../../middleware/chat-rate-limit';

/**
 * Priority 2 Chat System Completion Tests
 * Tests for message persistence, conversation context, RAG integration,
 * cost tracking, and rate limiting
 */

const prisma = new PrismaClient();

// Mock user for testing
const TEST_USER_ID = 'test-user-priority2-' + Date.now();
const TEST_APPLICATION_ID = 'test-app-priority2-' + Date.now();

describe('Priority 2: AI Chat System Completion', () => {
  
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
  });

  afterAll(async () => {
    // Cleanup
    try {
      // Delete all messages, sessions, and metrics for test user
      const sessions = await prisma.chatSession.findMany({
        where: { userId: TEST_USER_ID },
      });
      
      const sessionIds = sessions.map(s => s.id);
      
      await prisma.chatMessage.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      
      await prisma.chatSession.deleteMany({
        where: { userId: TEST_USER_ID },
      });
      
      await prisma.aIUsageMetrics.deleteMany({
        where: { userId: TEST_USER_ID },
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    
    await prisma.$disconnect();
  });

  describe('1. Message Persistence & Retrieval', () => {
    test('should persist user message in database', async () => {
      const content = 'What are the requirements for a US tourist visa?';
      const sessionId = await chatService.getOrCreateSession(TEST_USER_ID);
      
      // Save a message
      const message = await prisma.chatMessage.create({
        data: {
          sessionId,
          userId: TEST_USER_ID,
          role: 'user',
          content,
          sources: JSON.stringify([]),
        },
      });
      
      expect(message.id).toBeDefined();
      expect(message.content).toBe(content);
      expect(message.role).toBe('user');
      
      // Retrieve it
      const retrieved = await prisma.chatMessage.findUnique({
        where: { id: message.id },
      });
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe(content);
    });

    test('should persist assistant response with sources', async () => {
      const sessionId = await chatService.getOrCreateSession(TEST_USER_ID);
      const sources = [
        { title: 'US Visa Guide', url: 'https://example.com/us-visa' },
      ];
      
      const message = await prisma.chatMessage.create({
        data: {
          sessionId,
          userId: TEST_USER_ID,
          role: 'assistant',
          content: 'US tourist visa requires a valid passport and completed application.',
          sources: JSON.stringify(sources),
          model: 'gpt-4',
          tokensUsed: 250,
        },
      });
      
      expect(message.role).toBe('assistant');
      expect(message.tokensUsed).toBe(250);
      expect(JSON.parse(message.sources || '[]')).toHaveLength(1);
    });

    test('should retrieve conversation history', async () => {
      const sessionId = await chatService.getOrCreateSession(TEST_USER_ID);
      
      // Create multiple messages
      for (let i = 0; i < 5; i++) {
        await prisma.chatMessage.create({
          data: {
            sessionId,
            userId: TEST_USER_ID,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i}`,
            sources: JSON.stringify([]),
          },
        });
      }
      
      // Use sessionId-based API (legacy)
      const history = await chatService.getConversationHistory(sessionId);
      
      expect(history.length).toBeGreaterThanOrEqual(5);
      expect(history[0].role).toBe('user');
    });
  });

  describe('2. Conversation Context (Last 10 Messages)', () => {
    test('should retrieve last 10 messages from session', async () => {
      const sessionId = await chatService.getOrCreateSession(
        TEST_USER_ID + '-context',
        TEST_APPLICATION_ID
      );
      
      // Create 15 messages
      for (let i = 0; i < 15; i++) {
        await prisma.chatMessage.create({
          data: {
            sessionId,
            userId: TEST_USER_ID + '-context',
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i}`,
            sources: JSON.stringify([]),
          },
        });
      }
      
      // Get last 10
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      
      expect(messages).toHaveLength(10);
      // Messages should be in reverse chronological order
      expect(messages[0].content).toContain('Message 14');
    });

    test('should format conversation history for AI context', async () => {
      const sessionId = await chatService.getOrCreateSession(
        TEST_USER_ID + '-format'
      );
      
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi, how can I help?' },
        { role: 'user', content: 'Tell me about visas' },
      ];
      
      for (const msg of messages) {
        await prisma.chatMessage.create({
          data: {
            sessionId,
            userId: TEST_USER_ID + '-format',
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            sources: JSON.stringify([]),
          },
        });
      }
      
      // Retrieve and format
      const recentMessages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });
      
      const formattedHistory = recentMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      
      expect(formattedHistory).toHaveLength(3);
      expect(formattedHistory[0].role).toBe('user');
      expect(formattedHistory[2].role).toBe('user');
    });
  });

  describe('3. RAG Integration & Context Extraction', () => {
    test('should extract application context correctly', async () => {
      // Create test application
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
      });
      
      if (!user) throw new Error('Test user not found');
      
      // Get or create country and visa type
      let country = await prisma.country.findFirst({
        where: { code: 'US' },
      });
      
      if (!country) {
        country = await prisma.country.create({
          data: {
            name: 'United States',
            code: 'US',
            flagEmoji: '🇺🇸',
          },
        });
      }
      
      let visaType = await prisma.visaType.findFirst({
        where: { country: { code: 'US' }, name: 'Tourist Visa' },
      });
      
      if (!visaType) {
        visaType = await prisma.visaType.create({
          data: {
            countryId: country.id,
            name: 'Tourist Visa',
            processingDays: 15,
            validity: '10 years',
            fee: 160,
            requirements: JSON.stringify(['passport', 'photo']),
            documentTypes: JSON.stringify(['passport', 'bank_statement']),
          },
        });
      }
      
      const application = await prisma.visaApplication.create({
        data: {
          userId: TEST_USER_ID,
          countryId: country.id,
          visaTypeId: visaType.id,
          status: 'draft',
        },
      });
      
      // Extract context (would be done in chat service)
      const appData = await prisma.visaApplication.findUnique({
        where: { id: application.id },
        include: {
          country: true,
          visaType: true,
          documents: true,
        },
      });
      
      expect(appData?.country.name).toBe('United States');
      expect(appData?.visaType.name).toBe('Tourist Visa');
    });

    test('should include RAG sources in assistant response', async () => {
      const sessionId = await chatService.getOrCreateSession(
        TEST_USER_ID + '-rag'
      );
      
      const sources = [
        {
          title: 'US Visa Requirements',
          url: 'https://example.com/us-visa',
          relevance: 0.95,
        },
        {
          title: 'Travel Requirements',
          url: 'https://example.com/travel',
          relevance: 0.87,
        },
      ];
      
      const message = await prisma.chatMessage.create({
        data: {
          sessionId,
          userId: TEST_USER_ID + '-rag',
          role: 'assistant',
          content: 'Based on the knowledge base, here are the requirements...',
          sources: JSON.stringify(sources),
          model: 'gpt-4',
          tokensUsed: 300,
        },
      });
      
      const retrieved = await prisma.chatMessage.findUnique({
        where: { id: message.id },
      });
      
      const parsedSources = JSON.parse(retrieved?.sources || '[]');
      expect(parsedSources).toHaveLength(2);
      expect(parsedSources[0].relevance).toBe(0.95);
    });
  });

  describe('4. Cost Tracking Per User', () => {
    test('should track daily usage metrics', async () => {
      const userId = TEST_USER_ID + '-cost';
      
      // Track message usage
      await usageTrackingService.trackMessageUsage(userId, 250, 'gpt-4', 1000);
      await usageTrackingService.trackMessageUsage(userId, 300, 'gpt-4', 1200);
      
      const daily = await usageTrackingService.getDailyUsage(userId);
      
      expect(daily?.totalRequests).toBe(2);
      expect(daily?.totalTokens).toBe(550);
      expect(daily?.totalCost).toBeGreaterThan(0);
    });

    test('should calculate cost correctly for different models', async () => {
      const userId = TEST_USER_ID + '-models';
      
      // Track with different models
      await usageTrackingService.trackMessageUsage(userId, 1000, 'gpt-4', 1000);
      await usageTrackingService.trackMessageUsage(userId, 1000, 'gpt-3.5-turbo', 500);
      
      const daily = await usageTrackingService.getDailyUsage(userId);
      
      expect(daily?.totalTokens).toBe(2000);
      // GPT-4 cost + GPT-3.5 cost should be tracked
      expect(daily?.totalCost).toBeGreaterThan(0);
    });

    test('should track errors separately', async () => {
      const userId = TEST_USER_ID + '-errors';
      
      await usageTrackingService.trackMessageUsage(userId, 100, 'gpt-4', 800);
      await usageTrackingService.trackError(userId);
      await usageTrackingService.trackError(userId);
      
      const daily = await usageTrackingService.getDailyUsage(userId);
      
      expect(daily?.totalRequests).toBe(1);
      expect(daily?.errorCount).toBe(2);
    });

    test('should generate weekly usage report', async () => {
      const userId = TEST_USER_ID + '-weekly';
      
      // Add messages for multiple days
      for (let i = 0; i < 3; i++) {
        await usageTrackingService.trackMessageUsage(
          userId,
          100 * (i + 1),
          'gpt-4',
          1000
        );
      }
      
      const weekly = await usageTrackingService.getWeeklyUsage(userId);
      
      expect(weekly?.totals.totalRequests).toBeGreaterThan(0);
      expect(weekly?.totals.totalTokens).toBeGreaterThan(0);
      expect(weekly?.dailyBreakdown.length).toBeGreaterThan(0);
    });

    test('should generate cost analysis report', async () => {
      const userId = TEST_USER_ID + '-analysis';
      
      // Add various usage
      await usageTrackingService.trackMessageUsage(userId, 200, 'gpt-4', 1000);
      await usageTrackingService.trackMessageUsage(userId, 150, 'gpt-3.5-turbo', 800);
      
      const analysis = await usageTrackingService.getCostAnalysis(userId);
      
      expect(analysis?.today).toBeDefined();
      expect(analysis?.today.cost).toBeGreaterThanOrEqual(0);
      expect(analysis?.today.requests).toBeGreaterThan(0);
    });
  });

  describe('5. User-Level Rate Limiting (50 msg/day)', () => {
    test('should check user quota correctly', async () => {
      const userId = TEST_USER_ID + '-ratelimit';
      
      const limitInfo = await getChatRateLimitInfo(userId);
      
      expect(limitInfo.messagesRemaining).toBe(50);
      expect(limitInfo.messagesUsed).toBe(0);
      expect(limitInfo.isLimited).toBe(false);
    });

    test('should increment message count', async () => {
      const userId = TEST_USER_ID + '-increment';
      
      // Get initial
      const initial = await getChatRateLimitInfo(userId);
      expect(initial.messagesRemaining).toBe(50);
      
      // Increment
      for (let i = 0; i < 5; i++) {
        await incrementChatMessageCount(userId);
      }
      
      // Check updated
      const updated = await getChatRateLimitInfo(userId);
      expect(updated.messagesUsed).toBe(5);
      expect(updated.messagesRemaining).toBe(45);
    });

    test('should track reset time correctly', async () => {
      const userId = TEST_USER_ID + '-reset';
      
      const limitInfo = await getChatRateLimitInfo(userId);
      const now = new Date();
      
      expect(limitInfo.resetTime.getTime()).toBeGreaterThan(now.getTime());
      // Should reset within 24 hours
      const diff = limitInfo.resetTime.getTime() - now.getTime();
      expect(diff).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 60000); // 24h + 1min buffer
    });

    test('should mark user as limited when quota exceeded', async () => {
      const userId = TEST_USER_ID + '-limited';
      
      // Add 50 messages
      for (let i = 0; i < 50; i++) {
        await incrementChatMessageCount(userId);
      }
      
      const limitInfo = await getChatRateLimitInfo(userId);
      
      expect(limitInfo.messagesUsed).toBe(50);
      expect(limitInfo.messagesRemaining).toBe(0);
      expect(limitInfo.isLimited).toBe(true);
    });
  });

  describe('6. Integration Tests', () => {
    test('should track usage when message is sent', async () => {
      const userId = TEST_USER_ID + '-integration';
      
      // Get initial usage
      const before = await usageTrackingService.getDailyUsage(userId);
      const initialRequests = before?.totalRequests || 0;
      
      // Track a message (simulating sendMessage)
      await usageTrackingService.trackMessageUsage(userId, 500, 'gpt-4', 2000);
      
      // Check updated usage
      const after = await usageTrackingService.getDailyUsage(userId);
      
      expect(after?.totalRequests).toBe(initialRequests + 1);
      expect(after?.totalTokens).toBe((before?.totalTokens || 0) + 500);
    });

    test('should handle rate limiting and cost tracking together', async () => {
      const userId = TEST_USER_ID + '-both';
      
      // Track quota
      const quotaBefore = await getChatRateLimitInfo(userId);
      expect(quotaBefore.messagesRemaining).toBe(50);
      
      // Simulate sending a message
      await incrementChatMessageCount(userId);
      await usageTrackingService.trackMessageUsage(userId, 250, 'gpt-4', 1500);
      
      // Check both
      const quotaAfter = await getChatRateLimitInfo(userId);
      const costAfter = await usageTrackingService.getDailyUsage(userId);
      
      expect(quotaAfter.messagesUsed).toBe(1);
      expect(quotaAfter.messagesRemaining).toBe(49);
      expect(costAfter?.totalRequests).toBeGreaterThan(0);
    });

    test('should persist and retrieve chat stats correctly', async () => {
      const userId = TEST_USER_ID + '-stats';
      
      const sessionId = await chatService.getOrCreateSession(userId);
      
      // Create messages
      for (let i = 0; i < 5; i++) {
        await prisma.chatMessage.create({
          data: {
            sessionId,
            userId,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i}`,
            sources: JSON.stringify([]),
            tokensUsed: 100 * (i + 1),
          },
        });
      }
      
      const stats = await chatService.getChatStats(userId);
      
      expect(stats.totalSessions).toBeGreaterThan(0);
      expect(stats.totalMessages).toBeGreaterThanOrEqual(5);
      expect(stats.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('7. Error Handling & Edge Cases', () => {
    test('should handle missing usage data gracefully', async () => {
      const userId = TEST_USER_ID + '-nodata';
      
      const usage = await usageTrackingService.getDailyUsage(userId);
      
      expect(usage).toBeDefined();
      expect(usage?.totalRequests).toBe(0);
      expect(usage?.totalTokens).toBe(0);
    });

    test('should handle zero tokens gracefully', async () => {
      const userId = TEST_USER_ID + '-zerotokens';
      
      await usageTrackingService.trackMessageUsage(userId, 0, 'gpt-4', 0);
      
      const usage = await usageTrackingService.getDailyUsage(userId);
      
      expect(usage?.totalTokens).toBe(0);
      expect(usage?.totalCost).toBe(0);
    });

    test('should handle very large token counts', async () => {
      const userId = TEST_USER_ID + '-largetokens';
      
      await usageTrackingService.trackMessageUsage(userId, 100000, 'gpt-4', 5000);
      
      const usage = await usageTrackingService.getDailyUsage(userId);
      
      expect(usage?.totalTokens).toBe(100000);
      expect(usage?.totalCost).toBeGreaterThan(0);
    });

    test('should handle multiple concurrent rate limit checks', async () => {
      const userId = TEST_USER_ID + '-concurrent';
      
      const promises = Array(10)
        .fill(null)
        .map(() => getChatRateLimitInfo(userId));
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.messagesRemaining).toBe(50);
      });
    });
  });
});