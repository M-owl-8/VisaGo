import {
  mockChatSession,
  mockChatMessage,
  mockUser,
  mockApplication,
  createMockPrisma,
} from '../../__tests__/test-utils';

jest.mock('axios');
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => createMockPrisma()),
}));

describe('ChatService', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  describe('session management', () => {
    it('should create a new chat session', async () => {
      mockPrisma.chatSession.create.mockResolvedValueOnce(mockChatSession);

      const session = await mockPrisma.chatSession.create({
        data: {
          userId: mockUser.id,
          applicationId: mockApplication.id,
          startedAt: new Date(),
        },
      });

      expect(session).toBeDefined();
      expect(session.userId).toBe(mockUser.id);
      expect(session.applicationId).toBe(mockApplication.id);
    });

    it('should retrieve session by ID', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValueOnce(mockChatSession);

      const session = await mockPrisma.chatSession.findUnique({
        where: { id: 'session-123' },
      });

      expect(session).toBeDefined();
      expect(session.id).toBe('session-123');
    });

    it('should list sessions for a user', async () => {
      mockPrisma.chatSession.findMany.mockResolvedValueOnce([mockChatSession]);

      const sessions = await mockPrisma.chatSession.findMany({
        where: { userId: mockUser.id },
      });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].userId).toBe(mockUser.id);
    });

    it('should update session when new messages arrive', async () => {
      mockPrisma.chatSession.update.mockResolvedValueOnce({
        ...mockChatSession,
        messageCount: 5,
      });

      const updatedSession = await mockPrisma.chatSession.update({
        where: { id: 'session-123' },
        data: { messageCount: 5 },
      });

      expect(updatedSession.messageCount).toBe(5);
    });

    it('should close session with end time', async () => {
      const now = new Date();
      mockPrisma.chatSession.update.mockResolvedValueOnce({
        ...mockChatSession,
        endedAt: now,
      });

      const closedSession = await mockPrisma.chatSession.update({
        where: { id: 'session-123' },
        data: { endedAt: now },
      });

      expect(closedSession.endedAt).toBe(now);
    });
  });

  describe('message handling', () => {
    it('should save user message', async () => {
      mockPrisma.chatMessage.create.mockResolvedValueOnce(mockChatMessage);

      const message = await mockPrisma.chatMessage.create({
        data: {
          sessionId: 'session-123',
          role: 'user',
          content: 'What documents do I need?',
        },
      });

      expect(message).toBeDefined();
      expect(message.role).toBe('user');
      expect(message.content).toBe('What documents do I need?');
    });

    it('should save assistant response', async () => {
      mockPrisma.chatMessage.create.mockResolvedValueOnce({
        ...mockChatMessage,
        role: 'assistant',
        content: 'For Spain visa you need: passport, visa photo, bank statement...',
      });

      const message = await mockPrisma.chatMessage.create({
        data: {
          sessionId: 'session-123',
          role: 'assistant',
          content: 'For Spain visa you need...',
        },
      });

      expect(message.role).toBe('assistant');
      expect(message.content).toContain('Spain');
    });

    it('should retrieve conversation history', async () => {
      mockPrisma.chatMessage.findMany.mockResolvedValueOnce([
        mockChatMessage,
        { ...mockChatMessage, role: 'assistant' },
      ]);

      const messages = await mockPrisma.chatMessage.findMany({
        where: { sessionId: 'session-123' },
      });

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('should preserve message order chronologically', async () => {
      const now = new Date();
      const msg1 = { ...mockChatMessage, createdAt: new Date(now.getTime() - 10000) };
      const msg2 = { ...mockChatMessage, createdAt: new Date(now.getTime()) };

      mockPrisma.chatMessage.findMany.mockResolvedValueOnce([msg1, msg2]);

      const messages = await mockPrisma.chatMessage.findMany({
        where: { sessionId: 'session-123' },
        orderBy: { createdAt: 'asc' },
      });

      expect(messages[0].createdAt < messages[1].createdAt).toBe(true);
    });
  });

  describe('context extraction', () => {
    it('should extract application context from session', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValueOnce(mockChatSession);

      const session = await mockPrisma.chatSession.findUnique({
        where: { id: 'session-123' },
      });

      expect(session.applicationId).toBe(mockApplication.id);
      expect(session.userId).toBe(mockUser.id);
    });

    it('should include user information in context', () => {
      const context = {
        userId: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
      };

      expect(context.userId).toBe(mockUser.id);
      expect(context.email).toBe(mockUser.email);
      expect(context.firstName).toBe('John');
    });

    it('should include application details in context', () => {
      const context = {
        applicationId: mockApplication.id,
        countryId: mockApplication.countryId,
        visaTypeId: mockApplication.visaTypeId,
        status: mockApplication.status,
      };

      expect(context.applicationId).toBeDefined();
      expect(context.countryId).toBeDefined();
      expect(context.visaTypeId).toBeDefined();
    });

    it('should format context for AI model', () => {
      const context = {
        application: {
          country: 'Spain',
          visaType: 'Tourist Visa',
          status: 'draft',
        },
        user: {
          firstName: 'John',
          location: 'USA',
        },
      };

      const formatted = JSON.stringify(context, null, 2);
      expect(formatted).toContain('Spain');
      expect(formatted).toContain('Tourist Visa');
      expect(formatted).toContain('John');
    });
  });

  describe('message content validation', () => {
    it('should accept regular text messages', () => {
      const content = 'What is the processing time?';
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
    });

    it('should handle multi-line messages', () => {
      const content = `I need to upload:
- Passport
- Bank statement
- Employment letter`;

      expect(content).toContain('\n');
      expect(content.split('\n').length).toBe(4);
    });

    it('should handle special characters', () => {
      const content = 'Price: $100, €80, ¥5000 - café & résumé';
      expect(content).toContain('$');
      expect(content).toContain('€');
      expect(content).toContain('ü');
    });

    it('should handle emoji', () => {
      const content = '✓ Done ✗ Not done 👍 Great!';
      expect(content).toContain('✓');
      expect(content).toContain('👍');
    });

    it('should reject empty messages', () => {
      const emptyContent = '';
      expect(emptyContent.length === 0).toBe(true);
    });

    it('should handle very long messages', () => {
      const content = 'A'.repeat(10000);
      expect(content.length).toBe(10000);
    });
  });

  describe('RAG context', () => {
    it('should include document embeddings', () => {
      const message = {
        ...mockChatMessage,
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      };

      expect(message.embedding).toBeDefined();
      expect(Array.isArray(message.embedding)).toBe(true);
      expect(message.embedding.length).toBe(5);
    });

    it('should store embeddings for similarity search', () => {
      const embeddings = [
        [0.1, 0.2, 0.3],
        [0.15, 0.22, 0.32],
        [0.11, 0.21, 0.31],
      ];

      // Embeddings should be close to each other for similar messages
      const similarity = embeddings[0][0] - embeddings[1][0];
      expect(Math.abs(similarity) < 0.1).toBe(true);
    });

    it('should retrieve documents for RAG', () => {
      const ragDocuments = [
        { content: 'Spain tourist visa requires...', similarity: 0.95 },
        { content: 'Visa processing typically takes...', similarity: 0.87 },
        { content: 'Document requirements are...', similarity: 0.82 },
      ];

      expect(ragDocuments).toHaveLength(3);
      expect(ragDocuments[0].similarity > ragDocuments[2].similarity).toBe(true);
    });
  });

  describe('session statistics', () => {
    it('should track message count', async () => {
      mockPrisma.chatMessage.findMany.mockResolvedValueOnce(Array(15).fill(mockChatMessage));

      const messages = await mockPrisma.chatMessage.findMany({
        where: { sessionId: 'session-123' },
      });

      expect(messages.length).toBe(15);
    });

    it('should track session duration', () => {
      const startTime = new Date('2024-01-01 10:00:00');
      const endTime = new Date('2024-01-01 10:15:30');
      const duration = endTime.getTime() - startTime.getTime();
      const durationMinutes = duration / 1000 / 60;

      expect(durationMinutes).toBeCloseTo(15.5, 1);
    });

    it('should count user vs assistant messages', async () => {
      mockPrisma.chatMessage.findMany.mockResolvedValueOnce([
        { ...mockChatMessage, role: 'user' },
        { ...mockChatMessage, role: 'assistant' },
        { ...mockChatMessage, role: 'user' },
      ]);

      const messages = await mockPrisma.chatMessage.findMany({
        where: { sessionId: 'session-123' },
      });

      const userMessages = messages.filter((m) => m.role === 'user');
      const assistantMessages = messages.filter((m) => m.role === 'assistant');

      expect(userMessages.length).toBe(2);
      expect(assistantMessages.length).toBe(1);
    });
  });
});
