import { PrismaClient } from "@prisma/client";
/**
 * OpenAI + RAG Service
 * Handles GPT-4 API calls and Retrieval-Augmented Generation (RAG)
 *
 * Features:
 * - Direct GPT-4 responses
 * - RAG: Searches knowledge base before responding
 * - Token counting and cost tracking
 * - Error handling with fallback responses
 */
export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}
export interface RAGSource {
    documentId: string;
    title: string;
    content: string;
    relevanceScore: number;
    url?: string;
}
export interface AIResponse {
    message: string;
    sources?: RAGSource[];
    tokensUsed: number;
    cost: number;
    model: string;
    responseTime: number;
}
export declare class AIOpenAIService {
    private static openai;
    private static prisma;
    private static readonly MODEL;
    private static readonly MAX_TOKENS;
    private static readonly PRICING;
    /**
     * Initialize OpenAI service
     */
    static initialize(prisma: PrismaClient): void;
    /**
     * Chat with AI (direct call without RAG)
     */
    static chat(messages: ChatMessage[], systemPrompt?: string): Promise<AIResponse>;
    /**
     * Chat with RAG (searches knowledge base before responding)
     */
    static chatWithRAG(messages: ChatMessage[], userId: string, applicationId?: string, systemPrompt?: string): Promise<AIResponse>;
    /**
     * Search knowledge base for relevant documents
     */
    private static searchKnowledgeBase;
    /**
     * Generate embeddings for documents (for vector search)
     */
    static generateEmbedding(text: string): Promise<number[]>;
    /**
     * Get default system prompt
     */
    private static getDefaultSystemPrompt;
    /**
     * Calculate API cost
     */
    private static calculateCost;
    /**
     * Fallback response when API fails
     */
    static getFallbackResponse(userMessage: string): string;
    /**
     * Generate document checklist for visa application
     */
    static generateChecklist(userContext: any, country: string, visaType: string): Promise<{
        checklist: Array<{
            document: string;
            required: boolean;
            description?: string;
        }>;
        type: string;
    }>;
    /**
     * Track AI usage for billing
     */
    static trackUsage(userId: string, tokensUsed: number, cost: number): Promise<void>;
}
export default AIOpenAIService;
//# sourceMappingURL=ai-openai.service.d.ts.map