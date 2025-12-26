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

export interface ChatSession {
  id: string;
  title: string;
  applicationId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    role: 'user' | 'assistant';
  } | null;
}

interface ChatState {
  messages: ChatMessage[];
  sessions: ChatSession[];
  selectedSessionId: string | null;
  currentApplicationId: string | null;
  isLoading: boolean; // sending / loading messages
  isLoadingSessions: boolean;
  error: string | null;

  // Actions
  loadSessions: () => Promise<void>;
  selectSession: (sessionId: string | null) => Promise<void>;
  createNewSession: (applicationId?: string | null) => Promise<string | null>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  setCurrentApplication: (applicationId: string | null) => void;
  sendMessage: (content: string, applicationId?: string) => Promise<void>;
  loadChatHistory: (sessionId?: string | null, limit?: number) => Promise<void>;
  clearMessages: () => void;
}

const mapMessage = (msg: any): ChatMessage => {
  let sources = msg.sources;
  if (typeof sources === 'string') {
    try {
      sources = JSON.parse(sources);
    } catch {
      sources = [];
    }
  }
  if (!Array.isArray(sources)) {
    sources = [];
  }

  return {
    id: msg.id || `msg-${Date.now()}-${Math.random()}`,
    role: msg.role || 'user',
    content: msg.content || msg.message || '',
    timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
    sources,
    tokens_used: msg.tokens_used || msg.tokensUsed || 0,
    model: msg.model || 'gpt-4',
  };
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessions: [],
  selectedSessionId: null,
  currentApplicationId: null,
  isLoading: false,
  isLoadingSessions: false,
  error: null,

  loadSessions: async () => {
    try {
      set({ isLoadingSessions: true });
      const response = await apiClient.getChatSessions(100, 0);
      if (!response.success || !response.data?.sessions) {
        throw new Error(response.error?.message || 'Failed to load sessions');
      }

      const sessions: ChatSession[] = response.data.sessions.map((session: any) => ({
        id: session.id,
        title: session.title || 'New Chat',
        applicationId: session.applicationId || null,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        lastMessage: session.messages?.[0]
          ? {
              content: session.messages[0].content,
              createdAt: session.messages[0].createdAt,
              role: session.messages[0].role || 'assistant',
            }
          : null,
      }));

      set((state) => {
        const existingSelection = state.selectedSessionId;
        const nextSelection =
          existingSelection && sessions.find((s) => s.id === existingSelection)
            ? existingSelection
            : sessions[0]?.id || null;

        return { sessions, selectedSessionId: nextSelection };
      });
    } catch (error) {
      console.error('Failed to load sessions:', error);
      set({ sessions: [] });
    } finally {
      set({ isLoadingSessions: false });
    }
  },

  selectSession: async (sessionId: string | null) => {
    set({ selectedSessionId: sessionId });
    if (sessionId) {
      await get().loadChatHistory(sessionId);
    } else {
      set({ messages: [] });
    }
  },

  createNewSession: async (applicationId?: string | null) => {
    try {
      const response = await apiClient.createChatSession(applicationId || undefined);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create session');
      }

      const session: ChatSession = {
        id: response.data.id,
        title: response.data.title || 'New Chat',
        applicationId: response.data.applicationId || null,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt,
        lastMessage: null,
      };

      set((state) => ({
        sessions: [session, ...state.sessions],
        selectedSessionId: session.id,
        currentApplicationId: applicationId || null,
        messages: [],
      }));

      return session.id;
    } catch (error) {
      console.error('Failed to create session:', error);
      set({ error: 'Unable to create new chat session' });
      return null;
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      const response = await apiClient.deleteChatSession(sessionId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete session');
      }

      set((state) => {
        const filtered = state.sessions.filter((s) => s.id !== sessionId);
        const nextSelected = state.selectedSessionId === sessionId ? filtered[0]?.id || null : state.selectedSessionId;
        return {
          sessions: filtered,
          selectedSessionId: nextSelected,
          messages: nextSelected === state.selectedSessionId ? state.messages : [],
        };
      });
    } catch (error) {
      console.error('Failed to delete session:', error);
      set({ error: 'Failed to delete chat session' });
    }
  },

  renameSession: async (sessionId: string, title: string) => {
    try {
      const response = await apiClient.renameChatSession(sessionId, title);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to rename session');
      }

      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, title: response.data.title || title } : s
        ),
      }));
    } catch (error) {
      console.error('Failed to rename session:', error);
      set({ error: 'Failed to rename chat session' });
    }
  },

  setCurrentApplication: (applicationId: string | null) => {
    set({ currentApplicationId: applicationId });
  },

  sendMessage: async (content: string, applicationId?: string) => {
    // Prevent duplicate submissions
    if (get().isLoading) {
      return;
    }

    const activeSessionId = get().selectedSessionId;
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

      const response = await apiClient.sendMessage(
        content,
        applicationId || get().currentApplicationId || undefined,
        conversationHistory,
        activeSessionId || undefined
      );

      if (!response.success && response.error?.status === 429) {
        throw new Error(
          response.error.message ||
            "You're sending messages too quickly. Please wait a few seconds and try again."
        );
      }

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to send message');
      }

      const resolvedSessionId = response.data.sessionId || activeSessionId || get().selectedSessionId;
      if (resolvedSessionId && resolvedSessionId !== get().selectedSessionId) {
        set({ selectedSessionId: resolvedSessionId });
      }

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
        sessions: state.sessions.map((s) =>
          s.id === resolvedSessionId
            ? {
                ...s,
                updatedAt: new Date().toISOString(),
                lastMessage: {
                  content: assistantMessage.content,
                  createdAt: assistantMessage.timestamp,
                  role: 'assistant',
                },
              }
            : s
        ),
      }));
    } catch (error: any) {
      if (
        error.response?.status === 429 ||
        error.message?.includes('429') ||
        error.message?.includes('rate limit') ||
        error.message?.includes('limit exceeded')
      ) {
        set({
          error: "You're sending messages too quickly. Please wait a few seconds and try again.",
        });
      } else {
        set({ error: error.message || 'Failed to send message' });
      }

      set((state) => ({
        messages: state.messages.filter((msg) => msg.id !== userMessageId),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  loadChatHistory: async (sessionId?: string | null, limit: number = 100) => {
    if (get().isLoading) {
      return;
    }

    const targetSessionId = sessionId || get().selectedSessionId;
    if (!targetSessionId) {
      set({ messages: [] });
      return;
    }

    try {
      set({ isLoading: true, error: null });

      const sessionResponse = await apiClient.getChatSessionDetails(targetSessionId, limit);
      if (!sessionResponse.success || !sessionResponse.data) {
        throw new Error(sessionResponse.error?.message || 'Failed to load chat history');
      }

      const historyData = sessionResponse.data.messages || [];
      const messages: ChatMessage[] = historyData.map(mapMessage);

      set({
        messages,
        error: null,
        selectedSessionId: targetSessionId,
      });
    } catch (error: any) {
      if (!get().error) {
        console.error('Failed to load chat history:', error);
      }
      set({ messages: [], error: null });
    } finally {
      set({ isLoading: false });
    }
  },

  clearMessages: () => {
    set({ messages: [], error: null });
  },
}));
