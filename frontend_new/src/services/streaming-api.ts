/**
 * Streaming API Client
 * Handles streaming responses for AI chat with progressive text rendering
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

// Determine API URL based on environment
// IMPORTANT: Physical devices ALWAYS use Railway URL (or env var)
// Only emulators/simulators can use localhost/10.0.2.2 (via explicit env var)
const getApiBaseUrl = (): string => {
  // Priority 1: Environment variable (set at build time)
  // If explicitly set, use it (even if localhost/10.0.2.2 for emulator development)
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL.trim();
    if (envUrl) {
      return envUrl;
    }
  }
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) {
    const envUrl = process.env.REACT_APP_API_URL.trim();
    if (envUrl) {
      return envUrl;
    }
  }

  // Priority 2: Always use Railway URL by default
  // This ensures physical devices NEVER try to connect to localhost/10.0.2.2
  // For emulator development, set EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 explicitly
  return 'https://visago-production.up.railway.app';
};

const API_BASE_URL = getApiBaseUrl();

export interface StreamingOptions {
  onChunk: (chunk: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  language?: 'en' | 'uz' | 'ru';
  applicationId?: string;
  conversationHistory?: any[];
}

export class StreamingApiClient {
  private baseURL = `${API_BASE_URL}/api`;
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * Send message with streaming response
   * @param content - Message content
   * @param options - Streaming options
   * @returns Function to abort the stream
   */
  async sendMessageStream(
    content: string,
    options: StreamingOptions,
  ): Promise<{abort: () => void; messageId: string}> {
    const streamId = `stream_${Date.now()}`;
    const abortController = new AbortController();
    this.abortControllers.set(streamId, abortController);

    let messageId = '';
    let fullText = '';

    try {
      // Get token from storage
      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Prepare request payload
      const payload = {
        content,
        applicationId: options.applicationId,
        conversationHistory: options.conversationHistory || [],
        language: options.language || 'en',
      };

      // Start streaming request
      const response = await fetch(`${this.baseURL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      // Handle response based on platform
      if (Platform.OS === 'web') {
        // Web: Use ReadableStream
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const {done, value} = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          this.processStreamChunk(chunk, options, (id, text) => {
            messageId = id;
            fullText = text;
          });
        }
      } else {
        // Native: Parse JSON responses
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'chunk') {
                fullText += parsed.content;
                options.onChunk(parsed.content);
              } else if (parsed.type === 'complete') {
                messageId = parsed.id;
                fullText = parsed.content;
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message);
              }
            } catch (e) {
              // Skip non-JSON lines
            }
          }
        }
      }

      options.onComplete(fullText);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const err = error instanceof Error ? error : new Error(String(error));
        options.onError(err);
      }
    } finally {
      this.abortControllers.delete(streamId);
    }

    return {
      abort: () => abortController.abort(),
      messageId,
    };
  }

  /**
   * Process stream chunk
   */
  private processStreamChunk(
    chunk: string,
    options: StreamingOptions,
    setIds: (id: string, text: string) => void,
  ): void {
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'chunk') {
            options.onChunk(parsed.content);
          } else if (parsed.type === 'complete') {
            setIds(parsed.id, parsed.content);
          } else if (parsed.type === 'error') {
            throw new Error(parsed.message);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  /**
   * Abort streaming
   */
  abortStream(streamId: string): void {
    const controller = this.abortControllers.get(streamId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(streamId);
    }
  }

  /**
   * Abort all active streams
   */
  abortAllStreams(): void {
    for (const [, controller] of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();
  }
}

// Export singleton
export const streamingApiClient = new StreamingApiClient();
