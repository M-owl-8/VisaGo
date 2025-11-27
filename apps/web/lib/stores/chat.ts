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

  // Actions
  setCurrentApplication: (applicationId: string | null) => void;
  sendMessage: (content: string, applicationId?: string) => Promise<void>;
  loadChatHistory: (applicationId?: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  currentApplicationId: null,

  setCurrentApplication: (applicationId: string | null) => {
    set({ currentApplicationId: applicationId });
    get().loadChatHistory(applicationId || undefined);
  },

  sendMessage: async (content: string, applicationId?: string) => {
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
      console.error('Failed to send message:', error);
      set({ error: error.message || 'Failed to send message' });
      // Remove optimistic user message on error using the stored ID
      set((state) => ({
        messages: state.messages.filter((msg) => msg.id !== userMessageId),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  loadChatHistory: async (applicationId?: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.getChatHistory(applicationId);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to load chat history');
      }

      // Transform backend messages to ChatMessage format
      const messages: ChatMessage[] = (response.data.messages || []).map((msg: any) => ({
        id: msg.id || `msg-${Date.now()}-${Math.random()}`,
        role: msg.role || 'user',
        content: msg.content || msg.message || '',
        timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
        sources: msg.sources,
        tokens_used: msg.tokens_used,
        model: msg.model,
      }));

      set({ messages });
    } catch (error: any) {
      console.error('Failed to load chat history:', error);
      set({ error: error.message || 'Failed to load chat history' });
    } finally {
      set({ isLoading: false });
    }
  },

  clearMessages: () => {
    set({ messages: [], error: null });
  },
}));
