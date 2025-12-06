import OpenAI from 'openai';
import { getAIConfig } from '../config/ai-models';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { AITrainingTaskType, AITrainingSource } from '../ai-training/types';
import { PROMPT_VERSIONS } from '../ai-training/config';
import { getActiveModelForTask } from '../ai-model-registry/registry.service';
import { AITaskType, RoutingOptions } from '../ai-model-registry/types';

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
// Change summary (2025-11-24): Tightened checklist prompt, enforced country-specific terminology, and lowered token limits for faster responses.

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
  // Default model for general AI tasks (can be gpt-4o-mini for cost efficiency)
  public static readonly MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  // Checklist generation ALWAYS uses GPT-4 (gpt-4o or gpt-4.1) - never falls back to mini
  public static readonly CHECKLIST_MODEL = process.env.OPENAI_MODEL_CHECKLIST || 'gpt-4o';
  private static readonly MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || '2000');

  /**
   * Resolve model for task using registry (with fallback to defaults)
   */
  private static async resolveModelForTask(
    taskType: AITaskType,
    defaultModel: string
  ): Promise<{ modelName: string; modelVersionId?: string }> {
    try {
      // Check env overrides
      const envOverride =
        process.env[`${taskType.toUpperCase().replace(/_/g, '_')}_FORCE_MODEL`] ||
        process.env[`${taskType.split('_')[0].toUpperCase()}_FORCE_MODEL`] ||
        (taskType === 'checklist_enrichment' ? process.env.CHECKLIST_FORCE_MODEL : undefined) ||
        (taskType === 'document_check' ? process.env.DOC_CHECK_FORCE_MODEL : undefined) ||
        (taskType === 'risk_explanation' ? process.env.RISK_FORCE_MODEL : undefined) ||
        (taskType === 'document_explanation'
          ? process.env.DOC_EXPLANATION_FORCE_MODEL
          : undefined) ||
        (taskType === 'rules_extraction' ? process.env.RULES_EXTRACTION_FORCE_MODEL : undefined);

      const options: RoutingOptions = {
        forceModelName: envOverride,
        allowCandidates: true, // Allow canary models
      };

      const routing = await getActiveModelForTask(taskType, options);
      return {
        modelName: routing.modelName,
        modelVersionId: routing.modelVersionId,
      };
    } catch (error) {
      // Fallback to default if registry fails
      logWarn('[AIOpenAI] Failed to resolve model from registry, using default', {
        error: error instanceof Error ? error.message : String(error),
        taskType,
        defaultModel,
      });
      return {
        modelName: defaultModel,
      };
    }
  }

  /**
   * Record AI interaction for training data pipeline
   * Called after GPT-4 API calls to store request/response for export
   */
  private static async recordAIInteraction(params: {
    taskType: AITrainingTaskType;
    model: string;
    promptVersion?: string;
    source: AITrainingSource;
    requestPayload: any;
    responsePayload: any;
    success: boolean;
    errorMessage?: string;
    modelVersionId?: string;
    contextMeta?: {
      countryCode?: string | null;
      visaType?: string | null;
      ruleSetId?: string | null;
      applicationId?: string | null;
      userId?: string | null;
    };
  }): Promise<void> {
    try {
      if (!AIOpenAIService.prisma) {
        AIOpenAIService.prisma = new PrismaClient();
      }

      await (AIOpenAIService.prisma as any).aIInteraction.create({
        data: {
          taskType: params.taskType,
          model: params.model,
          promptVersion: params.promptVersion || null,
          requestPayload: params.requestPayload as any,
          responsePayload: params.responsePayload as any,
          success: params.success,
          errorMessage: params.errorMessage || null,
          source: params.source,
          countryCode: params.contextMeta?.countryCode || null,
          visaType: params.contextMeta?.visaType || null,
          ruleSetId: params.contextMeta?.ruleSetId || null,
          applicationId: params.contextMeta?.applicationId || null,
          userId: params.contextMeta?.userId || null,
          modelVersionId: params.modelVersionId || null,
        },
      });
    } catch (error) {
      // Don't fail the main request if logging fails
      logWarn('[AIOpenAI] Failed to record AI interaction', {
        error: error instanceof Error ? error.message : String(error),
        taskType: params.taskType,
      });
    }
  }

  /**
   * Get OpenAI client (for internal use)
   */
  static getOpenAIClient(): OpenAI {
    if (!AIOpenAIService.openai) {
      throw new Error('OpenAI service not initialized. Call initialize() first.');
    }
    return AIOpenAIService.openai;
  }

  /**
   * Get checklist model with fallback hierarchy:
   * 1. OPENAI_MODEL_CHECKLIST env var (if set)
   * 2. gpt-4o (default)
   * 3. gpt-4.1 (fallback if gpt-4o fails)
   *
   * NEVER falls back to gpt-4o-mini for checklist generation
   */
  static getChecklistModel(): string {
    return this.CHECKLIST_MODEL;
  }

  /**
   * Call OpenAI API with checklist model and fallback logic
   * Tries: OPENAI_MODEL_CHECKLIST → gpt-4o → gpt-4.1
   */
  private static async callChecklistAPI(
    messages: Array<{ role: 'user' | 'system'; content: string }>,
    options: {
      temperature?: number;
      max_completion_tokens?: number;
      response_format?: { type: 'json_object' };
    },
    context: { country: string; visaType: string; mode?: string }
  ): Promise<any> {
    const modelsToTry = [this.CHECKLIST_MODEL, 'gpt-4o', 'gpt-4.1'].filter(
      (model, index, arr) => arr.indexOf(model) === index
    ); // Remove duplicates

    let lastError: any = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];

      console.log(
        `[Checklist][AI] Using model: ${model} (attempt ${i + 1}/${modelsToTry.length})`,
        {
          country: context.country,
          visaType: context.visaType,
          mode: context.mode || 'unknown',
        }
      );

      logInfo('[Checklist][AI] Attempting checklist generation', {
        model,
        attempt: i + 1,
        totalAttempts: modelsToTry.length,
        country: context.country,
        visaType: context.visaType,
        mode: context.mode || 'unknown',
      });

      try {
        const response = await AIOpenAIService.openai.chat.completions.create({
          model,
          messages,
          temperature: options.temperature ?? 0.5,
          max_completion_tokens: options.max_completion_tokens ?? 2000,
          response_format: options.response_format ?? { type: 'json_object' },
        });

        logInfo('[Checklist][AI] Successfully generated checklist', {
          model,
          country: context.country,
          visaType: context.visaType,
          mode: context.mode || 'unknown',
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
        });

        return response;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        const isTimeout =
          errorMessage.includes('timeout') ||
          errorMessage.includes('ECONNABORTED') ||
          errorMessage.includes('Request timed out');

        logWarn('[Checklist][AI] Model attempt failed', {
          model,
          attempt: i + 1,
          totalAttempts: modelsToTry.length,
          isTimeout,
          errorMessage: errorMessage.substring(0, 200),
          country: context.country,
          visaType: context.visaType,
          willRetry: i < modelsToTry.length - 1,
        });

        // If timeout and we have more models to try, continue
        if (isTimeout && i < modelsToTry.length - 1) {
          continue;
        }

        // If not timeout or last attempt, re-throw
        if (!isTimeout || i >= modelsToTry.length - 1) {
          throw error;
        }
      }
    }

    // Should never reach here, but just in case
    throw lastError || new Error('All checklist model attempts failed');
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
        timeout: 60000, // 60 second timeout for checklist generation (GPT-4 can take longer)
      });
      AIOpenAIService.prisma = prisma;
      logInfo('[OpenAI] Service initialized', {
        defaultModel: AIOpenAIService.MODEL,
        checklistModel: AIOpenAIService.CHECKLIST_MODEL,
        maxTokens: AIOpenAIService.MAX_TOKENS,
        hasApiKey: !!apiKey,
        timeout: 60000,
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
   * Check if hybrid checklist generation is enabled for this country+visa type
   * Hybrid mode: Rule engine decides documents, GPT-4 only enriches
   * Legacy mode: GPT-4 decides everything (old behavior)
   */
  private static async isHybridChecklistEnabled(
    countryCode: string,
    visaType: string
  ): Promise<boolean> {
    const { findVisaDocumentRuleSet } = await import('../data/visaDocumentRules');
    const ruleSet = await findVisaDocumentRuleSet(countryCode, visaType);
    return !!ruleSet;
  }

  /**
   * Build system prompt for hybrid mode
   * GPT-4 is NOT allowed to add or remove documents, only enrich with descriptions
   */
  private static buildHybridSystemPrompt(
    country: string,
    visaType: string,
    visaKb: string
  ): string {
    return `You are a visa document checklist ENRICHMENT assistant specialized for Uzbek applicants.

CRITICAL: You are NOT allowed to add or remove documents. The document list is FINAL and determined by rules.

Your task:
Given a list of document types (with category and required status already determined), you must ONLY enrich each document with:
- Human-readable names (EN/UZ/RU)
- Descriptions explaining what the document is and why it's needed (EN/UZ/RU)
- Instructions on where to obtain the document in Uzbekistan (EN/UZ/RU)

RULES:
- You MUST output exactly the same documentType values you receive as input
- You MUST NOT add new documents
- You MUST NOT remove documents
- You MUST NOT change category or required status
- Each documentType must have complete name, description, and whereToObtain in EN, UZ, and RU
- Use correct country-specific terminology:
  * USA student: "Form I-20" (NOT "LOA")
  * Canada student: "Letter of Acceptance (LOA) from a Designated Learning Institution (DLI)" (NOT "I-20")
  * Schengen: "Travel health insurance" covering at least 30,000 EUR
- Uzbekistan context is ALWAYS assumed:
  - Passport = Uzbek biometric passport
  - Bank statements = Uzbek banks
  - Income certificates = Uzbek employers/government
  - Documents may be in Uzbek or Russian

OUTPUT FORMAT:
You MUST return valid JSON with this exact structure:
{
  "checklist": [
    {
      "documentType": "passport",  // MUST match input exactly
      "category": "required",      // MUST match input exactly
      "required": true,            // MUST match input exactly
      "name": "Valid Passport",
      "nameUz": "Yaroqli Pasport",
      "nameRu": "Действительный Паспорт",
      "description": "Passport valid for at least 6 months beyond intended stay",
      "descriptionUz": "Kamida 6 oy muddati qolgan yaroqli pasport",
      "descriptionRu": "Действительный паспорт со сроком действия не менее 6 месяцев",
      "whereToObtain": "Apply at migration service or internal affairs office",
      "whereToObtainUz": "Migratsiya xizmatiga yoki Ichki ishlar organlariga murojaat qiling",
      "whereToObtainRu": "Обратитесь в службу миграции или органы внутренних дел"
    }
  ]
}

NO markdown, NO extra text, ONLY valid JSON.`;
  }

  /**
   * Build user prompt for hybrid mode
   * Includes base checklist and context
   */
  private static async buildHybridUserPrompt(
    userContext: any,
    country: string,
    visaType: string,
    baseChecklist: Array<{ documentType: string; category: string; required: boolean }>,
    visaKb: string,
    documentGuidesText: string
  ): Promise<string> {
    // Convert to canonical format for consistent GPT input
    const { buildCanonicalAIUserContext } = require('./ai-context.service');
    const canonical = await buildCanonicalAIUserContext(userContext);
    const profile = canonical.applicantProfile;
    const riskScore = canonical.riskScore;

    // Extract key info from canonical format
    const sponsorType = profile.sponsorType;
    const duration = profile.duration === 'unknown' ? 'Not specified' : profile.duration;
    const hasTravelHistory = profile.hasInternationalTravel;
    const previousRefusals = profile.previousVisaRejections;
    const bankBalance = profile.bankBalanceUSD;

    return `Enrich the following document checklist with names, descriptions, and whereToObtain instructions.

Destination Country: ${country}
Visa Type: ${visaType}
Sponsor: ${sponsorType}
Duration: ${duration}
Travel History: ${hasTravelHistory ? 'Has previous travel' : 'No previous international travel'}
Previous Refusals: ${previousRefusals ? 'Yes' : 'No'}
Financial Capacity: ${bankBalance ? `~$${bankBalance}` : 'Not specified'}
Risk Score: ${riskScore.probabilityPercent}% (${riskScore.level})

Knowledge Base Context:
${visaKb || 'No specific knowledge base available.'}

${documentGuidesText ? `Document Guides:\n${documentGuidesText}` : ''}

BASE DOCUMENT LIST (you MUST enrich these exact documents, no additions or removals):
${JSON.stringify(
  baseChecklist.map((item) => ({
    documentType: item.documentType,
    category: (item.category === 'required' ||
    item.category === 'highly_recommended' ||
    item.category === 'optional'
      ? item.category
      : 'optional') as 'required' | 'highly_recommended' | 'optional',
    required: item.required,
  })),
  null,
  2
)}

CRITICAL REMINDERS:
- Output EXACTLY these ${baseChecklist.length} documents, no more, no less
- Keep documentType, category, and required EXACTLY as shown above
- Generate complete EN, UZ, RU translations for name, description, and whereToObtain
- Use correct country-specific terminology
- All whereToObtain fields must be realistic for Uzbekistan

Return ONLY valid JSON matching the schema, no other text, no markdown, no comments.`;
  }

  /**
   * Parse hybrid response from GPT-4
   */
  private static parseHybridResponse(
    rawContent: string,
    baseChecklist: Array<{ documentType: string; category: string; required: boolean }>,
    country: string,
    visaType: string
  ): any {
    try {
      // Extract JSON from response
      let jsonText = rawContent.trim();
      if (jsonText.includes('```json')) {
        const start = jsonText.indexOf('```json') + 7;
        const end = jsonText.indexOf('```', start);
        if (end !== -1) {
          jsonText = jsonText.substring(start, end).trim();
        }
      } else if (jsonText.includes('```')) {
        const start = jsonText.indexOf('```') + 3;
        const end = jsonText.indexOf('```', start);
        if (end !== -1) {
          jsonText = jsonText.substring(start, end).trim();
        }
      }

      // Find JSON object
      if (jsonText.includes('{')) {
        const start = jsonText.indexOf('{');
        const end = jsonText.lastIndexOf('}') + 1;
        if (end > start) {
          jsonText = jsonText.substring(start, end);
        }
      }

      const parsed = JSON.parse(jsonText);

      if (!parsed.checklist || !Array.isArray(parsed.checklist)) {
        return null;
      }

      return parsed;
    } catch (error) {
      logError('[OpenAI][Checklist] Hybrid mode JSON parse error', error as Error, {
        country,
        visaType,
      });
      return null;
    }
  }

  /**
   * Validate hybrid response matches base checklist
   */
  private static validateHybridResponse(
    gptChecklist: any[],
    baseChecklist: Array<{ documentType: string; category: string; required: boolean }>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const baseDocTypes = new Set(baseChecklist.map((b) => b.documentType));
    const gptDocTypes = new Set(gptChecklist.map((g: any) => g.documentType || g.document));

    // Check for missing documents
    for (const baseDoc of baseChecklist) {
      if (!gptDocTypes.has(baseDoc.documentType)) {
        errors.push(`Missing document: ${baseDoc.documentType}`);
      }
    }

    // Check for extra documents
    for (const gptDoc of gptChecklist) {
      const docType = gptDoc.documentType || gptDoc.document;
      if (!baseDocTypes.has(docType)) {
        errors.push(`Extra document: ${docType}`);
      }
    }

    // Check category/required matches
    for (const gptItem of gptChecklist) {
      const docType = gptItem.documentType || gptItem.document;
      const baseItem = baseChecklist.find((b) => b.documentType === docType);
      if (baseItem) {
        if (gptItem.category !== baseItem.category) {
          errors.push(
            `Category mismatch for ${docType}: expected ${baseItem.category}, got ${gptItem.category}`
          );
        }
        if (gptItem.required !== baseItem.required) {
          errors.push(
            `Required mismatch for ${docType}: expected ${baseItem.required}, got ${gptItem.required}`
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Correct hybrid response to match base checklist
   * Removes extras, adds missing, fixes category/required
   */
  private static correctHybridResponse(
    gptChecklist: any[],
    baseChecklist: Array<{ documentType: string; category: string; required: boolean }>
  ): any[] {
    const corrected: any[] = [];
    const baseMap = new Map(baseChecklist.map((b) => [b.documentType, b]));

    // Process each base document
    for (const baseItem of baseChecklist) {
      const gptItem = gptChecklist.find(
        (g) => (g.documentType || g.document) === baseItem.documentType
      );

      if (gptItem) {
        // Use GPT enrichment but fix category/required
        corrected.push({
          ...gptItem,
          documentType: baseItem.documentType,
          category: baseItem.category,
          required: baseItem.required,
        });
      } else {
        // Missing document - create minimal entry
        corrected.push({
          documentType: baseItem.documentType,
          category: baseItem.category,
          required: baseItem.required,
          name: baseItem.documentType,
          nameUz: baseItem.documentType,
          nameRu: baseItem.documentType,
          description: '',
          descriptionUz: '',
          descriptionRu: '',
          whereToObtain: '',
          whereToObtainUz: '',
          whereToObtainRu: '',
        });
      }
    }

    return corrected;
  }

  /**
   * Infer priority from category
   */
  private static inferPriorityFromCategory(
    category?: 'required' | 'highly_recommended' | 'optional' | string
  ): 'high' | 'medium' | 'low' {
    const normalized =
      category === 'required' || category === 'highly_recommended' || category === 'optional'
        ? category
        : 'optional';
    if (normalized === 'required') return 'high';
    if (normalized === 'highly_recommended') return 'medium';
    return 'low';
  }

  /**
   * Get basic document name/description from knowledge base for fallback
   */
  private static getDocumentNameFromKB(
    documentType: string,
    country: string,
    visaType: string,
    visaKb: string
  ): {
    en: string;
    uz: string;
    ru: string;
    description?: string;
    descriptionUz?: string;
    descriptionRu?: string;
  } {
    // Basic document name mappings
    const docNames: Record<string, { en: string; uz: string; ru: string }> = {
      passport: { en: 'Passport', uz: 'Pasport', ru: 'Паспорт' },
      passport_photo: { en: 'Passport Photo', uz: 'Pasport surati', ru: 'Фотография на паспорт' },
      bank_statement_main: { en: 'Bank Statement', uz: 'Bank hisoboti', ru: 'Выписка из банка' },
      i20_form: { en: 'Form I-20', uz: 'I-20 formasi', ru: 'Форма I-20' },
      sevis_fee_receipt: {
        en: 'SEVIS Fee Receipt',
        uz: "SEVIS to'lov kvitansiyasi",
        ru: 'Квитанция об оплате SEVIS',
      },
      ds160_confirmation: {
        en: 'DS-160 Confirmation',
        uz: 'DS-160 tasdiqlash',
        ru: 'Подтверждение DS-160',
      },
      loa_letter: {
        en: 'Letter of Acceptance (LOA)',
        uz: 'Qabul qilish xati (LOA)',
        ru: 'Письмо о зачислении (LOA)',
      },
      cas_letter: { en: 'CAS Letter', uz: 'CAS xati', ru: 'Письмо CAS' },
      coe_letter: {
        en: 'Confirmation of Enrolment (COE)',
        uz: "Ro'yxatdan o'tish tasdiqlovchisi (COE)",
        ru: 'Подтверждение о зачислении (COE)',
      },
      travel_insurance: {
        en: 'Travel Insurance',
        uz: "Sayohat sug'urtasi",
        ru: 'Страховка для путешествий',
      },
      accommodation_proof: {
        en: 'Accommodation Proof',
        uz: 'Yashash joyi hujjati',
        ru: 'Подтверждение проживания',
      },
      round_trip_ticket: {
        en: 'Round Trip Ticket',
        uz: 'Ikki tomonlama chipta',
        ru: 'Билет туда и обратно',
      },
      employment_letter: {
        en: 'Employment Letter',
        uz: 'Ish joyi xati',
        ru: 'Справка с места работы',
      },
      sponsor_bank_statement: {
        en: 'Sponsor Bank Statement',
        uz: 'Homiylik bank hisoboti',
        ru: 'Выписка из банка спонсора',
      },
      sponsor_employment_letter: {
        en: 'Sponsor Employment Letter',
        uz: 'Homiylik ish joyi xati',
        ru: 'Справка с места работы спонсора',
      },
      property_documents: {
        en: 'Property Documents',
        uz: 'Mulk hujjatlari',
        ru: 'Документы на недвижимость',
      },
      family_ties_proof: {
        en: 'Family Ties Proof',
        uz: 'Oila aloqalari hujjati',
        ru: 'Подтверждение семейных связей',
      },
      refusal_explanation_letter: {
        en: 'Refusal Explanation Letter',
        uz: 'Rad etish tushuntirish xati',
        ru: 'Письмо с объяснением отказа',
      },
      travel_itinerary: { en: 'Travel Itinerary', uz: 'Sayohat rejasi', ru: 'Маршрут поездки' },
      visa_application_form: {
        en: 'Visa Application Form',
        uz: 'Viza ariza formasi',
        ru: 'Форма заявления на визу',
      },
      schengen_visa_form: {
        en: 'Schengen Visa Form',
        uz: 'Shengen viza formasi',
        ru: 'Форма заявления на шенгенскую визу',
      },
      daily_itinerary: { en: 'Daily Itinerary', uz: 'Kunlik reja', ru: 'Ежедневный маршрут' },
      travel_history_proof: {
        en: 'Travel History Proof',
        uz: 'Sayohat tarixi hujjati',
        ru: 'Подтверждение истории поездок',
      },
      gic_certificate: { en: 'GIC Certificate', uz: 'GIC sertifikati', ru: 'Сертификат GIC' },
      tuition_payment_proof: {
        en: 'Tuition Payment Proof',
        uz: "To'lov hujjati",
        ru: 'Подтверждение оплаты обучения',
      },
      health_insurance: {
        en: 'Health Insurance (OSHC)',
        uz: "Sog'liqni saqlash sug'urtasi (OSHC)",
        ru: 'Медицинская страховка (OSHC)',
      },
      sop: { en: 'Statement of Purpose', uz: 'Maqsad deklaratsiyasi', ru: 'Заявление о целях' },
      tuberculosis_test: { en: 'Tuberculosis Test', uz: 'Sil testi', ru: 'Тест на туберкулез' },
      academic_records: {
        en: 'Academic Records',
        uz: 'Akademik yozuvlar',
        ru: 'Академические записи',
      },
      language_certificate: {
        en: 'Language Certificate',
        uz: 'Til sertifikati',
        ru: 'Сертификат о знании языка',
      },
      english_test_proof: {
        en: 'English Test Proof',
        uz: 'Ingliz tili testi hujjati',
        ru: 'Подтверждение теста по английскому языку',
      },
    };

    const defaultName = docNames[documentType] || {
      en: documentType,
      uz: documentType,
      ru: documentType,
    };

    return {
      en: defaultName.en,
      uz: defaultName.uz,
      ru: defaultName.ru,
      description: `Required document for ${country} ${visaType} visa application.`,
      descriptionUz: `${country} ${visaType} viza arizasi uchun talab qilinadigan hujjat.`,
      descriptionRu: `Требуемый документ для заявления на визу ${country} ${visaType}.`,
    };
  }

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
      category: 'required' | 'highly_recommended' | 'optional'; // NEW: Explicit category
      required: boolean; // Kept for backward compatibility
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
    const startTime = Date.now();
    try {
      // Import visa knowledge base and document guides
      const { getVisaKnowledgeBase } = await import('../data/visaKnowledgeBase');
      const { getRelevantDocumentGuides } = await import('../data/documentGuides');

      // Normalize country code for rule lookup
      const countryCodeMap: Record<string, string> = {
        'united states': 'US',
        usa: 'US',
        'united kingdom': 'GB',
        uk: 'GB',
        canada: 'CA',
        australia: 'AU',
        germany: 'DE',
        spain: 'ES',
        japan: 'JP',
        uae: 'AE',
        'united arab emirates': 'AE',
        poland: 'PL',
        'new zealand': 'NZ',
      };
      const normalizedCountry = country.toLowerCase();
      const countryCode =
        countryCodeMap[normalizedCountry] || country.substring(0, 2).toUpperCase();

      // Check if hybrid mode is enabled
      const isHybrid = await this.isHybridChecklistEnabled(countryCode, visaType);

      if (isHybrid) {
        // ========================================================================
        // HYBRID CHECKLIST PATH: documents come from rule engine; GPT only enriches
        // ========================================================================
        logInfo('[OpenAI][Checklist] Using HYBRID mode (rule engine + GPT enrichment)', {
          country,
          visaType,
          countryCode,
        });

        const { findVisaDocumentRuleSet } = await import('../data/visaDocumentRules');
        const { buildBaseChecklistFromRules } = await import('./checklist-rules.service');

        const { VisaRulesService } = await import('./visa-rules.service');
        const ruleSetData = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
        if (!ruleSetData) {
          logWarn('[OpenAI][Checklist] Rule set not found, falling back to legacy mode', {
            country,
            visaType,
            countryCode,
          });
          // Fall through to legacy mode
        } else {
          // Build base checklist from rules
          const baseChecklist = await buildBaseChecklistFromRules(userContext, ruleSetData);

          if (baseChecklist.length === 0) {
            logWarn('[OpenAI][Checklist] Base checklist is empty, falling back to legacy mode', {
              country,
              visaType,
            });
            // Fall through to legacy mode
          } else {
            // Get visa knowledge base for context
            const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');
            const userQuery = JSON.stringify(userContext);
            const documentGuidesText = getRelevantDocumentGuides(userQuery, 3);

            // Build hybrid system prompt (GPT only enriches, doesn't decide documents)
            const hybridSystemPrompt = this.buildHybridSystemPrompt(country, visaType, visaKb);

            // Build hybrid user prompt with base checklist
            const hybridUserPrompt = await this.buildHybridUserPrompt(
              userContext,
              country,
              visaType,
              baseChecklist,
              visaKb,
              documentGuidesText
            );

            // Call GPT-4 for enrichment only (with retry logic)
            let response;
            let attempt = 0;
            const maxAttempts = 2;
            let lastError: any = null;
            let rawContent = '{}';
            let parsed: any = null;

            while (attempt < maxAttempts) {
              attempt++;
              try {
                response = await this.callChecklistAPI(
                  [
                    { role: 'system', content: hybridSystemPrompt },
                    { role: 'user', content: hybridUserPrompt },
                  ],
                  {
                    temperature: 0.5,
                    max_completion_tokens: 2000,
                    response_format: { type: 'json_object' },
                  },
                  {
                    country,
                    visaType,
                    mode: 'hybrid',
                  }
                );

                rawContent = response.choices[0]?.message?.content || '{}';
                const responseTime = Date.now() - startTime;

                logInfo('[OpenAI][Checklist] Hybrid mode GPT-4 response received', {
                  model: response?.model || this.getChecklistModel(),
                  country,
                  visaType,
                  countryCode,
                  ruleSet: `${countryCode}-${visaType}`,
                  attempt,
                  responseLength: rawContent.length,
                  baseChecklistCount: baseChecklist.length,
                  responseTimeMs: responseTime,
                });

                // Parse and validate hybrid response
                parsed = this.parseHybridResponse(rawContent, baseChecklist, country, visaType);

                if (!parsed || !parsed.checklist || parsed.checklist.length === 0) {
                  logWarn('[OpenAI][Checklist] Hybrid mode parsing failed', {
                    country,
                    visaType,
                    attempt,
                    willRetry: attempt < maxAttempts,
                  });
                  if (attempt < maxAttempts) {
                    continue; // Retry
                  }
                } else {
                  // Validate that all base documents are present and no extras
                  const validationResult = this.validateHybridResponse(
                    parsed.checklist,
                    baseChecklist
                  );

                  if (!validationResult.isValid) {
                    logWarn('[OpenAI][Checklist] Hybrid mode validation failed', {
                      country,
                      visaType,
                      attempt,
                      errors: validationResult.errors,
                      willRetry: attempt < maxAttempts,
                    });
                    if (attempt < maxAttempts) {
                      continue; // Retry
                    }
                    // Correct the response to match base checklist
                    parsed.checklist = this.correctHybridResponse(parsed.checklist, baseChecklist);
                    logInfo('[OpenAI][Checklist] Hybrid mode response corrected', {
                      country,
                      visaType,
                      correctionsApplied: validationResult.errors.length,
                    });
                  } else {
                    // Success - break out of retry loop
                    break;
                  }
                }
              } catch (openaiError: any) {
                lastError = openaiError;
                const errorMessage = openaiError?.message || String(openaiError);
                logWarn('[OpenAI][Checklist] Hybrid mode request error', {
                  country,
                  visaType,
                  attempt,
                  errorMessage,
                  willRetry: attempt < maxAttempts,
                });

                if (
                  errorMessage.includes('timeout') ||
                  errorMessage.includes('ECONNABORTED') ||
                  errorMessage.includes('Request timed out')
                ) {
                  if (attempt < maxAttempts) {
                    continue; // Retry on timeout
                  }
                  throw new Error('Request timed out.');
                }

                if (attempt >= maxAttempts) {
                  throw openaiError;
                }
              }
            }

            // If we have a valid parsed response, use it
            if (parsed && parsed.checklist && parsed.checklist.length > 0) {
              const responseTime = Date.now() - startTime;

              // Convert to internal format
              const enrichedChecklist = parsed.checklist.map((item: any) => {
                const baseItem = baseChecklist.find((b) => b.documentType === item.documentType);
                return {
                  document: item.documentType || item.document || 'Unknown',
                  name: item.name || item.documentType || 'Unknown',
                  nameUz: item.nameUz || item.name || item.documentType || "Noma'lum",
                  nameRu: item.nameRu || item.name || item.documentType || 'Неизвестно',
                  category: baseItem?.category || item.category || 'optional',
                  required:
                    baseItem?.required !== undefined ? baseItem.required : item.required !== false,
                  description: item.description || '',
                  descriptionUz: item.descriptionUz || item.description || '',
                  descriptionRu: item.descriptionRu || item.description || '',
                  priority: this.inferPriorityFromCategory(baseItem?.category || item.category),
                  whereToObtain: item.whereToObtain || '',
                  whereToObtainUz: item.whereToObtainUz || item.whereToObtain || '',
                  whereToObtainRu: item.whereToObtainRu || item.whereToObtain || '',
                };
              });

              logInfo('[OpenAI][Checklist] Hybrid mode checklist generation completed', {
                model: response?.model || this.getChecklistModel(),
                country,
                visaType,
                countryCode,
                ruleSet: `${countryCode}-${visaType}`,
                itemCount: enrichedChecklist.length,
                baseChecklistCount: baseChecklist.length,
                responseTimeMs: responseTime,
                attempts: attempt,
                mode: 'hybrid',
              });

              return {
                type: visaType,
                checklist: enrichedChecklist,
              };
            }

            // ========================================================================
            // SEVERE SAFETY MODE: GPT failed twice, build minimal fallback from rules
            // ========================================================================
            logWarn(
              '[OpenAI][Checklist] Hybrid mode GPT failed after retries, using rule-based fallback',
              {
                country,
                visaType,
                countryCode,
                ruleSet: `${countryCode}-${visaType}`,
                baseChecklistCount: baseChecklist.length,
              }
            );

            // Build minimal fallback checklist using ruleSet only
            const fallbackChecklist = baseChecklist.map((item) => {
              // Get basic descriptions from knowledge base
              const docName = this.getDocumentNameFromKB(
                item.documentType,
                country,
                visaType,
                visaKb
              );
              return {
                document: item.documentType,
                name: docName.en || item.documentType,
                nameUz: docName.uz || item.documentType,
                nameRu: docName.ru || item.documentType,
                category: (item.category === 'required' ||
                item.category === 'highly_recommended' ||
                item.category === 'optional'
                  ? item.category
                  : 'optional') as 'required' | 'highly_recommended' | 'optional',
                required: item.required,
                description: docName.description || `Required document: ${item.documentType}`,
                descriptionUz:
                  docName.descriptionUz || `Talab qilinadigan hujjat: ${item.documentType}`,
                descriptionRu: docName.descriptionRu || `Требуемый документ: ${item.documentType}`,
                priority: this.inferPriorityFromCategory(item.category),
                whereToObtain: 'Contact embassy or visa application center for details.',
                whereToObtainUz:
                  'Tafsilotlar uchun elchixona yoki viza ariza markaziga murojaat qiling.',
                whereToObtainRu:
                  'Обратитесь в посольство или центр подачи заявлений на визу для получения подробной информации.',
              };
            });

            logInfo('[OpenAI][Checklist] Rule-based fallback checklist generated', {
              country,
              visaType,
              countryCode,
              ruleSet: `${countryCode}-${visaType}`,
              itemCount: fallbackChecklist.length,
              mode: 'fallback',
            });

            return {
              type: visaType,
              checklist: fallbackChecklist,
            };
          }
        }
      }

      // ========================================================================
      // LEGACY CHECKLIST PATH: GPT-4 decides everything (original behavior)
      // ========================================================================
      logInfo('[OpenAI][Checklist] Using LEGACY mode (GPT-4 decides documents)', {
        country,
        visaType,
        countryCode,
      });

      // Get visa knowledge base for the country and visa type
      const visaKb = getVisaKnowledgeBase(country, visaType as 'tourist' | 'student');

      // Get relevant document guides based on user context
      const userQuery = JSON.stringify(userContext);
      const documentGuidesText = getRelevantDocumentGuides(userQuery, 3);

      const systemPrompt = `You are a STRICT visa document checklist generator specialized for Uzbek applicants.

Your task:
Given:
- AIUserContext (Uzbekistan-based by default)
- Questionnaire summary (10-step V2)
- visaType (student | tourist)
- target country (one of 8 supported countries)
- riskScore

Analyze ALL context and produce a COMPLETE, CONSISTENT, ACCURATE 3-category checklist:
1) required
2) highly_recommended
3) optional

GENERAL RULES:
- ALWAYS output 8–15 total documents.
- ALWAYS include ALL THREE categories.
- ALWAYS put every document in exactly one category.
- EACH ITEM MUST have:
  - document (slug)
  - name/nameUz/nameRu
  - category
  - required (boolean: true only if category=='required')
  - priority ('high','medium','low')
  - description/descriptionUz/descriptionRu
  - whereToObtain/Uz/Ru
- NO hallucinations. NO fake document names. NO fake embassies.
- Uzbekistan context is ALWAYS assumed unless explicitly overwritten:
  - Passport = Uzbek biometric passport
  - Bank statements = Uzbek banks
  - Income certificates = Uzbek employers/government
  - Documents may be in Uzbek or Russian
- DO NOT write specific step-by-step my.gov procedures.

CATEGORY LOGIC:
Provide:
1. REQUIRED:
   - Must-have documents for embassy acceptance.
   - Examples:
     - Passport valid 6+ months AFTER return
     - Bank statement (if self-sponsored)
     - Income certificate (sponsor or applicant)
     - Acceptance letter / hotel booking / invitation
     - Photo
     - Insurance
     - Application form

2. HIGHLY_RECOMMENDED:
   - Strongly improves approval chances.
   - Examples:
     - Property documents (kadastr)
     - Employment letter
     - Sponsor support letter
     - Previous travel proofs
     - Academic transcripts (for students)

3. OPTIONAL:
   - Nice-to-have supporting evidence.
   - Examples:
     - Additional financial proof
     - Extra sponsor documents
     - Additional travel plans
     - Extra family relationship documents

RISK INFLUENCE:
If riskScore is HIGH:
  - Add more documents to HIGHLY_RECOMMENDED
  - Add employment ties or stronger financial guarantees

If riskScore is LOW:
  - MINIMIZE OPTIONAL items
  - Keep required items clean and standard

OUTPUT RULES (VERY IMPORTANT):
- OUTPUT MUST BE **VALID JSON ONLY**.
- NO markdown, no text outside JSON.
- Every item MUST contain UZ and RU translations.
- whereToObtain fields MUST be realistic for Uzbekistan.

COUNTRY SPECIALIZATION:
You MUST adapt documents to the embassy:

USA (student):
  - I-20, SEVIS fee, bank statements for 1-year tuition/living

USA (tourist):
  - Strong ties + hotel booking + employer letter

Canada:
  - LOA (students), financial proof for 1 year

Australia:
  - OSHC (student insurance)
  - GTE-related documents (if relevant)

Schengen:
  - Insurance with €30,000 coverage
  - Passport photos (biometric)

Japan:
  - Detailed itinerary + sponsor proof

UAE:
  - Hotel booking, sponsor letter (if invited)

UK:
  - CAS (students), bank statements 28 days rule

Spain:
  - Proof of accommodation
  - Medical insurance

Anything country-specific must be accurate.

TERMINOLOGY RULES (STRICTLY ENFORCED):
- CANADA (Study Permit):
  * MUST use: "Letter of Acceptance (LOA) from a Designated Learning Institution (DLI)"
  * NEVER mention "I-20" or "Form I-20" for Canada
  * Include: GIC (Guaranteed Investment Certificate) if applicable
  * Use Canadian-specific terms: "Study Permit" not "Student Visa"

- USA (F-1, J-1 Student):
  * MUST use: "Form I-20" (for F-1) or "DS-2019" (for J-1 exchange programs)
  * Include: SEVIS fee receipt
  * Use US-specific terms: "F-1 Student Visa" not generic "Student Visa"

- SCHENGEN COUNTRIES (Germany, Spain, Italy, France, etc.):
  * MUST include: "Travel health insurance" covering at least 30,000 EUR
  * Include: "Accommodation proof" (hotel booking, invitation, etc.)
  * Use: "Schengen visa application form" terminology
  * Include: Round-trip flight reservation

- GENERIC TOURIST VISAS:
  * Core: Passport, passport photos, application form, financial proof
  * Travel: Travel itinerary, accommodation proof, travel insurance (if required)
  * Ties: Employment letter, property documents, family ties proof

REQUIRED JSON SCHEMA (CRITICAL - MUST MATCH EXACTLY):
Your entire response must be a single JSON object with this EXACT structure. No markdown, no comments, no explanations, no extra text before or after the JSON.

{
  "type": "<visaTypeSlug>",           // REQUIRED: Visa type string (e.g., "tourist", "student")
  "country": "<countryName>",         // REQUIRED: Country name string (e.g., "United States", "Germany")
  "checklist": [                      // REQUIRED: MUST be a JSON array (never an object, never nested)
    {
      "document": "passport",         // REQUIRED: Document type slug string
      "name": "Valid Passport",      // REQUIRED: English name string (2-5 words)
      "nameUz": "...",               // REQUIRED: Uzbek translation string
      "nameRu": "...",               // REQUIRED: Russian translation string
      "category": "required",         // REQUIRED: One of "required", "highly_recommended", "optional"
      "required": true,               // REQUIRED: boolean (true if category="required", false otherwise)
      "description": "...",           // REQUIRED: English description string (1-2 sentences)
      "descriptionUz": "...",        // REQUIRED: Uzbek translation string
      "descriptionRu": "...",        // REQUIRED: Russian translation string
      "priority": "high",             // REQUIRED: One of "high", "medium", "low"
      "whereToObtain": "...",         // REQUIRED: English instructions string
      "whereToObtainUz": "...",       // REQUIRED: Uzbek translation string
      "whereToObtainRu": "..."        // REQUIRED: Russian translation string
    }
  ]
}

CRITICAL STRUCTURE REQUIREMENTS:
1. The root object MUST have exactly three keys: "type", "country", "checklist"
2. "checklist" MUST be a JSON array (starts with [ and contains array items)
3. "checklist" MUST NEVER be an object (never starts with {)
4. "checklist" MUST NEVER be nested under "data" or any other wrapper
5. "checklist" MUST contain 10-16 array items (each item is an object)
6. Do NOT include any other root-level keys beyond "type", "country", "checklist"
7. Do NOT include any text, markdown, or comments outside the JSON object

VALIDATION RULES:
- "checklist" must be an array with at least 4 items (validation will fail if fewer than 4)
- Ideal checklist has 10-16 items (fewer than 10 is acceptable but suboptimal)
- All three categories (required, highly_recommended, optional) must be present in the array
- Every item MUST have all required fields listed above
- "category" must match "required" field: if category="required" then required=true, else required=false
- "priority" must be consistent: "required" items should have priority="high"

RULES FOR required, priority, AND category:
- If category = "required":
  * required = true
  * priority = "high"
- If category = "highly_recommended":
  * required = false
  * priority = "high" or "medium" (choose based on importance)
- If category = "optional":
  * required = false
  * priority = "low"

FINAL INSTRUCTIONS:
- Return ONLY valid JSON matching the schema above. No markdown code blocks, no comments, no explanations.
- The "checklist" field MUST be a JSON array ([]), never an object ({}).
- ALWAYS return clean JSON in schema EXACTLY as required.
- If questionnaire data is incomplete or contradictory → resolve logically using Uzbek context.
- NEVER output fewer than 10 items in the checklist array.
- NEVER output only "required" category items.
- NO HALLUCINATIONS: Only use real document types, real embassy requirements, real terminology.
- NO FAKE DOCUMENTS: Do not invent document names that don't exist.
- NO FAKE EMBASSIES: Do not invent embassy procedures or requirements.
- If unsure about a document requirement → mark as "optional" rather than inventing.

Your goal: produce the most reliable, accurate, embassy-ready checklist every time.`;

      // Extract risk factors and key information from user context
      const riskFactors: string[] = [];
      const keyInfo: {
        duration?: string;
        sponsorType?: string;
        travelHistory?: boolean;
        previousRefusals?: boolean;
        bankBalance?: number;
        hasProperty?: boolean;
        hasFamily?: boolean;
      } = {};

      if (userContext.questionnaireSummary) {
        const summary = userContext.questionnaireSummary;

        // Duration
        if (summary.travelInfo?.duration) {
          keyInfo.duration = summary.travelInfo.duration;
          if (
            summary.travelInfo.duration.includes('more_than_6_months') ||
            summary.travelInfo.duration.includes('more_than_1_year')
          ) {
            riskFactors.push(
              'Long stay duration - requires stronger proof of ties and financial capacity'
            );
          }
        } else if (summary.duration) {
          keyInfo.duration = summary.duration;
        }

        // Sponsor type
        if (summary.financialInfo?.sponsorDetails) {
          keyInfo.sponsorType = summary.financialInfo.sponsorDetails.relationship || 'sponsor';
          riskFactors.push(
            `Sponsored by ${keyInfo.sponsorType} - include sponsor financial documents`
          );
        } else if (summary.sponsorType && summary.sponsorType !== 'self') {
          keyInfo.sponsorType = summary.sponsorType;
          riskFactors.push(
            `Sponsored by ${keyInfo.sponsorType} - include sponsor financial documents`
          );
        }

        // Travel history
        if (
          summary.travelHistory?.traveledBefore === false ||
          (summary.travelHistory?.visitedCountries &&
            summary.travelHistory.visitedCountries.length === 0)
        ) {
          keyInfo.travelHistory = false;
          riskFactors.push(
            'No previous international travel - include stronger proof of ties to home country'
          );
        } else {
          keyInfo.travelHistory = true;
        }

        // Previous refusals
        if (summary.previousVisaRejections || summary.travelHistory?.hasRefusals) {
          keyInfo.previousRefusals = true;
          riskFactors.push(
            'Previous visa refusal - include explanation letter and stronger supporting documents'
          );
        }

        // Financial situation
        if (summary.financialInfo?.selfFundsUSD) {
          keyInfo.bankBalance = summary.financialInfo.selfFundsUSD;
        } else if (summary.bankBalanceUSD) {
          keyInfo.bankBalance = summary.bankBalanceUSD;
        }

        // Ties to home country
        if (summary.ties?.propertyDocs || summary.hasPropertyInUzbekistan) {
          keyInfo.hasProperty = true;
        }
        if (summary.ties?.familyTies || summary.hasFamilyInUzbekistan) {
          keyInfo.hasFamily = true;
        }
      }

      // Add risk factors from riskScore if available
      if (userContext.riskScore) {
        riskFactors.push(...userContext.riskScore.riskFactors);
      }

      // Extract Uzbekistan context from user profile
      const homeCountry = userContext.userProfile?.homeCountry || 'Uzbekistan';
      const citizenship = userContext.userProfile?.citizenship || 'UZ';
      const isUzbekCitizen = userContext.userProfile?.isUzbekCitizen !== false; // Default to true

      const promptPayload = {
        country,
        visaType,
        visaKnowledgeBase:
          visaKb || 'No specific knowledge base available for this country/visa type.',
        documentGuides:
          documentGuidesText || 'No Uzbekistan-specific document guides matched this request.',
        applicantContext: {
          // Include only non-sensitive summary information
          visaType: userContext.questionnaireSummary?.visaType,
          duration: keyInfo.duration,
          sponsorType: keyInfo.sponsorType,
          hasTravelHistory: keyInfo.travelHistory,
          hasPreviousRefusals: keyInfo.previousRefusals,
          financialCapacity: keyInfo.bankBalance
            ? `Bank balance: ~$${keyInfo.bankBalance}`
            : 'Not specified',
          tiesToHomeCountry: {
            hasProperty: keyInfo.hasProperty,
            hasFamily: keyInfo.hasFamily,
          },
          // NEW: Explicit Uzbekistan context
          homeCountry,
          citizenship,
          isUzbekCitizen,
          documentOrigin: isUzbekCitizen
            ? 'All documents are issued in Uzbekistan (passport, bank statements, income certificates, property documents, etc.)'
            : `Documents are issued in ${homeCountry}`,
        },
        riskFactors:
          riskFactors.length > 0
            ? riskFactors
            : ['Standard application - include all standard required documents'],
        instructions:
          'Generate a comprehensive checklist with 8-15 items tailored to this specific applicant profile. Consider the risk factors when determining which additional documents to include.',
      };

      const userPrompt = `Generate the document checklist following the schema and rules above.

Key Applicant Information:
- Destination Country: ${country}
- Visa Type: ${visaType}
- Home Country: ${homeCountry} (${citizenship})
- Applicant is from Uzbekistan: ${isUzbekCitizen ? 'Yes' : 'No'}
- Duration: ${keyInfo.duration || 'Not specified'}
- Sponsor: ${keyInfo.sponsorType || 'Self-funded'}
- Travel History: ${keyInfo.travelHistory ? 'Has previous travel' : 'No previous international travel'}
- Previous Refusals: ${keyInfo.previousRefusals ? 'Yes' : 'No'}
- Financial Capacity: ${keyInfo.bankBalance ? `~$${keyInfo.bankBalance}` : 'Not specified'}
- Document Origin: ${isUzbekCitizen ? 'All documents are issued in Uzbekistan' : `Documents are issued in ${homeCountry}`}
- Risk Score: ${userContext.riskScore ? `${userContext.riskScore.probabilityPercent}% (${userContext.riskScore.level})` : 'Not calculated'}

Risk Factors to Consider:
${riskFactors.length > 0 ? riskFactors.map((f) => `- ${f}`).join('\n') : '- Standard application profile'}

Knowledge Base Context:
${visaKb || 'No specific knowledge base available - use general requirements for this country/visa type.'}

${documentGuidesText ? `\nDocument Guides:\n${documentGuidesText}` : ''}

CRITICAL REMINDERS:
- ALWAYS output at least 4 documents (aim for 10-16 for optimal coverage)
- ALWAYS include ALL THREE categories (required, highly_recommended, optional)
- NEVER output fewer than 4 items
- NEVER output only "required" items
- Use correct country-specific terminology (I-20 for USA, LOA for Canada, CAS for UK, etc.)
- All whereToObtain fields must be realistic for Uzbekistan
- All items MUST have complete UZ and RU translations

CRITICAL JSON STRUCTURE REQUIREMENT:
- Your response MUST be a single JSON object with "type", "country", and "checklist" keys
- The "checklist" key MUST be a JSON array (starts with [), never an object (never starts with {)
- The "checklist" array MUST contain at least 4 item objects (10-16 is ideal)
- Do NOT wrap the response in markdown code blocks
- Do NOT include any text before or after the JSON
- Do NOT nest "checklist" under "data" or any other wrapper

Return ONLY valid JSON matching the schema exactly, no other text, no markdown, no comments.`;

      logInfo('[OpenAI][Checklist] Generating checklist', {
        model: this.getChecklistModel(),
        country,
        visaType,
        hasVisaKb: !!visaKb,
        hasDocumentGuides: !!documentGuidesText && documentGuidesText.length > 0,
      });

      let response;
      try {
        response = await this.callChecklistAPI(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          {
            temperature: 0.5, // Increased from 0.1 to 0.5 for more creative but still controlled responses
            max_completion_tokens: 2000, // Increased from 1200 to 2000 to allow for 8-15 items with full multilingual fields
            response_format: { type: 'json_object' },
          },
          {
            country,
            visaType,
            mode: 'legacy',
          }
        );
      } catch (openaiError: any) {
        // Catch timeout and other OpenAI API errors
        const errorMessage = openaiError?.message || String(openaiError);
        logWarn('[OpenAI][Checklist] All checklist model attempts failed', {
          country,
          visaType,
          errorMessage: errorMessage.substring(0, 200),
          timeoutMs: 60000,
        });
        // Re-throw to be handled by outer catch
        throw openaiError;
      }

      const responseTime = Date.now() - startTime;
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const totalTokens = inputTokens + outputTokens;

      if (responseTime > 30000) {
        logWarn('[OpenAI][Checklist] Slow response', {
          country,
          visaType,
          responseTimeMs: responseTime,
          tokensUsed: totalTokens,
        });
      }

      const rawContent = response.choices[0]?.message?.content || '{}';

      logInfo('[OpenAI][Checklist] Raw GPT-4 response received', {
        model: response?.model || this.getChecklistModel(),
        country,
        visaType,
        responseLength: rawContent.length,
        responsePreview: rawContent.substring(0, 200),
        responseTimeMs: responseTime,
        tokensUsed: totalTokens,
      });

      // Use new JSON validator with retry logic
      const { parseAndValidateChecklistResponse } = await import('../utils/json-validator');
      const { autoTranslateChecklistItems } = await import('../utils/translation-helper');
      const { getFallbackChecklist } = await import('../data/fallback-checklists');

      let parsed: any = null;
      let validationResult: any = null;
      let attempt = 1;
      let needsRetry = false;

      // First attempt
      const firstAttempt = parseAndValidateChecklistResponse(
        rawContent,
        country,
        visaType,
        attempt
      );

      parsed = firstAttempt.parsed;
      validationResult = firstAttempt.validation;
      needsRetry = firstAttempt.needsRetry;

      // ATTEMPT 1: Log validation error + reason if failed
      if (!validationResult.isValid) {
        logWarn('[OpenAI][Checklist] Attempt 1 failed validation', {
          country,
          visaType,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          reason: validationResult.errors.join('; '),
        });
      }

      // ATTEMPT 2: Retry if needed
      if (needsRetry && attempt < 2) {
        logInfo('[OpenAI][Checklist] Attempt 2: Retrying with stricter JSON requirements', {
          country,
          visaType,
          previousErrors: validationResult.errors,
        });

        attempt = 2;
        const retryPrompt = `${userPrompt}

CRITICAL: Your previous response was invalid JSON or failed validation. You MUST return strictly valid JSON now.

Previous validation errors:
${validationResult.errors.map((e: string) => `- ${e}`).join('\n')}

You MUST:
1. Return ONLY valid JSON matching the exact schema in the system prompt
2. Include ALL required fields for every checklist item
3. Ensure "checklist" is an array with 10-16 items
4. Include all three categories: required, highly_recommended, optional
5. No markdown, no comments, no extra text outside JSON`;

        const retryResponse = await AIOpenAIService.openai.chat.completions.create({
          model: this.MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: retryPrompt },
          ],
          temperature: 0.3, // Lower temperature for more consistent output
          max_completion_tokens: 2000,
          response_format: { type: 'json_object' },
        });

        const retryContent = retryResponse.choices[0]?.message?.content || '{}';
        const retryAttempt = parseAndValidateChecklistResponse(
          retryContent,
          country,
          visaType,
          attempt
        );

        parsed = retryAttempt.parsed;
        validationResult = retryAttempt.validation;
        needsRetry = retryAttempt.needsRetry;

        // If attempt 2 still fails → log and trigger fallback
        if (!validationResult.isValid) {
          logError(
            '[OpenAI][Checklist] Attempt 2 also failed validation, triggering fallback',
            new Error('Validation failed after retry'),
            {
              country,
              visaType,
              errors: validationResult.errors,
              warnings: validationResult.warnings,
              reason: validationResult.errors.join('; '),
            }
          );
        } else {
          logInfo('[OpenAI][Checklist] Attempt 2 succeeded after retry', {
            country,
            visaType,
            itemCount: parsed?.checklist?.length || 0,
          });
        }
      }

      // If still invalid after retry, use fallback
      if (!parsed || !validationResult.isValid) {
        logError(
          '[OpenAI][Checklist] Both attempts failed, using fallback checklist',
          new Error('GPT-4 validation failed'),
          {
            country,
            visaType,
            errors: validationResult?.errors || ['Unknown error'],
            warnings: validationResult?.warnings || [],
          }
        );

        // Get country code from country name
        const countryCodeMap: Record<string, string> = {
          'united states': 'US',
          usa: 'US',
          'united kingdom': 'GB',
          uk: 'GB',
          canada: 'CA',
          australia: 'AU',
          germany: 'DE',
          spain: 'ES',
          japan: 'JP',
          uae: 'AE',
          'united arab emirates': 'AE',
        };

        const countryCode =
          countryCodeMap[country.toLowerCase()] || country.substring(0, 2).toUpperCase();
        const normalizedVisaType = visaType.toLowerCase().includes('student')
          ? 'student'
          : 'tourist';

        const fallbackItems = getFallbackChecklist(
          countryCode,
          normalizedVisaType as 'student' | 'tourist'
        );

        parsed = {
          type: visaType,
          country: country,
          checklist: fallbackItems,
          aiFallbackUsed: true,
        };

        logInfo('[OpenAI][Checklist] Using fallback checklist', {
          country,
          visaType,
          itemCount: fallbackItems.length,
        });
      } else {
        // Auto-translate missing translations
        if (validationResult.warnings.some((w: string) => w.includes('Missing'))) {
          logInfo('[OpenAI][Checklist] Auto-translating missing translations');
          await autoTranslateChecklistItems(parsed.checklist);
        }

        // Auto-correct any remaining issues
        const { autoCorrectChecklist } = await import('../utils/json-validator');
        parsed = autoCorrectChecklist(parsed, country, visaType);

        logInfo('[OpenAI][Checklist] Validation passed after corrections', {
          country,
          visaType,
          itemCount: parsed.checklist.length,
          warnings: validationResult.warnings.length,
        });
      }

      // Final logging for checklist generation
      logInfo('[OpenAI][Checklist] Checklist generation completed', {
        model: this.MODEL,
        country,
        visaType,
        tokensUsed: totalTokens,
        inputTokens,
        outputTokens,
        responseTimeMs: responseTime,
        itemCount: parsed.checklist?.length || 0,
      });

      // Ensure the response has the correct structure
      // If validation failed and we're using fallback, parsed should already have a valid checklist
      if (!parsed || !parsed.checklist || !Array.isArray(parsed.checklist)) {
        logError(
          '[OpenAI][Checklist] Final validation failed - checklist is missing or invalid, using fallback',
          new Error('Invalid checklist format from AI: missing or invalid checklist array'),
          {
            country,
            visaType,
            hasParsed: !!parsed,
            checklistType: parsed?.checklist ? typeof parsed.checklist : 'undefined',
            isArray: Array.isArray(parsed?.checklist),
          }
        );

        // Get fallback checklist as last resort
        const countryCodeMap: Record<string, string> = {
          'united states': 'US',
          usa: 'US',
          'united kingdom': 'GB',
          uk: 'GB',
          canada: 'CA',
          australia: 'AU',
          germany: 'DE',
          spain: 'ES',
          japan: 'JP',
          uae: 'AE',
          'united arab emirates': 'AE',
        };

        const countryCode =
          countryCodeMap[country.toLowerCase()] || country.substring(0, 2).toUpperCase();
        const normalizedVisaType = visaType.toLowerCase().includes('student')
          ? 'student'
          : 'tourist';

        const fallbackItems = getFallbackChecklist(
          countryCode,
          normalizedVisaType as 'student' | 'tourist'
        );

        parsed = {
          type: visaType,
          country: country,
          checklist: fallbackItems,
          aiFallbackUsed: true,
        };

        logInfo('[OpenAI][Checklist] Using emergency fallback checklist', {
          country,
          visaType,
          itemCount: fallbackItems.length,
        });
      }

      // Validate that checklist is not empty
      if (parsed.checklist.length === 0) {
        logError(
          '[OpenAI][Checklist] Checklist is empty, using fallback',
          new Error('AI returned empty checklist array'),
          {
            country,
            visaType,
          }
        );

        // Get fallback checklist
        const countryCodeMap: Record<string, string> = {
          'united states': 'US',
          usa: 'US',
          'united kingdom': 'GB',
          uk: 'GB',
          canada: 'CA',
          australia: 'AU',
          germany: 'DE',
          spain: 'ES',
          japan: 'JP',
          uae: 'AE',
          'united arab emirates': 'AE',
        };

        const countryCode =
          countryCodeMap[country.toLowerCase()] || country.substring(0, 2).toUpperCase();
        const normalizedVisaType = visaType.toLowerCase().includes('student')
          ? 'student'
          : 'tourist';

        const fallbackItems = getFallbackChecklist(
          countryCode,
          normalizedVisaType as 'student' | 'tourist'
        );

        parsed = {
          type: visaType,
          country: country,
          checklist: fallbackItems,
          aiFallbackUsed: true,
        };
      }

      // STEP 3: Handle "too few items" gracefully - warn but don't fail
      const { MIN_ITEMS_HARD, IDEAL_MIN_ITEMS, MAX_ITEMS_HARD, IDEAL_MAX_ITEMS } = await import(
        '../config/checklist-config'
      );
      const itemCount = parsed.checklist.length;

      if (itemCount < MIN_ITEMS_HARD) {
        logWarn('[OpenAI][Checklist] AI returned too few items, minimum required', {
          country,
          visaType,
          itemCount,
          minimumRequired: MIN_ITEMS_HARD,
        });
      } else if (itemCount < IDEAL_MIN_ITEMS) {
        logWarn('[OpenAI][Checklist] AI returned fewer than ideal items', {
          country,
          visaType,
          itemCount,
          idealMin: IDEAL_MIN_ITEMS,
        });

        // Instead of throwing, we'll return what we have and let the caller decide
        // The document-checklist.service can merge with fallback items if needed
        // This makes the system more resilient to AI inconsistencies
      }

      // Warn if too many items (but don't fail)
      if (parsed.checklist.length > IDEAL_MAX_ITEMS) {
        logWarn('[OpenAI][Checklist] AI returned more than recommended items', {
          country,
          visaType,
          itemCount: parsed.checklist.length,
          recommendedMax: IDEAL_MAX_ITEMS,
        });
      }

      // Validate required fields for each item
      for (const item of parsed.checklist) {
        if (!item.document && !item.name) {
          throw new Error('Invalid checklist item: missing document or name field');
        }
      }

      // Import helper for category consistency
      const { ensureCategoryConsistency } = await import('../utils/checklist-helpers');

      // Validate and enrich checklist items with category support
      const enrichedChecklist = parsed.checklist.map((item: any) => {
        // Ensure category consistency (handle both new format with category and old format)
        const { category, required, priority } = ensureCategoryConsistency({
          category: (item.category === 'required' ||
          item.category === 'highly_recommended' ||
          item.category === 'optional'
            ? item.category
            : 'optional') as 'required' | 'highly_recommended' | 'optional',
          required: item.required,
          priority: item.priority || (item.required ? 'high' : 'medium'),
        });

        return {
          document: item.document || item.name || 'Unknown',
          name: item.name || item.document || 'Unknown',
          nameUz: item.nameUz || item.name || item.document || "Noma'lum",
          nameRu: item.nameRu || item.name || item.document || 'Неизвестно',
          category, // NEW: Explicit category field
          required, // Derived from category or kept from AI response
          description: item.description || '',
          descriptionUz: item.descriptionUz || item.description || '',
          descriptionRu: item.descriptionRu || item.description || '',
          priority, // Ensured to match category
          whereToObtain: item.whereToObtain || '',
          whereToObtainUz: item.whereToObtainUz || item.whereToObtain || '',
          whereToObtainRu: item.whereToObtainRu || item.whereToObtain || '',
        };
      });

      return {
        type: parsed.type || visaType,
        checklist: enrichedChecklist,
      };
    } catch (error: any) {
      // STEP 3: Enhanced error logging (no sensitive user data)
      // Note: startTime may not be in scope if error occurs before declaration
      const errorResponseTime = Date.now() - startTime;
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
          responseTimeMs: errorResponseTime,
        }
      );

      // Return a basic fallback checklist with multilingual support
      // Note: This is a minimal fallback for API errors. DocumentChecklistService
      // will use generateRobustFallbackChecklist() for better fallback behavior.
      const { ensureCategoryConsistency } = await import('../utils/checklist-helpers');

      const isStudent =
        visaType.toLowerCase().includes('student') || visaType.toLowerCase().includes('study');

      const baseChecklistItems = [
        {
          document: 'passport',
          name: 'Passport',
          nameUz: 'Pasport',
          nameRu: 'Паспорт',
          required: true,
          description: 'Valid passport with at least 6 months validity',
          descriptionUz: 'Kamida 6 oy muddati qolgan yaroqli pasport',
          descriptionRu: 'Действительный паспорт со сроком действия не менее 6 месяцев',
          priority: 'high' as const,
          whereToObtain: 'Apply at migration service or internal affairs office',
          whereToObtainUz: 'Migratsiya xizmatiga yoki Ichki ishlar organlariga murojaat qiling',
          whereToObtainRu: 'Обратитесь в службу миграции или органы внутренних дел',
        },
        {
          document: 'passport_photo',
          name: 'Passport Photo',
          nameUz: 'Pasport Fotosi',
          nameRu: 'Фото на Паспорт',
          required: true,
          description: '2x2 inch photo with white background',
          descriptionUz: '2x2 dyuymli foto, oq fon',
          descriptionRu: 'Фото 2x2 дюйма на белом фоне',
          priority: 'high' as const,
          whereToObtain: 'Take at photo studio',
          whereToObtainUz: 'Foto studiyada oling',
          whereToObtainRu: 'Сделайте в фотостудии',
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
          priority: 'high' as const,
          whereToObtain: 'Download from embassy/consulate website or VFS center',
          whereToObtainUz: 'Elchixona/konsullik veb-saytidan yoki VFS markazidan yuklab oling',
          whereToObtainRu: 'Скачайте с веб-сайта посольства/консульства или центра VFS',
        },
        {
          document: 'bank_statement',
          name: 'Bank Statement',
          nameUz: 'Bank Hisobi',
          nameRu: 'Банковская Выписка',
          required: true,
          description: 'Recent bank statement showing sufficient funds',
          descriptionUz: "Yeterli mablag'ni ko'rsatadigan so'nggi bank hisobi",
          descriptionRu: 'Недавняя банковская выписка, показывающая достаточные средства',
          priority: 'high' as const,
          whereToObtain: 'Obtain from your bank',
          whereToObtainUz: 'Bankingizdan oling',
          whereToObtainRu: 'Получите в вашем банке',
        },
      ];

      // Add student-specific documents if applicable
      if (isStudent) {
        baseChecklistItems.push({
          document: 'acceptance_letter',
          name: 'Acceptance Letter',
          nameUz: 'Qabul Xati',
          nameRu: 'Письмо о Зачислении',
          required: true,
          description: 'Official acceptance letter from educational institution',
          descriptionUz: "Ta'lim muassasasidan rasmiy qabul xati",
          descriptionRu: 'Официальное письмо о зачислении от учебного заведения',
          priority: 'high' as const,
          whereToObtain: 'Request from your school or university',
          whereToObtainUz: "Maktabingiz yoki universitetingizdan so'rang",
          whereToObtainRu: 'Запросите в вашей школе или университете',
        });
      }

      // Ensure all items have category field
      const baseChecklist = baseChecklistItems.map((item) => {
        const { category, required, priority } = ensureCategoryConsistency({
          category: 'required', // All fallback items are required
          required: item.required,
          priority: item.priority,
        });
        return {
          ...item,
          category,
          required,
          priority,
        };
      });

      return {
        type: visaType,
        checklist: baseChecklist,
      };
    }
  }

  /**
   * Extract JSON from OpenAI response
   * Handles cases where JSON is wrapped in markdown code fences or has extra text
   */
  private static extractJson(raw: string): string {
    // If the model wraps JSON in ```json ... ```
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/i);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }

    // If wrapped in generic ``` ... ```
    const genericMatch = raw.match(/```\s*([\s\S]*?)\s*```/);
    if (genericMatch) {
      return genericMatch[1].trim();
    }

    // Try to find JSON object boundaries
    const jsonObjectMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      return jsonObjectMatch[0].trim();
    }

    // Return trimmed raw content as fallback
    return raw.trim();
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

  /**
   * Generate checklist using legacy mode (GPT-4 structured output)
   * Used when no VisaRuleSet exists for the country/visa type
   *
   * @param application - Application object with country and visaType
   * @param aiUserContext - AI user context with questionnaire data
   * @returns Checklist response with items array
   */
  static async generateChecklistLegacy(
    application: { country: { code: string; name: string }; visaType: { name: string } },
    aiUserContext: any
  ): Promise<{
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
  }> {
    const country = application.country.name;
    const visaType = application.visaType.name;
    const countryCode = application.country.code.toUpperCase();

    logInfo('[OpenAI][Checklist][Legacy] Generating checklist with structured output', {
      country,
      visaType,
      countryCode,
    });

    const startTime = Date.now();

    try {
      // Import dependencies
      const { getVisaKnowledgeBase } = await import('../data/visaKnowledgeBase');
      const { getRelevantDocumentGuides } = await import('../data/documentGuides');
      const { MIN_ITEMS_HARD, IDEAL_MIN_ITEMS } = await import('../config/checklist-config');

      // Get visa knowledge base and document guides
      const visaKb = getVisaKnowledgeBase(country, visaType.toLowerCase() as 'tourist' | 'student');
      const userQuery = JSON.stringify(aiUserContext);
      const documentGuidesText = getRelevantDocumentGuides(userQuery, 3);

      // Extract explicit questionnaire data for prompt
      const summary = aiUserContext.questionnaireSummary;
      const purpose = summary?.travelInfo?.purpose || summary?.visaType || 'tourism';
      const duration = summary?.travelInfo?.duration || summary?.duration || 'Not specified';
      const sponsorType =
        summary?.sponsorType || (summary?.financialInfo?.sponsorDetails ? 'sponsor' : 'self');
      const employmentStatus = summary?.employment?.currentStatus || 'Not specified';
      const hasInvitation =
        summary?.hasUniversityInvitation || summary?.hasOtherInvitation || false;
      const travelHistory =
        summary?.hasInternationalTravel || summary?.travelHistory?.traveledBefore || false;
      const previousRefusals =
        summary?.previousVisaRejections || summary?.travelHistory?.hasRefusals || false;
      const bankBalance = summary?.bankBalanceUSD || summary?.financialInfo?.selfFundsUSD;
      const monthlyIncome = summary?.monthlyIncomeUSD || summary?.employment?.monthlySalaryUSD;
      const hasProperty = summary?.hasPropertyInUzbekistan || summary?.ties?.propertyDocs || false;
      const hasFamily = summary?.hasFamilyInUzbekistan || summary?.ties?.familyTies || false;
      const hasChildren = summary?.hasChildren && summary.hasChildren !== 'no';
      const age = summary?.age || aiUserContext.userProfile?.age;
      const riskScore = aiUserContext.riskScore;

      // Build compact system prompt (COMPACT VERSION)
      const useCompactPrompts = process.env.USE_COMPACT_CHECKLIST_PROMPTS !== 'false'; // Default: true

      const systemPrompt = useCompactPrompts
        ? this.buildLegacySystemPromptCompact(country, visaType, MIN_ITEMS_HARD, IDEAL_MIN_ITEMS)
        : this.buildLegacySystemPromptLegacy(country, visaType, MIN_ITEMS_HARD, IDEAL_MIN_ITEMS);

      // Build compact user prompt using CanonicalAIUserContext
      let userPrompt: string;
      if (useCompactPrompts) {
        const { buildCanonicalAIUserContext } = await import('./ai-context.service');
        const canonical = await buildCanonicalAIUserContext(aiUserContext);
        userPrompt = this.buildLegacyUserPromptCompact(
          canonical,
          country,
          countryCode,
          visaType,
          visaKb,
          documentGuidesText,
          MIN_ITEMS_HARD,
          IDEAL_MIN_ITEMS
        );
      } else {
        userPrompt = this.buildLegacyUserPromptLegacy(
          aiUserContext,
          country,
          countryCode,
          visaType,
          purpose,
          duration,
          employmentStatus,
          sponsorType,
          bankBalance,
          monthlyIncome,
          hasInvitation,
          travelHistory,
          previousRefusals,
          hasProperty,
          hasFamily,
          hasChildren,
          age,
          riskScore,
          visaKb,
          documentGuidesText,
          MIN_ITEMS_HARD,
          IDEAL_MIN_ITEMS
        );
      }

      // Call GPT-4 with structured output using centralized config
      const aiConfig = getAIConfig('checklistLegacy');

      logInfo('[OpenAI][Checklist][Legacy] Calling GPT-4 with centralized config', {
        model: aiConfig.model,
        country,
        visaType,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
      });

      const response = await this.callChecklistAPI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: aiConfig.temperature,
          max_completion_tokens: aiConfig.maxTokens,
          response_format: aiConfig.responseFormat || undefined,
        },
        {
          country,
          visaType,
          mode: 'legacy',
        }
      );

      const rawContent = response.choices[0]?.message?.content || '{}';
      const responseTime = Date.now() - startTime;

      logInfo('[OpenAI][Checklist][Legacy] GPT-4 response received', {
        model: response?.model || this.getChecklistModel(),
        country,
        visaType,
        responseLength: rawContent.length,
        responseTimeMs: responseTime,
      });

      // Parse and validate
      const { parseAndValidateChecklistResponse } = await import('../utils/json-validator');
      const parseResult = parseAndValidateChecklistResponse(rawContent, country, visaType, 1);

      if (!parseResult.validation.isValid) {
        logWarn('[OpenAI][Checklist][Legacy] Validation failed, will retry or use fallback', {
          country,
          visaType,
          errors: parseResult.validation.errors,
        });
        // Return null so caller can use fallback
        return null as any;
      }

      const parsed = parseResult.parsed;

      if (!parsed || !parsed.checklist) {
        throw new Error('Invalid checklist response: missing checklist array');
      }

      // Auto-translate missing translations if needed
      if (parseResult.validation.warnings.some((w: string) => w.includes('Missing'))) {
        const { autoTranslateChecklistItems } = await import('../utils/translation-helper');
        await autoTranslateChecklistItems(parsed.checklist);
      }

      logInfo('[OpenAI][Checklist][Legacy] Checklist generated successfully', {
        country,
        visaType,
        itemCount: parsed.checklist.length,
      });

      return {
        type: visaType,
        checklist: parsed.checklist as any, // Type assertion needed due to legacy format compatibility
      };
    } catch (error: any) {
      logError('[OpenAI][Checklist][Legacy] Generation failed', error as Error, {
        country,
        visaType,
      });
      // Return null so caller can use fallback
      return null as any;
    }
  }

  /**
   * Build compact legacy system prompt (COMPACT VERSION)
   */
  private static buildLegacySystemPromptCompact(
    country: string,
    visaType: string,
    minItems: number,
    idealItems: number
  ): string {
    return `Generate visa document checklist for Uzbek applicants.

OUTPUT SCHEMA:
{
  "checklist": [
    {
      "document": "string",
      "name": "string",
      "nameUz": "string",
      "nameRu": "string",
      "category": "required" | "highly_recommended" | "optional",
      "required": boolean,
      "description": "string",
      "descriptionUz": "string",
      "descriptionRu": "string",
      "priority": "high" | "medium" | "low",
      "whereToObtain": "string",
      "whereToObtainUz": "string",
      "whereToObtainRu": "string"
    }
  ]
}

RULES:
- Output ${minItems}-${idealItems} items
- Include all 3 categories
- Use country-specific terms (I-20/USA, LOA/Canada, CAS/UK)
- Complete EN/UZ/RU translations
- whereToObtain: realistic for Uzbekistan

Return ONLY valid JSON.`;
  }

  /**
   * Build compact legacy user prompt using CanonicalAIUserContext (COMPACT VERSION)
   */
  private static buildLegacyUserPromptCompact(
    canonical: any,
    country: string,
    countryCode: string,
    visaType: string,
    visaKb: string,
    documentGuidesText: string,
    minItems: number,
    idealItems: number
  ): string {
    const profile = canonical.applicantProfile;
    const riskScore = canonical.riskScore;

    const context = {
      country: `${country} (${countryCode})`,
      visaType,
      sponsorType: profile.sponsorType,
      currentStatus: profile.currentStatus,
      bankBalanceUSD: profile.bankBalanceUSD,
      monthlyIncomeUSD: profile.monthlyIncomeUSD,
      hasInternationalTravel: profile.hasInternationalTravel,
      previousVisaRejections: profile.previousVisaRejections,
      hasProperty: profile.hasPropertyInUzbekistan,
      hasFamily: profile.hasFamilyInUzbekistan,
      hasChildren: profile.hasChildren,
      riskLevel: riskScore.level,
      riskProbability: riskScore.probabilityPercent,
    };

    return `APPLICANT_CONTEXT:
${JSON.stringify(context, null, 2)}

${visaKb ? `KNOWLEDGE_BASE:\n${visaKb.substring(0, 800)}\n` : ''}
${documentGuidesText ? `DOCUMENT_GUIDES:\n${documentGuidesText.substring(0, 500)}\n` : ''}

Generate ${minItems}-${idealItems} items. Return ONLY valid JSON.`;
  }

  /**
   * OLD LEGACY SYSTEM PROMPT (kept for reference/rollback)
   */
  private static buildLegacySystemPromptLegacy(
    country: string,
    visaType: string,
    minItems: number,
    idealItems: number
  ): string {
    return `You are a visa document checklist generator specialized for Uzbek applicants.

Your task: Generate a personalized document checklist using structured JSON output.

OUTPUT SCHEMA (JSON):
{
  "checklist": [
    {
      "document": "passport",
      "name": "Valid Passport",
      "nameUz": "...",
      "nameRu": "...",
      "category": "required" | "highly_recommended" | "optional",
      "required": true,
      "description": "...",
      "descriptionUz": "...",
      "descriptionRu": "...",
      "priority": "high" | "medium" | "low",
      "whereToObtain": "...",
      "whereToObtainUz": "...",
      "whereToObtainRu": "..."
    }
  ]
}

RULES:
- Output at least ${minItems} items (${idealItems}+ is ideal)
- Include ALL THREE categories: required, highly_recommended, optional
- Use country-specific terminology (I-20 for USA, LOA for Canada, CAS for UK, etc.)
- All items must have complete EN, UZ, RU translations
- whereToObtain must be realistic for Uzbekistan

Return ONLY valid JSON, no markdown, no comments.`;
  }

  /**
   * OLD LEGACY USER PROMPT (kept for reference/rollback)
   */
  private static buildLegacyUserPromptLegacy(
    aiUserContext: any,
    country: string,
    countryCode: string,
    visaType: string,
    purpose: string,
    duration: string,
    employmentStatus: string,
    sponsorType: string,
    bankBalance: number | null,
    monthlyIncome: number | null,
    hasInvitation: boolean,
    travelHistory: boolean,
    previousRefusals: boolean,
    hasProperty: boolean,
    hasFamily: boolean,
    hasChildren: boolean,
    age: number | null,
    riskScore: any,
    visaKb: string,
    documentGuidesText: string,
    minItems: number,
    idealItems: number
  ): string {
    return `Generate a personalized visa document checklist.

APPLICANT INFORMATION:
- Destination: ${country} (${countryCode})
- Visa Type: ${visaType}
- Purpose: ${purpose}
- Stay Duration: ${duration}
- Employment: ${employmentStatus}
- Sponsor: ${sponsorType === 'self' ? 'Self-funded' : `Sponsored by ${sponsorType}`}
- Income/Savings: ${bankBalance ? `~$${bankBalance}` : monthlyIncome ? `~$${monthlyIncome}/month` : 'Not specified'}
- Has Invitation: ${hasInvitation ? 'Yes' : 'No'}
- Travel History: ${travelHistory ? 'Has previous international travel' : 'No previous travel'}
- Previous Refusals: ${previousRefusals ? 'Yes' : 'No'}
- Ties to Home: ${hasProperty ? 'Has property' : ''}${hasFamily ? (hasProperty ? ', has family' : 'Has family') : ''}${hasChildren ? (hasProperty || hasFamily ? ', has children' : 'Has children') : ''}${!hasProperty && !hasFamily && !hasChildren ? 'Standard ties' : ''}
- Age: ${age || 'Not specified'}
- Risk Level: ${riskScore ? `${riskScore.level} (${riskScore.probabilityPercent}%)` : 'Not calculated'}

${visaKb ? `\nKNOWLEDGE BASE:\n${visaKb.substring(0, 1000)}` : ''}
${documentGuidesText ? `\nDOCUMENT GUIDES:\n${documentGuidesText}` : ''}

Generate checklist with at least ${minItems} items (${idealItems}+ is ideal). Return ONLY valid JSON.`;
  }
}

export default AIOpenAIService;
