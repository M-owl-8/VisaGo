import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {ChatSession} from '../../store/chat';

interface ChatSessionItemProps {
  session: ChatSession;
  isSelected: boolean;
  onPress: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const formatRelativeTime = (dateString?: string) => {
  if (!dateString) {
    return '';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const now = new Date().getTime();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 172800) return 'Yesterday';
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export const ChatSessionItem: React.FC<ChatSessionItemProps> = ({
  session,
  isSelected,
  onPress,
  onRename,
  onDelete,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.container,
        isSelected ? styles.containerActive : styles.containerInactive,
      ]}>
      <View style={styles.textGroup}>
        <Text
          style={[styles.title, isSelected && styles.titleActive]}
          numberOfLines={1}>
          {session.title || 'New Chat'}
        </Text>
        <Text style={styles.timestamp}>
          {formatRelativeTime(session.updatedAt || session.createdAt)}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onRename}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Icon name="pencil" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Icon name="trash" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 10,
  },
  containerActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  containerInactive: {
    backgroundColor: 'transparent',
  },
  textGroup: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  titleActive: {
    color: '#FFFFFF',
  },
  timestamp: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
});

export default ChatSessionItem;
