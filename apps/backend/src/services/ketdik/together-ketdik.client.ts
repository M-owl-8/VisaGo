import axios, { AxiosError } from 'axios';
import { logInfo, logWarn, logError } from '../../middleware/logger';
import { getKetdikConfig } from './ketdik.config';

export interface KetdikChatResponse {
  content: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  requestId?: string;
}

function shouldRetry(error: AxiosError): boolean {
  if (error.code === 'ECONNABORTED') return true;
  const status = error.response?.status;
  return status !== undefined && status >= 500;
}

export async function callKetdikChat(
  systemPrompt: string,
  userMessage: string
): Promise<KetdikChatResponse> {
  const config = getKetdikConfig();
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const payload = {
    model: config.modelId,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 700,
    stream: false,
  };

  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };

  let attempt = 0;
  const maxAttempts = 2; // initial + 1 retry

  while (attempt < maxAttempts) {
    const start = Date.now();
    try {
      const response = await axios.post(url, payload, {
        headers,
        timeout: config.timeoutMs,
      });

      const data = response.data;
      const choice = data?.choices?.[0];
      const content = choice?.message?.content;

      const usage = data?.usage || {};

      logInfo('[Ketdik][Together] Response received', {
        latencyMs: Date.now() - start,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        requestId: response.headers?.['x-request-id'],
      });

      if (!content) {
        throw new Error('Empty response content from Together.ai');
      }

      return {
        content,
        model: config.modelId,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        requestId: response.headers?.['x-request-id'] as string | undefined,
      };
    } catch (err) {
      attempt += 1;
      const axiosError = err as AxiosError;

      const status = axiosError.response?.status;
      const requestId = (axiosError.response?.headers as any)?.['x-request-id'];
      const shouldTryAgain = attempt < maxAttempts && shouldRetry(axiosError);

      const logPayload = {
        attempt,
        status,
        code: axiosError.code,
        message: axiosError.message,
        requestId,
      };

      if (shouldTryAgain) {
        logWarn('[Ketdik][Together] Request failed, retrying once', logPayload);
        continue;
      }

      logError('[Ketdik][Together] Request failed', axiosError, logPayload);
      throw axiosError;
    }
  }

  throw new Error('Unable to reach Together.ai after retries');
}
