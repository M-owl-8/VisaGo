/**
 * Chat service
 * Handles AI-powered chat functionality with RAG context
 */

import { PrismaClient } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import { usageTrackingService } from './usage-tracking.service';
import { getEnvConfig } from '../config/env';
import { errors } from '../utils/errors';
import { logError, logWarn } from '../middleware/logger';
import { AIOpenAIService } from './ai-openai.service';
import db from '../db';

const prisma = db; // Use shared Prisma instance

/**
 * Get AI service URL from environment
 */
function getAIServiceURL(): string {
  const envConfig = getEnvConfig();
  return process.env.AI_SERVICE_URL || 'http://localhost:8001';
}

const AI_SERVICE_URL = getAIServiceURL();

export class ChatService {
  /**
   * Create or get a chat session
   */
  async getOrCreateSession(userId: string, applicationId?: string): Promise<string> {
    const session = await prisma.chatSession.findFirst({
      where: {
        userId,
        applicationId: applicationId || null,
      },
    });

    if (session) {
      return session.id;
    }

    const newSession = await prisma.chatSession.create({
      data: {
        userId,
        applicationId: applicationId || null,
        title: applicationId ? `Chat for ${applicationId}` : 'General Chat',
      },
    });

    return newSession.id;
  }

  /**
   * Extract context from visa application
   */
  private async extractApplicationContext(applicationId: string) {
    try {
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
          country: true,
          visaType: true,
          documents: {
            select: {
              documentType: true,
              documentName: true,
              status: true,
              uploadedAt: true,
            },
          },
          checkpoints: {
            select: {
              title: true,
              isCompleted: true,
              order: true,
            },
            orderBy: { order: 'asc' },
          },
          user: {
            select: {
              firstName: true,
              language: true,
              bio: true,
            },
          },
        },
      });

      if (!application) {
        return null;
      }

      // Get required documents from visa type
      const requiredDocuments = JSON.parse(application.visaType.documentTypes || '[]');

      // Calculate document statistics
      const documentsUploaded = application.documents.length;
      const documentsVerified = application.documents.filter((d) => d.status === 'verified').length;
      const documentsPending = application.documents.filter((d) => d.status === 'pending').length;
      const documentsRejected = application.documents.filter((d) => d.status === 'rejected').length;

      // Find missing documents
      const uploadedTypes = application.documents.map((d) => d.documentType);
      const missingDocuments = requiredDocuments.filter(
        (doc: string) => !uploadedTypes.includes(doc)
      );

      // Find next incomplete checkpoint
      const nextCheckpoint = application.checkpoints.find((c) => !c.isCompleted);

      return {
        country: application.country.name,
        countryCode: application.country.code,
        visaType: application.visaType.name,
        processingDays: application.visaType.processingDays,
        fee: application.visaType.fee,
        validity: application.visaType.validity,
        status: application.status,
        createdAt: application.createdAt,

        // Document statistics
        documentsTotal: requiredDocuments.length,
        documentsUploaded,
        documentsVerified,
        documentsPending,
        documentsRejected,
        missingDocuments,

        // Checkpoint progress
        checkpointsTotal: application.checkpoints.length,
        checkpointsCompleted: application.checkpoints.filter((c) => c.isCompleted).length,
        nextCheckpoint: nextCheckpoint ? nextCheckpoint.title : null,

        // User info
        userName: application.user.firstName,
        userLanguage: application.user.language || 'en',
        userBio: application.user.bio ? JSON.parse(application.user.bio) : null,
      };
    } catch (error) {
      console.error('Failed to extract application context:', error);
      return null;
    }
  }

  /**
   * Send a message and get AI response with RAG context
   */
  async sendMessage(
    userId: string,
    content: string,
    applicationId?: string,
    conversationHistory?: any[]
  ) {
    const startTime = Date.now();
    try {
      // Get or create session
      const sessionId = await this.getOrCreateSession(userId, applicationId);

      // Get recent conversation history for context
      let history = conversationHistory || [];
      if (!history.length) {
        const recentMessages = await prisma.chatMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        history = recentMessages
          .reverse()
          .map((m: any): any => ({ role: m.role, content: m.content }));
      }

      // Extract application context for better responses
      let applicationContext = null;
      if (applicationId) {
        applicationContext = await this.extractApplicationContext(applicationId);
      }

      // Build context string for RAG
      let ragContext = '';
      if (applicationContext) {
        ragContext = `
User's Current Visa Application:
- Country: ${applicationContext.country}
- Visa Type: ${applicationContext.visaType}
- Processing Time: ${applicationContext.processingDays} days
- Fee: $${applicationContext.fee}
- Documents Uploaded: ${applicationContext.documentsUploaded}/${applicationContext.documentsTotal}
- Missing Documents: ${applicationContext.missingDocuments.length > 0 ? applicationContext.missingDocuments.join(', ') : 'None'}
- Application Status: ${applicationContext.status}
        `.trim();
      }

      // Check if AI service is configured
      const envConfig = getEnvConfig();
      if (!envConfig.OPENAI_API_KEY) {
        logWarn('OpenAI API key not configured, using fallback response', {
          userId,
          applicationId,
        });

        return this.createFallbackResponse(
          userId,
          applicationId,
          sessionId,
          content,
          startTime,
          'AI service not configured. Please configure OPENAI_API_KEY in environment variables.'
        );
      }

      // Use OpenAI service with RAG for better, context-aware responses
      let aiResponse;
      try {
        // Build system prompt with context
        const systemPrompt = this.buildSystemPrompt(applicationContext, ragContext);

        // Convert history to OpenAI format
        const openaiMessages: Array<{ role: 'user' | 'assistant'; content: string }> = history.map(
          (msg: any) => ({
            role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: msg.content || '',
          })
        );

        // Add current user message
        openaiMessages.push({
          role: 'user' as const,
          content: content,
        });

        // Use OpenAI chat with enhanced system prompt
        // Try RAG first if available, fallback to regular chat
        try {
          // Try to use RAG if knowledge base is available
          let response;
          try {
            response = await AIOpenAIService.chatWithRAG(
              openaiMessages,
              userId,
              applicationId,
              systemPrompt
            );
          } catch (ragError) {
            // Fallback to regular chat if RAG fails
            console.warn('RAG search failed, using regular chat:', ragError);
            response = await AIOpenAIService.chat(openaiMessages, systemPrompt);
          }

          // Format response
          const formattedResponse = {
            message: response.message,
            sources:
              response.sources?.map((s: any) => ({
                title: s.title,
                content: s.content,
                relevanceScore: s.relevanceScore,
              })) || [],
            tokens_used: response.tokensUsed,
            model: response.model,
          };

          aiResponse = { data: formattedResponse };
        } catch (chatError: any) {
          // Final fallback if both RAG and regular chat fail
          console.error('Chat service failed:', chatError);

          // Check if it's a configuration error
          if (
            chatError.message?.includes('not configured') ||
            chatError.message?.includes('not initialized')
          ) {
            throw chatError; // Re-throw configuration errors to be handled by outer catch
          }

          // Try regular chat as last resort
          try {
            const fallbackResponse = await AIOpenAIService.chat(openaiMessages, systemPrompt);

            const formattedResponse = {
              message: fallbackResponse.message,
              sources: [],
              tokens_used: fallbackResponse.tokensUsed,
              model: fallbackResponse.model,
            };

            aiResponse = { data: formattedResponse };
          } catch (finalError: any) {
            // If even regular chat fails, throw the error
            throw finalError;
          }
        }
      } catch (openaiError: any) {
        logError('OpenAI service error', openaiError, {
          userId,
          applicationId,
        });

        // Provide user-friendly error message
        const errorMessage =
          openaiError.message ||
          'AI service temporarily unavailable. Please try again in a moment.';

        return this.createFallbackResponse(
          userId,
          applicationId,
          sessionId,
          content,
          startTime,
          errorMessage
        );
      }

      const { message, sources = [], tokens_used = 0, model = 'gpt-4' } = aiResponse.data;

      // Validate response has a message
      if (!message || !message.trim()) {
        console.error('[ChatService] Empty message in response:', {
          hasData: !!aiResponse.data,
          dataKeys: Object.keys(aiResponse.data || {}),
        });
        throw new Error('AI service returned empty response');
      }

      console.log('[ChatService] AI response received:', {
        messageLength: message?.length || 0,
        hasMessage: !!message,
        messagePreview: message.substring(0, 50),
        sourcesCount: sources?.length || 0,
        tokensUsed: tokens_used,
        model,
      });

      // Log RAG usage if sources are present
      if (sources && sources.length > 0) {
        logWarn('RAG sources used in response', {
          userId,
          applicationId,
          sourceCount: sources.length,
        });
      }

      const responseTime = Date.now() - startTime;

      // Save user message
      await prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role: 'user',
          content,
          sources: JSON.stringify([]),
          model,
          responseTime,
        },
      });

      // Save assistant response with sources and response time
      const assistantMessage = await prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role: 'assistant',
          content: message,
          sources: JSON.stringify(sources || []),
          model,
          tokensUsed: tokens_used,
          responseTime,
        },
      });

      // Update session's last interaction time
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      // Track usage for cost analytics (async, don't block response)
      usageTrackingService
        .trackMessageUsage(userId, tokens_used, model, responseTime)
        .catch((err) => console.error('Failed to track usage:', err));

      return {
        message,
        sources,
        tokens_used,
        model,
        id: assistantMessage.id,
        applicationContext,
      };
    } catch (error: any) {
      console.error('Chat service error:', error);

      // Track error (async, don't block)
      usageTrackingService
        .trackError(userId)
        .catch((err) => console.error('Failed to track error:', err));

      // Fallback response if AI service is down
      if (error.response?.status >= 500 || error.code === 'ECONNREFUSED') {
        try {
          const sessionId = await this.getOrCreateSession(userId, applicationId);

          // Save user message anyway
          const responseTime = Date.now() - startTime;
          await prisma.chatMessage.create({
            data: {
              sessionId,
              userId,
              role: 'user',
              content,
              sources: JSON.stringify([]),
              responseTime,
            },
          });
        } catch (saveError) {
          console.error('Failed to save message:', saveError);
        }

        return {
          message:
            "I'm currently experiencing technical difficulties. Your message has been saved, and I'll respond as soon as the service is restored. Thank you for your patience!",
          sources: [],
          tokens_used: 0,
          model: 'fallback',
        };
      }

      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    userIdOrSessionId: string,
    applicationId?: string,
    limit = 50,
    offset = 0
  ) {
    // If applicationId is provided, it's the new API with userId, applicationId, limit, offset
    // Otherwise, treat the first param as sessionId (legacy API)
    if (applicationId !== undefined) {
      const userId = userIdOrSessionId;
      const sessions = await prisma.chatSession.findMany({
        where: {
          userId,
          applicationId: applicationId || null,
        },
        select: { id: true },
      });

      const sessionIds = sessions.map((s: any): string => s.id);

      const messages = await prisma.chatMessage.findMany({
        where: {
          sessionId: {
            in: sessionIds,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });

      return messages.reverse();
    } else {
      // Legacy: treat first param as sessionId
      const sessionId = userIdOrSessionId;
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return messages.reverse();
    }
  }

  /**
   * Get user's chat sessions with pagination
   */
  async getUserSessions(userId: string, limit = 20, offset = 0) {
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            role: true,
          },
        },
      },
    });

    const total = await prisma.chatSession.count({
      where: { userId },
    });

    return {
      sessions,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get session details
   */
  async getSessionDetails(sessionId: string, userId: string) {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            sources: true,
            model: true,
            tokensUsed: true,
            responseTime: true,
            feedback: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return session;
  }

  /**
   * Rename a chat session
   */
  async renameSession(sessionId: string, userId: string, newTitle: string) {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: newTitle },
    });
  }

  /**
   * Add feedback to a message
   */
  async addFeedback(messageId: string, feedback: string) {
    return await prisma.chatMessage.update({
      where: { id: messageId },
      data: { feedback },
    });
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string) {
    return await prisma.chatSession.delete({
      where: { id: sessionId },
    });
  }

  /**
   * Build system prompt with application context
   */
  private buildSystemPrompt(applicationContext: any, ragContext: string): string {
    const userLanguage = applicationContext?.userLanguage || 'en';
    const languageName =
      userLanguage === 'ru' ? 'Russian' : userLanguage === 'uz' ? 'Uzbek' : 'English';

    let prompt = `You are VisaBuddy, an expert AI assistant specializing in visa applications and immigration processes. Your goal is to provide accurate, helpful, and personalized guidance to users.

Core Guidelines:
- Be friendly, professional, and empathetic
- Provide accurate, up-to-date information about visa processes
- If you don't know something, say so honestly and suggest where they can find the information
- Keep responses concise but comprehensive
- Always respond in ${languageName} (${userLanguage})
- Use clear, simple language that's easy to understand
- Provide actionable advice and next steps when possible
- Be encouraging and supportive, especially for complex visa processes`;

    if (applicationContext) {
      prompt += `\n\nCurrent User's Visa Application Context:
- Destination Country: ${applicationContext.country}
- Visa Type: ${applicationContext.visaType}
- Processing Time: ${applicationContext.processingDays} days
- Application Fee: $${applicationContext.fee}
- Application Status: ${applicationContext.status}
- Documents Progress: ${applicationContext.documentsUploaded} of ${applicationContext.documentsTotal} documents uploaded
${applicationContext.missingDocuments?.length > 0 ? `- Missing Documents: ${applicationContext.missingDocuments.join(', ')}` : '- All required documents uploaded'}
${applicationContext.nextCheckpoint ? `- Next Step: ${applicationContext.nextCheckpoint}` : ''}

Use this context to provide personalized, relevant advice. Reference their specific application when helpful.`;

      // Add helpful suggestions based on status
      if (applicationContext.status === 'draft') {
        prompt += `\n\nThe user's application is in draft status. Encourage them to complete document uploads and provide guidance on next steps.`;
      } else if (applicationContext.status === 'in_progress') {
        prompt += `\n\nThe user's application is being processed. Provide reassurance and explain what happens during this stage.`;
      }
    }

    if (ragContext) {
      prompt += `\n\n${ragContext}`;
    }

    prompt += `\n\nRemember: Always be helpful, accurate, and supportive. If you reference information from the knowledge base, mention it naturally in your response.`;

    return prompt;
  }

  /**
   * Create a fallback response when AI service is unavailable
   */
  private async createFallbackResponse(
    userId: string,
    applicationId: string | undefined,
    sessionId: string,
    content: string,
    startTime: number,
    errorMessage: string
  ) {
    const responseTime = Date.now() - startTime;

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId,
        userId,
        role: 'user',
        content,
        sources: JSON.stringify([]),
        model: 'fallback',
        responseTime: 0,
      },
    });

    // Create a helpful fallback message based on the user's question
    let fallbackMessage = '';
    const lowerContent = content.toLowerCase();

    if (
      lowerContent.includes('xato') ||
      lowerContent.includes('mistake') ||
      lowerContent.includes('error')
    ) {
      fallbackMessage = `Arizachilar odatda quyidagi xatolarni qilishadi:\n\n1. To'liq bo'lmagan hujjatlar - barcha kerakli hujjatlarni yuklashni unutmang\n2. Noto'g'ri ma'lumotlar - barcha ma'lumotlarni tekshirib ko'ring\n3. Muddati o'tgan hujjatlar - barcha hujjatlarning amal qilish muddatini tekshiring\n4. Yetarli mablag' ko'rsatilmagan - moliyaviy hujjatlarni to'liq taqdim eting\n\nAgar sizda boshqa savollar bo'lsa, iltimos, so'rang!`;
    } else if (lowerContent.includes('hujjat') || lowerContent.includes('document')) {
      fallbackMessage = `Visa arizasi uchun odatda quyidagi hujjatlar talab qilinadi:\n\n1. Pasport (kamida 6 oy amal qilish muddati)\n2. Arizachining fotosurati\n3. Moliyaviy hujjatlar (bank hisob varag'i)\n4. Mehmondo'stlik dalillari\n5. Sayohat rejasi\n\nAniq ro'yxat uchun arizangizni yarating va hujjatlar ro'yxatini ko'ring.`;
    } else if (
      lowerContent.includes('muddat') ||
      lowerContent.includes('time') ||
      lowerContent.includes('vaqt')
    ) {
      fallbackMessage = `Visa arizasini ko'rib chiqish odatda 5-15 ish kuni davom etadi, lekin bu mamlakat va visa turiga bog'liq. Aniq muddatni bilish uchun arizangizni yarating va mamlakat ma'lumotlarini ko'ring.`;
    } else {
      fallbackMessage = `Kechirasiz, hozirda AI xizmati ishlamayapti. ${errorMessage}\n\nSizning xabaringiz saqlandi. Xizmat tiklanganda men sizga yordam beraman.\n\nBu vaqtda siz:\n- Arizalar bo'limida arizangiz holatini ko'rishingiz mumkin\n- Yuklangan hujjatlaringizni ko'rib chiqishingiz mumkin\n- Qo'shimcha yordam kerak bo'lsa, qo'llab-quvvatlash jamoasiga murojaat qiling\n\nRahmat!`;
    }

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        userId,
        role: 'assistant',
        content: fallbackMessage,
        sources: JSON.stringify([]),
        model: 'fallback',
        tokensUsed: 0,
        responseTime,
      },
    });

    // Update session
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return {
      message: fallbackMessage,
      sources: [],
      tokens_used: 0,
      model: 'fallback',
      id: assistantMessage.id,
      applicationContext: null,
    };
  }

  /**
   * Search documents in knowledge base with filters
   */
  async searchDocuments(query: string, country?: string, visaType?: string, limit = 5) {
    try {
      // Call AI service to search with filters
      const response = await axios.post(`${AI_SERVICE_URL}/api/chat/search`, {
        query,
        country,
        visa_type: visaType,
        limit,
      });
      return response.data.data || response.data.results || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Add feedback to a message (thumbs up/down or detailed feedback)
   */
  async addMessageFeedback(
    messageId: string,
    userId: string,
    feedback: 'thumbs_up' | 'thumbs_down' | string
  ) {
    try {
      // Verify message belongs to user
      const message = await prisma.chatMessage.findFirst({
        where: { id: messageId, userId },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      // If it's a new thumbs_down, don't overwrite if already exists
      if (feedback === 'thumbs_down' && message.feedback === 'thumbs_down') {
        return message;
      }

      return await prisma.chatMessage.update({
        where: { id: messageId },
        data: { feedback },
      });
    } catch (error) {
      console.error('Feedback error:', error);
      throw error;
    }
  }

  /**
   * Clear conversation history for a user/application
   */
  async clearConversationHistory(userId: string, applicationId?: string) {
    try {
      // Find all sessions for this user/application combo
      const sessions = await prisma.chatSession.findMany({
        where: {
          userId,
          applicationId: applicationId || null,
        },
        select: { id: true },
      });

      const sessionIds = sessions.map((s: any): string => s.id);

      // Delete all messages in these sessions
      const messagesDeleted = await prisma.chatMessage.deleteMany({
        where: {
          sessionId: {
            in: sessionIds,
          },
        },
      });

      // Delete the sessions
      const sessionsDeleted = await prisma.chatSession.deleteMany({
        where: { id: { in: sessionIds } },
      });

      return {
        messagesDeleted: messagesDeleted.count,
        sessionsDeleted: sessionsDeleted.count,
      };
    } catch (error) {
      console.error('Clear history error:', error);
      throw error;
    }
  }

  /**
   * Get chat statistics for a user
   */
  async getChatStats(userId: string) {
    try {
      const sessions = await prisma.chatSession.findMany({
        where: { userId },
        select: {
          id: true,
          createdAt: true,
          messages: {
            select: {
              tokensUsed: true,
              createdAt: true,
            },
          },
        },
      });

      let totalMessages = 0;
      let totalTokens = 0;
      let totalSessions = sessions.length;

      sessions.forEach((session: any): void => {
        totalMessages += session.messages.length;
        totalTokens += session.messages.reduce(
          (sum: number, msg: any): number => sum + (msg.tokensUsed || 0),
          0
        );
      });

      return {
        totalSessions,
        totalMessages,
        totalTokens,
        averageTokensPerMessage: totalMessages > 0 ? Math.round(totalTokens / totalMessages) : 0,
      };
    } catch (error) {
      console.error('Stats error:', error);
      throw error;
    }
  }

  /**
   * Get user's daily usage and cost data
   */
  async getDailyUsage(userId: string) {
    try {
      return await usageTrackingService.getDailyUsage(userId);
    } catch (error) {
      console.error('Error getting daily usage:', error);
      throw error;
    }
  }

  /**
   * Get user's weekly usage and cost data
   */
  async getWeeklyUsage(userId: string) {
    try {
      return await usageTrackingService.getWeeklyUsage(userId, 1);
    } catch (error) {
      console.error('Error getting weekly usage:', error);
      throw error;
    }
  }

  /**
   * Get user's monthly usage and cost data
   */
  async getMonthlyUsage(userId: string) {
    try {
      return await usageTrackingService.getMonthlyUsage(userId, 1);
    } catch (error) {
      console.error('Error getting monthly usage:', error);
      throw error;
    }
  }

  /**
   * Get user's cost analysis across different periods
   */
  async getCostAnalysis(userId: string) {
    try {
      return await usageTrackingService.getCostAnalysis(userId);
    } catch (error) {
      console.error('Error getting cost analysis:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();

// Also support alternative import patterns for backwards compatibility
export default chatService;
