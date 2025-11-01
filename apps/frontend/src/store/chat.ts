import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../services/api";

export interface ChatMessage {
  id: string;
  userId: string;
  applicationId?: string;
  role: "user" | "assistant";
  content: string;
  sources: string[];
  model: string;
  tokensUsed: number;
  createdAt: string;
}

export interface ChatStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalTokensUsed: number;
  uniqueApplications: number;
}

interface ChatConversation {
  messages: ChatMessage[];
  total: number;
  limit: number;
  offset: number;
}

interface ChatStore {
  // State
  conversations: Record<string, ChatConversation>;
  currentConversation: ChatConversation | null;
  currentApplicationId: string | null;
  stats: ChatStats | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  // Actions
  loadChatHistory: (applicationId?: string, limit?: number) => Promise<void>;
  sendMessage: (
    content: string,
    applicationId?: string,
    conversationHistory?: ChatMessage[]
  ) => Promise<void>;
  searchDocuments: (query: string) => Promise<any>;
  clearChatHistory: (applicationId?: string) => Promise<void>;
  loadStats: () => Promise<void>;
  setCurrentApplicationId: (applicationId: string | null) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, _get) => ({
      // Initial state
      conversations: {},
      currentConversation: null,
      currentApplicationId: null,
      stats: null,
      isLoading: false,
      isSending: false,
      error: null,

      // Load chat history
      loadChatHistory: async (applicationId?: string, limit = 50) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.getChatHistory(applicationId, limit);

          if (response.success) {
            const key = applicationId || "general";
            set((state) => ({
              conversations: {
                ...state.conversations,
                [key]: response.data,
              },
              currentConversation: response.data,
              currentApplicationId: applicationId || null,
              isLoading: false,
            }));
          } else {
            set({ error: response.error?.message || "Failed to load chat history" });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to load chat history",
            isLoading: false,
          });
        }
      },

      // Send a message
      sendMessage: async (
        content: string,
        applicationId?: string,
        conversationHistory?: ChatMessage[]
      ) => {
        try {
          set({ isSending: true, error: null });
          const response = await apiClient.sendMessage(
            content,
            applicationId,
            conversationHistory
          );

          if (response.success) {
            const key = applicationId || "general";
            set((state) => {
              const conversation = state.conversations[key] || {
                messages: [],
                total: 0,
                limit: 50,
                offset: 0,
              };

              // Add user message and assistant response
              const updatedMessages = [
                ...conversation.messages,
                {
                  id: `user-${Date.now()}`,
                  userId: "",
                  applicationId: applicationId,
                  role: "user" as const,
                  content,
                  sources: [],
                  model: "user",
                  tokensUsed: 0,
                  createdAt: new Date().toISOString(),
                },
                {
                  id: response.data.id,
                  userId: "",
                  applicationId: applicationId,
                  role: "assistant" as const,
                  content: response.data.message,
                  sources: response.data.sources || [],
                  model: response.data.model || "gpt-4",
                  tokensUsed: response.data.tokens_used || 0,
                  createdAt: new Date().toISOString(),
                },
              ];

              return {
                conversations: {
                  ...state.conversations,
                  [key]: {
                    ...conversation,
                    messages: updatedMessages,
                    total: conversation.total + 2,
                  },
                },
                isSending: false,
              };
            });
          } else {
            set({ error: response.error?.message || "Failed to send message" });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to send message",
            isSending: false,
          });
        }
      },

      // Search documents
      searchDocuments: async (query: string) => {
        try {
          const response = await apiClient.searchDocuments(query);
          return response.data;
        } catch (error: any) {
          set({ error: error.message || "Failed to search documents" });
          return null;
        }
      },

      // Clear chat history
      clearChatHistory: async (applicationId?: string) => {
        try {
          const response = await apiClient.clearChatHistory(applicationId);

          if (response.success) {
            const key = applicationId || "general";
            set((state) => {
              const newConversations = { ...state.conversations };
              delete newConversations[key];

              return {
                conversations: newConversations,
                currentConversation:
                  state.currentApplicationId === applicationId ? null : state.currentConversation,
              };
            });
          }
        } catch (error: any) {
          set({ error: error.message || "Failed to clear chat history" });
        }
      },

      // Load statistics
      loadStats: async () => {
        try {
          const response = await apiClient.getChatStats();

          if (response.success) {
            set({ stats: response.data });
          }
        } catch (error: any) {
          console.error("Failed to load chat stats:", error);
        }
      },

      // Set current application ID
      setCurrentApplicationId: (applicationId: string | null) => {
        set({ currentApplicationId: applicationId });
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: "@visabuddy_chat",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        conversations: state.conversations,
      }),
    }
  )
);