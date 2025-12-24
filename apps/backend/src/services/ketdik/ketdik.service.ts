import { AIOpenAIService } from '../ai-openai.service';
import { KETDIK_SYSTEM_PROMPT } from './ketdik.system-prompt';
import { callKetdikChat } from './together-ketdik.client';
import { isKetdikResponseSafe } from './ketdik.response-guard';
import { logInfo, logWarn } from '../../middleware/logger';
import { getAIConfig } from '../../config/ai-models';

export interface KetdikRequest {
  message: string;
  language?: 'uz' | 'ru' | 'en';
  country?: string;
  visaType?: string;
  userId?: string;
  applicationId?: string;
}

export interface KetdikResult {
  answer: string;
  model: string;
  usedFallback: boolean;
}

export async function getKetdikInstruction(params: KetdikRequest): Promise<KetdikResult> {
  const { message, language, country, visaType, userId, applicationId } = params;

  const languageLine = language
    ? `Respond in ${language}.`
    : 'Respond in the user language if provided.';
  const contextLines = [
    country ? `Country: ${country}` : '',
    visaType ? `Visa type: ${visaType}` : '',
    languageLine,
  ]
    .filter(Boolean)
    .join('\n');

  const systemPrompt = [KETDIK_SYSTEM_PROMPT, contextLines].filter(Boolean).join('\n\n');

  try {
    const start = Date.now();
    const response = await callKetdikChat(systemPrompt, message);

    const safe = isKetdikResponseSafe(response.content);
    const latencyMs = Date.now() - start;

    if (!safe) {
      logWarn('[Ketdik] Response flagged as unsafe, will fallback', {
        userId,
        applicationId,
        model: response.model,
        latencyMs,
      });
      return await fallbackToOpenAI(systemPrompt, message);
    }

    logInfo('[Ketdik] Instruction generated', {
      userId,
      applicationId,
      model: response.model,
      latencyMs,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      totalTokens: response.totalTokens,
      requestId: response.requestId,
      usedFallback: false,
    });

    return {
      answer: response.content,
      model: 'ketdik',
      usedFallback: false,
    };
  } catch (error: any) {
    logWarn('[Ketdik] Falling back due to Together error', {
      userId,
      applicationId,
      error: error?.message || String(error),
    });
    return await fallbackToOpenAI(systemPrompt, message);
  }
}

async function fallbackToOpenAI(systemPrompt: string, userMessage: string): Promise<KetdikResult> {
  const aiConfig = getAIConfig('chat');
  const client = AIOpenAIService.getOpenAIClient();
  const start = Date.now();
  const chatResponse = await client.chat.completions.create({
    model: aiConfig.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: aiConfig.temperature ?? 0.3,
    max_tokens: Math.min(aiConfig.maxTokens || 700, 700),
  });

  const answer =
    chatResponse.choices?.[0]?.message?.content ||
    'I am not certain. Please check the official embassy or VFS website for document instructions.';

  logInfo('[Ketdik][Fallback] OpenAI used', {
    latencyMs: Date.now() - start,
    model: aiConfig.model,
    usedFallback: true,
  });

  return {
    answer,
    model: aiConfig.model,
    usedFallback: true,
  };
}
