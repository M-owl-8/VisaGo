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
  status?: 'sending' | 'sent' | 'error';
  sources?: string[];
  model?: string;
  tokensUsed?: number;
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

  // Handle sending a message
  const handleSendMessage = async () => {
    // Validation
    if (!messageInput.trim()) {
      return;
    }

    if (!isSignedIn || !user) {
      Alert.alert('Authentication Required', 'Please sign in to use the chat.');
      return;
    }

    // Create local user message
    const content = messageInput.trim();
    const userMessage: LocalMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    // Clear input and add user message
    setMessageInput('');
    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);

    // Build conversation history from current messages (before adding AI reply)
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
        throw new Error(response.error?.message || 'AI error');
      }

      const aiData = response.data; // { message, sources, tokens_used, model, id }

      const assistantMessage: LocalMessage = {
        id: aiData.id || `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiData.message,
        createdAt: new Date().toISOString(),
        status: 'sent',
        sources: aiData.sources || [],
        model: aiData.model,
        tokensUsed: aiData.tokens_used,
      };

      // Mark last user message as 'sent' and add assistant message
      setMessages(prev => {
        const updated = prev.map(msg =>
          msg.id === userMessage.id ? {...msg, status: 'sent'} : msg,
        );
        return [...updated, assistantMessage];
      });
    } catch (err: any) {
      console.error('[ChatScreen] AI send error:', err);

      // Mark last user message as error
      setMessages(prev =>
        prev.map(msg =>
          msg.id === userMessage.id ? {...msg, status: 'error'} : msg,
        ),
      );

      Alert.alert(
        'Error',
        err?.message || 'Failed to send message. Please try again.',
      );
    } finally {
      setIsSending(false);
    }
  };

  // Render a single message
  const renderMessage = ({item}: {item: LocalMessage}) => {
    const isUser = item.role === 'user';
    const isError = item.status === 'error';
    const isSending = item.status === 'sending';

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
          {isSending && (
            <ActivityIndicator
              size="small"
              color={isUser ? '#FFFFFF' : '#4A9EFF'}
              style={styles.sendingIndicator}
            />
          )}
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
          {item.sources && item.sources.length > 0 && (
            <View style={styles.sourcesContainer}>
              <Text style={styles.sourcesLabel}>Sources:</Text>
              {item.sources.map((source, idx) => (
                <Text key={idx} style={styles.sourceText}>
                  •{' '}
                  {typeof source === 'string'
                    ? source
                    : source.title || 'Source'}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        {applicationId && (
          <Text style={styles.headerSubtitle}>Application Chat</Text>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chatbubbles-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              Start a conversation with your AI assistant
            </Text>
          </View>
        }
      />

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
            (!messageInput.trim() || isSending) && styles.sendButtonDisabled,
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  messagesList: {
    padding: 16,
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
    color: '#9CA3AF',
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
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#111827',
  },
  sendingIndicator: {
    marginBottom: 4,
  },
  errorIcon: {
    marginBottom: 4,
  },
  sourcesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  sourcesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  sourceText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
    marginRight: 8,
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
    backgroundColor: '#D1D5DB',
  },
});

export default ChatScreen;
