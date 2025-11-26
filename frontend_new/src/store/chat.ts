import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiClient} from '../services/api';
import {useAuthStore} from './auth';

export interface ChatMessage {
  id: string;
  userId: string;
  applicationId?: string;
  role: 'user' | 'assistant';
  content: string;
  sources: string[];
  model: string;
  tokensUsed: number;
  createdAt: string;
  status?: 'sending' | 'sent' | 'error'; // Track message status for optimistic UI
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

  // Actions
  loadChatHistory: (applicationId?: string, limit?: number) => Promise<void>;
  sendMessage: (
    content: string,
    applicationId?: string,
    conversationHistory?: ChatMessage[],
  ) => Promise<void>;
  searchDocuments: (
    query: string,
    country?: string,
    visaType?: string,
  ) => Promise<any>;
  clearChatHistory: (applicationId?: string) => Promise<void>;
  loadStats: () => Promise<void>;
  loadSessions: (limit?: number, offset?: number) => Promise<void>;
  loadSessionDetails: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  addMessageFeedback: (
    messageId: string,
    feedback: 'thumbs_up' | 'thumbs_down',
  ) => Promise<void>;
  setCurrentApplicationId: (applicationId: string | null) => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, _get) => ({
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

      // Load chat history
      loadChatHistory: async (applicationId?: string, limit = 50) => {
        try {
          set({isLoading: true, error: null});

          // Verify user is signed in before loading
          const authState = useAuthStore.getState();
          if (!authState.isSignedIn || !authState.token) {
            set({
              error: 'Please log in to view chat history',
              isLoading: false,
            });
            return;
          }

          const response = await apiClient.getChatHistory(applicationId, limit);

          if (response.success) {
            const key = applicationId || 'general';
            set(state => {
              const existingConversation = state.conversations[key];
              const serverMessages = response.data.messages || [];

              // If we have optimistic updates (messages with status 'sending'), preserve them
              if (
                existingConversation &&
                existingConversation.messages.length > 0
              ) {
                const optimisticMessages = existingConversation.messages.filter(
                  msg => msg.status === 'sending' || msg.status === 'error',
                );

                // MEDIUM PRIORITY FIX: Improved merge logic to prevent message loss
                // Merge: server messages + optimistic messages that aren't on server yet
                const serverMessageIds = new Set(serverMessages.map(m => m.id));
                const optimisticToAdd = optimisticMessages.filter(
                  msg => !serverMessageIds.has(msg.id),
                );

                // Combine all messages and deduplicate by ID to prevent duplicates
                const allMessages = [...serverMessages, ...optimisticToAdd];
                const messageMap = new Map();
                allMessages.forEach(msg => {
                  // Use ID as key, keep the one with latest timestamp if duplicate
                  const existing = messageMap.get(msg.id);
                  if (
                    !existing ||
                    new Date(msg.createdAt || 0) >
                      new Date(existing.createdAt || 0)
                  ) {
                    messageMap.set(msg.id, msg);
                  }
                });

                // Convert back to array and sort by createdAt to maintain chronological order
                const mergedMessages = Array.from(messageMap.values()).sort(
                  (a, b) =>
                    new Date(a.createdAt || 0).getTime() -
                    new Date(b.createdAt || 0).getTime(),
                );

                const mergedConversation = {
                  ...response.data,
                  messages: mergedMessages,
                  total: mergedMessages.length,
                };

                return {
                  conversations: {
                    ...state.conversations,
                    [key]: mergedConversation,
                  },
                  currentConversation: mergedConversation,
                  currentApplicationId: applicationId || null,
                  isLoading: false,
                };
              }

              // No existing conversation, use server data as-is
              return {
                conversations: {
                  ...state.conversations,
                  [key]: response.data,
                },
                currentConversation: response.data,
                currentApplicationId: applicationId || null,
                isLoading: false,
              };
            });
          } else {
            set({
              error: response.error?.message || 'Failed to load chat history',
            });
          }
        } catch (error: any) {
          // Handle authentication errors more gracefully
          if (error.response?.status === 401) {
            set({
              error:
                'Your session has expired. You can still view previous messages, but please log in to send new messages.',
              isLoading: false,
            });
          } else {
            set({
              error: error.message || 'Failed to load chat history',
              isLoading: false,
            });
          }
        }
      },

      // Send a message
      sendMessage: async (
        content: string,
        applicationId?: string,
        conversationHistory?: ChatMessage[],
      ) => {
        try {
          set({isSending: true, error: null});

          console.log('[AI CHAT] [ChatStore] sendMessage called:', {
            contentLength: content.length,
            contentPreview: content.substring(0, 50),
            hasApplicationId: !!applicationId,
            applicationId,
            historyLength: conversationHistory?.length || 0,
          });

          // Verify user is signed in before sending
          const authState = useAuthStore.getState();
          if (!authState.isSignedIn || !authState.token) {
            console.log('[AI CHAT] [ChatStore] User not authenticated');
            set({
              error: 'Please log in to use the AI assistant',
              isSending: false,
            });
            return;
          }

          // STEP 1: Add user message immediately (optimistic UI update)
          const key = applicationId || 'general';
          const userMessageId = `user-${Date.now()}`;
          const userMessage: ChatMessage = {
            id: userMessageId,
            userId: authState.user?.id || '',
            applicationId: applicationId,
            role: 'user',
            content,
            sources: [],
            model: 'user',
            tokensUsed: 0,
            createdAt: new Date().toISOString(),
            status: 'sending', // Mark as sending
          };

          // Add user message to conversation immediately
          try {
            set(state => {
              const conversation = state.conversations[key] || {
                messages: [],
                total: 0,
                limit: 50,
                offset: 0,
              };

              // Prevent duplicate messages
              const hasDuplicate = conversation.messages.some(
                msg => msg.id === userMessageId,
              );
              if (hasDuplicate) {
                console.warn(
                  '[AI CHAT] [ChatStore] Duplicate message detected, skipping',
                );
                return state;
              }

              const updatedMessages = [...conversation.messages, userMessage];
              const updatedConversation = {
                ...conversation,
                messages: updatedMessages,
                total: updatedMessages.length,
              };

              const newState = {
                conversations: {
                  ...state.conversations,
                  [key]: updatedConversation,
                },
                currentConversation: updatedConversation,
              };

              console.log(
                '[AI CHAT] [ChatStore] User message added to UI immediately:',
                {
                  messageId: userMessageId,
                  conversationKey: key,
                  totalMessages: updatedMessages.length,
                  currentConversationMessages:
                    newState.currentConversation.messages.length,
                },
              );

              return newState;
            });
          } catch (error) {
            console.error(
              '[AI CHAT] [ChatStore] Error adding user message to state:',
              error,
            );
            // Continue with API call even if state update fails
          }

          // STEP 2: Call API to get AI response
          console.log('[AI CHAT] [ChatStore] Calling apiClient.sendMessage...');
          const response = await apiClient.sendMessage(
            content,
            applicationId,
            conversationHistory,
          );

          console.log('[AI CHAT] [ChatStore] Send message response received:', {
            success: response.success,
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : [],
            error: response.error,
            errorMessage: response.error?.message,
            errorCode: response.error?.code,
            responseStatus: (response as any).status,
            fullResponse: JSON.stringify(response, null, 2).substring(0, 1000),
          });

          // Validate response structure
          if (!response) {
            console.error('[AI CHAT] [ChatStore] No response received');
            set({
              error: 'No response received from server',
              isSending: false,
            });
            return;
          }

          if (!response.success) {
            console.error(
              '[AI CHAT] [ChatStore] Response indicates failure:',
              response,
            );
            set({
              error: response.error?.message || 'Failed to send message',
              isSending: false,
            });
            return;
          }

          if (!response.data) {
            console.error(
              '[AI CHAT] [ChatStore] Response has no data field:',
              response,
            );
            set({
              error: 'Invalid response from server',
              isSending: false,
            });
            return;
          }

          if (!response.data.message) {
            console.error(
              '[AI CHAT] [ChatStore] Response data has no message:',
              response.data,
            );
            set({
              error: 'AI response missing message content',
              isSending: false,
            });
            return;
          }

          console.log(
            '[AI CHAT] [ChatStore] Response validated, updating state with AI message:',
            {
              messageLength: response.data.message.length,
              messagePreview: response.data.message.substring(0, 100),
              hasId: !!response.data.id,
              messageId: response.data.id,
            },
          );

          // STEP 3: Update conversation with AI response or handle error
          if (response.success && response.data) {
            try {
              set(state => {
                // Get current conversation - use existing one to preserve optimistic updates
                const conversation = state.conversations[key] || {
                  messages: [],
                  total: 0,
                  limit: 50,
                  offset: 0,
                };

                console.log('[AI CHAT] [ChatStore] Adding AI response:', {
                  conversationKey: key,
                  existingMessagesCount: conversation.messages.length,
                  userMessageId,
                  aiResponseId: response.data.id,
                  aiMessagePreview: response.data.message?.substring(0, 50),
                });

                // Find and update user message status to 'sent'
                const updatedMessages = conversation.messages.map(msg =>
                  msg.id === userMessageId
                    ? {...msg, status: 'sent' as const}
                    : msg,
                );

                // Check if AI response already exists (prevent duplicates)
                const existingAssistantId =
                  response.data.id || `assistant-${Date.now()}`;
                const hasExistingResponse = updatedMessages.some(
                  msg => msg.id === existingAssistantId,
                );

                if (!hasExistingResponse) {
                  // Add AI response
                  const assistantMessage: ChatMessage = {
                    id: existingAssistantId,
                    userId: '',
                    applicationId: applicationId,
                    role: 'assistant',
                    content: response.data.message || 'No response received',
                    sources: response.data.sources || [],
                    model: response.data.model || 'gpt-4',
                    tokensUsed: response.data.tokens_used || 0,
                    createdAt: new Date().toISOString(),
                    status: 'sent',
                  };

                  updatedMessages.push(assistantMessage);
                  console.log(
                    '[AI CHAT] [ChatStore] AI message added to state:',
                    {
                      messageId: assistantMessage.id,
                      contentLength: assistantMessage.content.length,
                      totalMessagesNow: updatedMessages.length,
                    },
                  );
                } else {
                  console.warn(
                    '[AI CHAT] [ChatStore] AI response already exists, skipping',
                  );
                }

                const updatedConversation = {
                  ...conversation,
                  messages: updatedMessages,
                  total: updatedMessages.length,
                };

                console.log('[AI CHAT] [ChatStore] Final conversation state:', {
                  totalMessages: updatedConversation.messages.length,
                  messageIds: updatedConversation.messages.map(m => ({
                    id: m.id,
                    role: m.role,
                    status: m.status,
                  })),
                });

                return {
                  conversations: {
                    ...state.conversations,
                    [key]: updatedConversation,
                  },
                  currentConversation: updatedConversation,
                  isSending: false,
                };
              });
            } catch (error) {
              console.error(
                '[AI CHAT] [ChatStore] Error updating conversation state:',
                error,
              );
              // Still set isSending to false even if state update fails
              set({isSending: false});
            }

            // Don't reload chat history immediately - it can overwrite optimistic updates
            // The server already has the messages, so we'll load them on next screen visit
            console.log(
              '[AI CHAT] [ChatStore] Message sent successfully, skipping history reload to preserve UI state',
            );
          } else {
            // API failed - mark user message as error but keep it visible
            console.error('[AI CHAT] [ChatStore] Send message failed:', {
              response,
              errorDetails: response.error,
              fullResponse: JSON.stringify(response, null, 2),
            });

            set(state => {
              const conversation = state.conversations[key] || {
                messages: [],
                total: 0,
                limit: 50,
                offset: 0,
              };

              // Update user message status to 'error'
              const updatedMessages = conversation.messages.map(msg =>
                msg.id === userMessageId
                  ? {...msg, status: 'error' as const}
                  : msg,
              );

              const updatedConversation = {
                ...conversation,
                messages: updatedMessages,
              };

              return {
                conversations: {
                  ...state.conversations,
                  [key]: updatedConversation,
                },
                currentConversation: updatedConversation,
                error: response.error?.message || 'Failed to send message',
                isSending: false,
              };
            });
          }
        } catch (error: any) {
          console.log('[AI CHAT] [ChatStore] Send message exception:', {
            error: error?.message || error,
            errorType: error?.constructor?.name,
            isAxiosError: error?.isAxiosError,
            responseStatus: error?.response?.status,
            responseData: error?.response?.data,
            responseHeaders: error?.response?.headers,
            requestUrl: error?.config?.url,
            requestMethod: error?.config?.method,
            requestData: error?.config?.data,
            requestHeaders: error?.config?.headers,
            stack: error?.stack,
          });

          // Handle authentication errors more gracefully
          if (error.response?.status === 401) {
            console.log(
              '[AI CHAT] [ChatStore] 401 Unauthorized - session expired',
            );
            set({
              error: 'Your session has expired. Please log in again.',
              isSending: false,
            });
          } else {
            console.log(
              '[AI CHAT] [ChatStore] Other error, setting error state',
            );
            set({
              error:
                error.message || 'Failed to send message. Please try again.',
              isSending: false,
            });
          }
        }
      },

      // Search documents
      searchDocuments: async (query: string) => {
        try {
          const response = await apiClient.searchDocuments(query);
          return response.data;
        } catch (error: any) {
          set({error: error.message || 'Failed to search documents'});
          return null;
        }
      },

      // Clear chat history
      clearChatHistory: async (applicationId?: string) => {
        try {
          const response = await apiClient.clearChatHistory(applicationId);

          if (response.success) {
            const key = applicationId || 'general';
            set(state => {
              const newConversations = {...state.conversations};
              delete newConversations[key];

              return {
                conversations: newConversations,
                currentConversation:
                  state.currentApplicationId === applicationId
                    ? null
                    : state.currentConversation,
              };
            });
          }
        } catch (error: any) {
          set({error: error.message || 'Failed to clear chat history'});
        }
      },

      // Load statistics
      loadStats: async () => {
        try {
          const response = await apiClient.getChatStats();

          if (response.success) {
            set({stats: response.data});
          }
        } catch (error: any) {
          console.error('Failed to load chat stats:', error);
        }
      },

      // Set current application ID
      setCurrentApplicationId: (applicationId: string | null) => {
        set({currentApplicationId: applicationId});
      },

      // Load chat sessions
      loadSessions: async (limit = 20, offset = 0) => {
        try {
          set({isLoading: true, error: null});
          const response = await apiClient.getChatSessions(limit, offset);

          if (response.success) {
            set({
              sessions: response.data.sessions || [],
              isLoading: false,
            });
          } else {
            set({error: response.error?.message || 'Failed to load sessions'});
          }
        } catch (error: any) {
          set({
            error: error.message || 'Failed to load sessions',
            isLoading: false,
          });
        }
      },

      // Load session details
      loadSessionDetails: async (sessionId: string) => {
        try {
          set({isLoading: true, error: null});
          const response = await apiClient.getSessionDetails(sessionId);

          if (response.success) {
            const session = response.data;
            set(state => ({
              conversations: {
                ...state.conversations,
                [sessionId]: {
                  messages: session.messages || [],
                  total: session.messages?.length || 0,
                  limit: 50,
                  offset: 0,
                },
              },
              currentConversation: {
                messages: session.messages || [],
                total: session.messages?.length || 0,
                limit: 50,
                offset: 0,
              },
              currentSessionId: sessionId,
              isLoading: false,
            }));
          } else {
            set({error: response.error?.message || 'Failed to load session'});
          }
        } catch (error: any) {
          set({
            error: error.message || 'Failed to load session',
            isLoading: false,
          });
        }
      },

      // Rename session
      renameSession: async (sessionId: string, newTitle: string) => {
        try {
          const response = await apiClient.renameSession(sessionId, newTitle);

          if (response.success) {
            set(state => ({
              sessions: state.sessions.map(s =>
                s.id === sessionId ? {...s, title: newTitle} : s,
              ),
            }));
          } else {
            set({error: response.error?.message || 'Failed to rename session'});
          }
        } catch (error: any) {
          set({error: error.message || 'Failed to rename session'});
        }
      },

      // Delete session
      deleteSession: async (sessionId: string) => {
        try {
          const response = await apiClient.deleteSession(sessionId);

          if (response.success) {
            set(state => ({
              sessions: state.sessions.filter(s => s.id !== sessionId),
              currentSessionId:
                state.currentSessionId === sessionId
                  ? null
                  : state.currentSessionId,
            }));
          } else {
            set({error: response.error?.message || 'Failed to delete session'});
          }
        } catch (error: any) {
          set({error: error.message || 'Failed to delete session'});
        }
      },

      // Add message feedback
      addMessageFeedback: async (
        messageId: string,
        feedback: 'thumbs_up' | 'thumbs_down',
      ) => {
        try {
          await apiClient.addMessageFeedback(messageId, feedback);
        } catch (error: any) {
          console.error('Failed to send feedback:', error);
        }
      },

      // Set current session ID
      setCurrentSessionId: (sessionId: string | null) => {
        set({currentSessionId: sessionId});
      },

      // Clear error
      clearError: () => set({error: null}),
    }),
    {
      name: '@visabuddy_chat',
      // TODO: Include userId in the storage key to avoid leaking conversations across accounts.
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        // TODO: This cache must never be treated as source of truth—always refresh from backend on login.
        conversations: state.conversations,
        // CRITICAL FIX: Also persist current conversation to ensure messages are saved
        currentConversation: state.currentConversation,
        currentApplicationId: state.currentApplicationId,
        currentSessionId: state.currentSessionId,
      }),
      // Add error handling for storage operations
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[ChatStore] Failed to rehydrate:', error);
        }
      },
    },
  ),
);
