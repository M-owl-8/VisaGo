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
        id: string;
        model: string;
        responseTime: number | null;
        sources: string | null;
        tokensUsed: number;
        content: string;
        createdAt: Date;
        userId: string;
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
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
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
            id: string;
            model: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        applicationId: string | null;
        systemPrompt: string;
    }>;
    /**
     * Rename a chat session
     */
    renameSession(sessionId: string, userId: string, newTitle: string): Promise<{
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        applicationId: string | null;
        systemPrompt: string;
    }>;
    /**
     * Add feedback to a message
     */
    addFeedback(messageId: string, feedback: string): Promise<{
        id: string;
        model: string;
        responseTime: number | null;
        sources: string | null;
        tokensUsed: number;
        content: string;
        createdAt: Date;
        userId: string;
        role: string;
        sessionId: string;
        feedback: string | null;
    }>;
    /**
     * Delete a chat session
     */
    deleteSession(sessionId: string): Promise<{
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        applicationId: string | null;
        systemPrompt: string;
    }>;
    /**
     * Search documents in knowledge base with filters
     */
    searchDocuments(query: string, country?: string, visaType?: string, limit?: number): Promise<any>;
    /**
     * Add feedback to a message (thumbs up/down or detailed feedback)
     */
    addMessageFeedback(messageId: string, userId: string, feedback: "thumbs_up" | "thumbs_down" | string): Promise<{
        id: string;
        model: string;
        responseTime: number | null;
        sources: string | null;
        tokensUsed: number;
        content: string;
        createdAt: Date;
        userId: string;
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
}
export declare const chatService: ChatService;
export default chatService;
//# sourceMappingURL=chat.service.d.ts.map