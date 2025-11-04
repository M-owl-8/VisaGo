import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://localhost:8001";

export class ChatService {
  /**
   * Create or get a chat session
   */
  async getOrCreateSession(
    userId: string,
    applicationId?: string
  ): Promise<string> {
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
        title: applicationId ? `Chat for ${applicationId}` : "General Chat",
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
          documents: true,
        },
      });

      if (!application) {
        return null;
      }

      const documentStatus = application.documents.reduce(
        (acc: Record<string, string>, doc: typeof application.documents[0]) => {
          acc[doc.documentType] = doc.status;
          return acc;
        },
        {}
      );

      return {
        country: application.country.name,
        visaType: application.visaType.name,
        processingDays: application.visaType.processingDays,
        fee: application.visaType.fee,
        requiredDocuments: JSON.parse(application.visaType.documentTypes || "[]"),
        documentsCollected: application.documents.filter(
          (d: typeof application.documents[0]) => d.status === "verified"
        ).length,
        totalDocuments: application.documents.length,
        applicationStatus: application.status,
      };
    } catch (error) {
      console.error("Failed to extract application context:", error);
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
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        history = recentMessages
          .reverse()
          .map((m: any) => ({ role: m.role, content: m.content }));
      }

      // Extract application context for better responses
      let applicationContext = null;
      if (applicationId) {
        applicationContext = await this.extractApplicationContext(applicationId);
      }

      // Build context string for RAG
      let ragContext = "";
      if (applicationContext) {
        ragContext = `
User's Current Visa Application:
- Country: ${applicationContext.country}
- Visa Type: ${applicationContext.visaType}
- Processing Time: ${applicationContext.processingDays} days
- Fee: $${applicationContext.fee}
- Documents Collected: ${applicationContext.documentsCollected}/${applicationContext.totalDocuments}
- Required Documents: ${applicationContext.requiredDocuments.join(", ")}
- Application Status: ${applicationContext.applicationStatus}
        `.trim();
      }

      // Call AI service with full context
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/chat`, {
        content,
        user_id: userId,
        application_id: applicationId,
        conversation_history: history,
        context: ragContext,
        country: applicationContext?.country,
        visa_type: applicationContext?.visaType,
      });

      const {
        message,
        sources = [],
        tokens_used = 0,
        model = "gpt-4",
      } = aiResponse.data;

      const responseTime = Date.now() - startTime;

      // Save user message
      await prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role: "user",
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
          role: "assistant",
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

      return {
        message,
        sources,
        tokens_used,
        model,
        id: assistantMessage.id,
        applicationContext,
      };
    } catch (error: any) {
      console.error("Chat service error:", error);

      // Fallback response if AI service is down
      if (error.response?.status >= 500 || error.code === "ECONNREFUSED") {
        try {
          const sessionId = await this.getOrCreateSession(
            userId,
            applicationId
          );

          // Save user message anyway
          const responseTime = Date.now() - startTime;
          await prisma.chatMessage.create({
            data: {
              sessionId,
              userId,
              role: "user",
              content,
              sources: JSON.stringify([]),
              responseTime,
            },
          });
        } catch (saveError) {
          console.error("Failed to save message:", saveError);
        }

        return {
          message:
            "AI service is temporarily unavailable. Your message has been saved and we'll respond as soon as possible.",
          sources: [],
          tokens_used: 0,
          model: "fallback",
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

      const sessionIds = sessions.map((s: any) => s.id);

      const messages = await prisma.chatMessage.findMany({
        where: {
          sessionId: {
            in: sessionIds,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      });

      return messages.reverse();
    } else {
      // Legacy: treat first param as sessionId
      const sessionId = userIdOrSessionId;
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
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
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
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
          orderBy: { createdAt: "asc" },
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
      throw new Error("Session not found");
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
      throw new Error("Session not found");
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
   * Search documents in knowledge base with filters
   */
  async searchDocuments(
    query: string,
    country?: string,
    visaType?: string,
    limit = 5
  ) {
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
      console.error("Search error:", error);
      return [];
    }
  }

  /**
   * Add feedback to a message (thumbs up/down or detailed feedback)
   */
  async addMessageFeedback(
    messageId: string,
    userId: string,
    feedback: "thumbs_up" | "thumbs_down" | string
  ) {
    try {
      // Verify message belongs to user
      const message = await prisma.chatMessage.findFirst({
        where: { id: messageId, userId },
      });

      if (!message) {
        throw new Error("Message not found");
      }

      // If it's a new thumbs_down, don't overwrite if already exists
      if (feedback === "thumbs_down" && message.feedback === "thumbs_down") {
        return message;
      }

      return await prisma.chatMessage.update({
        where: { id: messageId },
        data: { feedback },
      });
    } catch (error) {
      console.error("Feedback error:", error);
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

      const sessionIds = sessions.map((s: any) => s.id);

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
      console.error("Clear history error:", error);
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

      sessions.forEach((session: any) => {
        totalMessages += session.messages.length;
        totalTokens += session.messages.reduce(
          (sum: any, msg: any) => sum + (msg.tokensUsed || 0),
          0
        );
      });

      return {
        totalSessions,
        totalMessages,
        totalTokens,
        averageTokensPerMessage:
          totalMessages > 0 ? Math.round(totalTokens / totalMessages) : 0,
      };
    } catch (error) {
      console.error("Stats error:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();

// Also support alternative import patterns for backwards compatibility
export default chatService;