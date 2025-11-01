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
   * Send a message and get AI response
   */
  async sendMessage(
    userId: string,
    content: string,
    applicationId?: string,
    conversationHistory?: any[]
  ) {
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
          .map((m) => ({ role: m.role, content: m.content }));
      }

      // Call AI service
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/chat`, {
        content,
        user_id: userId,
        application_id: applicationId,
        conversation_history: history,
      });

      const { message, sources = [], tokens_used = 0, model = "gpt-4" } =
        aiResponse.data;

      // Save user message
      await prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role: "user",
          content,
          sources: JSON.stringify([]),
          model,
        },
      });

      // Save assistant response
      const assistantMessage = await prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role: "assistant",
          content: message,
          sources: JSON.stringify(sources || []),
          model,
          tokensUsed: tokens_used,
        },
      });

      return {
        message,
        sources,
        tokens_used,
        model,
        id: assistantMessage.id,
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
          await prisma.chatMessage.create({
            data: {
              sessionId,
              userId,
              role: "user",
              content,
              sources: JSON.stringify([]),
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

      const sessionIds = sessions.map((s) => s.id);

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
   * Get user's chat sessions
   */
  async getUserSessions(userId: string) {
    return await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
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
   * Search documents in knowledge base
   */
  async searchDocuments(query: string) {
    try {
      // Call AI service to search
      const response = await axios.post(`${AI_SERVICE_URL}/api/search`, {
        query,
      });
      return response.data.results || [];
    } catch (error) {
      console.error("Search error:", error);
      return [];
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

      const sessionIds = sessions.map((s) => s.id);

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

      sessions.forEach((session) => {
        totalMessages += session.messages.length;
        totalTokens += session.messages.reduce(
          (sum, msg) => sum + (msg.tokensUsed || 0),
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