import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

interface ChatHeaderProps {
  onMenuPress: () => void;
  onNewChatPress?: () => void;
  showNewChatButton?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onMenuPress,
  onNewChatPress,
  showNewChatButton = true,
}) => {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 12);

  return (
    <View style={[styles.container, {paddingTop}]}>
      <View style={styles.leftGroup}>
        <TouchableOpacity
          onPress={onMenuPress}
          activeOpacity={0.7}
          style={styles.iconButton}
          accessibilityLabel="Open chat history"
          accessibilityRole="button">
          <Icon name="menu" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.brandText}>Ketdik</Text>
      </View>

      {showNewChatButton && (
        <TouchableOpacity
          onPress={onNewChatPress}
          activeOpacity={0.7}
          style={styles.newChatButton}
          accessibilityLabel="Start new chat"
          accessibilityRole="button">
          <Icon name="add" size={20} color="#FFFFFF" />
          <Text style={styles.newChatText}>New chat</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#040816',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ChatHeader;
