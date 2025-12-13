import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
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
    role: 'user' | 'assistant';
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
    static readonly MODEL: string;
    static readonly CHECKLIST_MODEL: string;
    private static readonly MAX_TOKENS;
    /**
     * Resolve model for task using registry (with fallback to defaults)
     */
    private static resolveModelForTask;
    /**
     * Record AI interaction for training data pipeline
     * Called after GPT-4 API calls to store request/response for export
     */
    private static recordAIInteraction;
    /**
     * Get OpenAI client (for internal use)
     */
    static getOpenAIClient(): OpenAI;
    /**
     * Get checklist model with fallback hierarchy:
     * 1. OPENAI_MODEL_CHECKLIST env var (if set)
     * 2. gpt-4o (default)
     * 3. gpt-4.1 (fallback if gpt-4o fails)
     *
     * NEVER falls back to gpt-4o-mini for checklist generation
     */
    static getChecklistModel(): string;
    /**
     * Call OpenAI API with checklist model and fallback logic
     * Tries: OPENAI_MODEL_CHECKLIST → gpt-4o → gpt-4.1
     */
    private static callChecklistAPI;
    private static readonly PRICING;
    /**
     * Initialize OpenAI service
     */
    static initialize(prisma: PrismaClient): void;
    /**
     * Check if OpenAI service is initialized
     */
    static isInitialized(): boolean;
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
     * Check if hybrid checklist generation is enabled for this country+visa type
     * Hybrid mode: Rule engine decides documents, GPT-4 only enriches
     * Legacy mode: GPT-4 decides everything (old behavior)
     */
    private static isHybridChecklistEnabled;
    /**
     * Build system prompt for hybrid mode
     * GPT-4 is NOT allowed to add or remove documents, only enrich with descriptions
     */
    private static buildHybridSystemPrompt;
    /**
     * Build user prompt for hybrid mode
     * Includes base checklist and context
     */
    private static buildHybridUserPrompt;
    /**
     * Parse hybrid response from GPT-4
     */
    private static parseHybridResponse;
    /**
     * Validate hybrid response matches base checklist
     */
    private static validateHybridResponse;
    /**
     * Correct hybrid response to match base checklist
     * Removes extras, adds missing, fixes category/required
     */
    private static correctHybridResponse;
    /**
     * Infer priority from category
     */
    private static inferPriorityFromCategory;
    /**
     * Get basic document name/description from knowledge base for fallback
     */
    private static getDocumentNameFromKB;
    /**
     * Generate document checklist for visa application
     * Enhanced with visa knowledge base and document guides
     *
     * FULL HYBRID COVERAGE for 8 countries × visa types:
     * - USA: student, tourist
     * - Canada: student, tourist
     * - UK: student, tourist
     * - Australia: student, tourist
     * - Spain: tourist (Schengen)
     * - Germany: tourist (Schengen)
     * - Japan: tourist
     * - UAE: tourist
     *
     * HYBRID MODE (if rule set exists):
     * - Rule engine decides which documents to include (base + conditional + risk-based)
     * - GPT-4 only enriches with names, descriptions, whereToObtain (EN/UZ/RU)
     * - Retry logic: up to 2 attempts if GPT fails
     * - Severe safety fallback: if GPT fails twice, build minimal checklist from rules only
     * - Strict validation: ensures no document hallucinations, exact match with rule set
     *
     * LEGACY MODE (if no rule set):
     * - GPT-4 decides everything (original behavior)
     * - Only used for unsupported future countries
     */
    static generateChecklist(userContext: any, country: string, visaType: string): Promise<{
        checklist: Array<{
            document: string;
            name?: string;
            nameUz?: string;
            nameRu?: string;
            category: 'required' | 'highly_recommended' | 'optional';
            required: boolean;
            description?: string;
            descriptionUz?: string;
            descriptionRu?: string;
            priority?: 'high' | 'medium' | 'low';
            whereToObtain?: string;
            whereToObtainUz?: string;
            whereToObtainRu?: string;
        }>;
        type: string;
    }>;
    /**
     * Extract JSON from OpenAI response
     * Handles cases where JSON is wrapped in markdown code fences or has extra text
     */
    private static extractJson;
    /**
     * Track AI usage for billing
     */
    static trackUsage(userId: string, tokensUsed: number, cost: number): Promise<void>;
    /**
     * Generate checklist using legacy mode (GPT-4 structured output)
     * Used when no VisaRuleSet exists for the country/visa type
     *
     * @param application - Application object with country and visaType
     * @param aiUserContext - AI user context with questionnaire data
     * @returns Checklist response with items array
     */
    static generateChecklistLegacy(application: {
        country: {
            code: string;
            name: string;
        };
        visaType: {
            name: string;
        };
    }, aiUserContext: any): Promise<{
        checklist: Array<{
            document: string;
            name?: string;
            nameUz?: string;
            nameRu?: string;
            category: 'required' | 'highly_recommended' | 'optional';
            required: boolean;
            description?: string;
            descriptionUz?: string;
            descriptionRu?: string;
            priority?: 'high' | 'medium' | 'low';
            whereToObtain?: string;
            whereToObtainUz?: string;
            whereToObtainRu?: string;
        }>;
        type: string;
    }>;
    /**
     * Build compact legacy system prompt (COMPACT VERSION)
     */
    private static buildLegacySystemPromptCompact;
    /**
     * Build compact legacy user prompt using CanonicalAIUserContext (COMPACT VERSION)
     */
    private static buildLegacyUserPromptCompact;
    /**
     * OLD LEGACY SYSTEM PROMPT (kept for reference/rollback)
     */
    private static buildLegacySystemPromptLegacy;
    /**
     * OLD LEGACY USER PROMPT (kept for reference/rollback)
     */
    private static buildLegacyUserPromptLegacy;
}
export default AIOpenAIService;
//# sourceMappingURL=ai-openai.service.d.ts.map