import { getEnvConfig } from '../../config/env';

export interface KetdikConfig {
  apiKey: string;
  baseUrl: string;
  modelId: string;
  timeoutMs: number;
}

export function getKetdikConfig(): KetdikConfig {
  const env = getEnvConfig();

  if (!env.TOGETHER_API_KEY) {
    throw new Error('TOGETHER_API_KEY is required to call Ketdik (Together.ai).');
  }

  return {
    apiKey: env.TOGETHER_API_KEY,
    baseUrl: env.TOGETHER_BASE_URL || 'https://api.together.ai/v1',
    modelId: env.KETDIK_MODEL_ID || 'murodbekshamsid_9585/DeepSeek-R1-ketdik-r1-v1-9cf6dce1',
    timeoutMs: env.KETDIK_TIMEOUT_MS || 20000,
  };
}
