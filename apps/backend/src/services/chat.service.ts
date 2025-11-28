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
import { getVisaKnowledgeBase } from '../data/visaKnowledgeBase';
import { getRelevantDocumentGuides } from '../data/documentGuides';

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
  /**
   * Get or create a chat session
   * MEDIUM PRIORITY FIX: Ensure session exists before saving messages to prevent orphaned messages
   * This method is called before every message save to guarantee session exists
   */
  async getOrCreateSession(userId: string, applicationId?: string): Promise<string> {
    try {
      const session = await prisma.chatSession.findFirst({
        where: {
          userId,
          applicationId: applicationId || null,
        },
      });

      if (session) {
        return session.id;
      }

      // MEDIUM PRIORITY FIX: Create session if it doesn't exist, with proper error handling
      // This ensures messages are never saved without a valid session
      const newSession = await prisma.chatSession.create({
        data: {
          userId,
          applicationId: applicationId || null,
          title: applicationId ? `Chat for ${applicationId}` : 'General Chat',
        },
      });

      if (!newSession || !newSession.id) {
        throw new Error('Failed to create chat session');
      }

      return newSession.id;
    } catch (error: any) {
      // Log error and re-throw to prevent messages from being saved without a session
      console.error('[ChatService] Failed to get or create session:', error);
      throw new Error(`Failed to create chat session: ${error.message || 'Unknown error'}`);
    }
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

      // Check if DeepSeek API key is configured for chat
      const envConfig = getEnvConfig();
      if (!process.env.DEEPSEEK_API_KEY) {
        logWarn('DeepSeek API key not configured, using fallback response', {
          userId,
          applicationId,
        });

        return this.createFallbackResponse(
          userId,
          applicationId,
          sessionId,
          content,
          startTime,
          'AI service not configured. Please configure DEEPSEEK_API_KEY in environment variables.'
        );
      }

      // Use DeepSeek Reasoner for AI assistant chat
      // Build messages array with trimmed history
      let aiResponse;
      try {
        // Build compact system prompt with context
        const systemPrompt = this.buildSystemPrompt(applicationContext, ragContext, content);

        // Import DeepSeek service
        const { deepseekVisaChat } = await import('./deepseek');
        type DeepSeekMessage = { role: 'system' | 'user' | 'assistant'; content: string };

        // Trim conversation history to last 20 messages (max ~1500 tokens)
        const trimmedHistory = this.trimConversationHistory(history, 20, 1500);

        // Build messages array for DeepSeek
        const messages: DeepSeekMessage[] = [
          ...trimmedHistory.map((msg: any) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          { role: 'user' as const, content },
        ];

        // Call DeepSeek with messages array (system prompt is included separately)
        const deepseekResponse = await deepseekVisaChat(
          messages,
          systemPrompt,
          userId,
          applicationId
        );

        // Format response to match expected structure
        const formattedResponse = {
          message: deepseekResponse.message,
          sources: [], // DeepSeek doesn't provide RAG sources, but we keep the structure
          tokens_used: deepseekResponse.tokensUsed,
          model: deepseekResponse.model,
        };

        aiResponse = { data: formattedResponse };
      } catch (chatError: any) {
        // Handle DeepSeek errors with friendly multilingual messages
        logError(
          '[DeepSeek][Chat] Service error',
          chatError instanceof Error ? chatError : new Error(String(chatError)),
          {
            userId,
            applicationId,
          }
        );

        // Check if it's a configuration error
        if (
          chatError.message?.includes('not configured') ||
          chatError.message === 'DEEPSEEK_AUTH_ERROR'
        ) {
          throw chatError; // Re-throw configuration errors to be handled by outer catch
        }

        // Handle timeout with friendly message
        if (chatError.message === 'DEEPSEEK_TIMEOUT') {
          return this.createFallbackResponse(
            userId,
            applicationId,
            sessionId,
            content,
            startTime,
            "Serverimizdagi AI hozir sekin ishlayapti. Iltimos, birozdan so'ng qayta urinib ko'ring."
          );
        }

        // For other errors, provide user-friendly message
        if (
          chatError.message === 'DEEPSEEK_CHAT_ERROR' ||
          chatError.message === 'DEEPSEEK_RATE_LIMIT'
        ) {
          return this.createFallbackResponse(
            userId,
            applicationId,
            sessionId,
            content,
            startTime,
            'AI service temporarily unavailable. Please try again in a moment.'
          );
        }

        // Generic fallback
        return this.createFallbackResponse(
          userId,
          applicationId,
          sessionId,
          content,
          startTime,
          'AI service temporarily unavailable. Please try again in a moment.'
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

      // CRITICAL FIX: Save user message and ensure it's committed before saving assistant message
      // This prevents race conditions where history is queried before messages are saved
      const userMessage = await prisma.chatMessage.create({
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

      // CRITICAL FIX: Update session timestamp immediately after saving user message
      // This ensures session is marked as active and messages are queryable
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      // Save assistant response with sources and response time
      let assistantMessage;
      try {
        assistantMessage = await prisma.chatMessage.create({
          data: {
            sessionId,
            userId,
            role: 'assistant',
            content: message,
            // MEDIUM PRIORITY FIX: Properly serialize sources - handle both array and already-stringified cases
            // This prevents double-stringification errors and ensures sources are stored correctly
            sources: Array.isArray(sources)
              ? JSON.stringify(sources)
              : typeof sources === 'string'
                ? sources
                : JSON.stringify([]),
            model,
            tokensUsed: tokens_used,
            responseTime,
          },
        });

        // CRITICAL FIX: Update session again after assistant message to ensure both messages are queryable
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() },
        });
      } catch (error) {
        // CRITICAL FIX: If assistant message save fails, delete user message to maintain consistency
        // This prevents orphaned user messages without responses
        await prisma.chatMessage.delete({ where: { id: userMessage.id } }).catch(() => {
          // Ignore delete errors
        });
        throw error;
      }

      // CRITICAL FIX: Update session timestamp to ensure it's included in history queries
      // This prevents race conditions where getConversationHistory is called before session is updated
      // Only update once after both messages are saved
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      // Track usage for cost analytics (async, don't block response)
      usageTrackingService
        .trackMessageUsage(userId, tokens_used, model, responseTime)
        .catch((err) => console.error('Failed to track usage:', err));

      // Ensure we always return a valid response
      const finalResponse = {
        message: message || 'I apologize, but I could not generate a response. Please try again.',
        sources: sources || [],
        tokens_used: tokens_used || 0,
        model: model || 'gpt-4',
        id: assistantMessage.id,
        applicationContext: applicationContext || null,
      };

      console.log('[ChatService] Returning response:', {
        hasMessage: !!finalResponse.message,
        messageLength: finalResponse.message.length,
        hasId: !!finalResponse.id,
      });

      return finalResponse;
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
   * CRITICAL SECURITY FIX: Always require userId for verification
   */
  async getConversationHistory(
    userIdOrSessionId: string,
    applicationId?: string,
    limit = 50,
    offset = 0,
    verifiedUserId?: string // Required for legacy API to verify session ownership
  ) {
    // If applicationId is provided (including null), it's the new API with userId, applicationId, limit, offset
    // We check !== undefined to distinguish between "not provided" (legacy mode) and "explicitly null" (general chat)
    if (applicationId !== undefined) {
      const userId = userIdOrSessionId;
      const sessions = await prisma.chatSession.findMany({
        where: {
          userId,
          applicationId: applicationId || null, // Convert empty string to null for Prisma
        },
        select: { id: true },
      });

      const sessionIds = sessions.map((s: any): string => s.id);

      // If no sessions exist, return empty array instead of error
      if (sessionIds.length === 0) {
        return [];
      }

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
      // CRITICAL SECURITY FIX: Verify session belongs to requesting user
      const sessionId = userIdOrSessionId;

      // Require verifiedUserId for legacy API to prevent unauthorized access
      if (!verifiedUserId) {
        throw new Error('User ID required for session verification');
      }

      // Verify session ownership - this prevents users from accessing other users' sessions
      const session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId: verifiedUserId, // CRITICAL: Verify session belongs to requesting user
        },
      });

      if (!session) {
        throw new Error('Session not found or access denied');
      }

      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
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
   * Trim conversation history to last N messages, ensuring total tokens stay under limit
   * @param history - Full conversation history
   * @param maxMessages - Maximum number of messages to keep (default: 10)
   * @param maxTokens - Maximum total tokens for history (default: 2000)
   * @returns Trimmed history array
   */
  private trimConversationHistory(
    history: any[],
    maxMessages: number = 20,
    maxTokens: number = 1500
  ): any[] {
    if (!history || history.length === 0) {
      return [];
    }

    // Take last N messages
    let trimmed = history.slice(-maxMessages);

    // Rough token estimation: ~4 characters per token
    // Count tokens for each message
    let totalTokens = 0;
    const result: any[] = [];

    // Add messages from the end until we hit token limit
    for (let i = trimmed.length - 1; i >= 0; i--) {
      const msg = trimmed[i];
      const msgTokens = Math.ceil((msg.content?.length || 0) / 4);

      if (totalTokens + msgTokens > maxTokens && result.length > 0) {
        break; // Stop if adding this message would exceed limit
      }

      result.unshift(msg); // Add to beginning
      totalTokens += msgTokens;
    }

    return result;
  }

  /**
   * Build compact system prompt with application context
   * Optimized for faster responses and lower token usage
   */
  private buildSystemPrompt(
    applicationContext: any,
    ragContext: string,
    latestUserMessage: string
  ): string {
    // Compact system prompt - focused on essential instructions
    let prompt = `You are Ketdik's visa assistant. Answer concisely (short paragraphs, no essays).

LANGUAGE: Match user's language (UZ/RU/EN). Keep it simple and polite.

ROLE: Help with tourist/student visas for Spain, Germany, Italy, France, Turkey, UAE, UK, USA, Canada, South Korea.

RESPONSE FORMAT:
- If missing info: Ask 2-6 short questions (nationality, destination, visa type, duration, finances, travel history).
- If you have info: 1-2 sentence summary, then structured answer (Eligibility, Documents, Finances, Process, Refusal risks), end with 3-7 action items.

KNOWLEDGE BASE: Use APPLICATION_CONTEXT, VISA_KNOWLEDGE_BASE, DOCUMENT_GUIDES, RAG_CONTEXT when provided. Mark general advice: UZ "Umumiy maslahat, iltimos rasmiy manbadan tekshiring." / RU "Общий совет, проверьте на официальном сайте." / EN "General advice, verify on official sources."

SAFETY: Never promise approval. Remind users to verify with official sources. Never suggest lying or fake documents.

STYLE: Short paragraphs, simple lists (1., 2., 3.), no markdown headings, no chain-of-thought output, no <think> tags.`;

    // Extract country and visaType from applicationContext
    const country =
      applicationContext?.country ||
      applicationContext?.destinationCountry ||
      applicationContext?.targetCountry ||
      null;

    const visaType = applicationContext?.visaType || applicationContext?.visa_type || null;

    // Get Spain visa knowledge base if applicable
    const visaKb = getVisaKnowledgeBase(country, visaType);

    // Get relevant document guides based on user's latest message
    const documentGuides = getRelevantDocumentGuides(latestUserMessage || '');

    // Build KNOWLEDGE_BASE section with priority order:
    // 1. Application context (if present)
    // 2. Spain visa KB (if available)
    // 3. Document guides (if user asks about specific documents)
    // 4. RAG context (if present)
    let knowledgeBaseBlock = '';

    if (applicationContext) {
      knowledgeBaseBlock += `APPLICATION CONTEXT:\n- Destination Country: ${applicationContext.country}\n- Visa Type: ${applicationContext.visaType}\n- Processing Time: ${applicationContext.processingDays} days\n- Application Fee: $${applicationContext.fee}\n- Application Status: ${applicationContext.status}\n- Documents Progress: ${applicationContext.documentsUploaded} of ${applicationContext.documentsTotal} documents uploaded\n${applicationContext.missingDocuments?.length > 0 ? `- Missing Documents: ${applicationContext.missingDocuments.join(', ')}` : '- All required documents uploaded'}\n${applicationContext.nextCheckpoint ? `- Next Step: ${applicationContext.nextCheckpoint}` : ''}\n\nUse this context to provide personalized, relevant advice. Reference their specific application when helpful.\n\n`;
    }

    if (visaKb) {
      knowledgeBaseBlock += `VISA_KNOWLEDGE_BASE:\n${visaKb}\n\n`;
    }

    if (documentGuides) {
      knowledgeBaseBlock += `DOCUMENT_GUIDES:\n${documentGuides}\n\n`;
    }

    if (ragContext) {
      knowledgeBaseBlock += `RAG_CONTEXT:\n${ragContext}\n\n`;
    }

    // Add KNOWLEDGE_BASE section to prompt if we have any content
    if (knowledgeBaseBlock.trim()) {
      prompt += `\n\nKNOWLEDGE_BASE\n${knowledgeBaseBlock.trim()}`;
    }

    // Add explicit chain-of-thought blocking rules at the end
    prompt += `\n\nCRITICAL OUTPUT RULES (MUST FOLLOW):
- Do NOT output chain-of-thought, hidden reasoning, or internal analysis.
- Never output <think> or anything similar.
- Only provide the final, concise answer.
- If you need to reason, do it internally, but output only conclusions.`;

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
