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

export class AIOpenAIService {
  private static openai: OpenAI;
  private static prisma: PrismaClient;
  private static readonly MODEL = process.env.OPENAI_MODEL || 'gpt-4';
  private static readonly MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || '2000');

  // Pricing per 1K tokens (as of 2024)
  private static readonly PRICING = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };

  /**
   * Initialize OpenAI service
   */
  static initialize(prisma: PrismaClient): void {
    if (!AIOpenAIService.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      AIOpenAIService.openai = new OpenAI({ apiKey });
      AIOpenAIService.prisma = prisma;
    }
  }

  /**
   * Check if OpenAI service is initialized
   */
  static isInitialized(): boolean {
    return !!AIOpenAIService.openai && !!AIOpenAIService.prisma;
  }

  /**
   * Chat with AI (direct call without RAG)
   */
  static async chat(messages: ChatMessage[], systemPrompt?: string): Promise<AIResponse> {
    // Check if service is initialized
    if (!AIOpenAIService.isInitialized()) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'
        );
      }
      // Try to initialize if not already done - import Prisma from db module
      if (!AIOpenAIService.prisma) {
        // Lazy import to avoid circular dependencies
        const { default: db } = await import('../db');
        AIOpenAIService.prisma = db;
      }
      AIOpenAIService.initialize(AIOpenAIService.prisma);
    }

    const startTime = Date.now();

    try {
      const systemMessage = systemPrompt || this.getDefaultSystemPrompt();

      if (!AIOpenAIService.openai) {
        throw new Error('OpenAI client not initialized');
      }

      const response = await AIOpenAIService.openai.chat.completions.create({
        model: this.MODEL,
        messages: [{ role: 'system', content: systemMessage }, ...messages],
        max_tokens: this.MAX_TOKENS,
        temperature: 0.7,
      });

      const responseTime = Date.now() - startTime;
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const cost = this.calculateCost(inputTokens, outputTokens);

      return {
        message: response.choices[0]?.message?.content || '',
        tokensUsed: inputTokens + outputTokens,
        cost,
        model: this.MODEL,
        responseTime,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);

      // Provide user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('AI service is busy. Please try again in a moment.');
        }
        if (error.message.includes('timeout') || error.message.includes('ECONNABORTED')) {
          throw new Error('AI service request timed out. Please try again.');
        }
        if (error.message.includes('API key') || error.message.includes('401')) {
          throw new Error('AI service configuration error. Please contact support.');
        }
      }

      throw new Error('AI service temporarily unavailable. Please try again later.');
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
    // Check if service is initialized
    if (!AIOpenAIService.isInitialized()) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'
        );
      }
      // Try to initialize if not already done - import Prisma from db module
      if (!AIOpenAIService.prisma) {
        // Lazy import to avoid circular dependencies
        const { default: db } = await import('../db');
        AIOpenAIService.prisma = db;
      }
      AIOpenAIService.initialize(AIOpenAIService.prisma);
    }

    const startTime = Date.now();

    try {
      // Extract last user message for RAG search
      const lastUserMessage = messages[messages.length - 1];
      if (!lastUserMessage || lastUserMessage.role !== 'user') {
        throw new Error('Last message must be from user');
      }

      // Search knowledge base for relevant documents
      const ragSources = await this.searchKnowledgeBase(lastUserMessage.content);

      // Build context from RAG sources
      let ragContext = '';
      if (ragSources.length > 0) {
        ragContext = '\n\nRelevant information from knowledge base:\n';
        ragSources.forEach((source, index) => {
          ragContext += `\n${index + 1}. ${source.title} (${(source.relevanceScore * 100).toFixed(0)}% relevant)\n`;
          ragContext += `${source.content}\n`;
        });
      }

      // Build system prompt with RAG context
      const systemMessage = `${systemPrompt || this.getDefaultSystemPrompt()}${ragContext}

When answering questions, cite the sources from the knowledge base when relevant.`;

      // Call GPT-4
      if (!AIOpenAIService.openai) {
        throw new Error('OpenAI client not initialized');
      }

      const response = await AIOpenAIService.openai.chat.completions.create({
        model: this.MODEL,
        messages: [{ role: 'system', content: systemMessage }, ...messages],
        max_tokens: this.MAX_TOKENS,
        temperature: 0.7,
      });

      const responseTime = Date.now() - startTime;
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const cost = this.calculateCost(inputTokens, outputTokens);

      return {
        message: response.choices[0]?.message?.content || '',
        sources: ragSources,
        tokensUsed: inputTokens + outputTokens,
        cost,
        model: this.MODEL,
        responseTime,
      };
    } catch (error) {
      console.error('RAG chat error:', error);
      throw error;
    }
  }

  /**
   * Search knowledge base for relevant documents
   */
  private static async searchKnowledgeBase(query: string): Promise<RAGSource[]> {
    try {
      if (!AIOpenAIService.prisma) {
        console.warn('Prisma not initialized, skipping knowledge base search');
        return [];
      }

      // Text-based search with relevance scoring
      // Note: Vector similarity search can be implemented using OpenAI embeddings + vector DB (Pinecone/Weaviate)
      // For now, using Prisma full-text search with basic relevance scoring
      // SQLite doesn't support case-insensitive mode, so we'll do case-insensitive matching in JavaScript
      const queryLower = query.toLowerCase();
      const documents = await AIOpenAIService.prisma.document.findMany({
        where: {
          isPublished: true,
          OR: [{ title: { contains: query } }, { content: { contains: query } }],
        },
        take: 10, // Get more to filter case-insensitively
      });

      // Calculate basic relevance score based on query match (case-insensitive)
      const filteredDocs = documents
        .map((doc: any) => {
          const titleLower = doc.title.toLowerCase();
          const contentLower = doc.content.toLowerCase();
          const titleMatch = titleLower.includes(queryLower);
          const contentMatch = contentLower.includes(queryLower);

          // Simple relevance: title matches are more relevant than content matches
          const relevanceScore = titleMatch ? 0.9 : contentMatch ? 0.7 : 0.5;

          return {
            documentId: doc.id,
            title: doc.title,
            content: doc.content.substring(0, 500), // First 500 chars
            relevanceScore,
            url: `/api/documents/${doc.id}`,
            _match: titleMatch || contentMatch, // Track if it matches
          };
        })
        .filter((doc: any) => doc._match) // Only include matching documents
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore) // Sort by relevance
        .slice(0, 5) // Take top 5
        .map(({ _match, ...doc }: any) => doc); // Remove _match field

      return filteredDocs;
    } catch (error) {
      console.error('Knowledge base search error:', error);
      return [];
    }
  }

  /**
   * Generate embeddings for documents (for vector search)
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await AIOpenAIService.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
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

    if (message.includes('visa') && message.includes('time')) {
      return 'Most visa applications take 5-15 business days to process, depending on the country and visa type. Please check the specific requirements for your destination country.';
    }

    if (message.includes('document') || message.includes('paper')) {
      return 'The required documents typically include: passport, completed application form, proof of funds, and country-specific documents. Please check your visa application checklist.';
    }

    if (message.includes('fee') || message.includes('cost')) {
      return 'Visa fees vary by country and type. Please check your specific visa type in the application for the exact fee.';
    }

    return 'Thank you for your question. For detailed information, please check the documentation in your visa application or contact support.';
  }

  /**
   * Generate document checklist for visa application
   */
  static async generateChecklist(
    userContext: any,
    country: string,
    visaType: string
  ): Promise<{
    checklist: Array<{ document: string; required: boolean; description?: string }>;
    type: string;
  }> {
    try {
      const systemPrompt = `You are a visa application assistant. Generate a comprehensive document checklist for a ${visaType} visa application to ${country}.

Based on the user's context, create a detailed checklist of all required and optional documents. Format your response as a JSON object with this structure:
{
  "type": "${visaType}",
  "checklist": [
    {
      "document": "Document name",
      "required": true/false,
      "description": "Brief description of what this document is and why it's needed"
    }
  ]
}

Include all standard documents for this visa type, plus any specific documents based on the user's profile.`;

      const userPrompt = `Generate a document checklist for:
- Country: ${country}
- Visa Type: ${visaType}
- User Context: ${JSON.stringify(userContext, null, 2)}

Provide a complete checklist with all required documents.`;

      const response = await AIOpenAIService.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent checklist generation
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      // Ensure the response has the correct structure
      if (!parsed.checklist || !Array.isArray(parsed.checklist)) {
        throw new Error('Invalid checklist format from AI');
      }

      return {
        type: parsed.type || visaType,
        checklist: parsed.checklist,
      };
    } catch (error) {
      console.error('Checklist generation error:', error);
      // Return a basic fallback checklist
      return {
        type: visaType,
        checklist: [
          {
            document: 'Passport',
            required: true,
            description: 'Valid passport with at least 6 months validity',
          },
          {
            document: 'Visa Application Form',
            required: true,
            description: 'Completed and signed visa application form',
          },
          {
            document: 'Passport Photos',
            required: true,
            description: 'Recent passport-sized photographs',
          },
          {
            document: 'Travel Itinerary',
            required: false,
            description: 'Flight bookings and travel plans',
          },
          {
            document: 'Accommodation Proof',
            required: false,
            description: 'Hotel reservations or accommodation details',
          },
          {
            document: 'Financial Proof',
            required: true,
            description: 'Bank statements or proof of sufficient funds',
          },
        ],
      };
    }
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
      console.error('Failed to track AI usage:', error);
    }
  }
}

export default AIOpenAIService;
