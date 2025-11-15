import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { useNotificationStore, Notification } from '../store/notifications';

const WINDOW_HEIGHT = Dimensions.get('window').height;
const TOAST_HEIGHT = 80;
const ANIMATION_DURATION = 300;

interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
}

const NotificationToastItem: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Slide in
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();

    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start(onDismiss);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  const getTypeStyle = () => {
    switch (notification.type) {
      case 'success':
        return { backgroundColor: '#4CAF50', icon: '✓' };
      case 'error':
        return { backgroundColor: '#f44336', icon: '✕' };
      case 'info':
        return { backgroundColor: '#2196F3', icon: 'ℹ' };
      case 'payment_confirmed':
        return { backgroundColor: '#4CAF50', icon: '💳' };
      case 'document_uploaded':
        return { backgroundColor: '#2196F3', icon: '📄' };
      case 'document_verified':
        return { backgroundColor: '#4CAF50', icon: '✓' };
      case 'document_rejected':
        return { backgroundColor: '#f44336', icon: '✕' };
      case 'visa_status_update':
        return { backgroundColor: '#FF9800', icon: '📋' };
      case 'missing_documents':
        return { backgroundColor: '#FF9800', icon: '⚠' };
      case 'deadline_approaching':
        return { backgroundColor: '#FF5722', icon: '⏰' };
      case 'news_update':
        return { backgroundColor: '#9C27B0', icon: '📰' };
      default:
        return { backgroundColor: '#2196F3', icon: 'ℹ' };
    }
  };

  const { backgroundColor, icon } = getTypeStyle();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
        },
      ]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onDismiss}
        style={[styles.toast, { backgroundColor }]}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onDismiss}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const NotificationToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Show only the most recent notification
    if (notifications.length > 0) {
      setVisibleNotifications([notifications[0]]);
    }
  }, [notifications]);

  const handleDismiss = (id: string) => {
    setVisibleNotifications((prev) => prev.filter((n) => n.id !== id));
    removeNotification(id);
  };

  return (
    <View style={styles.toastContainer} pointerEvents="box-none">
      {visibleNotifications.map((notification) => (
        <NotificationToastItem
          key={notification.id}
          notification={notification}
          onDismiss={() => handleDismiss(notification.id)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 10,
    right: 10,
    zIndex: 9999,
  },
  container: {
    marginBottom: 10,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: TOAST_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    lineHeight: 16,
  },
  closeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});