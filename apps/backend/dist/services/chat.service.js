"use strict";
/**
 * Chat service
 * Handles AI-powered chat functionality with RAG context
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatService = exports.ChatService = void 0;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const usage_tracking_service_1 = require("./usage-tracking.service");
const env_1 = require("../config/env");
const logger_1 = require("../middleware/logger");
const ai_openai_service_1 = require("./ai-openai.service");
const prisma = new client_1.PrismaClient();
/**
 * Get AI service URL from environment
 */
function getAIServiceURL() {
    const envConfig = (0, env_1.getEnvConfig)();
    return process.env.AI_SERVICE_URL || 'http://localhost:8001';
}
const AI_SERVICE_URL = getAIServiceURL();
class ChatService {
    /**
     * Create or get a chat session
     */
    async getOrCreateSession(userId, applicationId) {
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
    async extractApplicationContext(applicationId) {
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
            const missingDocuments = requiredDocuments.filter((doc) => !uploadedTypes.includes(doc));
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
        }
        catch (error) {
            console.error('Failed to extract application context:', error);
            return null;
        }
    }
    /**
     * Send a message and get AI response with RAG context
     */
    async sendMessage(userId, content, applicationId, conversationHistory) {
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
                    .map((m) => ({ role: m.role, content: m.content }));
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
            const envConfig = (0, env_1.getEnvConfig)();
            if (!envConfig.OPENAI_API_KEY) {
                (0, logger_1.logWarn)('OpenAI API key not configured, using fallback response', {
                    userId,
                    applicationId,
                });
                return this.createFallbackResponse(userId, applicationId, sessionId, content, startTime, 'AI service not configured. Please configure OPENAI_API_KEY in environment variables.');
            }
            // Use OpenAI service directly (simplified ChatGPT-like experience)
            let aiResponse;
            try {
                // Build system prompt with context
                const systemPrompt = this.buildSystemPrompt(applicationContext, ragContext);
                // Convert history to OpenAI format
                const openaiMessages = history.map((msg) => ({
                    role: (msg.role === 'user' ? 'user' : 'assistant'),
                    content: msg.content || '',
                }));
                // Add current user message
                openaiMessages.push({
                    role: 'user',
                    content: content,
                });
                // Call OpenAI directly
                aiResponse = await ai_openai_service_1.AIOpenAIService.chat(openaiMessages, systemPrompt);
                // Format response to match expected structure
                const formattedResponse = {
                    message: aiResponse.message,
                    sources: [],
                    tokens_used: aiResponse.tokensUsed,
                    model: aiResponse.model,
                };
                aiResponse = { data: formattedResponse };
            }
            catch (openaiError) {
                (0, logger_1.logError)('OpenAI service error', openaiError, {
                    userId,
                    applicationId,
                });
                // Provide user-friendly error message
                const errorMessage = openaiError.message ||
                    'AI service temporarily unavailable. Please try again in a moment.';
                return this.createFallbackResponse(userId, applicationId, sessionId, content, startTime, errorMessage);
            }
            const { message, sources = [], tokens_used = 0, model = 'gpt-4' } = aiResponse.data;
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
            usage_tracking_service_1.usageTrackingService
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
        }
        catch (error) {
            console.error('Chat service error:', error);
            // Track error (async, don't block)
            usage_tracking_service_1.usageTrackingService
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
                }
                catch (saveError) {
                    console.error('Failed to save message:', saveError);
                }
                return {
                    message: "AI service is temporarily unavailable. Your message has been saved and we'll respond as soon as possible.",
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
    async getConversationHistory(userIdOrSessionId, applicationId, limit = 50, offset = 0) {
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
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
            });
            return messages.reverse();
        }
        else {
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
    async getUserSessions(userId, limit = 20, offset = 0) {
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
    async getSessionDetails(sessionId, userId) {
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
    async renameSession(sessionId, userId, newTitle) {
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
    async addFeedback(messageId, feedback) {
        return await prisma.chatMessage.update({
            where: { id: messageId },
            data: { feedback },
        });
    }
    /**
     * Delete a chat session
     */
    async deleteSession(sessionId) {
        return await prisma.chatSession.delete({
            where: { id: sessionId },
        });
    }
    /**
     * Build system prompt with application context
     */
    buildSystemPrompt(applicationContext, ragContext) {
        let prompt = `You are a helpful AI assistant for visa applications. You help users with visa-related questions, document requirements, application processes, and general guidance.

Guidelines:
- Be friendly, professional, and helpful
- Provide accurate information about visa processes
- If you don't know something, say so honestly
- Keep responses concise but informative
- Support multiple languages (English, Uzbek, Russian)`;
        if (applicationContext) {
            prompt += `\n\nCurrent User Context:
- Country: ${applicationContext.country}
- Visa Type: ${applicationContext.visaType}
- Processing Time: ${applicationContext.processingDays} days
- Application Status: ${applicationContext.status}
- Documents Uploaded: ${applicationContext.documentsUploaded}/${applicationContext.documentsTotal}
${applicationContext.missingDocuments?.length > 0 ? `- Missing Documents: ${applicationContext.missingDocuments.join(', ')}` : ''}`;
        }
        if (ragContext) {
            prompt += `\n\n${ragContext}`;
        }
        return prompt;
    }
    /**
     * Create a fallback response when AI service is unavailable
     */
    async createFallbackResponse(userId, applicationId, sessionId, content, startTime, errorMessage) {
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
        // Create fallback assistant message
        const fallbackMessage = `I apologize, but I'm currently unable to process your request. ${errorMessage} Please try again in a few moments, or contact support if the issue persists.`;
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
    async searchDocuments(query, country, visaType, limit = 5) {
        try {
            // Call AI service to search with filters
            const response = await axios_1.default.post(`${AI_SERVICE_URL}/api/chat/search`, {
                query,
                country,
                visa_type: visaType,
                limit,
            });
            return response.data.data || response.data.results || [];
        }
        catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
    /**
     * Add feedback to a message (thumbs up/down or detailed feedback)
     */
    async addMessageFeedback(messageId, userId, feedback) {
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
        }
        catch (error) {
            console.error('Feedback error:', error);
            throw error;
        }
    }
    /**
     * Clear conversation history for a user/application
     */
    async clearConversationHistory(userId, applicationId) {
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
        }
        catch (error) {
            console.error('Clear history error:', error);
            throw error;
        }
    }
    /**
     * Get chat statistics for a user
     */
    async getChatStats(userId) {
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
                totalTokens += session.messages.reduce((sum, msg) => sum + (msg.tokensUsed || 0), 0);
            });
            return {
                totalSessions,
                totalMessages,
                totalTokens,
                averageTokensPerMessage: totalMessages > 0 ? Math.round(totalTokens / totalMessages) : 0,
            };
        }
        catch (error) {
            console.error('Stats error:', error);
            throw error;
        }
    }
    /**
     * Get user's daily usage and cost data
     */
    async getDailyUsage(userId) {
        try {
            return await usage_tracking_service_1.usageTrackingService.getDailyUsage(userId);
        }
        catch (error) {
            console.error('Error getting daily usage:', error);
            throw error;
        }
    }
    /**
     * Get user's weekly usage and cost data
     */
    async getWeeklyUsage(userId) {
        try {
            return await usage_tracking_service_1.usageTrackingService.getWeeklyUsage(userId, 1);
        }
        catch (error) {
            console.error('Error getting weekly usage:', error);
            throw error;
        }
    }
    /**
     * Get user's monthly usage and cost data
     */
    async getMonthlyUsage(userId) {
        try {
            return await usage_tracking_service_1.usageTrackingService.getMonthlyUsage(userId, 1);
        }
        catch (error) {
            console.error('Error getting monthly usage:', error);
            throw error;
        }
    }
    /**
     * Get user's cost analysis across different periods
     */
    async getCostAnalysis(userId) {
        try {
            return await usage_tracking_service_1.usageTrackingService.getCostAnalysis(userId);
        }
        catch (error) {
            console.error('Error getting cost analysis:', error);
            throw error;
        }
    }
}
exports.ChatService = ChatService;
// Export singleton instance
exports.chatService = new ChatService();
// Also support alternative import patterns for backwards compatibility
exports.default = exports.chatService;
//# sourceMappingURL=chat.service.js.map