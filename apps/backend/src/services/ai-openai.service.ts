import OpenAI from "openai";
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

export class AIOpenAIService {
  private static openai: OpenAI;
  private static prisma: PrismaClient;
  private static readonly MODEL = process.env.OPENAI_MODEL || "gpt-4";
  private static readonly MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || "2000");

  // Pricing per 1K tokens (as of 2024)
  private static readonly PRICING = {
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  };

  /**
   * Initialize OpenAI service
   */
  static initialize(prisma: PrismaClient): void {
    if (!AIOpenAIService.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY not configured");
      }
      AIOpenAIService.openai = new OpenAI({ apiKey });
      AIOpenAIService.prisma = prisma;
    }
  }

  /**
   * Chat with AI (direct call without RAG)
   */
  static async chat(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const systemMessage = systemPrompt || this.getDefaultSystemPrompt();

      const response = await AIOpenAIService.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: "system", content: systemMessage },
          ...messages,
        ],
        max_tokens: this.MAX_TOKENS,
        temperature: 0.7,
      });

      const responseTime = Date.now() - startTime;
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const cost = this.calculateCost(inputTokens, outputTokens);

      return {
        message: response.choices[0]?.message?.content || "",
        tokensUsed: inputTokens + outputTokens,
        cost,
        model: this.MODEL,
        responseTime,
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw error;
    }
  }

  /**
   * Chat with RAG (searches knowledge base before responding)
   */
  static async chatWithRAG(
    messages: ChatMessage[],
    userId: string,
    applicationId?: string,
    systemPrompt?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Extract last user message for RAG search
      const lastUserMessage = messages[messages.length - 1];
      if (!lastUserMessage || lastUserMessage.role !== "user") {
        throw new Error("Last message must be from user");
      }

      // Search knowledge base for relevant documents
      const ragSources = await this.searchKnowledgeBase(lastUserMessage.content);

      // Build context from RAG sources
      let ragContext = "";
      if (ragSources.length > 0) {
        ragContext = "\n\nRelevant information from knowledge base:\n";
        ragSources.forEach((source, index) => {
          ragContext += `\n${index + 1}. ${source.title} (${(source.relevanceScore * 100).toFixed(0)}% relevant)\n`;
          ragContext += `${source.content}\n`;
        });
      }

      // Build system prompt with RAG context
      const systemMessage = `${
        systemPrompt || this.getDefaultSystemPrompt()
      }${ragContext}

When answering questions, cite the sources from the knowledge base when relevant.`;

      // Call GPT-4
      const response = await AIOpenAIService.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: "system", content: systemMessage },
          ...messages,
        ],
        max_tokens: this.MAX_TOKENS,
        temperature: 0.7,
      });

      const responseTime = Date.now() - startTime;
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const cost = this.calculateCost(inputTokens, outputTokens);

      return {
        message: response.choices[0]?.message?.content || "",
        sources: ragSources,
        tokensUsed: inputTokens + outputTokens,
        cost,
        model: this.MODEL,
        responseTime,
      };
    } catch (error) {
      console.error("RAG chat error:", error);
      throw error;
    }
  }

  /**
   * Search knowledge base for relevant documents
   */
  private static async searchKnowledgeBase(query: string): Promise<RAGSource[]> {
    try {
      // Simple text search for now
      // TODO: Implement vector similarity search using embeddings
      const documents = await AIOpenAIService.prisma.document.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 5,
      });

      return documents.map((doc) => ({
        documentId: doc.id,
        title: doc.title,
        content: doc.content.substring(0, 500), // First 500 chars
        relevanceScore: 0.8, // TODO: Calculate actual relevance score
        url: `/api/documents/${doc.id}`,
      }));
    } catch (error) {
      console.error("Knowledge base search error:", error);
      return [];
    }
  }

  /**
   * Generate embeddings for documents (for vector search)
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await AIOpenAIService.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Embedding generation error:", error);
      throw error;
    }
  }

  /**
   * Get default system prompt
   */
  private static getDefaultSystemPrompt(): string {
    return `You are a helpful visa application assistant for VisaBuddy. 
Your role is to:
1. Provide accurate information about visa requirements and application processes
2. Help users understand document requirements for different visa types
3. Answer questions about visa processing times and fees
4. Guide users through the application process
5. Be professional, clear, and concise in your responses

Always provide accurate information and cite sources when available.
If you don't know something, say so clearly and suggest how to find the information.`;
  }

  /**
   * Calculate API cost
   */
  private static calculateCost(inputTokens: number, outputTokens: number): number {
    const pricing = this.PRICING[this.MODEL as keyof typeof this.PRICING] || {
      input: 0.03,
      output: 0.06,
    };

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Fallback response when API fails
   */
  static getFallbackResponse(userMessage: string): string {
    // Basic responses without AI
    const message = userMessage.toLowerCase();

    if (message.includes("visa") && message.includes("time")) {
      return "Most visa applications take 5-15 business days to process, depending on the country and visa type. Please check the specific requirements for your destination country.";
    }

    if (message.includes("document") || message.includes("paper")) {
      return "The required documents typically include: passport, completed application form, proof of funds, and country-specific documents. Please check your visa application checklist.";
    }

    if (message.includes("fee") || message.includes("cost")) {
      return "Visa fees vary by country and type. Please check your specific visa type in the application for the exact fee.";
    }

    return "Thank you for your question. For detailed information, please check the documentation in your visa application or contact support.";
  }

  /**
   * Track AI usage for billing
   */
  static async trackUsage(userId: string, tokensUsed: number, cost: number): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await AIOpenAIService.prisma.aIUsageMetrics.upsert({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        update: {
          totalRequests: { increment: 1 },
          totalTokens: { increment: tokensUsed },
          totalCost: { increment: cost },
        },
        create: {
          userId,
          date: today,
          totalRequests: 1,
          totalTokens: tokensUsed,
          totalCost: cost,
        },
      });
    } catch (error) {
      console.error("Failed to track AI usage:", error);
    }
  }
}

export default AIOpenAIService;