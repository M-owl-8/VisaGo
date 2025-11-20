/**
 * Enhanced Chat Store
 * Adds streaming support, language context, and improved state management
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../services/api";
import { streamingApiClient } from "../services/streaming-api";
import { useAuthStore } from "./auth";

export type ChatLanguage = "en" | "uz" | "ru";
export type MessageStatus = "sent" | "streaming" | "complete" | "error";

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
  status?: MessageStatus;
}

export interface ChatStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalTokensUsed: number;
  uniqueApplications: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  applicationId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

interface ChatConversation {
  messages: ChatMessage[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface ChatStore {
  // State
  conversations: Record<string, ChatConversation>;
  currentConversation: ChatConversation | null;
  currentApplicationId: string | null;
  currentSessionId: string | null;
  sessions: ChatSession[];
  stats: ChatStats | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  currentLanguage: ChatLanguage;
  streamingMessage: string;
  streamingMessageId: string | null;
  currentStreamId: string | null;

  // Actions - Chat Management
  loadChatHistory: (applicationId?: string, limit?: number, offset?: number) => Promise<void>;
  sendMessage: (
    content: string,
    applicationId?: string,
    conversationHistory?: ChatMessage[]
  ) => Promise<void>;
  sendMessageWithStreaming: (
    content: string,
    applicationId?: string,
    conversationHistory?: ChatMessage[]
  ) => Promise<void>;
  searchDocuments: (query: string, country?: string, visaType?: string) => Promise<any>;
  clearChatHistory: (applicationId?: string) => Promise<void>;
  loadStats: () => Promise<void>;

  // Actions - Session Management
  loadSessions: (limit?: number, offset?: number) => Promise<void>;
  loadSessionDetails: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;

  // Actions - Language & Settings
  setCurrentLanguage: (language: ChatLanguage) => void;
  getContextLanguage: () => ChatLanguage;

  // Actions - Message Management
  addMessageFeedback: (messageId: string, feedback: "thumbs_up" | "thumbs_down") => Promise<void>;
  loadMoreMessages: (applicationId?: string) => Promise<void>;
  abortStreaming: () => void;
  updateStreamingMessage: (content: string, messageId: string) => void;
  completeStreaming: (messageId: string, finalContent: string) => void;

  // Actions - State Management
  setCurrentApplicationId: (applicationId: string | null) => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: {},
      currentConversation: null,
      currentApplicationId: null,
      currentSessionId: null,
      sessions: [],
      stats: null,
      isLoading: false,
      isSending: false,
      error: null,
      currentLanguage: "en",
      streamingMessage: "",
      streamingMessageId: null,
      currentStreamId: null,

      // ============================================================================
      // CHAT MANAGEMENT ACTIONS
      // ============================================================================

      loadChatHistory: async (applicationId?: string, limit = 50, offset = 0) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.getChatHistory(applicationId, limit, offset);

          if (response.success) {
            const key = applicationId || "general";
            set((state) => ({
              conversations: {
                ...state.conversations,
                [key]: {
                  ...response.data,
                  hasMore: response.data.messages.length === limit,
                },
              },
              currentConversation: {
                ...response.data,
                hasMore: response.data.messages.length === limit,
              },
              currentApplicationId: applicationId || null,
              isLoading: false,
            }));
          } else {
            set({
              error: response.error?.message || "Failed to load chat history",
              isLoading: false,
            });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to load chat history",
            isLoading: false,
          });
        }
      },

      sendMessage: async (
        content: string,
        applicationId?: string,
        conversationHistory?: ChatMessage[]
      ) => {
        try {
          set({ isSending: true, error: null });
          const language = get().currentLanguage;

          const response = await apiClient.sendMessage(content, applicationId, conversationHistory);

          if (response.success) {
            const key = applicationId || "general";
            set((state) => {
              const conversation = state.conversations[key] || {
                messages: [],
                total: 0,
                limit: 50,
                offset: 0,
                hasMore: false,
              };

              const userMessage: ChatMessage = {
                id: `user-${Date.now()}`,
                userId: "",
                applicationId,
                role: "user",
                content,
                sources: [],
                model: "user",
                tokensUsed: 0,
                createdAt: new Date().toISOString(),
                status: "complete",
              };

              const assistantMessage: ChatMessage = {
                id: response.data.id,
                userId: "",
                applicationId,
                role: "assistant",
                content: response.data.message,
                sources: response.data.sources || [],
                model: response.data.model || "gpt-4",
                tokensUsed: response.data.tokens_used || 0,
                createdAt: new Date().toISOString(),
                status: "complete",
              };

              return {
                conversations: {
                  ...state.conversations,
                  [key]: {
                    ...conversation,
                    messages: [...conversation.messages, userMessage, assistantMessage],
                    total: conversation.total + 2,
                  },
                },
                isSending: false,
              };
            });
          } else {
            set({ error: response.error?.message || "Failed to send message", isSending: false });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to send message",
            isSending: false,
          });
        }
      },

      sendMessageWithStreaming: async (
        content: string,
        applicationId?: string,
        conversationHistory?: ChatMessage[]
      ) => {
        const language = get().currentLanguage;

        try {
          set({
            isSending: true,
            error: null,
            streamingMessage: "",
            streamingMessageId: null,
          });

          // Add user message immediately
          const key = applicationId || "general";
          const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            userId: "",
            applicationId,
            role: "user",
            content,
            sources: [],
            model: "user",
            tokensUsed: 0,
            createdAt: new Date().toISOString(),
            status: "complete",
          };

          // Create placeholder for assistant message
          const assistantMessageId = `assistant-${Date.now()}`;
          const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            userId: "",
            applicationId,
            role: "assistant",
            content: "",
            sources: [],
            model: "gpt-4-streaming",
            tokensUsed: 0,
            createdAt: new Date().toISOString(),
            status: "streaming",
          };

          set((state) => {
            const conversation = state.conversations[key] || {
              messages: [],
              total: 0,
              limit: 50,
              offset: 0,
              hasMore: false,
            };

            return {
              conversations: {
                ...state.conversations,
                [key]: {
                  ...conversation,
                  messages: [
                    ...conversation.messages,
                    userMessage,
                    assistantMessage,
                  ],
                  total: conversation.total + 2,
                },
              },
              currentConversation: {
                ...conversation,
                messages: [
                  ...conversation.messages,
                  userMessage,
                  assistantMessage,
                ],
                total: conversation.total + 2,
              },
              streamingMessageId: assistantMessageId,
            };
          });

          // Start streaming
          const { abort, messageId } = await streamingApiClient.sendMessageStream(content, {
            language,
            applicationId,
            conversationHistory,
            onChunk: (chunk) => {
              set((state) => ({
                streamingMessage: state.streamingMessage + chunk,
              }));
            },
            onComplete: (fullText) => {
              set((state) => {
                const updatedConversations = { ...state.conversations };
                const conversation = updatedConversations[key];
                if (conversation) {
                  const lastMessage = conversation.messages[conversation.messages.length - 1];
                  if (lastMessage) {
                    lastMessage.content = fullText;
                    lastMessage.status = "complete";
                    lastMessage.id = messageId || lastMessage.id;
                  }
                }

                return {
                  conversations: updatedConversations,
                  currentConversation: conversation,
                  isSending: false,
                  streamingMessage: "",
                  streamingMessageId: null,
                };
              });
            },
            onError: (error) => {
              set({
                error: error.message || "Streaming failed",
                isSending: false,
                streamingMessage: "",
                streamingMessageId: null,
              });
            },
          });

          set({ currentStreamId: messageId });
        } catch (error: any) {
          set({
            error: error.message || "Failed to send message",
            isSending: false,
            streamingMessage: "",
            streamingMessageId: null,
          });
        }
      },

      searchDocuments: async (query: string, country?: string, visaType?: string) => {
        try {
          const response = await apiClient.searchDocuments(query, country, visaType);
          return response.data;
        } catch (error: any) {
          set({ error: error.message || "Failed to search documents" });
          return null;
        }
      },

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
                error: null,
              };
            });
          }
        } catch (error: any) {
          set({ error: error.message || "Failed to clear chat history" });
        }
      },

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

      // ============================================================================
      // SESSION MANAGEMENT ACTIONS
      // ============================================================================

      loadSessions: async (limit = 20, offset = 0) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.getChatSessions(limit, offset);

          if (response.success) {
            set({
              sessions: response.data.sessions || [],
              isLoading: false,
            });
          } else {
            set({ error: response.error?.message || "Failed to load sessions", isLoading: false });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to load sessions",
            isLoading: false,
          });
        }
      },

      loadSessionDetails: async (sessionId: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.getSessionDetails(sessionId);

          if (response.success) {
            const session = response.data;
            const key = sessionId;

            set((state) => ({
              conversations: {
                ...state.conversations,
                [key]: {
                  messages: session.messages || [],
                  total: session.messages?.length || 0,
                  limit: 50,
                  offset: 0,
                  hasMore: false,
                },
              },
              currentConversation: {
                messages: session.messages || [],
                total: session.messages?.length || 0,
                limit: 50,
                offset: 0,
                hasMore: false,
              },
              currentSessionId: sessionId,
              isLoading: false,
            }));
          } else {
            set({ error: response.error?.message || "Failed to load session", isLoading: false });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to load session",
            isLoading: false,
          });
        }
      },

      renameSession: async (sessionId: string, newTitle: string) => {
        try {
          const response = await apiClient.renameSession(sessionId, newTitle);

          if (response.success) {
            set((state) => ({
              sessions: state.sessions.map((s) =>
                s.id === sessionId ? { ...s, title: newTitle } : s
              ),
            }));
          } else {
            set({ error: response.error?.message || "Failed to rename session" });
          }
        } catch (error: any) {
          set({ error: error.message || "Failed to rename session" });
        }
      },

      deleteSession: async (sessionId: string) => {
        try {
          const response = await apiClient.deleteSession(sessionId);

          if (response.success) {
            set((state) => ({
              sessions: state.sessions.filter((s) => s.id !== sessionId),
              currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
            }));
          } else {
            set({ error: response.error?.message || "Failed to delete session" });
          }
        } catch (error: any) {
          set({ error: error.message || "Failed to delete session" });
        }
      },

      // ============================================================================
      // LANGUAGE & SETTINGS ACTIONS
      // ============================================================================

      setCurrentLanguage: (language: ChatLanguage) => {
        set({ currentLanguage: language });
      },

      getContextLanguage: () => {
        return get().currentLanguage;
      },

      // ============================================================================
      // MESSAGE MANAGEMENT ACTIONS
      // ============================================================================

      addMessageFeedback: async (messageId: string, feedback: "thumbs_up" | "thumbs_down") => {
        try {
          await apiClient.addMessageFeedback(messageId, feedback);
        } catch (error: any) {
          console.error("Failed to send feedback:", error);
        }
      },

      loadMoreMessages: async (applicationId?: string) => {
        try {
          const key = applicationId || "general";
          const conversation = get().conversations[key];

          if (!conversation?.hasMore) {
            return;
          }

          set({ isLoading: true });
          const response = await apiClient.getChatHistory(
            applicationId,
            conversation.limit,
            conversation.offset + conversation.limit
          );

          if (response.success) {
            set((state) => {
              const updatedConversations = { ...state.conversations };
              const current = updatedConversations[key];

              return {
                conversations: {
                  ...updatedConversations,
                  [key]: {
                    messages: [...response.data.messages, ...current.messages],
                    total: response.data.total,
                    limit: response.data.limit,
                    offset: response.data.offset,
                    hasMore: response.data.messages.length === response.data.limit,
                  },
                },
                isLoading: false,
              };
            });
          }
        } catch (error: any) {
          set({ error: error.message || "Failed to load more messages", isLoading: false });
        }
      },

      updateStreamingMessage: (content: string, messageId: string) => {
        set((state) => {
          const conversation = state.currentConversation;
          if (!conversation) return state;

          const messages = conversation.messages.map((msg) =>
            msg.id === messageId ? { ...msg, content } : msg
          );

          return {
            streamingMessage: content,
            currentConversation: { ...conversation, messages },
          };
        });
      },

      completeStreaming: (messageId: string, finalContent: string) => {
        set((state) => {
          const conversation = state.currentConversation;
          if (!conversation) return state;

          const messages = conversation.messages.map((msg) =>
            msg.id === messageId
              ? { ...msg, content: finalContent, status: "complete" as MessageStatus }
              : msg
          );

          return {
            currentConversation: { ...conversation, messages },
            isSending: false,
            streamingMessage: "",
            streamingMessageId: null,
          };
        });
      },

      abortStreaming: () => {
        const streamId = get().currentStreamId;
        if (streamId) {
          streamingApiClient.abortStream(streamId);
        }
        set({
          isSending: false,
          streamingMessage: "",
          streamingMessageId: null,
          currentStreamId: null,
        });
      },

      // ============================================================================
      // STATE MANAGEMENT ACTIONS
      // ============================================================================

      setCurrentApplicationId: (applicationId: string | null) => {
        set({ currentApplicationId: applicationId });
      },

      setCurrentSessionId: (sessionId: string | null) => {
        set({ currentSessionId: sessionId });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "@visabuddy_chat_enhanced",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        currentLanguage: state.currentLanguage,
      }),
      // Add error handling for storage operations
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[ChatEnhancedStore] Failed to rehydrate:', error);
        }
      },
    }
  )
);