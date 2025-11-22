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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuthStore} from '../../store/auth';
import {apiClient} from '../../services/api';

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

  // Local state for messages
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for auto-scroll
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages.length]);

  // Logging (temporary)
  useEffect(() => {
    console.log('[ChatScreen] messages:', messages.length);
  }, [messages.length]);

  // Helper function to strip DeepSeek thinking blocks
  function stripThinkBlock(raw: string): string {
    if (!raw) return '';
    // Remove <think>...</think> including the tags and any leading/trailing whitespace/newlines
    const thinkRegex = /<think>[\s\S]*?<\/redacted_reasoning>/gi;
    let cleaned = raw.replace(thinkRegex, '');
    // Clean up any extra newlines or whitespace left behind
    cleaned = cleaned.replace(/\n\s*\n+/g, '\n').trim();
    // If after stripping we have nothing, return the original (shouldn't happen, but safety)
    return cleaned.length > 0 ? cleaned : raw.trim();
  }

  // Handle sending a message
  const handleSendMessage = async () => {
    // Validation
    if (!messageInput.trim() || isSending) {
      return;
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
      content: 'Ketdik is thinking...',
      createdAt: new Date().toISOString(),
      status: 'thinking',
      pending: true,
    };

    // Clear input and add both messages immediately (ChatGPT-style)
    setMessageInput('');
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

      // Strip thinking blocks from the response
      const cleanedContent = stripThinkBlock(aiData.message);

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

      // Set friendly error message
      const friendlyError =
        err?.message?.includes('unavailable') ||
        err?.message?.includes('timeout') ||
        err?.message?.includes('network')
          ? 'Ketdik AI is temporarily unavailable. Please try again in a moment.'
          : 'Failed to send message. Please try again.';

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <View style={styles.contentContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            style={styles.flatList}
            contentContainerStyle={styles.messagesList}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="chatbubbles-outline" size={64} color="#94A3B8" />
                <Text style={styles.emptyText}>
                  Start a conversation with your AI assistant
                </Text>
              </View>
            }
          />

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

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor="#9CA3AF"
              value={messageInput}
              onChangeText={setMessageInput}
              multiline
              maxLength={2000}
              editable={!isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageInput.trim() || isSending) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!messageInput.trim() || isSending}>
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
    borderRadius: 16,
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
    backgroundColor: '#0A1929',
    borderTopWidth: 1,
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
});

export default ChatScreen;
