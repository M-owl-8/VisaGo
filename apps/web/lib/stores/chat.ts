import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: any[];
  tokens_used?: number;
  model?: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  currentApplicationId: string | null;
  currentSessionId: string | null;

  // Actions
  setCurrentApplication: (applicationId: string | null) => void;
  sendMessage: (content: string, applicationId?: string) => Promise<void>;
  loadChatHistory: (applicationId?: string, limit?: number) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  currentApplicationId: null,
  currentSessionId: null,

  setCurrentApplication: (applicationId: string | null) => {
    set({ currentApplicationId: applicationId });
    // Only load history if not already loading to prevent spam
    if (!get().isLoading) {
      get().loadChatHistory(applicationId || undefined);
    }
  },

  sendMessage: async (content: string, applicationId?: string) => {
    // Prevent duplicate submissions
    if (get().isLoading) {
      return;
    }

    // Store user message ID for potential removal on error
    const userMessageId = `user-${Date.now()}`;

    try {
      set({ isLoading: true, error: null });

      // Optimistically add user message
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, userMessage],
      }));

      // Get conversation history for context
      const conversationHistory = get().messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Send to backend
      const response = await apiClient.sendMessage(
        content,
        applicationId || get().currentApplicationId || undefined,
        conversationHistory
      );

      // Handle 429 rate limit response
      if (!response.success && response.error?.status === 429) {
        throw new Error(response.error.message || 'You\'re sending messages too quickly. Please wait a few seconds and try again.');
      }

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to send message');
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: response.data.id || `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString(),
        sources: response.data.sources,
        tokens_used: response.data.tokens_used,
        model: response.data.model,
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
      }));
    } catch (error: any) {
      // Handle 429 rate limit errors specifically
      if (error.response?.status === 429 || error.message?.includes('429') || error.message?.includes('rate limit') || error.message?.includes('limit exceeded')) {
        set({ 
          error: 'You\'re sending messages too quickly. Please wait a few seconds and try again.' 
        });
      } else {
        set({ error: error.message || 'Failed to send message' });
      }
      // Remove optimistic user message on error using the stored ID
      set((state) => ({
        messages: state.messages.filter((msg) => msg.id !== userMessageId),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  loadChatHistory: async (applicationId?: string, limit: number = 100) => {
    // Prevent concurrent calls
    if (get().isLoading) {
      return;
    }

    try {
      set({ isLoading: true, error: null });

      // First, get or find the session for this applicationId
      let sessionId = get().currentSessionId;
      
      if (!sessionId) {
        // Get user sessions to find the one for this applicationId
        const sessionsResponse = await apiClient.getChatSessions(100, 0);
        if (sessionsResponse.success && sessionsResponse.data?.sessions) {
          const sessions = sessionsResponse.data.sessions;
          // Find session matching applicationId (or general chat if no applicationId)
          const matchingSession = sessions.find((s: any) => 
            applicationId ? s.applicationId === applicationId : !s.applicationId
          );
          if (matchingSession) {
            sessionId = matchingSession.id;
            set({ currentSessionId: sessionId });
          }
        }
      }

      // If we have a sessionId, use the session-based endpoint for cross-platform sync
      if (sessionId) {
        const sessionResponse = await apiClient.getChatSessionDetails(sessionId, limit);
        if (sessionResponse.success && sessionResponse.data) {
          const sessionData = sessionResponse.data;
          const historyData = sessionData.messages || [];
          const messages: ChatMessage[] = historyData.map((msg: any) => ({
            id: msg.id || `msg-${Date.now()}-${Math.random()}`,
            role: msg.role || 'user',
            content: msg.content || msg.message || '',
            timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
            sources: msg.sources,
            tokens_used: msg.tokens_used,
            model: msg.model,
          }));
          set({ messages, error: null, currentSessionId: sessionId });
          return;
        }
      }

      // Fallback to the old endpoint if no session found (for backward compatibility)
      const response = await apiClient.getChatHistory(applicationId, limit);

      // Handle empty history gracefully - backend returns empty array if no session
      if (!response.success) {
        // If it's a "session not found" error, treat as empty history
        if (response.error?.message?.includes('Session not found') || 
            response.error?.status === 500) {
          set({ messages: [], error: null });
          return;
        }
        throw new Error(response.error?.message || 'Failed to load chat history');
      }

      // Transform backend messages to ChatMessage format
      // Backend returns array directly, not wrapped in messages property
      const historyData = Array.isArray(response.data) ? response.data : (response.data?.messages || []);
      const messages: ChatMessage[] = historyData.map((msg: any) => ({
        id: msg.id || `msg-${Date.now()}-${Math.random()}`,
        role: msg.role || 'user',
        content: msg.content || msg.message || '',
        timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
        sources: msg.sources,
        tokens_used: msg.tokens_used,
        model: msg.model,
      }));

      set({ messages, error: null });
    } catch (error: any) {
      // Don't spam console - only log first error
      if (!get().error) {
        console.error('Failed to load chat history:', error);
      }
      // Set empty messages instead of error to allow user to start chatting
      set({ messages: [], error: null });
    } finally {
      set({ isLoading: false });
    }
  },

  clearMessages: () => {
    set({ messages: [], error: null });
  },
}));
