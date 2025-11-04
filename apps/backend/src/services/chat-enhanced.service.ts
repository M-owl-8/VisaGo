import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import { RAGService } from './rag.service';

/**
 * Enhanced Chat Service with RAG Integration
 * Provides intelligent visa guidance using OpenAI + Retrieval-Augmented Generation
 */

interface ChatMessage {
  id?: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  ragContext?: string;
  tokensUsed?: number;
  timestamp?: Date;
}

interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  systemPrompt?: string;
  applicationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
  tokensUsed: number;
  ragDocsUsed: number;
}

export class ChatEnhancedService {
  private prisma: PrismaClient;
  private openai: OpenAI;
  private ragService: RAGService;
  private maxTokensPerRequest: number = 2000;
  private maxMessagesInContext: number = 10;

  constructor(prisma: PrismaClient, ragService: RAGService) {
    this.prisma = prisma;
    this.ragService = ragService;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(userId: string, sessionId: string, userMessage: string): Promise<ChatResponse> {
    try {
      // Validate user and conversation
      const session = await this.validateConversation(userId, sessionId);

      // Retrieve RAG context
      const ragContext = await this.ragService.retrieveContext(
        userMessage,
        session.applicationId || undefined,
        undefined,
        userId
      );

      // Get conversation history
      const history = await this.getChatHistory(sessionId, this.maxMessagesInContext);

      // Build messages for OpenAI
      const messages = this.buildMessageArray(history, userMessage, session.systemPrompt);

      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages,
        max_tokens: this.maxTokensPerRequest,
        temperature: 0.7,
        top_p: 0.9,
      });

      const assistantMessage = response.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
      const tokensUsed = response.usage?.total_tokens || 0;

      // Save user message to database
      const userMsgRecord = await this.prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role: 'user',
          content: userMessage,
          sources: JSON.stringify(ragContext.relevantDocuments || []),
          tokensUsed: response.usage?.prompt_tokens || 0,
        },
      });

      // Save assistant response to database
      const assistantMsgRecord = await this.prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role: 'assistant',
          content: assistantMessage,
          tokensUsed: response.usage?.completion_tokens || 0,
        },
      });

      // Update session metadata
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      return {
        message: {
          id: assistantMsgRecord.id,
          sessionId,
          userId,
          role: 'assistant',
          content: assistantMessage,
          ragContext: session.systemPrompt,
          tokensUsed,
          timestamp: assistantMsgRecord.createdAt,
        },
        sessionId,
        tokensUsed,
        ragDocsUsed: ragContext.relevantDocuments?.length || 0,
      };
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to process chat message: ${errorMessage}`);
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    title: string,
    applicationId?: string,
    systemPrompt?: string
  ): Promise<ChatConversation> {
    try {
      const session = await this.prisma.chatSession.create({
        data: {
          userId,
          title,
          applicationId,
          systemPrompt: systemPrompt || 'You are a helpful visa assistant for VisaBuddy.',
        },
      });

      return {
        id: session.id,
        userId: session.userId,
        title: session.title,
        applicationId: session.applicationId || undefined,
        systemPrompt: session.systemPrompt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  /**
   * Get conversation history
   */
  async getChatHistory(sessionId: string, limit: number = 10): Promise<ChatMessage[]> {
    try {
      const messages = await this.prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: -limit, // Gets last N messages
      });

      return messages.map((msg: any): any => ({
        sessionId: msg.sessionId,
        userId: msg.userId,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.createdAt,
      }));
    } catch (error) {
      console.error('Error retrieving chat history:', error);
      return [];
    }
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string, limit: number = 20): Promise<ChatConversation[]> {
    try {
      const sessions = await this.prisma.chatSession.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      return sessions.map((session: any): any => ({
        id: session.id,
        userId: session.userId,
        title: session.title,
        applicationId: session.applicationId || undefined,
        systemPrompt: session.systemPrompt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }));
    } catch (error) {
      console.error('Error retrieving conversations:', error);
      throw new Error('Failed to retrieve conversations');
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(sessionId: string, userId: string): Promise<boolean> {
    try {
      // Verify ownership
      const session = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
      });

      if (!session) {
        throw new Error('Conversation not found');
      }

      // Delete all messages in session
      await this.prisma.chatMessage.deleteMany({
        where: { sessionId },
      });

      // Delete session
      await this.prisma.chatSession.delete({
        where: { id: sessionId },
      });

      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  /**
   * Get detailed conversation view
   */
  async getConversationDetails(sessionId: string, userId: string) {
    try {
      const session = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
      });

      if (!session) {
        throw new Error('Conversation not found');
      }

      const messages = await this.getChatHistory(sessionId, 100);

      return {
        conversation: {
          id: session.id,
          title: session.title,
          applicationId: session.applicationId,
          systemPrompt: session.systemPrompt,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
        messages,
      };
    } catch (error) {
      console.error('Error retrieving conversation details:', error);
      throw new Error('Failed to retrieve conversation');
    }
  }

  /**
   * Rename conversation
   */
  async renameConversation(sessionId: string, userId: string, newTitle: string): Promise<ChatConversation> {
    try {
      const session = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
      });

      if (!session) {
        throw new Error('Conversation not found');
      }

      const updated = await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: newTitle },
      });

      return {
        id: updated.id,
        userId: updated.userId,
        title: updated.title,
        applicationId: updated.applicationId || undefined,
        systemPrompt: updated.systemPrompt,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      console.error('Error renaming conversation:', error);
      throw new Error('Failed to rename conversation');
    }
  }

  /**
   * Export conversation as JSON
   */
  async exportConversation(sessionId: string, userId: string): Promise<object> {
    try {
      const conversation = await this.getConversationDetails(sessionId, userId);

      return {
        metadata: {
          title: conversation.conversation.title,
          applicationId: conversation.conversation.applicationId,
          systemPrompt: conversation.conversation.systemPrompt,
          exportedAt: new Date().toISOString(),
        },
        messages: conversation.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
      };
    } catch (error) {
      console.error('Error exporting conversation:', error);
      throw new Error('Failed to export conversation');
    }
  }

  /**
   * Get chat statistics for a user
   */
  async getChatStats(userId: string) {
    try {
      const sessions = await this.prisma.chatSession.findMany({
        where: { userId },
      });

      const messages = await this.prisma.chatMessage.findMany({
        where: { userId },
      });

      const totalTokens = messages.reduce((sum: number, msg: any): number => sum + (msg.tokensUsed || 0), 0);

      return {
        totalConversations: sessions.length,
        totalMessages: messages.length,
        totalTokensUsed: totalTokens,
        averageMessagesPerConversation:
          sessions.length > 0 ? Math.round(messages.length / sessions.length) : 0,
      };
    } catch (error) {
      console.error('Error getting chat stats:', error);
      throw new Error('Failed to retrieve chat statistics');
    }
  }

  /**
   * Private helper: Validate conversation ownership
   */
  private async validateConversation(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error('Conversation not found or unauthorized');
    }

    return session;
  }

  /**
   * Private helper: Build message array for OpenAI
   */
  private buildMessageArray(history: ChatMessage[], userMessage: string, systemPrompt: string) {
    const messages: any[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Add conversation history
    history.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    return messages;
  }

}