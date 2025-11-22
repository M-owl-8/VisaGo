import axios from 'axios';

/**
 * DeepSeek Service (via Together.ai)
 * Handles DeepSeek-R1 API calls for AI assistant chat using Together.ai as the provider
 */

const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';

if (!process.env.DEEPSEEK_API_KEY) {
  console.warn('⚠️ DEEPSEEK_API_KEY is not set in environment variables.');
}

export interface DeepSeekResponse {
  message: string;
  tokensUsed: number;
  model: string;
}

/**
 * Call DeepSeek-R1 for visa chat assistant (via Together.ai)
 * @param userMessage - The user's message
 * @param systemPrompt - Optional custom system prompt
 * @returns AI response with message, tokens, and model
 */
export async function deepseekVisaChat(
  userMessage: string,
  systemPrompt?: string
): Promise<DeepSeekResponse> {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    const defaultSystemPrompt =
      systemPrompt ||
      "You are Ketdik's main visa assistant. You help users understand visa requirements, eligibility, risks, and documents. Always think step-by-step, but only return a clear final answer to the user. If something is uncertain or depends on the embassy, clearly warn the user and avoid guessing.";

    console.log('[DeepSeek/Together] Sending visa chat request with model deepseek-ai/DeepSeek-R1');

    const response = await axios.post(
      TOGETHER_API_URL,
      {
        model: 'deepseek-ai/DeepSeek-R1',
        messages: [
          {
            role: 'system',
            content: defaultSystemPrompt,
          },
          { role: 'user', content: userMessage },
        ],
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 second timeout
      }
    );

    const content = response.data?.choices?.[0]?.message?.content ?? null;

    if (!content) {
      throw new Error('Empty response from Together.ai');
    }

    // Extract token usage if available
    const tokensUsed = response.data?.usage?.total_tokens || 0;
    const modelName = response.data?.model || 'deepseek-ai/DeepSeek-R1';

    console.log(
      `[DeepSeek/Together] Response received from model: ${modelName}, tokens used: ${tokensUsed}`
    );

    return {
      message: content,
      tokensUsed,
      model: 'deepseek-ai/DeepSeek-R1',
    };
  } catch (err: any) {
    console.error('DeepSeek/Together visa chat error:', err?.response?.data || err?.message || err);

    // Provide user-friendly error messages
    if (err?.response?.status === 401) {
      throw new Error('DEEPSEEK_AUTH_ERROR');
    }
    if (err?.response?.status === 429) {
      throw new Error('DEEPSEEK_RATE_LIMIT');
    }
    if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT') {
      throw new Error('DEEPSEEK_TIMEOUT');
    }

    throw new Error('DEEPSEEK_CHAT_ERROR');
  }
}
