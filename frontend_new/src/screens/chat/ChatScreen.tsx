/**
 * ChatScreen - Simple ChatGPT-style chat interface
 * Uses local state for messages instead of Zustand store
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuthStore} from '../../store/auth';
import {apiClient} from '../../services/api';
import {ChatHeader} from '../../components/chat/ChatHeader';
import {ChatHistoryDrawer} from '../../components/chat/ChatHistoryDrawer';
import {useChatStore} from '../../store/chat';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Storage key for chat history persistence
const CHAT_HISTORY_STORAGE_KEY = '@ketdik_chat_history_global_v1';

// Local message types
type LocalRole = 'user' | 'assistant';

interface LocalMessage {
  id: string;
  role: LocalRole;
  content: string;
  createdAt: string;
  status?: 'sending' | 'sent' | 'error' | 'thinking';
  sources?: string[];
  model?: string;
  tokensUsed?: number;
  pending?: boolean; // For placeholder AI messages
}

interface ChatScreenProps {
  navigation?: any;
  route?: any;
}

export function ChatScreen({navigation, route}: ChatScreenProps) {
  // Auth state (still using store for auth)
  const isSignedIn = useAuthStore(state => state.isSignedIn);
  const user = useAuthStore(state => state.user);
  const applicationId = route?.params?.applicationId || undefined;
  const {
    sessions,
    loadSessions,
    loadSessionDetails,
    setCurrentSessionId,
    currentConversation,
    currentSessionId,
    renameSession,
    deleteSession,
  } = useChatStore();

  // Local state for messages
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);

  // Refs for auto-scroll
  const flatListRef = useRef<FlatList>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && isNearBottom) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages.length, isNearBottom]);

  // Handle scroll events to show/hide scroll-to-bottom button
  const handleScroll = (event: any) => {
    const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    const nearBottom = distanceFromBottom < 200; // Show button if more than 200px from bottom
    setIsNearBottom(nearBottom);
    setShowScrollToBottom(!nearBottom && messages.length > 3);
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({animated: true});
    setShowScrollToBottom(false);
    setIsNearBottom(true);
  };

  // Load chat sessions for drawer
  useEffect(() => {
    const fetchSessions = async () => {
      if (!isSignedIn) {
        return;
      }
      try {
        setIsSessionsLoading(true);
        await loadSessions(50, 0);
      } catch (err) {
        console.warn('[ChatScreen] Failed to load sessions', err);
      } finally {
        setIsSessionsLoading(false);
      }
    };
    fetchSessions();
  }, [isSignedIn, loadSessions]);

  // HIGH PRIORITY FIX: Load chat history from BOTH AsyncStorage (for instant display) AND backend (for sync)
  // This ensures chat history persists across devices and app reinstalls
  useEffect(() => {
    let isCancelled = false;

    const loadChatHistory = async () => {
      try {
        // Step 1: Load from AsyncStorage first for instant display (optimistic loading)
        const stored = await AsyncStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Basic validation: ensure it's an array
          if (Array.isArray(parsed)) {
            if (!isCancelled) {
              setMessages(parsed);
              console.log(
                '[ChatScreen] Loaded chat history from storage:',
                parsed.length,
                'messages',
              );
            }
          }
        } else {
          console.log('[ChatScreen] No stored chat history found');
        }

        // Step 2: Sync with backend to get latest messages and ensure persistence
        // This is critical for multi-device support and data recovery
        if (isSignedIn && user) {
          try {
            const {useChatStore} = require('../../store/chat');
            const chatStore = useChatStore.getState();
            await chatStore.loadChatHistory(applicationId, 100); // Load last 100 messages for cross-platform sync

            // Merge backend messages with local messages (backend is source of truth)
            const backendConversation = chatStore.currentConversation;
            if (backendConversation && backendConversation.messages) {
              const backendMessages = backendConversation.messages.map(
                (msg: any) => ({
                  id: msg.id || `msg-${Date.now()}-${Math.random()}`,
                  role: msg.role,
                  content: msg.content,
                  createdAt: msg.createdAt || new Date().toISOString(),
                  status: 'sent' as const,
                  sources: msg.sources || [],
                  model: msg.model,
                  tokensUsed: msg.tokensUsed,
                }),
              );

              if (!isCancelled) {
                // Use backend messages as source of truth
                // Get current messages state to preserve optimistic updates
                setMessages(currentMessages => {
                  const localOptimistic = currentMessages.filter(
                    m => m.status === 'sending' || m.status === 'thinking',
                  );
                  return [...backendMessages, ...localOptimistic];
                });
                console.log(
                  '[ChatScreen] Synced with backend:',
                  backendMessages.length,
                  'messages',
                );
              }
            }
          } catch (backendError) {
            console.warn(
              '[ChatScreen] Failed to load chat from backend, using local storage:',
              backendError,
            );
            // Continue with local storage if backend fails
          }
        }
      } catch (error) {
        console.warn(
          '[ChatScreen] Failed to load chat history from storage',
          error,
        );
        // If parsing/loading fails, just start with empty messages
      } finally {
        if (!isCancelled) {
          setIsHydrated(true);
        }
      }
    };

    loadChatHistory();

    return () => {
      isCancelled = true;
    };
  }, [isSignedIn, user, applicationId]);

  // Save chat history to AsyncStorage whenever messages change
  useEffect(() => {
    if (!isHydrated) {
      // Avoid saving initial empty state before hydration finishes
      return;
    }

    const saveChatHistory = async () => {
      try {
        // Limit the number of messages to avoid unbounded growth
        const maxMessagesToPersist = 200;
        const toPersist =
          messages.length > maxMessagesToPersist
            ? messages.slice(messages.length - maxMessagesToPersist)
            : messages;

        await AsyncStorage.setItem(
          CHAT_HISTORY_STORAGE_KEY,
          JSON.stringify(toPersist),
        );
        console.log(
          '[ChatScreen] Saved chat history:',
          toPersist.length,
          'messages',
        );
      } catch (error) {
        console.warn(
          '[ChatScreen] Failed to save chat history to storage',
          error,
        );
      }
    };

    saveChatHistory();
  }, [messages, isHydrated]);

  // Logging (temporary)
  useEffect(() => {
    console.log('[ChatScreen] messages:', messages.length);
  }, [messages.length]);

  // Sync messages from chat store when a session is loaded
  useEffect(() => {
    if (!currentConversation || !currentConversation.messages) {
      return;
    }
    const mapped = currentConversation.messages.map(msg => ({
      id: msg.id,
      role: msg.role as LocalRole,
      content: msg.content,
      createdAt: msg.createdAt || new Date().toISOString(),
      status: 'sent' as const,
      sources: msg.sources || [],
      model: msg.model,
      tokensUsed: msg.tokensUsed,
    }));
    setMessages(mapped);
  }, [currentConversation]);

  // Helper function to sanitize AI messages: remove markdown and thinking blocks
  const sanitizeAiMessage = (raw: string): string => {
    if (!raw) return '';

    let text = raw;

    // Remove <think>...</think> blocks (multi-line)
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Remove <think>...</think> blocks (alternative format)
    text = text.replace(/<think>[\s\S]*?<\/redacted_reasoning>/gi, '').trim();

    // Remove Markdown heading markers at line starts (###, ####, etc.)
    text = text.replace(/^\s*#{1,6}\s*/gm, '');

    // Remove bold markers **text**
    text = text.replace(/\*\*/g, '');

    // Normalize list markers "- " (ensure space after dash)
    text = text.replace(/^\s*-\s*/gm, '- ');

    // Collapse multiple blank lines into max 2
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    // Validation - prevent duplicate requests
    if (!messageInput.trim() || isSending) {
      return; // Already sending or empty input
    }

    if (!isSignedIn || !user) {
      Alert.alert('Authentication Required', 'Please sign in to use the chat.');
      return;
    }

    // Clear any previous error
    setErrorMessage(null);

    // Create local user message
    const content = messageInput.trim();
    const userMessageId = `user-${Date.now()}`;
    const userMessage: LocalMessage = {
      id: userMessageId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      status: 'sent', // User message is immediately visible
    };

    // Create placeholder AI message for "thinking" state
    const thinkingMessageId = `assistant-thinking-${Date.now()}`;
    const thinkingMessage: LocalMessage = {
      id: thinkingMessageId,
      role: 'assistant',
      content: 'Ketdik AI is thinking...',
      createdAt: new Date().toISOString(),
      status: 'thinking',
      pending: true,
    };

    // Clear input and add both messages immediately (ChatGPT-style)
    setMessageInput('');

    // Animate message appearance
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setMessages(prev => [...prev, userMessage, thinkingMessage]);
    setIsSending(true);

    // Build conversation history from current messages (excluding the thinking placeholder)
    const conversationHistory = [...messages, userMessage].map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      // Call the existing AI API
      const response = await apiClient.sendMessage(
        content,
        applicationId,
        conversationHistory,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'AI service error');
      }

      const aiData = response.data; // { message, sources, tokens_used, model, id }

      // Sanitize AI message: remove markdown and thinking blocks
      const cleanedContent = sanitizeAiMessage(aiData.message);

      const assistantMessage: LocalMessage = {
        id: aiData.id || `assistant-${Date.now()}`,
        role: 'assistant',
        content: cleanedContent,
        createdAt: new Date().toISOString(),
        status: 'sent',
        sources: aiData.sources || [],
        model: aiData.model,
        tokensUsed: aiData.tokens_used,
        pending: false,
      };

      // Replace the thinking placeholder with the real AI response
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      setMessages(prev => {
        return prev
          .filter(msg => msg.id !== thinkingMessageId) // Remove thinking placeholder
          .map(msg =>
            msg.id === userMessageId ? {...msg, status: 'sent'} : msg,
          )
          .concat(assistantMessage); // Add real AI response
      });
    } catch (err: any) {
      console.error('[ChatScreen] AI send error:', err);

      // Remove the thinking placeholder
      setMessages(prev => prev.filter(msg => msg.id !== thinkingMessageId));

      // Set friendly multilingual error message
      let friendlyError = '';
      const errorMessage = err?.message || '';
      const isTimeout =
        errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT');
      const isNetwork =
        errorMessage.includes('network') || errorMessage.includes('Network');
      const isUnavailable =
        errorMessage.includes('unavailable') ||
        errorMessage.includes('UNAVAILABLE');

      // Detect user language from last message (simple heuristic)
      const lastUserMessage = messages.find(m => m.role === 'user');
      const userLang = lastUserMessage?.content || '';
      const isUzbek =
        /[а-яё]/.test(userLang) === false &&
        /[А-ЯЁ]/.test(userLang) === false &&
        userLang.length > 0;
      const isRussian = /[а-яёА-ЯЁ]/.test(userLang);

      if (isTimeout || isNetwork || isUnavailable) {
        if (isUzbek) {
          friendlyError =
            "AI javob bera olmadi. Iltimos, qayta urinib ko'ring.";
        } else if (isRussian) {
          friendlyError = 'ИИ не смог ответить. Попробуйте еще раз.';
        } else {
          friendlyError = 'AI could not respond. Please try again.';
        }
      } else {
        if (isUzbek) {
          friendlyError =
            "Xabar yuborib bo'lmadi. Iltimos, qayta urinib ko'ring.";
        } else if (isRussian) {
          friendlyError = 'Не удалось отправить сообщение. Попробуйте еще раз.';
        } else {
          friendlyError = 'Failed to send message. Please try again.';
        }
      }

      setErrorMessage(friendlyError);

      // Keep the user message in history (it's already there)
    } finally {
      setIsSending(false);
    }
  };

  // Render a single message
  const renderMessage = ({item}: {item: LocalMessage}) => {
    const isUser = item.role === 'user';
    const isError = item.status === 'error';
    const isThinking = item.status === 'thinking' || item.pending;

    return (
      <View
        style={[
          styles.messageContainer,
          isUser
            ? styles.userMessageContainer
            : styles.assistantMessageContainer,
        ]}>
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            isError && styles.errorBubble,
          ]}>
          {isThinking && !isUser && (
            <View style={styles.thinkingContainer}>
              <ActivityIndicator
                size="small"
                color="#4A9EFF"
                style={styles.thinkingIndicator}
              />
              <Text style={styles.thinkingText}>{item.content}</Text>
            </View>
          )}
          {!isThinking && (
            <>
              {isError && (
                <Icon
                  name="alert-circle"
                  size={16}
                  color="#EF4444"
                  style={styles.errorIcon}
                />
              )}
              <Text
                style={[
                  styles.messageText,
                  isUser ? styles.userMessageText : styles.assistantMessageText,
                ]}>
                {item.content}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  // Platform-specific keyboard behavior
  const keyboardBehavior = Platform.select({
    ios: 'padding',
    android: 'height',
    default: undefined,
  }) as 'padding' | 'height' | 'position' | undefined;

  const handleSelectSession = async (sessionId: string) => {
    try {
      setIsSending(true);
      setCurrentSessionId(sessionId);
      await loadSessionDetails(sessionId);
      setIsDrawerOpen(false);
    } catch (err) {
      console.warn('[ChatScreen] Failed to select session', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleNewChat = () => {
    // Placeholder: simply clear local messages and input; session creation can be triggered on first send
    setCurrentSessionId(null);
    setMessages([]);
    setMessageInput('');
    setIsDrawerOpen(false);
    loadSessions(50, 0).catch(err =>
      console.warn(
        '[ChatScreen] Failed to refresh sessions after new chat',
        err,
      ),
    );
  };

  const handleRenameSession = (sessionId: string, currentTitle: string) => {
    if (Platform.OS === 'ios' && (Alert as any).prompt) {
      (Alert as any).prompt(
        'Rename chat',
        'Enter a new chat title',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Save',
            onPress: (text: string) => {
              if (text && text.trim().length > 0) {
                renameSession(sessionId, text.trim());
              }
            },
          },
        ],
        'plain-text',
        currentTitle || 'New Chat',
      );
    } else {
      Alert.alert('Rename chat', 'Renaming is only available on iOS for now.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ChatHeader
        onMenuPress={() => setIsDrawerOpen(true)}
        onNewChatPress={handleNewChat}
        showNewChatButton
      />
      <ChatHistoryDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        sessions={sessions}
        selectedSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onCreateNew={handleNewChat}
        onRenameSession={(id, title) => handleRenameSession(id, title)}
        onDeleteSession={id => deleteSession(id)}
        isLoading={isSessionsLoading}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <View style={styles.contentContainer}>
          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            style={styles.flatList}
            contentContainerStyle={styles.messagesList}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="chatbubbles-outline" size={64} color="#94A3B8" />
                <Text style={styles.emptyText}>
                  Start a conversation with your AI assistant
                </Text>
              </View>
            }
          />

          {/* Scroll to bottom button */}
          {showScrollToBottom && (
            <TouchableOpacity
              style={styles.scrollToBottomButton}
              onPress={scrollToBottom}
              activeOpacity={0.7}>
              <Icon name="chevron-down" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
              <TouchableOpacity
                onPress={() => setErrorMessage(null)}
                style={styles.errorCloseButton}>
                <Icon name="close" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}

          {/* Input Container - Always visible above keyboard */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor="#9CA3AF"
              value={messageInput}
              onChangeText={setMessageInput}
              multiline
              maxLength={2000}
              editable={isHydrated && !isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!isHydrated || !messageInput.trim() || isSending) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!isHydrated || !messageInput.trim() || isSending}>
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  flatList: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  messagesList: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    width: '100%',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#4A9EFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  errorBubble: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#FFFFFF',
  },
  sendingIndicator: {
    marginBottom: 4,
  },
  errorIcon: {
    marginBottom: 4,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thinkingIndicator: {
    marginRight: 8,
  },
  thinkingText: {
    fontSize: 16,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  errorCloseButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    backgroundColor: '#0A1929',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(74, 158, 255, 0.2)',
    alignItems: 'flex-end',
    minHeight: 60,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A9EFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(74, 158, 255, 0.3)',
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A9EFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default ChatScreen;
