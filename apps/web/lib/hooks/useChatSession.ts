import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errorMessages';
import { useTranslation } from 'react-i18next';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: any[];
  tokens_used?: number;
  model?: string;
}

interface UseChatSessionResult {
  messages: ChatMessage[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadHistory: () => Promise<void>;
  clearError: () => void;
}

export function useChatSession(
  applicationId?: string,
  options?: {
    onError?: (error: string) => void;
    autoFetch?: boolean;
  }
): UseChatSessionResult {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const shouldAutoFetch = options?.autoFetch !== false;
  const [isLoading, setIsLoading] = useState<boolean>(shouldAutoFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to avoid recreating callbacks when options change
  const onErrorRef = useRef(options?.onError);
  useEffect(() => {
    onErrorRef.current = options?.onError;
  }, [options?.onError]);

  const fetchHistory = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await apiClient.getChatHistory(applicationId);

        if (response.success) {
          // Transform backend messages to ChatMessage format
          const historyData = Array.isArray(response.data) 
            ? response.data 
            : (response.data?.messages || []);
          
          const transformedMessages: ChatMessage[] = historyData.map((msg: any) => ({
            id: msg.id || `msg-${Date.now()}-${Math.random()}`,
            role: msg.role || 'user',
            content: msg.content || msg.message || '',
            timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
            sources: msg.sources,
            tokens_used: msg.tokens_used,
            model: msg.model,
          }));

          setMessages(transformedMessages);
          setError(null);
        } else {
          // If it's a "session not found" error, treat as empty history
          if (response.error?.message?.includes('Session not found') || 
              response.error?.status === 404) {
            setMessages([]);
            setError(null);
            return;
          }
          
          const errorMsg = getErrorMessage(response.error || {}, t, i18n.language);
          const finalError = errorMsg || t('errors.failedToLoadChatHistory', 'Failed to load chat history');
          setError(finalError);
          if (onErrorRef.current) {
            onErrorRef.current(finalError);
          }
        }
      } catch (err: any) {
        // Don't show error for empty history - allow user to start chatting
        if (err?.response?.status === 404 || err?.message?.includes('not found')) {
          setMessages([]);
          setError(null);
          return;
        }
        
        const errorMsg = getErrorMessage(err, t, i18n.language);
        const finalError = errorMsg || t('errors.failedToLoadChatHistory', 'Failed to load chat history');
        setError(finalError);
        if (onErrorRef.current) {
          onErrorRef.current(finalError);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [applicationId, t, i18n.language]
  );

  const loadHistory = useCallback(() => fetchHistory(true), [fetchHistory]);
  const clearError = useCallback(() => setError(null), []);

  // Only fetch when autoFetch is enabled and applicationId changes
  useEffect(() => {
    if (shouldAutoFetch) {
      fetchHistory(false);
    } else {
      setIsLoading(false);
    }
  }, [applicationId, shouldAutoFetch, fetchHistory]);

  return {
    messages,
    isLoading,
    isRefreshing,
    error,
    loadHistory,
    clearError,
  };
}

