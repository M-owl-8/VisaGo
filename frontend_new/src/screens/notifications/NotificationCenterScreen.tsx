import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNotificationStore } from '../../store/notifications';
import { formatDistanceToNow } from 'date-fns';

export const NotificationCenterScreen: React.FC = () => {
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    loadNotificationHistory,
  } = useNotificationStore();

  useEffect(() => {
    loadNotificationHistory();
  }, []);

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [notifications]);

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const handleRefresh = async () => {
    await loadNotificationHistory();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#f44336';
      case 'info':
        return '#2196F3';
      case 'payment_confirmed':
        return '#4CAF50';
      case 'document_uploaded':
        return '#2196F3';
      case 'document_verified':
        return '#4CAF50';
      case 'document_rejected':
        return '#f44336';
      case 'visa_status_update':
        return '#FF9800';
      case 'missing_documents':
        return '#FF9800';
      case 'deadline_approaching':
        return '#FF5722';
      case 'news_update':
        return '#9C27B0';
      default:
        return '#666';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      case 'payment_confirmed':
        return '💳';
      case 'document_uploaded':
        return '📄';
      case 'document_verified':
        return '✓';
      case 'document_rejected':
        return '✕';
      case 'visa_status_update':
        return '📋';
      case 'missing_documents':
        return '⚠';
      case 'deadline_approaching':
        return '⏰';
      case 'news_update':
        return '📰';
      default:
        return 'ℹ';
    }
  };

  const renderNotificationItem = ({ item: notification }: any) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.read && styles.notificationItemUnread,
      ]}
      onPress={() => handleMarkAsRead(notification.id)}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: getTypeColor(notification.type) },
        ]}>
        <Text style={styles.icon}>{getTypeIcon(notification.type)}</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.timestamp}>
          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
        </Text>
      </View>

      {!notification.read && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyMessage}>
        You're all caught up! Check back later for updates.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTitle}>
        <Text style={styles.headerText}>Notifications</Text>
        {notifications.some((n) => !n.read) && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              {notifications.filter((n) => !n.read).length}
            </Text>
          </View>
        )}
      </View>

      {notifications.length > 0 && (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={markAllAsRead}>
            <Text style={styles.headerButtonText}>Mark All Read</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={clearNotifications}>
            <Text style={styles.headerButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (isLoading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={sortedNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
        contentContainerStyle={sortedNotifications.length === 0 ? styles.centeredContent : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  badgeContainer: {
    marginLeft: 12,
    backgroundColor: '#FF5722',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationItemUnread: {
    backgroundColor: '#f9f9f9',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});