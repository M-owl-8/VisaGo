import axios from 'axios';
import { logInfo, logWarn, logError } from '../middleware/logger';

/**
 * DeepSeek Service (via Together.ai)
 * Handles DeepSeek-R1 API calls for AI assistant chat using Together.ai as the provider
 *
 * Optimizations (2025-01-XX):
 * - Bounded response tokens (max_completion_tokens: 500)
 * - Lower temperature (0.5) for more focused responses
 * - 15s timeout with friendly error messages
 * - Conversation history trimming (handled in chat.service.ts)
 * - Comprehensive logging ([DeepSeek][Chat] format)
 */

const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
// DeepSeek-R1 is a reasoning model that requires more time for thoughtful responses
// Increased timeout to 45 seconds to accommodate reasoning process
const REQUEST_TIMEOUT_MS = 45000; // 45 seconds (DeepSeek-R1 needs time for reasoning)
const MAX_COMPLETION_TOKENS = 2000; // Increased for more complete responses
const TEMPERATURE = 0.7; // Slightly higher for more natural conversation

if (!process.env.DEEPSEEK_API_KEY) {
  console.warn('⚠️ DEEPSEEK_API_KEY is not set in environment variables.');
}

export interface DeepSeekResponse {
  message: string;
  tokensUsed: number;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Call DeepSeek-R1 for visa chat assistant (via Together.ai)
 * @param messages - Array of messages (system, user, assistant) - history is pre-trimmed
 * @param systemPrompt - Optional custom system prompt (if not in messages)
 * @param userId - User ID for logging
 * @param applicationId - Optional application ID for logging
 * @returns AI response with message, tokens, and model
 */
export async function deepseekVisaChat(
  messages: DeepSeekMessage[],
  systemPrompt?: string,
  userId?: string,
  applicationId?: string
): Promise<DeepSeekResponse> {
  const startTime = Date.now();
  const modelName = 'deepseek-ai/DeepSeek-R1';

  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    // Ensure system prompt is included
    let finalMessages = messages;
    if (systemPrompt && !messages.some((m) => m.role === 'system')) {
      finalMessages = [{ role: 'system', content: systemPrompt }, ...messages];
    }

    logInfo('[DeepSeek][Chat] Request started', {
      model: modelName,
      userId,
      applicationId,
      messageCount: finalMessages.length,
      systemPromptLength: systemPrompt?.length || 0,
    });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('DEEPSEEK_TIMEOUT'));
      }, REQUEST_TIMEOUT_MS);
    });

    // Create API request promise
    const apiPromise = axios.post(
      TOGETHER_API_URL,
      {
        model: modelName,
        messages: finalMessages,
        stream: false,
        max_tokens: MAX_COMPLETION_TOKENS,
        temperature: TEMPERATURE,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    // Race between API call and timeout
    const response = await Promise.race([apiPromise, timeoutPromise]);

    const responseTime = Date.now() - startTime;
    const rawContent = response.data?.choices?.[0]?.message?.content ?? null;

    if (!rawContent) {
      throw new Error('Empty response from Together.ai');
    }

    // Strip <think> tags from DeepSeek reasoning output
    // DeepSeek-R1 includes reasoning in <think>...</think> blocks which should not be shown to users
    const content = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Extract token usage if available
    const promptTokens = response.data?.usage?.prompt_tokens || 0;
    const completionTokens = response.data?.usage?.completion_tokens || 0;
    const totalTokens = response.data?.usage?.total_tokens || promptTokens + completionTokens;

    logInfo('[DeepSeek][Chat] Response received', {
      model: modelName,
      userId,
      applicationId,
      tokensUsed: totalTokens,
      promptTokens,
      completionTokens,
      responseTimeMs: responseTime,
    });

    // Warn if response is slow
    if (responseTime > 4000) {
      logWarn('[DeepSeek][Chat] Slow response', {
        model: modelName,
        userId,
        applicationId,
        responseTimeMs: responseTime,
        tokensUsed: totalTokens,
      });
    }

    return {
      message: content,
      tokensUsed: totalTokens,
      promptTokens,
      completionTokens,
      model: modelName,
    };
  } catch (err: any) {
    const responseTime = Date.now() - startTime;

    // Handle timeout specifically
    if (
      err?.code === 'ECONNABORTED' ||
      err?.code === 'ETIMEDOUT' ||
      err?.message === 'DEEPSEEK_TIMEOUT'
    ) {
      logWarn('[DeepSeek][Chat] Timeout', {
        model: modelName,
        userId,
        applicationId,
        responseTimeMs: responseTime,
        timeoutMs: REQUEST_TIMEOUT_MS,
      });
      throw new Error('DEEPSEEK_TIMEOUT');
    }

    logError('[DeepSeek][Chat] Error', err instanceof Error ? err : new Error(String(err)), {
      model: modelName,
      userId,
      applicationId,
      responseTimeMs: responseTime,
      errorType: err?.response?.status || err?.code || 'unknown',
    });

    // Provide user-friendly error messages
    if (err?.response?.status === 401) {
      throw new Error('DEEPSEEK_AUTH_ERROR');
    }
    if (err?.response?.status === 429) {
      throw new Error('DEEPSEEK_RATE_LIMIT');
    }

    throw new Error('DEEPSEEK_CHAT_ERROR');
  }
}
