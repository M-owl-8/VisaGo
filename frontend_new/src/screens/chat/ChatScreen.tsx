import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';
import {AppIcon, IconSizes, IconColors} from '../../components/icons/AppIcon';
import {ChatIcons, QuickActionIcons} from '../../components/icons/iconConfig';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useChatStore} from '../../store/chat';
import {useAuthStore} from '../../store/auth';

export const ChatScreen = ({route}: any) => {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const applicationId = route?.params?.applicationId;
  const isSignedIn = useAuthStore(state => state.isSignedIn);
  const user = useAuthStore(state => state.user);

  const {
    currentConversation,
    isSending,
    error,
    loadChatHistory,
    loadSessions,
    sendMessage,
  } = useChatStore();

  const [messageInput, setMessageInput] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (isSignedIn && user) {
      // Load sessions list
      loadSessions().catch(err => {
        console.error('[ChatScreen] Failed to load sessions:', err);
      });

      // Only load chat history if we don't already have a conversation
      // This prevents overwriting optimistic updates
      const key = applicationId || 'general';
      const hasExistingConversation =
        currentConversation && currentConversation.messages.length > 0;

      if (!hasExistingConversation) {
        // Use a small delay to prevent race conditions
        const timer = setTimeout(() => {
          loadChatHistory(applicationId).catch(err => {
            console.error('[ChatScreen] Failed to load chat history:', err);
          });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [applicationId, isSignedIn, user, loadChatHistory, loadSessions]);

  useEffect(() => {
    if (currentConversation && currentConversation.messages.length > 0) {
      flatListRef.current?.scrollToEnd({animated: true});
      setShowQuickActions(false);
    }
  }, [currentConversation?.messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    if (!isSignedIn || !user) {
      console.log('[AI CHAT] Cannot send: User not signed in');
      return;
    }

    const message = messageInput;
    setMessageInput('');

    console.log('[AI CHAT] Starting send message:', {
      messageLength: message.length,
      messagePreview: message.substring(0, 50),
      hasApplicationId: !!applicationId,
      applicationId,
      historyLength: currentConversation?.messages?.length || 0,
      userId: user?.id,
    });

    try {
      await sendMessage(
        message,
        applicationId,
        currentConversation?.messages || [],
      );
      console.log('[AI CHAT] Send message completed successfully');
    } catch (error: any) {
      console.log('[AI CHAT] Send message error in handleSendMessage:', {
        error: error?.message || error,
        errorType: error?.constructor?.name,
        stack: error?.stack,
      });
    }
  };

  const quickActions = [
    {
      id: 'documents',
      icon: QuickActionIcons.documents,
      text: t('chat.quickActions.documents'),
      color: '#4A9EFF',
    },
    {
      id: 'timeline',
      icon: QuickActionIcons.timeline,
      text: t('chat.quickActions.timeline'),
      color: '#10B981',
    },
    {
      id: 'requirements',
      icon: QuickActionIcons.requirements,
      text: t('chat.quickActions.requirements'),
      color: '#F59E0B',
    },
    {
      id: 'mistakes',
      icon: QuickActionIcons.mistakes,
      text: t('chat.quickActions.mistakes'),
      color: '#EF4444',
    },
  ];

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleQuickAction = (action: string) => {
    const quickMessages: {[key: string]: string} = {
      documents: t('chat.quickMessages.documents'),
      timeline: t('chat.quickMessages.timeline'),
      requirements: t('chat.quickMessages.requirements'),
      mistakes: t('chat.quickMessages.mistakes'),
    };

    if (quickMessages[action]) {
      setMessageInput(quickMessages[action]);
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => handleSendMessage(), 100);
      setShowQuickActions(false);
    }
  };

  const renderMessage = ({item}: {item: any}) => {
    const isUser = item.role === 'user';
    const isSending = item.status === 'sending';
    const hasError = item.status === 'error';

    return (
      <View style={styles.messageContainer}>
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.aiBubble,
            hasError && styles.errorBubble,
          ]}>
          {!isUser && (
            <View style={styles.aiIcon}>
              {isSending ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <AppIcon
                  name={ChatIcons.ai.name}
                  library={ChatIcons.ai.library}
                  size={IconSizes.small}
                  color="#8B5CF6"
                />
              )}
            </View>
          )}
          <View style={styles.messageContent}>
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userText : styles.aiText,
                hasError && styles.errorText,
              ]}>
              {item.content}
            </Text>
            {hasError && (
              <Text style={styles.errorMessage}>
                {t('chat.messageFailed', 'Failed to send. Tap to retry.')}
              </Text>
            )}
            {item.sources && item.sources.length > 0 && (
              <View style={styles.sourcesContainer}>
                <AppIcon
                  name="book-outline"
                  library="ionicons"
                  size={IconSizes.small}
                  color={IconColors.muted}
                />
                <Text style={styles.sourcesText}>
                  {t('chat.sources', {sources: item.sources.join(', ')})}
                </Text>
              </View>
            )}
            <View style={styles.timestampContainer}>
              {isSending && (
                <ActivityIndicator
                  size="small"
                  color={isUser ? '#FFFFFF' : '#8B5CF6'}
                  style={styles.sendingIndicator}
                />
              )}
              <Text style={styles.timestamp}>
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const messages = currentConversation?.messages || [];

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground}>
        {/* Background Pattern */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 65}>
          <View style={styles.contentWrapper}>
            {/* Messages List */}
            {messages.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyIconContainer}>
                  <AppIcon
                    name={ChatIcons.empty.name}
                    library={ChatIcons.empty.library}
                    size={IconSizes.large * 2}
                    color={IconColors.active}
                  />
                </View>
                <Text style={styles.emptyTitle}>{t('chat.aiAssistant')}</Text>
                <Text style={styles.emptyText}>{t('chat.askAnything')}</Text>

                {/* Quick Actions */}
                {showQuickActions && (
                  <View style={styles.quickActionsContainer}>
                    <Text style={styles.quickActionsTitle}>
                      {t('chat.quickQuestions')}
                    </Text>
                    <View style={styles.quickActionsGrid}>
                      {quickActions.map(action => (
                        <TouchableOpacity
                          key={action.id}
                          style={styles.quickActionButton}
                          onPress={() => handleQuickAction(action.id)}>
                          <AppIcon
                            name={action.icon.name}
                            library={action.icon.library}
                            size={IconSizes.settings}
                            color={action.color}
                          />
                          <Text style={styles.quickActionText}>
                            {action.text}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item: any) =>
                  item.id?.toString() || Math.random().toString()
                }
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() =>
                  flatListRef.current?.scrollToEnd({animated: true})
                }
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>

          {/* Input Area - Positioned directly above tab bar, moves above keyboard when open */}
          <View
            style={[
              styles.inputContainer,
              {
                paddingBottom: Math.max(12, insets.bottom),
              },
            ]}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={t('chat.messagePlaceholder')}
                placeholderTextColor="#6B7280"
                value={messageInput}
                onChangeText={setMessageInput}
                multiline
                maxLength={500}
                editable={!isSending}
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
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
                  <AppIcon
                    name={ChatIcons.send.name}
                    library={ChatIcons.send.library}
                    size={IconSizes.settings}
                    color={IconColors.bright}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.1)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -50,
  },
  keyboardView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingBottom: 0, // No padding - input is in normal flow
  },
  messagesList: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  userBubble: {
    justifyContent: 'flex-end',
    marginLeft: 'auto',
  },
  aiBubble: {
    justifyContent: 'flex-start',
  },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  messageContent: {
    maxWidth: '75%',
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#E2E8F0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  sourcesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  sourcesText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  timestamp: {
    fontSize: 11,
    color: '#6B7280',
  },
  sendingIndicator: {
    marginRight: 4,
  },
  errorBubble: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
  },
  errorText: {
    opacity: 0.7,
  },
  errorMessage: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    fontStyle: 'italic',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  quickActionsContainer: {
    width: '100%',
    marginTop: 8,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickActionsGrid: {
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 12,
  },
  quickActionText: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '500',
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(15, 30, 45, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 158, 255, 0.2)',
    // Positioned in normal flow - KeyboardAvoidingView handles keyboard
    // Tab bar (65px) is handled by React Navigation and stays at bottom
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4A9EFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A9EFF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
