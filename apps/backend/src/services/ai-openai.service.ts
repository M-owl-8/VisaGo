import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';

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
  // Use gpt-4o-mini for checklist generation and document validation
  public static readonly MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  private static readonly MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || '2000');

  /**
   * Get OpenAI client (for internal use)
   */
  static getOpenAIClient(): OpenAI {
    if (!AIOpenAIService.openai) {
      throw new Error('OpenAI service not initialized. Call initialize() first.');
    }
    return AIOpenAIService.openai;
  }

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
        logError(
          '[OPENAI_CONFIG_ERROR] OPENAI_API_KEY not configured',
          new Error('Missing OPENAI_API_KEY'),
          {
            model: AIOpenAIService.MODEL,
          }
        );
        throw new Error('OPENAI_API_KEY not configured');
      }
      AIOpenAIService.openai = new OpenAI({
        apiKey,
        timeout: 60000, // 60 second timeout
      });
      AIOpenAIService.prisma = prisma;
      logInfo('[OpenAI] Service initialized', {
        model: AIOpenAIService.MODEL,
        maxTokens: AIOpenAIService.MAX_TOKENS,
        hasApiKey: !!apiKey,
      });
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

      const aiMessage = response.choices[0]?.message?.content || '';

      if (!aiMessage) {
        console.error('[AIOpenAIService] Empty response from OpenAI:', {
          choices: response.choices,
          model: this.MODEL,
        });
        throw new Error('Received empty response from AI service');
      }

      return {
        message: aiMessage,
        tokensUsed: inputTokens + outputTokens,
        cost,
        model: this.MODEL,
        responseTime,
      };
    } catch (error: any) {
      const errorType = error?.type || 'unknown';
      const statusCode = error?.status || error?.response?.status;
      const errorMessage = error?.message || String(error);

      logError(
        '[OpenAI_API_ERROR] Chat completion failed',
        error instanceof Error ? error : new Error(errorMessage),
        {
          model: this.MODEL,
          errorType,
          statusCode,
          errorMessage,
        }
      );

      // Provide user-friendly error message
      if (error instanceof Error) {
        if (
          error.message.includes('rate limit') ||
          error.message.includes('429') ||
          statusCode === 429
        ) {
          throw new Error('AI service is busy. Please try again in a moment.');
        }
        if (error.message.includes('timeout') || error.message.includes('ECONNABORTED')) {
          throw new Error('AI service request timed out. Please try again.');
        }
        if (
          error.message.includes('API key') ||
          error.message.includes('401') ||
          statusCode === 401
        ) {
          logError('[OPENAI_CONFIG_ERROR] Invalid API key', error, { model: this.MODEL });
          throw new Error('AI service configuration error. Please contact support.');
        }
        if (
          error.message.includes('quota') ||
          error.message.includes('insufficient_quota') ||
          statusCode === 429
        ) {
          logError('[OPENAI_QUOTA_ERROR] Quota exceeded', error, { model: this.MODEL });
          throw new Error('AI service quota exceeded. Please try again later.');
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

      const aiMessage = response.choices[0]?.message?.content || '';

      if (!aiMessage) {
        console.error('[AIOpenAIService] Empty response from OpenAI (RAG):', {
          choices: response.choices,
          model: this.MODEL,
        });
        throw new Error('Received empty response from AI service');
      }

      return {
        message: aiMessage,
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
   * Enhanced with visa knowledge base and document guides
   */
  static async generateChecklist(
    userContext: any,
    country: string,
    visaType: string
  ): Promise<{
    checklist: Array<{
      document: string;
      name?: string;
      nameUz?: string;
      nameRu?: string;
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
  }> {
    try {
      // Import visa knowledge base and document guides
      const { getVisaKnowledgeBase } = await import('../data/visaKnowledgeBase');
      const { getRelevantDocumentGuides } = await import('../data/documentGuides');

      // Get visa knowledge base for the country and visa type
      const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');

      // Get relevant document guides based on user context
      const userQuery = JSON.stringify(userContext);
      const documentGuidesText = getRelevantDocumentGuides(userQuery, 5);

      const systemPrompt = `You are a visa application assistant for Ketdik. Generate a comprehensive, multilingual document checklist for a ${visaType} visa application to ${country}.

CRITICAL REQUIREMENTS:
1. You MUST return a JSON object with this EXACT structure:
{
  "type": "${visaType}",
  "checklist": [
    {
      "document": "English document name (internal key)",
      "name": "English display name",
      "nameUz": "Uzbek display name",
      "nameRu": "Russian display name",
      "required": true/false,
      "description": "English description",
      "descriptionUz": "Uzbek description",
      "descriptionRu": "Russian description",
      "priority": "high" | "medium" | "low",
      "whereToObtain": "English instructions on where to get this document in Uzbekistan",
      "whereToObtainUz": "Uzbek instructions on where to get this document in Uzbekistan",
      "whereToObtainRu": "Russian instructions on where to get this document in Uzbekistan"
    }
  ]
}

2. ALL fields (name, nameUz, nameRu, description, descriptionUz, descriptionRu, whereToObtain, whereToObtainUz, whereToObtainRu) MUST be provided for each checklist item.

3. Use the visa knowledge base and document guides provided below to ensure accuracy.

4. Priority levels:
   - "high": Essential documents that are always required (passport, application form, etc.)
   - "medium": Important documents that are usually required (bank statements, accommodation proof, etc.)
   - "low": Optional but recommended documents (travel insurance, flight bookings, etc.)

5. For "whereToObtain" fields, provide specific, practical instructions for obtaining each document in Uzbekistan, using the document guides provided.

VISA KNOWLEDGE BASE FOR ${country} ${visaType.toUpperCase()} VISA:
${visaKb || 'No specific knowledge base available for this country/visa type.'}

DOCUMENT GUIDES (How to obtain documents in Uzbekistan):
${documentGuidesText || 'No specific document guides available.'}

USER CONTEXT:
${JSON.stringify(userContext, null, 2)}

Based on the user's context, visa knowledge base, and document guides, create a complete, accurate checklist with all required and optional documents. Ensure all multilingual fields are properly filled.`;

      const userPrompt = `Generate a complete document checklist for:
- Country: ${country}
- Visa Type: ${visaType}
- User Context: ${JSON.stringify(userContext, null, 2)}

Provide a comprehensive checklist with all required documents, including multilingual names, descriptions, and instructions on where to obtain each document in Uzbekistan.`;

      logInfo('[OpenAI][Checklist] Generating checklist', {
        model: this.MODEL,
        country,
        visaType,
        hasVisaKb: !!visaKb,
        hasDocumentGuides: !!documentGuidesText && documentGuidesText.length > 0,
      });

      const startTime = Date.now();
      const response = await AIOpenAIService.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.2, // Very low temperature for deterministic, consistent checklist generation
        response_format: { type: 'json_object' },
      });

      const responseTime = Date.now() - startTime;
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const totalTokens = inputTokens + outputTokens;

      logInfo('[OpenAI][Checklist] Checklist generated', {
        model: this.MODEL,
        country,
        visaType,
        tokensUsed: totalTokens,
        inputTokens,
        outputTokens,
        responseTimeMs: responseTime,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      // Ensure the response has the correct structure
      if (!parsed.checklist || !Array.isArray(parsed.checklist)) {
        throw new Error('Invalid checklist format from AI');
      }

      // Validate and enrich checklist items
      const enrichedChecklist = parsed.checklist.map((item: any) => ({
        document: item.document || item.name || 'Unknown',
        name: item.name || item.document || 'Unknown',
        nameUz: item.nameUz || item.name || item.document || "Noma'lum",
        nameRu: item.nameRu || item.name || item.document || 'Неизвестно',
        required: item.required !== undefined ? item.required : true,
        description: item.description || '',
        descriptionUz: item.descriptionUz || item.description || '',
        descriptionRu: item.descriptionRu || item.description || '',
        priority: item.priority || (item.required ? 'high' : 'medium'),
        whereToObtain: item.whereToObtain || '',
        whereToObtainUz: item.whereToObtainUz || item.whereToObtain || '',
        whereToObtainRu: item.whereToObtainRu || item.whereToObtain || '',
      }));

      return {
        type: parsed.type || visaType,
        checklist: enrichedChecklist,
      };
    } catch (error: any) {
      logError(
        '[OpenAI][Checklist] Checklist generation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          model: this.MODEL,
          country,
          visaType,
          errorType: error?.type || 'unknown',
          statusCode: error?.status || error?.response?.status,
          errorMessage: error?.message || String(error),
        }
      );

      // Return a basic fallback checklist with multilingual support
      return {
        type: visaType,
        checklist: [
          {
            document: 'passport',
            name: 'Passport',
            nameUz: 'Pasport',
            nameRu: 'Паспорт',
            required: true,
            description: 'Valid passport with at least 6 months validity',
            descriptionUz: 'Kamida 6 oy muddati qolgan yaroqli pasport',
            descriptionRu: 'Действительный паспорт со сроком действия не менее 6 месяцев',
            priority: 'high',
            whereToObtain: 'Apply at migration service or internal affairs office',
            whereToObtainUz: 'Migratsiya xizmatiga yoki Ichki ishlar organlariga murojaat qiling',
            whereToObtainRu: 'Обратитесь в службу миграции или органы внутренних дел',
          },
          {
            document: 'visa_application_form',
            name: 'Visa Application Form',
            nameUz: 'Viza ariza formasi',
            nameRu: 'Форма заявления на визу',
            required: true,
            description: 'Completed and signed visa application form',
            descriptionUz: "To'ldirilgan va imzolangan viza ariza formasi",
            descriptionRu: 'Заполненная и подписанная форма заявления на визу',
            priority: 'high',
            whereToObtain: 'Download from embassy/consulate website or VFS center',
            whereToObtainUz: 'Elchixona/konsullik veb-saytidan yoki VFS markazidan yuklab oling',
            whereToObtainRu: 'Скачайте с веб-сайта посольства/консульства или центра VFS',
          },
          {
            document: 'financial_proof',
            name: 'Financial Proof',
            nameUz: 'Moliyaviy isbot',
            nameRu: 'Финансовое подтверждение',
            required: true,
            description: 'Bank statements or proof of sufficient funds',
            descriptionUz: "Bank hisob varag'lari yoki yetarli mablag' isboti",
            descriptionRu: 'Банковские выписки или подтверждение достаточных средств',
            priority: 'high',
            whereToObtain: 'Obtain from your bank',
            whereToObtainUz: 'Bankingizdan oling',
            whereToObtainRu: 'Получите в вашем банке',
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
