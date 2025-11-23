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
      // Build full user message with conversation history and context
      let aiResponse;
      try {
        // Build system prompt with context
        const systemPrompt = this.buildSystemPrompt(applicationContext, ragContext, content);

        // Use DeepSeek Reasoner for AI assistant chat
        // Build full user message with conversation history and context
        try {
          // Import DeepSeek service
          const { deepseekVisaChat } = await import('./deepseek');

          // Build the full user message with conversation history
          let fullUserMessage = content;
          if (history.length > 0) {
            // Include recent conversation history in the message
            const historyText = history
              .slice(-5) // Last 5 messages for context
              .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
              .join('\n\n');
            fullUserMessage = `Previous conversation:\n${historyText}\n\nCurrent question: ${content}`;
          }

          // Add application context to the message if available
          if (applicationContext) {
            fullUserMessage = `${fullUserMessage}\n\nContext: ${ragContext || 'No additional context available.'}`;
          }

          // Call DeepSeek with the system prompt and full user message
          const deepseekResponse = await deepseekVisaChat(fullUserMessage, systemPrompt);

          // Format response to match expected structure
          const formattedResponse = {
            message: deepseekResponse.message,
            sources: [], // DeepSeek doesn't provide RAG sources, but we keep the structure
            tokens_used: deepseekResponse.tokensUsed,
            model: deepseekResponse.model,
          };

          aiResponse = { data: formattedResponse };
        } catch (chatError: any) {
          // Handle DeepSeek errors
          console.error('DeepSeek chat service failed:', chatError);

          // Check if it's a configuration error
          if (
            chatError.message?.includes('not configured') ||
            chatError.message === 'DEEPSEEK_AUTH_ERROR'
          ) {
            throw chatError; // Re-throw configuration errors to be handled by outer catch
          }

          // For other errors, provide user-friendly message
          if (chatError.message === 'DEEPSEEK_CHAT_ERROR') {
            throw new Error(
              'Ketdik AI assistant is temporarily unavailable. Please try again later.'
            );
          }

          throw chatError;
        }
      } catch (deepseekError: any) {
        logError('DeepSeek service error', deepseekError, {
          userId,
          applicationId,
        });

        // Provide user-friendly error message
        const errorMessage =
          deepseekError.message ||
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
  private buildSystemPrompt(
    applicationContext: any,
    ragContext: string,
    latestUserMessage: string
  ): string {
    let prompt = `You are the main AI visa consultant inside the Ketdik app.

ROLE
- You act like an extremely proficient human visa consultant.
- You mainly help with two visa types: tourist (short stay) and student (study).
- You focus on these destination countries: Spain, Germany, Italy, France, Turkey, United Arab Emirates (UAE), United Kingdom (UK), United States of America (USA), Canada, South Korea.

LANGUAGE
- Always answer in the same language the user mainly uses in their last message:
  • If the user writes in Uzbek, answer in Uzbek.
  • If the user writes in Russian, answer in Russian.
  • Otherwise, answer in English.
- Keep the language simple, clear and polite. No over-praising and no motivational speeches.

HOW YOU WORK
1) First, make sure you understand the user's profile. If information is missing, ask a few SHORT questions (2–6 questions maximum) about:
  - Nationality and current country of residence
  - Destination country and visa type (tourist or student)
  - Planned duration and purpose of stay
  - Financial situation (savings, income, sponsor, property)
  - Travel history (Schengen, US/UK/Canada, etc.)

2) After you understand the profile, give:
  - A 1–2 sentence summary of their situation.
  - A structured answer with the following sections:
    • Eligibility
    • Required documents
    • Financial requirements (give safe approximate ranges if exact numbers are unknown and clearly say they are approximate)
    • Application process (where to apply, online portal, VFS/embassy, key steps)
    • Common refusal reasons and how to reduce risk
  - Finish with a short "Action checklist" (3–7 bullet points of what to do next).

RAG / KNOWLEDGE BASE
- If the prompt includes specific rules or text under something like KNOWLEDGE_BASE, treat that information as higher priority than your general knowledge.
- Within KNOWLEDGE_BASE there may be:
  • APPLICATION CONTEXT: details about this user's visa application.
  • VISA_KNOWLEDGE_BASE: country and visa-type specific rules (documents, finance, process, refusal reasons).
  • DOCUMENT_GUIDES: practical instructions (for Uzbekistan) on how the user can obtain specific documents such as bank statements, police clearance, property certificates, etc.
  • RAG_CONTEXT: additional retrieved information.
- When the user asks about a specific document (for example, where to get a bank statement or police clearance), prefer to use the DOCUMENT_GUIDES section and adapt it to the user's language.
- Use that information first. Only add general visa knowledge when needed, and clearly mark it as:
  - Uzbek: "Umumiy maslahat, iltimos rasmiy manbadan tekshiring."
  - Russian: "Общий совет, пожалуйста, проверьте на официальном сайте."
  - English: "General advice, please verify on official sources."

SAFETY AND HONESTY
- Visa rules change frequently and can differ by consulate. Remind users to check the official website or call the consulate when something is important.
- Never promise approval, never give exact percentages of success.
- Never suggest lying, creating fake documents, or hiding information.
- If you are not sure, say you are not sure and recommend the user to confirm with official sources.

STYLE
- Be calm, respectful, and efficient. No unnecessary jokes or hype.
- Use short paragraphs and SHORT lists.
- Prefer simple numbered or bulleted lists like "1., 2., 3." instead of Markdown headings.
- Avoid using Markdown headings such as "##", "###" and avoid too many "**bold**" markers.
- Use punctuation that is natural for the language:
  • Uzbek: commas and periods correctly, no extra exclamation marks.
  • Russian: proper commas and periods, no unnecessary quotes or brackets.
  • English: clear sentences, no overuse of parentheses or exclamation marks.
- Do not output chain-of-thought, hidden reasoning, or internal analysis.
- Never output "<think>" or any similar tags. If you need to reason, do it internally and output only the final answer.`;

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
