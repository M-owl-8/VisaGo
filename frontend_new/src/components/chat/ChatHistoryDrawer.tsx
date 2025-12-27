import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
} from 'react-native';
import {Animated, Easing} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {ChatSession} from '../../store/chat';
import {ChatSessionItem} from './ChatSessionItem';

interface ChatHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateNew: () => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onDeleteSession: (sessionId: string) => void;
  isLoading: boolean;
  applicationId?: string;
}

export const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({
  visible,
  onClose,
  sessions,
  selectedSessionId,
  onSelectSession,
  onCreateNew,
  onRenameSession,
  onDeleteSession,
  isLoading,
}) => {
  const slideAnim = useRef(new Animated.Value(-320)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -320,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const renderItem = ({item}: {item: ChatSession}) => (
    <ChatSessionItem
      session={item}
      isSelected={item.id === selectedSessionId}
      onPress={() => {
        onSelectSession(item.id);
        onClose();
      }}
      onRename={() => {
        onRenameSession(item.id, item.title || 'New Chat');
      }}
      onDelete={() => onDeleteSession(item.id)}
    />
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[styles.drawer, {transform: [{translateX: slideAnim}]}]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
          <TouchableOpacity
            style={styles.newChatButton}
            activeOpacity={0.8}
            onPress={() => {
              onCreateNew();
              onClose();
            }}>
            <Icon name="add" size={20} color="#FFFFFF" />
            <Text style={styles.newChatText}>New chat</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Icon name="reload" size={18} color="rgba(255,255,255,0.6)" />
            <Text style={styles.loadingText}>Loading chats...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              name="chatbubbles-outline"
              size={28}
              color="rgba(255,255,255,0.6)"
            />
            <Text style={styles.emptyText}>
              No chats yet. Start a conversation.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '75%',
    maxWidth: 320,
    backgroundColor: 'rgba(11, 18, 32, 0.95)',
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    gap: 8,
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
});

export default ChatHistoryDrawer;
