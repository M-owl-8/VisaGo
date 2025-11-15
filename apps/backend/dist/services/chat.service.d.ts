/**
 * Chat service
 * Handles AI-powered chat functionality with RAG context
 */
export declare class ChatService {
    /**
     * Create or get a chat session
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
        message: any;
        sources: any;
        tokens_used: any;
        model: any;
        id: string;
        applicationContext: {
            country: string;
            visaType: string;
            processingDays: number;
            fee: number;
            requiredDocuments: any;
            documentsCollected: number;
            totalDocuments: number;
            applicationStatus: string;
        } | null;
    } | {
        message: string;
        sources: never[];
        tokens_used: number;
        model: string;
        id?: undefined;
        applicationContext?: undefined;
    }>;
    /**
     * Get conversation history
     */
    getConversationHistory(userIdOrSessionId: string, applicationId?: string, limit?: number, offset?: number): Promise<{
        model: string;
        userId: string;
        id: string;
        responseTime: number | null;
        sources: string | null;
        tokensUsed: number;
        content: string;
        createdAt: Date;
        role: string;
        sessionId: string;
        feedback: string | null;
    }[]>;
    /**
     * Get user's chat sessions with pagination
     */
    getUserSessions(userId: string, limit?: number, offset?: number): Promise<{
        sessions: ({
            messages: {
                content: string;
                createdAt: Date;
                role: string;
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
     * Get session details
     */
    getSessionDetails(sessionId: string, userId: string): Promise<{
        messages: {
            model: string;
            id: string;
            responseTime: number | null;
            sources: string | null;
            tokensUsed: number;
            content: string;
            createdAt: Date;
            role: string;
            feedback: string | null;
        }[];
    } & {
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
        id: string;
        responseTime: number | null;
        sources: string | null;
        tokensUsed: number;
        content: string;
        createdAt: Date;
        role: string;
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
    addMessageFeedback(messageId: string, userId: string, feedback: "thumbs_up" | "thumbs_down" | string): Promise<{
        model: string;
        userId: string;
        id: string;
        responseTime: number | null;
        sources: string | null;
        tokensUsed: number;
        content: string;
        createdAt: Date;
        role: string;
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
        id: string;
        createdAt: Date;
        date: Date;
        totalRequests: number;
        totalTokens: number;
        totalCost: number;
        avgResponseTime: number;
        errorCount: number;
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
            id: string;
            createdAt: Date;
            date: Date;
            totalRequests: number;
            totalTokens: number;
            totalCost: number;
            avgResponseTime: number;
            errorCount: number;
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
            id: string;
            createdAt: Date;
            date: Date;
            totalRequests: number;
            totalTokens: number;
            totalCost: number;
            avgResponseTime: number;
            errorCount: number;
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