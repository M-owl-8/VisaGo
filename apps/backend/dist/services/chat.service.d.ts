/**
 * Chat service
 * Handles AI-powered chat functionality with RAG context
 */
export declare class ChatService {
    /**
     * Create or get a chat session
     */
    /**
     * Get or create a chat session
     * MEDIUM PRIORITY FIX: Ensure session exists before saving messages to prevent orphaned messages
     * This method is called before every message save to guarantee session exists
     */
    getOrCreateSession(userId: string, applicationId?: string): Promise<string>;
    /**
     * Extract context from visa application
     */
    private extractApplicationContext;
    /**
     * Send a message and get AI response with RAG context
     */
    sendMessage(userId: string, content: string, applicationId?: string, conversationHistory?: any[]): Promise<{
        message: string;
        sources: never[];
        tokens_used: number;
        model: string;
        id: string;
        applicationContext: {
            country: string;
            countryCode: string;
            visaType: string;
            processingDays: number;
            fee: number;
            validity: string;
            status: string;
            createdAt: Date;
            documentsTotal: any;
            documentsUploaded: number;
            documentsVerified: number;
            documentsPending: number;
            documentsRejected: number;
            missingDocuments: any;
            checkpointsTotal: number;
            checkpointsCompleted: number;
            nextCheckpoint: string | null;
            userName: string | null;
            userLanguage: string;
            userBio: any;
        } | null;
    } | {
        message: string;
        sources: never[];
        tokens_used: number;
        model: string;
    }>;
    /**
     * Get conversation history
     * CRITICAL SECURITY FIX: Always require userId for verification
     */
    getConversationHistory(userIdOrSessionId: string, applicationId?: string, limit?: number, offset?: number, verifiedUserId?: string): Promise<{
        model: string;
        userId: string;
        responseTime: number | null;
        id: string;
        createdAt: Date;
        role: string;
        tokensUsed: number;
        sources: string | null;
        content: string;
        sessionId: string;
        feedback: string | null;
    }[]>;
    /**
     * Get user's chat sessions with pagination
     */
    getUserSessions(userId: string, limit?: number, offset?: number): Promise<{
        sessions: ({
            messages: {
                createdAt: Date;
                role: string;
                content: string;
            }[];
        } & {
            title: string;
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            applicationId: string | null;
            systemPrompt: string;
        })[];
        total: number;
        limit: number;
        offset: number;
    }>;
    /**
     * Get session details with message history
     * @param sessionId - Session ID
     * @param userId - User ID for authorization
     * @param limit - Maximum number of messages to return (default: 100)
     */
    getSessionDetails(sessionId: string, userId: string, limit?: number): Promise<{
        messages: {
            model: string;
            responseTime: number | null;
            id: string;
            createdAt: Date;
            role: string;
            tokensUsed: number;
            sources: string | null;
            content: string;
            feedback: string | null;
        }[];
        title: string;
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        applicationId: string | null;
        systemPrompt: string;
    }>;
    /**
     * Rename a chat session
     */
    renameSession(sessionId: string, userId: string, newTitle: string): Promise<{
        title: string;
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        applicationId: string | null;
        systemPrompt: string;
    }>;
    /**
     * Add feedback to a message
     */
    addFeedback(messageId: string, feedback: string): Promise<{
        model: string;
        userId: string;
        responseTime: number | null;
        id: string;
        createdAt: Date;
        role: string;
        tokensUsed: number;
        sources: string | null;
        content: string;
        sessionId: string;
        feedback: string | null;
    }>;
    /**
     * Delete a chat session
     */
    deleteSession(sessionId: string): Promise<{
        title: string;
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        applicationId: string | null;
        systemPrompt: string;
    }>;
    /**
     * Trim conversation history to last N messages, ensuring total tokens stay under limit
     * @param history - Full conversation history
     * @param maxMessages - Maximum number of messages to keep (default: 10)
     * @param maxTokens - Maximum total tokens for history (default: 2000)
     * @returns Trimmed history array
     */
    private trimConversationHistory;
    /**
     * Build compact system prompt with application context
     * Optimized for faster responses and lower token usage
     */
    private buildSystemPrompt;
    /**
     * Create a fallback response when AI service is unavailable
     */
    private createFallbackResponse;
    /**
     * Search documents in knowledge base with filters
     */
    searchDocuments(query: string, country?: string, visaType?: string, limit?: number): Promise<any>;
    /**
     * Add feedback to a message (thumbs up/down or detailed feedback)
     */
    addMessageFeedback(messageId: string, userId: string, feedback: 'thumbs_up' | 'thumbs_down' | string): Promise<{
        model: string;
        userId: string;
        responseTime: number | null;
        id: string;
        createdAt: Date;
        role: string;
        tokensUsed: number;
        sources: string | null;
        content: string;
        sessionId: string;
        feedback: string | null;
    }>;
    /**
     * Clear conversation history for a user/application
     */
    clearConversationHistory(userId: string, applicationId?: string): Promise<{
        messagesDeleted: number;
        sessionsDeleted: number;
    }>;
    /**
     * Get chat statistics for a user
     */
    getChatStats(userId: string): Promise<{
        totalSessions: number;
        totalMessages: number;
        totalTokens: number;
        averageTokensPerMessage: number;
    }>;
    /**
     * Get user's daily usage and cost data
     */
    getDailyUsage(userId: string): Promise<{
        userId: string;
        date: Date;
        id: string;
        createdAt: Date;
        errorCount: number;
        totalRequests: number;
        totalTokens: number;
        totalCost: number;
        avgResponseTime: number;
    } | {
        userId: string;
        date: Date;
        totalRequests: number;
        totalTokens: number;
        totalCost: number;
        avgResponseTime: number;
        errorCount: number;
    } | null>;
    /**
     * Get user's weekly usage and cost data
     */
    getWeeklyUsage(userId: string): Promise<{
        period: {
            startDate: Date;
            endDate: Date;
            days: number;
        };
        dailyBreakdown: {
            userId: string;
            date: Date;
            id: string;
            createdAt: Date;
            errorCount: number;
            totalRequests: number;
            totalTokens: number;
            totalCost: number;
            avgResponseTime: number;
        }[];
        totals: {
            avgResponseTime: number;
            totalRequests: number;
            totalTokens: number;
            totalCost: number;
            errorCount: number;
        };
    } | null>;
    /**
     * Get user's monthly usage and cost data
     */
    getMonthlyUsage(userId: string): Promise<{
        period: {
            startDate: Date;
            endDate: Date;
            days: number;
        };
        dailyBreakdown: {
            userId: string;
            date: Date;
            id: string;
            createdAt: Date;
            errorCount: number;
            totalRequests: number;
            totalTokens: number;
            totalCost: number;
            avgResponseTime: number;
        }[];
        totals: {
            avgResponseTime: number;
            totalRequests: number;
            totalTokens: number;
            totalCost: number;
            errorCount: number;
        };
    } | null>;
    /**
     * Get user's cost analysis across different periods
     */
    getCostAnalysis(userId: string): Promise<{
        today: {
            cost: number;
            requests: number;
            tokens: number;
        };
        weekly: {
            cost: number;
            requests: number;
            tokens: number;
        };
        monthly: {
            cost: number;
            requests: number;
            tokens: number;
        };
    } | null>;
}
export declare const chatService: ChatService;
export default chatService;
//# sourceMappingURL=chat.service.d.ts.map