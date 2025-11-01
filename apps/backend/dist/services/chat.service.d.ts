export declare class ChatService {
    /**
     * Create or get a chat session
     */
    getOrCreateSession(userId: string, applicationId?: string): Promise<string>;
    /**
     * Send a message and get AI response
     */
    sendMessage(userId: string, content: string, applicationId?: string, conversationHistory?: any[]): Promise<{
        message: any;
        sources: any;
        tokens_used: any;
        model: any;
        id: string;
    } | {
        message: string;
        sources: never[];
        tokens_used: number;
        model: string;
        id?: undefined;
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
        sessionId: string;
        role: string;
        feedback: string | null;
    }[]>;
    /**
     * Get user's chat sessions
     */
    getUserSessions(userId: string): Promise<({
        messages: {
            id: string;
            model: string;
            responseTime: number | null;
            sources: string | null;
            tokensUsed: number;
            content: string;
            createdAt: Date;
            userId: string;
            sessionId: string;
            role: string;
            feedback: string | null;
        }[];
    } & {
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        applicationId: string | null;
        systemPrompt: string;
    })[]>;
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
        sessionId: string;
        role: string;
        feedback: string | null;
    }>;
    /**
     * Delete a chat session
     */
    deleteSession(sessionId: string): Promise<{
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        applicationId: string | null;
        systemPrompt: string;
    }>;
    /**
     * Search documents in knowledge base
     */
    searchDocuments(query: string): Promise<any>;
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